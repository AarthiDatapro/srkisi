// Import courses from an Excel workbook into tbl_courses.
//
//   node scripts/importCourses.js
//   node scripts/importCourses.js --import
//   node scripts/importCourses.js "C:\path\courses.xlsx" --import
//
// Columns: course_code, course_name, description, type, duration in hours, level,
// fee, thumbnail url, discount, created by, learning points, key points,
// course domain, tag, module, lesson, lesson material urls.
// Type, level, domain, and tag are matched by name. A name that is not in the
// master table is added, and the new id is stored on the course.
// Module, lesson, and material URLs are optional. A blank module or lesson does
// not stop the course. Repeat the course code on the next row to add another
// lesson. Material URLs are split by a new line, |, or ;.
// is_active is 1. is_offline is 0. has_completion_certificate is 1.
// A fee of 0, or a blank fee, stores is_paid 0. A fee above 0 stores is_paid 1.
// Learning points and key points can be separated by a new line, |, or ;.
// The first complete row for a course code is the course. Later rows with that
// code add modules and lessons. A course code already in the LMS is skipped.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(SCRIPT_DIR, "..", "server");
const server_require = createRequire(path.join(SERVER_DIR, "package.json"));

const dotenv = server_require("dotenv");
const mysql = server_require("mysql2/promise");
const AdmZip = server_require("adm-zip");

dotenv.config({ path: path.join(SERVER_DIR, ".env") });

const DO_IMPORT = process.argv.includes("--import");
const EXCEL_PATH = process.argv.map((arg) => String(arg)).find((arg) => arg.toLowerCase().endsWith(".xlsx"))
  || path.join(SCRIPT_DIR, "courses.xlsx");

const ALIASES = {
  course_code: ["course_code", "course code", "code"],
  course_name: ["course_name", "cour_name", "course name", "name"],
  description: ["description", "course description", "course_description"],
  type: ["type", "course type", "course_type"],
  duration_hours: ["duration in hours", "duration_hours", "duration", "hours"],
  level: ["level", "course level", "course_level"],
  fee: ["fee", "fee_amount", "amount"],
  thumbnail_url: ["thumbnail url", "thumbnail in url", "thumbnail", "thumbnail_url"],
  discount: ["discount", "discout", "discount_percent", "discount percent"],
  created_by: ["created by", "craeted by", "created_by", "created_by_display"],
  learn_points: ["learning points", "learn points", "learn_points", "what you will learn"],
  audience_points: ["key points", "audience points", "audience_points", "who this course is for"],
  domain: ["course domain", "domain", "course_domain"],
  tag: ["tag", "course tag", "course_tag"],
  module_title: ["module", "modules", "module title", "module_title"],
  lesson_title: ["lesson", "lessons", "lesson title", "lesson_title"],
  material_urls: [
    "lesson material urls",
    "lesson material url",
    "lesson materail urls",
    "esson materail urls",
    "material urls",
    "material url",
    "lesson url"
  ]
};

const MASTERS = {
  type: { table: "mst_course_types", id: "course_type_id", name: "course_type_name", label: "TYPE" },
  level: { table: "mst_course_levels", id: "course_level_id", name: "course_level_name", label: "LEVEL" },
  domain: { table: "mst_course_domains", id: "course_domain_id", name: "course_domain_name", label: "DOMAIN" },
  tag: { table: "mst_course_tags", id: "course_tag_id", name: "course_tag_name", label: "TAG" }
};

function normalize_header(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s._-]+/g, "");
}

