import { randomUUID } from "node:crypto";
import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "../utils/db_setup.js";
import { STORAGE_BUCKETS, forget_stored_file, upload_to_bucket } from "../utils/storage_buckets.js";
import { draw_certificate, draw_certificate_buffer, read_image_size } from "./certificate_draw.js";
import { known_source, known_type, load_issue_context, value_for_field } from "./certificate_sources.js";
export { list_value_sources } from "./certificate_sources.js";

const FONT_FAMILIES = ["Poppins", "Inter", "Montserrat", "Georgia", "Times New Roman", "Arial"];
const ALIGNMENTS = new Set(["left", "center", "right", "justify"]);
const ALIAS_PATTERN = /^[\p{L}][\p{L}\p{N} ]{0,79}$/u;

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function as_bool(value) {
  return value === true || value === 1 || value === "1";
}

function hex_color(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#0D1B3F";
}

function read_fields(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function alias_of(field) {
  const label = String(field?.field_label || "").trim();
  if (label) return label;
  const key = String(field?.field_key || "").trim();
  if (!key.includes("_")) return key;
  return key.split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function map_field(field) {
  const field_key = alias_of(field);
  if (!field_key) return null;
  const value_mode = field.value_mode === "static" ? "static" : "table";
  return {
    field_key,
    x_position: Number(field.x_position || 0),
    y_position: Number(field.y_position || 0),
    box_width: Number(field.box_width || field.width || 420),
    box_height: Number(field.box_height || field.height || 70),
    font_family: FONT_FAMILIES.includes(field.font_family) ? field.font_family : "Poppins",
    font_size: Number(field.font_size || 48),
    font_color: hex_color(field.font_color),
    text_alignment: ALIGNMENTS.has(field.text_alignment) ? field.text_alignment : "center",
    bold: as_bool(field.bold),
    italic: as_bool(field.italic),
    underline: as_bool(field.underline),
    letter_spacing: Number(field.letter_spacing || 0),
    value_mode,
    value_type: value_mode === "static" ? "manual" : (known_type(field.value_type) || String(known_source(field.value_source)).split(".")[0] || ""),
    value_source: value_mode === "table" ? known_source(field.value_source) : "",
    static_value: value_mode === "static" ? String(field.static_value || "").trim().slice(0, 200) : ""
  };
}

const ASSIGNED_FOR = new Set(["mock_interview"]);

function assigned_for_of(value) {
  const next = String(value || "").trim();
  return ASSIGNED_FOR.has(next) ? next : "";
}

function map_certificate(row) {
  if (!row) return null;
  return {
    certificate_id: Number(row.certificate_id),
    certificate_name: row.certificate_name || "",
    image_url: row.image_url || "",
    image_width: Number(row.image_width || 0),
    image_height: Number(row.image_height || 0),
    assigned_for: assigned_for_of(row.assigned_for),
    fields: read_fields(row.fields_json).map(map_field).filter(Boolean)
  };
}

function clean_fields(fields, width, height) {
  if (!Array.isArray(fields)) throw fail("Fields must be a list.");
  const seen = new Set();
  return fields.map((field) => {
    const next = map_field(field);
    if (!next || !ALIAS_PATTERN.test(next.field_key)) throw fail("Each variable needs one alias, such as Student Name.");
    const key = next.field_key.toLowerCase();
    if (seen.has(key)) throw fail(`${next.field_key} is already on this certificate.`);
    seen.add(key);
    if (!(next.x_position >= 0 && next.x_position < width && next.y_position >= 0 && next.y_position < height)) {
      throw fail(`${next.field_key} sits outside the picture.`);
    }
    next.font_size = Math.min(200, Math.max(8, Math.round(next.font_size)));
    next.box_width = Math.min(4000, Math.max(40, Math.round(next.box_width)));
    next.box_height = Math.min(800, Math.max(24, Math.round(next.box_height)));
    next.letter_spacing = Math.min(40, Math.max(-5, Number(next.letter_spacing) || 0));
    return next;
  });
}

async function find_certificate(certificate_id) {
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT * FROM tbl_certificates WHERE certificate_id = ? LIMIT 1`,
    [Number(certificate_id)]
  );
  if (!rows?.[0]) throw fail("Certificate was not found.", 404);
  return rows[0];
}

async function store_picture(file) {
  if (!file?.buffer?.length) throw fail("Choose a PNG or JPG.");
  const size = await read_image_size(file.buffer);
  const extension = size.format === "png" ? ".png" : ".jpg";
  const filename = `${randomUUID().replace(/-/g, "")}${extension}`;
  const storage_path = `templates/${filename}`;
  const image_url = await upload_to_bucket(
    STORAGE_BUCKETS.CERTIFICATES,
    storage_path,
    file.buffer,
    file.mimetype || (extension === ".png" ? "image/png" : "image/jpeg")
  );
  return {
    original_filename: file.originalname || filename,
    filename,
    storage_path,
    image_url,
    image_width: size.width,
    image_height: size.height
  };
}

export async function list_certificates() {
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT * FROM tbl_certificates ORDER BY certificate_id DESC`
  );
  return { items: (rows || []).map(map_certificate) };
}

export async function get_certificate(certificate_id) {
  return { item: map_certificate(await find_certificate(certificate_id)) };
}

export async function create_certificate(file, certificate_name) {
  const name = String(certificate_name || "").trim();
  if (!name) throw fail("Template name is required.");
  if (name.length > 150) throw fail("Template name is too long.");
  const picture = await store_picture(file);
  const [inserted] = await sqlQuery(
    get_pool(),
    `INSERT INTO tbl_certificates (
       certificate_name, original_filename, filename, storage_path, image_url,
       image_width, image_height, fields_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]')`,
    [
      name,
      picture.original_filename,
      picture.filename,
      picture.storage_path,
      picture.image_url,
      picture.image_width,
      picture.image_height
    ]
  );
  return get_certificate(inserted.insertId);
}

export async function find_assigned_certificate(kind) {
  const assigned_for = assigned_for_of(kind);
  if (!assigned_for) return null;
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT * FROM tbl_certificates
     WHERE assigned_for = ?
     ORDER BY updated_at DESC, certificate_id DESC
     LIMIT 1`,
    [assigned_for]
  );
  return map_certificate(rows?.[0]) || null;
}

export async function assign_certificate_for(kind, certificate_id) {
  const assigned_for = assigned_for_of(kind);
  if (!assigned_for) throw fail("Unknown assignment.");
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_certificates SET assigned_for = NULL WHERE assigned_for = ?`,
    [assigned_for]
  );
  const id = Number(certificate_id);
  if (!id) return { assigned_for: "", item: null };
  const current = await find_certificate(id);
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_certificates SET assigned_for = ?, updated_at = NOW() WHERE certificate_id = ?`,
    [assigned_for, current.certificate_id]
  );
  return get_certificate(current.certificate_id);
}

export async function save_certificate(certificate_id, body) {
  const current = await find_certificate(certificate_id);
  const name = String(body?.certificate_name || "").trim();
  if (!name) throw fail("Template name is required.");
  if (name.length > 150) throw fail("Template name is too long.");
  const fields = clean_fields(body?.fields || [], Number(current.image_width), Number(current.image_height));
  const assigned_for = Object.prototype.hasOwnProperty.call(body || {}, "assigned_for")
    ? assigned_for_of(body.assigned_for)
    : assigned_for_of(current.assigned_for);
  if (assigned_for) {
    await sqlQuery(
      get_pool(),
      `UPDATE tbl_certificates
       SET assigned_for = NULL
       WHERE assigned_for = ? AND certificate_id <> ?`,
      [assigned_for, current.certificate_id]
    );
  }
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_certificates
     SET certificate_name = ?, fields_json = ?, assigned_for = ?, updated_at = NOW()
     WHERE certificate_id = ?`,
    [name, JSON.stringify(fields), assigned_for || null, current.certificate_id]
  );
  return get_certificate(current.certificate_id);
}

