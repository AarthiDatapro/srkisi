import { safeIdentifier, sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { validateOptionalText, validateRequiredText } from "@datapromr/validation";
import { get_pool } from "../utils/db_setup.js";
import { get_dropdown_def, list_dropdown_catalog } from "./catalog.js";
import { ensure_program_dropdown_schema } from "./schema.js";
import { ensure_employee_schema } from "../employee_manager/schema.js";
import { ensure_course_schema } from "../course_manager/schema.js";
import { ensure_content_schema } from "../course_content_manager/schema.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function color_error(value) {
  const text = String(value || "").trim();
  if (!text) return "Select a color";
  if (!/^#[0-9a-fA-F]{6}$/.test(text)) return "Use a color like #1a2f7a";
  return "";
}

function format_error(body = {}) {
  const letters = String(body.code_letters || "").trim().toUpperCase();
  const series = String(body.number_next ?? "").trim();
  if (!/^[A-Z]{1,5}$/.test(letters)) return "Letter code must be 1 to 5 letters";
  if (!/^\d{1,5}$/.test(series)) return "Number series must be 1 to 5 digits";
  return "";
}

function format_values(body = {}) {
  return {
    letters: String(body.code_letters || "").trim().toUpperCase(),
    number_next: Number(String(body.number_next ?? "").trim())
  };
}

async function claim_letters(pool, table, id_column, letters, id = 0) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${id_column} AS id FROM ${table}
     WHERE code_letters = ? AND is_deleted = FALSE AND ${id_column} <> ?
     LIMIT 1`,
    [letters, id]
  );
  if (rows?.length) throw fail("This letter code is already used by another domain");
}

function map_row(def, row) {
  return {
    id: Number(row[def.idColumn]),
    name: row[def.nameColumn],
    description: row[def.descriptionColumn] || "",
    ...(def.colorColumn ? { color: row[def.colorColumn] || "" } : {}),
    ...(def.codeFormat ? {
      code_letters: row.code_letters || "",
      number_next: row.number_next == null ? "" : Number(row.number_next)
    } : {}),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function require_def(key) {
  await ensure_program_dropdown_schema();
  await ensure_employee_schema();
  await ensure_course_schema();
  const def = get_dropdown_def(key);
  if (!def) throw fail("Unknown dropdown", 404);
  if (def.key === "programming_languages") await ensure_content_schema();
  return def;
}

export function catalog_dropdowns() {
  return { items: list_dropdown_catalog() };
}

export async function list_dropdown_options(key, query = {}) {
  const def = await require_def(key);
  const search = String(query.search || "").trim();
  const status = String(query.status || "").trim();
  const table = safeIdentifier(def.table);
  const id_column = safeIdentifier(def.idColumn);
  const name_column = safeIdentifier(def.nameColumn);
  const description_column = safeIdentifier(def.descriptionColumn);
  const color_column = def.colorColumn ? safeIdentifier(def.colorColumn) : "";
  const format_columns = def.codeFormat ? ", code_letters, number_next" : "";
  const pool = get_pool();

  const where = ["is_deleted = FALSE"];
  const params = [];
  if (search) {
    where.push(
      def.codeFormat ?
        `(${name_column} LIKE ? OR ${description_column} LIKE ? OR code_letters LIKE ?)` :
        `(${name_column} LIKE ? OR ${description_column} LIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`);
    if (def.codeFormat) params.push(`%${search}%`);
  }
  if (status === "active") where.push("is_active = TRUE");
  if (status === "inactive") where.push("is_active = FALSE");

  const [rows] = await sqlQuery(
    pool,
    `SELECT ${id_column}, ${name_column}, ${description_column}${color_column ? `, ${color_column}` : ""}${format_columns}, is_active, created_at, updated_at
     FROM ${table}
     WHERE ${where.join(" AND ")}
     ORDER BY ${name_column} ASC`,
    params
  );

  const items = (rows || []).map((row) => map_row(def, row));

  if (def.usage && items.length) {
    const usage_table = safeIdentifier(def.usage.table);
    const usage_column = safeIdentifier(def.usage.column);
    const [usage] = await sqlQuery(
      pool,
      `SELECT ${usage_column} AS id, COUNT(*) AS total
       FROM ${usage_table}
       WHERE is_deleted = FALSE
       GROUP BY ${usage_column}`
    );
    const used = new Map(
      (usage || []).map((row) => [Number(row.id), Number(row.total || 0)])
    );
    items.forEach((item) => {
      item.used_count = used.get(Number(item.id)) || 0;
    });
  }

  return { key: def.key, label: def.label, items };
}

export async function create_dropdown_option(key, body = {}) {
  const def = await require_def(key);
  const name_error = validateRequiredText(body.name, "Name", 100);
  const description_error = validateOptionalText(body.description, "Description", 500);
  const picked_color = def.colorColumn ? color_error(body.color) : "";
  const picked_format = def.codeFormat ? format_error(body) : "";
  const first_error = name_error || description_error || picked_color || picked_format;
  if (first_error) throw fail(first_error);

  const table = safeIdentifier(def.table);
  const name_column = safeIdentifier(def.nameColumn);
  const description_column = safeIdentifier(def.descriptionColumn);
  const color_column = def.colorColumn ? safeIdentifier(def.colorColumn) : "";
  const pool = get_pool();
  const name = String(body.name).trim();
  const description = String(body.description || "").trim() || null;
  const color = def.colorColumn ? String(body.color).trim().toLowerCase() : "";
  const format = def.codeFormat ? format_values(body) : null;
  if (format) await claim_letters(pool, table, safeIdentifier(def.idColumn), format.letters);

  try {
    const [result] = await sqlQuery(
      pool,
      format ?
        `INSERT INTO ${table} (${name_column}, ${description_column}, code_letters, number_next) VALUES (?, ?, ?, ?)` :
        color_column ?
        `INSERT INTO ${table} (${name_column}, ${description_column}, ${color_column}) VALUES (?, ?, ?)` :
        `INSERT INTO ${table} (${name_column}, ${description_column}) VALUES (?, ?)`,
      format ? [name, description, format.letters, format.number_next] :
      color_column ? [name, description, color] : [name, description]
    );
    log.pass("createDropdownOption", `${key} ${result.insertId}`);
    const listed = await list_dropdown_options(key);
    return listed.items.find((item) => item.id === result.insertId) || listed.items[0];
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") throw fail("This option already exists");
    throw err;
  }
}

export async function update_dropdown_option(key, id, body = {}) {
  const def = await require_def(key);
  const name_error = validateRequiredText(body.name, "Name", 100);
  const description_error = validateOptionalText(body.description, "Description", 500);
  const picked_color = def.colorColumn ? color_error(body.color) : "";
  const picked_format = def.codeFormat ? format_error(body) : "";
  const first_error = name_error || description_error || picked_color || picked_format;
  if (first_error) throw fail(first_error);

  const table = safeIdentifier(def.table);
  const id_column = safeIdentifier(def.idColumn);
  const name_column = safeIdentifier(def.nameColumn);
  const description_column = safeIdentifier(def.descriptionColumn);
  const color_column = def.colorColumn ? safeIdentifier(def.colorColumn) : "";
  const pool = get_pool();
  const name = String(body.name).trim();
  const description = String(body.description || "").trim() || null;
  const color = def.colorColumn ? String(body.color).trim().toLowerCase() : "";
  const format = def.codeFormat ? format_values(body) : null;
  if (format) await claim_letters(pool, table, id_column, format.letters, id);

  const [result] = await sqlQuery(
    pool,
    format ?
      `UPDATE ${table}
       SET ${name_column} = ?, ${description_column} = ?, code_letters = ?, number_next = ?
       WHERE ${id_column} = ? AND is_deleted = FALSE` :
      color_column ?
      `UPDATE ${table}
       SET ${name_column} = ?, ${description_column} = ?, ${color_column} = ?
       WHERE ${id_column} = ? AND is_deleted = FALSE` :
      `UPDATE ${table}
       SET ${name_column} = ?, ${description_column} = ?
       WHERE ${id_column} = ? AND is_deleted = FALSE`,
    format ? [name, description, format.letters, format.number_next, id] :
    color_column ? [name, description, color, id] : [name, description, id]
  );
  if (!result?.affectedRows) throw fail("Option not found", 404);
  log.pass("updateDropdownOption", `${key} ${id}`);
  const listed = await list_dropdown_options(key);
  return listed.items.find((item) => Number(item.id) === Number(id));
}

export async function set_dropdown_option_active(key, id, is_active) {
  const def = await require_def(key);
  const table = safeIdentifier(def.table);
  const id_column = safeIdentifier(def.idColumn);
  const pool = get_pool();
  const [result] = await sqlQuery(
    pool,
    `UPDATE ${table} SET is_active = ? WHERE ${id_column} = ? AND is_deleted = FALSE`,
    [is_active, id]
  );
  if (!result?.affectedRows) throw fail("Option not found", 404);
  const listed = await list_dropdown_options(key);
  return listed.items.find((item) => Number(item.id) === Number(id));
}

export async function delete_dropdown_option(key, id) {
  const def = await require_def(key);
  const table = safeIdentifier(def.table);
  const id_column = safeIdentifier(def.idColumn);
  const pool = get_pool();

  if (def.usage) {
    const usage_table = safeIdentifier(def.usage.table);
    const usage_column = safeIdentifier(def.usage.column);
    const [used] = await sqlQuery(
      pool,
      `SELECT COUNT(*) AS total FROM ${usage_table}
       WHERE ${usage_column} = ? AND is_deleted = FALSE`,
      [id]
    );
    if (Number(used?.[0]?.total || 0) > 0) {
      throw fail(def.usage.blockMessage || "This option is in use. Deactivate it instead.");
    }
  }

  const [result] = await sqlQuery(
    pool,
    `UPDATE ${table} SET is_deleted = TRUE, is_active = FALSE WHERE ${id_column} = ?`,
    [id]
  );
  if (!result?.affectedRows) throw fail("Option not found", 404);
  log.pass("deleteDropdownOption", `${key} ${id}`);
  return { ok: true };
}