function is_empty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function decode_xml(text) {
  return String(text)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

function column_index(letters) {
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function first_sheet_path(zip) {
  const workbook = zip.readAsText("xl/workbook.xml");
  const rels = zip.readAsText("xl/_rels/workbook.xml.rels");
  const rel_id = workbook.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const target = rel_id && rels.match(new RegExp(`<Relationship\\b[^>]*Id="${rel_id}"[^>]*Target="([^"]+)"`))?.[1];
  if (!target) return "xl/worksheets/sheet1.xml";
  return target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
}

function load_excel() {
  if (!existsSync(EXCEL_PATH)) throw new Error(`Excel file not found: ${EXCEL_PATH}`);
  const zip = new AdmZip(EXCEL_PATH);
  const shared_xml = zip.getEntry("xl/sharedStrings.xml") ? zip.readAsText("xl/sharedStrings.xml") : "";
  const shared = (shared_xml.match(/<si>[\s\S]*?<\/si>/g) || []).map((item) =>
    decode_xml((item.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((part) => part.replace(/<[^>]+>/g, "")).join(""))
  );
  const sheet = zip.readAsText(first_sheet_path(zip));
  const grid = (sheet.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) || []).map((row) => {
    const values = [];
    for (const cell of row.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const ref = cell.match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!ref) continue;
      const type = cell.match(/\bt="([^"]+)"/)?.[1] || "";
      const raw = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const inline = cell.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
      let value = null;
      if (type === "s" && raw !== undefined) value = shared[Number(raw)] ?? null;
      else if (type === "inlineStr" && inline !== undefined) value = decode_xml(inline);
      else if (raw !== undefined) value = decode_xml(raw);
      values[column_index(ref)] = value;
    }
    return values;
  });
  if (grid.length < 2) throw new Error("Excel file contains no course rows.");
  const headers = grid[0].map((header) => String(header ?? "").trim());
  const rows = grid.slice(1)
    .map((values, index) => ({
      row_number: index + 2,
      cells: Object.fromEntries(headers.map((header, column) => [header, values[column] ?? null]))
    }))
    .filter((row) => Object.values(row.cells).some((value) => !is_empty(value)));
  return { headers: headers.filter(Boolean), rows };
}

function build_mapping(headers) {
  const lookup = new Map(headers.map((header) => [normalize_header(header), header]));
  const mapping = {};
  for (const [column, aliases] of Object.entries(ALIASES)) {
    const found = aliases.map(normalize_header).map((alias) => lookup.get(alias)).find(Boolean);
    if (found) mapping[column] = found;
  }
  const required = ["course_code", "course_name", "type", "level", "domain", "tag"];
  for (const column of required) {
    if (!mapping[column]) throw new Error(`No ${column.replaceAll("_", " ")} column found in the Excel.`);
  }
  return mapping;
}

function text_cell(value) {
  if (is_empty(value)) return "";
  return String(value).trim();
}

function number_cell(value, max, allow_zero) {
  if (is_empty(value)) return { ok: true, amount: null };
  const text = String(value).trim().replace(/,/g, "").replace(/%$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false, amount: null };
  const amount = Number(text);
  if (amount > max) return { ok: false, amount: null };
  if (!allow_zero && amount === 0) return { ok: false, amount: null };
  return { ok: true, amount };
}

function split_list(value) {
  if (is_empty(value)) return [];
  return String(value).split(/\r?\n|\||;/).map((item) => String(item).trim()).filter(Boolean);
}

function web_url(value) {
  return /^https?:\/\/\S+$/i.test(value) && value.length <= 2000;
}

function has_outline(row) {
  return Boolean(row.module_title || row.lesson_title || row.urls.length);
}

function point_list(value) {
  if (is_empty(value)) return { ok: true, list: [] };
  const raw = String(value).trim();
  let parts = null;
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parts = parsed.map((item) => String(item));
    } catch {
      parts = null;
    }
  }
  if (!parts) parts = raw.split(/\r?\n|\||;/);
  const list = parts.map((item) => String(item).trim().replace(/^[-•*]\s*/, "")).filter(Boolean);
  if (list.length > 20) return { ok: false, list: [], reason: "more than 20 points" };
  if (list.some((item) => item.length > 300)) return { ok: false, list: [], reason: "a point is longer than 300 characters" };
  return { ok: true, list };
}

function line(row, extra) {
  const base = `  row ${row.row_number} | code: ${row.course_code || "(blank)"} | name: ${row.course_name || "(blank)"}`;
  return extra ? `${base} | ${extra}` : base;
}