export async function replace_certificate_image(certificate_id, file) {
  const current = await find_certificate(certificate_id);
  const picture = await store_picture(file);
  const moved = read_fields(current.fields_json).map(map_field).filter(Boolean).map((field) => ({
    ...field,
    x_position: Math.min(Math.max(0, field.x_position), picture.image_width - 1),
    y_position: Math.min(Math.max(0, field.y_position), picture.image_height - 1)
  }));
  const fields = clean_fields(moved, picture.image_width, picture.image_height);
  try {
    await sqlQuery(
      get_pool(),
      `UPDATE tbl_certificates
       SET original_filename = ?, filename = ?, storage_path = ?, image_url = ?,
           image_width = ?, image_height = ?, fields_json = ?, updated_at = NOW()
       WHERE certificate_id = ?`,
      [
        picture.original_filename,
        picture.filename,
        picture.storage_path,
        picture.image_url,
        picture.image_width,
        picture.image_height,
        JSON.stringify(fields),
        current.certificate_id
      ]
    );
  } catch (err) {
    await forget_stored_file(picture.image_url);
    throw err;
  }
  await forget_stored_file(current.image_url);
  return get_certificate(current.certificate_id);
}

export async function delete_certificate(certificate_id) {
  const current = await find_certificate(certificate_id);
  await forget_stored_file(current.image_url);
  await sqlQuery(
    get_pool(),
    `DELETE FROM tbl_certificates WHERE certificate_id = ?`,
    [current.certificate_id]
  );
  return { item: { certificate_id: Number(current.certificate_id), deleted: true } };
}