function print_list(title, rows, extra) {
  console.log(`\n========== ${title} (${rows.length}) ==========`);
  if (!rows.length) {
    console.log("  none");
    return;
  }
  for (const row of rows) console.log(line(row, extra ? extra(row) : ""));
}

async function load_master(pool, spec) {
  const [rows] = await pool.query(
    `SELECT ${spec.id} AS id, ${spec.name} AS name
     FROM ${spec.table}
     WHERE is_deleted = FALSE`
  );
  const by_name = new Map();
  const ambiguous = new Set();
  for (const row of rows) {
    const key = String(row.name).trim().toLowerCase();
    if (!key) continue;
    if (by_name.has(key)) ambiguous.add(key);
    else by_name.set(key, { id: Number(row.id), name: String(row.name).trim() });
  }
  return { by_name, ambiguous };
}

async function save_outline(pool, course_id, outline) {
  const modules = new Map();
  const lessons = new Map();
  let module_sequence = 0;
  const lesson_sequence = new Map();
  const url_sequence = new Map();

  for (const piece of outline) {
    try {
      let module_id = null;
      if (piece.module_title) {
        const module_key = piece.module_title.toLowerCase();
        if (!modules.has(module_key)) {
          module_sequence += 1;
          const [created] = await pool.execute(
            `INSERT INTO tbl_course_modules
               (course_id, module_title, sequence_no, is_active, is_deleted, created_at)
             VALUES (?, ?, ?, TRUE, FALSE, NOW())`,
            [course_id, piece.module_title, module_sequence]
          );
          modules.set(module_key, Number(created.insertId));
        }
        module_id = modules.get(module_key);
      }
      if (!piece.lesson_title) continue;
      const lesson_key = `${module_id || 0}|${piece.lesson_title.toLowerCase()}`;
      let lesson_id = lessons.get(lesson_key);
      if (!lesson_id) {
        const bucket = String(module_id || 0);
        const sequence = (lesson_sequence.get(bucket) || 0) + 1;
        lesson_sequence.set(bucket, sequence);
        const [created] = await pool.execute(
          `INSERT INTO tbl_course_lessons
             (course_id, module_id, lesson_title, sequence_no, is_active, is_deleted, created_at)
           VALUES (?, ?, ?, ?, TRUE, FALSE, NOW())`,
          [course_id, module_id, piece.lesson_title, sequence]
        );
        lesson_id = Number(created.insertId);
        lessons.set(lesson_key, lesson_id);
        await pool.execute(
          `INSERT INTO tbl_course_content
             (course_id, module_id, content_type, lesson_id, sequence_no, is_active, is_deleted, created_at)
           VALUES (?, ?, 'lesson', ?, ?, TRUE, FALSE, NOW())`,
          [course_id, module_id, lesson_id, sequence]
        );
      }
      for (const url of piece.urls) {
        const next = (url_sequence.get(lesson_id) || 0) + 1;
        url_sequence.set(lesson_id, next);
        await pool.execute(
          `INSERT INTO tbl_lesson_contents
             (lesson_id, content_type, content_title, content_url, sequence_no, is_active, is_deleted, created_at)
           VALUES (?, 'Material', ?, ?, ?, TRUE, FALSE, NOW())`,
          [lesson_id, piece.lesson_title.slice(0, 200), url, next]
        );
      }
    } catch (error) {
      console.error(`  row ${piece.row_number} | code: ${piece.course_code} | name: ${piece.course_name} outline failed: ${error.message}`);
    }
  }
}

async function main() {
  const { headers, rows } = load_excel();
  const mapping = build_mapping(headers);
  const pick = (row, column) => (mapping[column] ? row.cells[mapping[column]] : null);
  const items = rows.map((row) => {
    const fee = number_cell(pick(row, "fee"), 9999999.99, true);
    const discount = number_cell(pick(row, "discount"), 100, true);
    const duration = number_cell(pick(row, "duration_hours"), 9999.99, false);
    const learn = point_list(pick(row, "learn_points"));
    const audience = point_list(pick(row, "audience_points"));
    const thumbnail = text_cell(pick(row, "thumbnail_url"));
    const created_by = text_cell(pick(row, "created_by"));
    return {
      row_number: row.row_number,
      course_code: text_cell(pick(row, "course_code")),
      course_name: text_cell(pick(row, "course_name")),
      description: text_cell(pick(row, "description")),
      type: text_cell(pick(row, "type")),
      level: text_cell(pick(row, "level")),
      domain: text_cell(pick(row, "domain")),
      tag: text_cell(pick(row, "tag")),
      duration,
      fee,
      discount,
      thumbnail,
      created_by,
      learn,
      audience,
      module_title: text_cell(pick(row, "module_title")),
      lesson_title: text_cell(pick(row, "lesson_title")),
      urls: split_list(pick(row, "material_urls"))
    };
  });

  function problem(row) {
    if (!row.course_code) return "code";
    if (!row.course_name) return "name";
    if (row.course_code.length > 50) return "long_code";
    if (row.course_name.length > 150) return "long_name";
    if (!row.type) return "type";
    if (!row.level) return "level";
    if (!row.domain) return "domain";
    if (!row.tag) return "tag";
    if ([row.type, row.level, row.domain, row.tag].some((name) => name.length > 100)) return "long_master";
    if (!row.duration.ok) return "duration";
    if (!row.fee.ok) return "fee";
    if (!row.discount.ok) return "discount";
    if (row.thumbnail.length > 500) return "thumbnail";
    if (row.created_by.length > 150) return "created_by";
    if (!row.learn.ok) return "learn";
    if (!row.audience.ok) return "audience";
    return "";
  }

  const grouped = {
    code: [],
    name: [],
    long_code: [],
    long_name: [],
    type: [],
    level: [],
    domain: [],
    tag: [],
    long_master: [],
    duration: [],
    fee: [],
    discount: [],
    thumbnail: [],
    created_by: [],
    learn: [],
    audience: [],
    long_outline: [],
    bad_url: [],
    url_without_lesson: []
  };
  const by_code = new Map();
  for (const row of items) {
    if (!row.course_code) {
      grouped.code.push(row);
      continue;
    }
    if (row.course_code.length > 50) {
      grouped.long_code.push(row);
      continue;
    }
    const key = row.course_code.toLowerCase();
    const list = by_code.get(key) || [];
    list.push(row);
    by_code.set(key, list);
  }

  const candidates = [];
  let repeated = 0;
  for (const rows of by_code.values()) {
    const valid = rows.filter((row) => !problem(row));
    const course_row = valid[0];
    if (!course_row) {
      const lead = rows.find((row) => !has_outline(row)) || rows[0];
      const reason = problem(lead);
      if (reason) grouped[reason].push({ ...lead, course_name: lead.course_name || rows.find((row) => row.course_name)?.course_name || "" });
      continue;
    }
    if (valid.length > 1) repeated += valid.length - 1;
    const outline = [];
    for (const row of rows) {
      if (!has_outline(row)) continue;
      const named = { ...row, course_name: row.course_name || course_row.course_name };
      if (named.module_title.length > 200 || named.lesson_title.length > 200) {
        grouped.long_outline.push(named);
        continue;
      }
      const good_urls = [];
      for (const url of named.urls) {
        if (web_url(url)) good_urls.push(url);
        else grouped.bad_url.push({ ...named, material_url: url });
      }
      if (good_urls.length && !named.lesson_title) grouped.url_without_lesson.push(named);
      if (!named.module_title && !named.lesson_title) continue;
      outline.push({
        row_number: named.row_number,
        course_code: named.course_code,
        course_name: named.course_name,
        module_title: named.module_title,
        lesson_title: named.lesson_title,
        urls: named.lesson_title ? good_urls : []
      });
    }
    candidates.push({ ...course_row, outline });
  }

  console.log(`Workbook: ${EXCEL_PATH}`);
  console.log(`Rows: ${items.length}`);

  const config = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "datapro_lms"
  };
  const pool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: 4 });

  try {
    const masters = {};
    for (const [key, spec] of Object.entries(MASTERS)) {
      masters[key] = await load_master(pool, spec);
    }

    const codes = [...new Set(candidates.map((row) => row.course_code.toLowerCase()))];
    const existing_codes = new Set();
    if (codes.length) {
      const [courses] = await pool.query(
        `SELECT course_code
         FROM tbl_courses
         WHERE LOWER(TRIM(course_code)) IN (${codes.map(() => "?").join(", ")})`,
        codes
      );
      for (const course of courses) existing_codes.add(String(course.course_code).trim().toLowerCase());
    }

    const already = [];
    const ambiguous = [];
    const will_add = { type: [], level: [], domain: [], tag: [] };
    const ready = [];
    const seen = new Set();

    for (const row of candidates) {
      const code_key = row.course_code.toLowerCase();
      if (existing_codes.has(code_key)) {
        already.push(row);
        continue;
      }
      if (seen.has(code_key)) continue;
      const links = {};
      let blocked_row = false;
      for (const key of ["type", "level", "domain", "tag"]) {
        const spec = MASTERS[key];
        const name_key = row[key].toLowerCase();
        if (masters[key].ambiguous.has(name_key)) {
          ambiguous.push({ ...row, master_label: spec.label, master_name: row[key] });
          blocked_row = true;
          break;
        }
        const found = masters[key].by_name.get(name_key);
        if (found) {
          links[key] = found;
          continue;
        }
        links[key] = { id: null, name: row[key], create: true };
      }
      if (blocked_row) continue;
      seen.add(code_key);
      ready.push({ ...row, links });
    }
    for (const row of ready) {
      for (const key of ["type", "level", "domain", "tag"]) {
        if (row.links[key].create) will_add[key].push({ ...row, master_name: row.links[key].name });
      }
    }

    print_list("COURSE CODE IS EMPTY", grouped.code);
    print_list("COURSE NAME IS EMPTY", grouped.name);
    print_list("COURSE CODE IS TOO LONG", grouped.long_code);
    print_list("COURSE NAME IS TOO LONG", grouped.long_name);
    print_list("TYPE IS EMPTY", grouped.type);
    print_list("LEVEL IS EMPTY", grouped.level);
    print_list("DOMAIN IS EMPTY", grouped.domain);
    print_list("TAG IS EMPTY", grouped.tag);
    print_list("TYPE, LEVEL, DOMAIN, OR TAG IS TOO LONG", grouped.long_master);
    print_list("DURATION IS NOT A NUMBER OF HOURS", grouped.duration);
    print_list("FEE IS NOT A NUMBER", grouped.fee);
    print_list("DISCOUNT MUST BE FROM 0 TO 100", grouped.discount);
    print_list("THUMBNAIL URL IS TOO LONG", grouped.thumbnail);
    print_list("CREATED BY IS TOO LONG", grouped.created_by);
    print_list("LEARNING POINTS", grouped.learn, (row) => row.learn.reason);
    print_list("KEY POINTS", grouped.audience, (row) => row.audience.reason);
    print_list("MODULE OR LESSON TITLE IS TOO LONG", grouped.long_outline);
    print_list("MATERIAL URL IS NOT A WEB ADDRESS", grouped.bad_url, (row) => `url: ${row.material_url}`);
    print_list("MATERIAL URL WITHOUT A LESSON", grouped.url_without_lesson);
    print_list("COURSE CODE ALREADY IN LMS", already);
    print_list("MORE THAN ONE MASTER ROW WITH THIS NAME", ambiguous, (row) => `${row.master_label}: ${row.master_name}`);
    print_list("TYPE WILL BE ADDED", will_add.type, (row) => `type: ${row.master_name}`);
    print_list("LEVEL WILL BE ADDED", will_add.level, (row) => `level: ${row.master_name}`);
    print_list("DOMAIN WILL BE ADDED", will_add.domain, (row) => `domain: ${row.master_name}`);
    print_list("TAG WILL BE ADDED", will_add.tag, (row) => `tag: ${row.master_name}`);

    const modules_to_add = [];
    const lessons_to_add = [];
    const materials_to_add = [];
    for (const row of ready) {
      const module_seen = new Set();
      const lesson_seen = new Set();
      for (const piece of row.outline) {
        const module_key = piece.module_title.toLowerCase();
        if (piece.module_title && !module_seen.has(module_key)) {
          module_seen.add(module_key);
          modules_to_add.push(piece);
        }
        if (!piece.lesson_title) continue;
        const lesson_key = `${module_key}|${piece.lesson_title.toLowerCase()}`;
        if (!lesson_seen.has(lesson_key)) {
          lesson_seen.add(lesson_key);
          lessons_to_add.push(piece);
        }
        for (const url of piece.urls) materials_to_add.push({ ...piece, material_url: url });
      }
    }
    print_list("MODULES TO ADD", modules_to_add, (row) => `module: ${row.module_title}`);
    print_list("LESSONS TO ADD", lessons_to_add, (row) => `lesson: ${row.lesson_title}${row.module_title ? ` | module: ${row.module_title}` : ""}`);
    print_list("LESSON MATERIAL URLS", materials_to_add, (row) => `url: ${row.material_url}`);

    const paid = ready.filter((row) => row.fee.amount !== null && row.fee.amount > 0).length;
    console.log("\n========== RESULT ==========");
    console.log(`Repeated course code, first row kept : ${repeated}`);
    console.log(`To insert                           : ${ready.length}`);
    console.log(`  paid                              : ${paid}`);
    console.log(`  free                              : ${ready.length - paid}`);
    console.log(`  modules                           : ${modules_to_add.length}`);
    console.log(`  lessons                           : ${lessons_to_add.length}`);
    console.log(`  material urls                     : ${materials_to_add.length}`);

    if (!DO_IMPORT) {
      console.log("\nReport only. Run with --import to insert.");
      return;
    }

    async function master_id(key, link) {
      if (!link.create) return link.id;
      const spec = MASTERS[key];
      const name_key = link.name.toLowerCase();
      const cached = masters[key].by_name.get(name_key);
      if (cached) return cached.id;
      const [result] = await pool.execute(
        `INSERT INTO ${spec.table} (${spec.name}, is_active, is_deleted, created_at)
         VALUES (?, TRUE, FALSE, NOW())`,
        [link.name]
      );
      const id = Number(result.insertId);
      masters[key].by_name.set(name_key, { id, name: link.name });
      return id;
    }

    let saved = 0;
    let failed = 0;
    for (const row of ready) {
      try {
        const type_id = await master_id("type", row.links.type);
        const level_id = await master_id("level", row.links.level);
        const domain_id = await master_id("domain", row.links.domain);
        const tag_id = await master_id("tag", row.links.tag);
        const fee_amount = row.fee.amount;
        const is_paid = fee_amount !== null && fee_amount > 0 ? 1 : 0;
        const level_text = row.level.length <= 50 ? row.level : null;
        const [inserted] = await pool.execute(
          `INSERT INTO tbl_courses (
             course_code, course_name, course_description,
             course_type_id, duration_hours, level, fee_amount, discount_percent,
             created_by_display, has_completion_certificate, learn_points, audience_points,
             is_paid, course_domain_id, course_level_id, course_tag_id, thumbnail_url,
             is_offline, is_active, is_deleted, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, NOW())`,
          [
            row.course_code,
            row.course_name,
            row.description || null,
            type_id,
            row.duration.amount,
            level_text,
            fee_amount,
            row.discount.amount,
            row.created_by || null,
            row.learn.list.length ? JSON.stringify(row.learn.list) : null,
            row.audience.list.length ? JSON.stringify(row.audience.list) : null,
            is_paid,
            domain_id,
            level_id,
            tag_id,
            row.thumbnail || null
          ]
        );
        await save_outline(pool, Number(inserted.insertId), row.outline).catch((error) => {
          console.error(`${line(row)} course saved, outline failed: ${error.message}`);
        });
        saved += 1;
      } catch (error) {
        failed += 1;
        console.error(`${line(row)} failed: ${error.message}`);
      }
    }
    console.log(`\nInserted: ${saved}   Failed: ${failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Import stopped:", error.message);
  process.exitCode = 1;
});