function sample_aliases(fields) {
  const sample = {};
  for (const field of fields) {
    if (field.value_mode === "static" && field.static_value) sample[field.field_key] = field.static_value;
    else sample[field.field_key] = `{${field.field_key}}`;
  }
  return sample;
}

export async function render_issued_certificate(certificate_id, scope = {}) {
  const current = map_certificate(await find_certificate(certificate_id));
  if (!current.image_url) throw fail("This certificate has no picture.");
  if (!current.fields.length) throw fail("This certificate has no variables yet.");
  const context = await load_issue_context(scope);
  const aliases = {};
  for (const field of current.fields) aliases[field.field_key] = value_for_field(field, context);
  const buffer = await draw_certificate(current.image_url, current.fields, aliases);
  return { buffer, content_type: "image/png", certificate_name: current.certificate_name };
}

export async function preview_certificate(certificate_id, fields) {
  const current = map_certificate(await find_certificate(certificate_id));
  const placed = Array.isArray(fields) && fields.length ? clean_fields(fields, current.image_width, current.image_height) : current.fields;
  if (!placed.length) throw fail("Add a variable before preview.");
  if (!current.image_url) throw fail("Upload a certificate picture first.");
  const buffer = await draw_certificate(current.image_url, placed, sample_aliases(placed));
  return { buffer, content_type: "image/png" };
}

export async function preview_draft({ file, image_url, image_width, image_height, fields }) {
  let input = null;
  let width = Number(image_width || 0);
  let height = Number(image_height || 0);

  if (file?.buffer?.length) {
    const size = await read_image_size(file.buffer);
    input = file.buffer;
    width = size.width;
    height = size.height;
  } else if (image_url) {
    const response = await fetch(image_url);
    if (!response.ok) throw fail("The certificate picture could not be loaded", 502);
    input = Buffer.from(await response.arrayBuffer());
    if (!(width > 0 && height > 0)) {
      const size = await read_image_size(input);
      width = size.width;
      height = size.height;
    }
  } else {
    throw fail("Upload a certificate picture first.");
  }

  if (!Array.isArray(fields) || !fields.length) throw fail("Add a variable before preview.");
  const placed = clean_fields(fields, width, height);
  const buffer = await draw_certificate_buffer(input, placed, sample_aliases(placed));
  return { buffer, content_type: "image/png" };
}
