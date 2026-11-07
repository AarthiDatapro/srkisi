// Import batch registrations from an Excel workbook.
//
//   node scripts/importRegistrations.js --cohort "City College"
//   node scripts/importRegistrations.js --cohort "City College" --import
//
// The institution name is the cohort when a batch is used. Each batch_name becomes a program.
// Batch name and program type must both be filled, or both left blank.
// Both filled adds or reuses the program. Both blank registers the student on the
// course with no program, the same way an open course registration is saved.
// A row with only one of the two is skipped.
// A new program_type is added to mst_program_types.
// A registration is written only when the course name is already in tbl_courses
// and the student email is already in tbl_students.
// course_id, program_id, and student_id on tbl_course_registrations come from those tables.
//
// Columns: batch_name, course_name, student_email, program_type, program duration,
// program_description, registration_code, start_date.
// course_name and student_email are required on every row.
// start_date is optional. When it is filled, it is stored as the registration created_at.
// When it is blank, created_at stays the current time.

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
  || path.join(SCRIPT_DIR, "registrations.xlsx");

function cohort_arg() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--cohort");
  if (index < 0) return "";
  const value = args[index + 1];
  if (!value || value.startsWith("--")) return "";
  return value.trim();
}

const COHORT_NAME = cohort_arg();

const ALIASES = {
  batch_name: ["batch_name", "batch name", "batch", "batch_nme"],
  course_name: ["course_name", "course name", "course_nme", "course"],
  email: ["student_email", "student email", "email", "email address"],
  program_type: ["program_type", "program type", "type"],
  duration: ["program duration", "program_duration", "program dureatioon", "duration", "duration months"],
  description: ["program_description", "program description", "description"],
  registration_code: ["registration_code", "registration code", "regusrtaion_code", "course student id"],
  start_date: ["start_date", "start date", "started on", "started", "enrollment date", "enrolment date"]
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
  if (grid.length < 2) throw new Error("Excel file contains no registration rows.");
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
  for (const column of ["course_name", "email"]) {
    if (!mapping[column]) throw new Error(`No ${column.replaceAll("_", " ")} column found in the Excel.`);
  }
  return mapping;
}

function text_cell(value) {
  if (is_empty(value)) return "";
  return String(value).trim();
}

function calendar_date(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || y < 1990 || y > 2100) return "";
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function excel_serial_date(value) {
  const serial = Number(String(value).trim());
  if (!Number.isFinite(serial)) return "";
  const days = Math.floor(serial);
  if (days < 32874 || days > 73415) return "";
  const utc = new Date(Date.UTC(1899, 11, 30) + days * 86400000);
  return calendar_date(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

function start_date_of(value) {
  if (is_empty(value)) return { ok: false, date: "", reason: "empty" };
  const text = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(text)) {
    const date = excel_serial_date(text);
    return date ? { ok: true, date } : { ok: false, date: "", reason: "invalid" };
  }
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const date = calendar_date(match[1], match[2], match[3]);
    return date ? { ok: true, date } : { ok: false, date: "", reason: "invalid" };
  }
  match = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (match) {
    const date = calendar_date(match[3], match[2], match[1]);
    return date ? { ok: true, date } : { ok: false, date: "", reason: "invalid" };
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const date = calendar_date(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
    return date ? { ok: true, date } : { ok: false, date: "", reason: "invalid" };
  }
  return { ok: false, date: "", reason: "invalid" };
}

function duration_months(value) {
  if (is_empty(value)) return { ok: true, months: null };
  const text = String(value).trim().toLowerCase().replace(/\.0+$/, "");
  const months = text.match(/^(\d+)\s*(months?|m)?$/);
  if (months) {
    const count = Number(months[1]);
    if (count > 0 && count <= 240) return { ok: true, months: count };
  }
  const years = text.match(/^(\d+)\s*years?$/);
  if (years) {
    const count = Number(years[1]) * 12;
    if (count > 0 && count <= 240) return { ok: true, months: count };
  }
  return { ok: false, months: null };
}

function line(row, extra) {
  const base = `  row ${row.row_number} | batch: ${row.batch_name || "(blank)"} | course: ${row.course_name || "(blank)"} | email: ${row.email || "(blank)"} | start: ${row.start_date?.date || "(default)"}`;
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

function program_code_for(name, taken) {
  const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "BATCH";
  let code = base;
  let number = 2;
  while (taken.has(code.toLowerCase())) {
    code = `${base.slice(0, 44)}-${number}`;
    number += 1;
  }
  taken.add(code.toLowerCase());
  return code;
}

async function main() {
  if (!COHORT_NAME) throw new Error("Enter the institution name before the workbook.");
  if (COHORT_NAME.length > 150) throw new Error("Institution name must be 150 characters or less.");

  const { headers, rows } = load_excel();
  const mapping = build_mapping(headers);
  const pick = (row, column) => (mapping[column] ? row.cells[mapping[column]] : null);
  const items = rows.map((row) => ({
    row_number: row.row_number,
    batch_name: text_cell(pick(row, "batch_name")),
    course_name: text_cell(pick(row, "course_name")),
    email: text_cell(pick(row, "email")).toLowerCase(),
    program_type: text_cell(pick(row, "program_type")),
    duration: duration_months(pick(row, "duration")),
    description: text_cell(pick(row, "description")),
    registration_code: text_cell(pick(row, "registration_code")),
    start_date: start_date_of(pick(row, "start_date"))
  }));

  const pair_mismatch = items.filter((row) => Boolean(row.batch_name) !== Boolean(row.program_type));
  const blank_course = items.filter((row) => !pair_mismatch.includes(row) && !row.course_name);
  const blank_email = items.filter((row) => !pair_mismatch.includes(row) && row.course_name && !row.email);
  const bad_start = items.filter((row) => row.start_date.reason === "invalid");
  const long_batch = items.filter((row) => row.batch_name.length > 150);
  const long_type = items.filter((row) => row.program_type.length > 100);
  const long_code = items.filter((row) => row.registration_code.length > 40);
  const blocked = new Set([...pair_mismatch, ...blank_course, ...blank_email, ...bad_start, ...long_batch, ...long_type, ...long_code]);
  const candidates = items.filter((row) => !blocked.has(row));
  const bad_duration = candidates.filter((row) => !row.duration.ok);

  console.log(`Workbook: ${EXCEL_PATH}`);
  console.log(`Institution: ${COHORT_NAME}`);
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
    const [cohort_rows] = await pool.query(
      `SELECT cohort_id, cohort_name
       FROM tbl_cohorts
       WHERE is_deleted = FALSE AND LOWER(TRIM(cohort_name)) = ?`,
      [COHORT_NAME.toLowerCase()]
    );
    if (cohort_rows.length > 1) {
      throw new Error(`More than one cohort is named ${COHORT_NAME}.`);
    }
    const cohort = cohort_rows[0] ? { id: Number(cohort_rows[0].cohort_id), name: cohort_rows[0].cohort_name, create: false } : { id: null, name: COHORT_NAME, create: true };

    const course_names = [...new Set(candidates.map((row) => row.course_name.toLowerCase()))];
    const emails = [...new Set(candidates.map((row) => row.email))];
    const courses_by_name = new Map();
    const students_by_email = new Map();
    if (course_names.length) {
      const [courses] = await pool.query(
        `SELECT course_id, course_name
         FROM tbl_courses
         WHERE is_deleted = FALSE
           AND LOWER(TRIM(course_name)) IN (${course_names.map(() => "?").join(", ")})`,
        course_names
      );
      for (const course of courses) {
        const key = String(course.course_name).trim().toLowerCase();
        const list = courses_by_name.get(key) || [];
        list.push(course);
        courses_by_name.set(key, list);
      }
    }
    if (emails.length) {
      const [students] = await pool.query(
        `SELECT student_id, email
         FROM tbl_students
         WHERE is_deleted = FALSE
           AND LOWER(TRIM(email)) IN (${emails.map(() => "?").join(", ")})`,
        emails
      );
      for (const student of students) {
        students_by_email.set(String(student.email).trim().toLowerCase(), student.student_id);
      }
    }

    const [type_rows] = await pool.query(
      `SELECT program_type_id, program_type_name
       FROM mst_program_types
       WHERE is_deleted = FALSE`
    );
    const types = new Map();
    for (const row of type_rows) types.set(String(row.program_type_name).trim().toLowerCase(), { id: Number(row.program_type_id), name: String(row.program_type_name).trim() });

    const [program_rows] = await pool.query(
      `SELECT program_id, program_code, program_name
       FROM tbl_programs
       WHERE is_deleted = FALSE`
    );
    const programs_by_name = new Map();
    const taken_codes = new Set();
    for (const row of program_rows) {
      taken_codes.add(String(row.program_code).trim().toLowerCase());
      const key = String(row.program_name).trim().toLowerCase();
      const list = programs_by_name.get(key) || [];
      list.push(row);
      programs_by_name.set(key, list);
    }

    const course_missing = [];
    const course_ambiguous = [];
    const email_missing = [];
    const program_ambiguous = [];
    const type_missing = [];
    const detail_conflict = [];
    const batches = new Map();
    const open_pending = [];

    for (const row of candidates) {
      const courses = courses_by_name.get(row.course_name.toLowerCase()) || [];
      if (!courses.length) {
        course_missing.push(row);
        continue;
      }
      if (courses.length > 1) {
        course_ambiguous.push(row);
        continue;
      }
      const student_id = students_by_email.get(row.email);
      if (!student_id) {
        email_missing.push(row);
        continue;
      }
      if (!row.batch_name) {
        open_pending.push({
          ...row,
          course_id: Number(courses[0].course_id),
          student_id
        });
        continue;
      }
      const batch_key = row.batch_name.toLowerCase();
      const existing_programs = programs_by_name.get(batch_key) || [];
      if (existing_programs.length > 1) {
        program_ambiguous.push(row);
        continue;
      }
      if (!batches.has(batch_key)) {
        batches.set(batch_key, {
          name: row.batch_name,
          type: "",
          months: null,
          description: "",
          existing: existing_programs[0] || null,
          rows: []
        });
      }
      const batch = batches.get(batch_key);
      if (row.program_type) {
        if (!batch.type) batch.type = row.program_type;
        else if (batch.type.toLowerCase() !== row.program_type.toLowerCase()) detail_conflict.push({ ...row, detail: `type: ${row.program_type}` });
      }
      if (row.duration.months != null) {
        if (batch.months == null) batch.months = row.duration.months;
        else if (batch.months !== row.duration.months) detail_conflict.push({ ...row, detail: `duration: ${row.duration.months}` });
      }
      if (row.description) {
        if (!batch.description) batch.description = row.description.slice(0, 5000);
        else if (batch.description !== row.description.slice(0, 5000)) detail_conflict.push({ ...row, detail: "description differs" });
      }
      batch.rows.push({
        ...row,
        course_id: Number(courses[0].course_id),
        student_id
      });
    }

    const ready = [];
    const ready_open = [];
    const types_to_add = [];
    const batches_to_add = [];
    const batches_existing = [];
    const code_used = [];
    const already = [];
    const seen_registration = new Set();
    const seen_code = new Set();
    let replaced = 0;

    const course_ids = [...new Set([
      ...[...batches.values()].flatMap((batch) => batch.rows.map((row) => row.course_id)),
      ...open_pending.map((row) => row.course_id)
    ])];
    const existing_registrations = new Set();
    const registered_on_course = new Set();
    const existing_codes = new Set();
    if (course_ids.length) {
      const [registrations] = await pool.query(
        `SELECT student_id, course_id, program_id, course_student_id, status, is_deleted
         FROM tbl_course_registrations
         WHERE course_id IN (${course_ids.map(() => "?").join(", ")})`,
        course_ids
      );
      for (const row of registrations) {
        if (!row.is_deleted && String(row.status) === "registered") {
          registered_on_course.add(`${row.student_id}|${row.course_id}`);
          if (row.program_id != null) {
            existing_registrations.add(`${row.student_id}|${row.course_id}|${row.program_id}`);
          }
        }
        const code = String(row.course_student_id || "").trim().toLowerCase();
        if (!row.is_deleted && code) existing_codes.add(`${row.course_id}|${code}`);
      }
    }

    for (const batch of batches.values()) {
      if (!batch.existing && !batch.type) {
        type_missing.push(...batch.rows);
        continue;
      }
      if (batch.existing) batches_existing.push(batch.rows[0]);
      else batches_to_add.push(batch.rows[0]);
      if (!batch.existing && batch.type && !types.has(batch.type.toLowerCase())) types_to_add.push(batch.rows[0]);
      const program_key = batch.existing ? `id:${batch.existing.program_id}` : `new:${batch.name.toLowerCase()}`;
      for (const row of batch.rows) {
        const registration_key = `${row.student_id}|${row.course_id}|${program_key}`;
        if (seen_registration.has(registration_key)) {
          replaced += 1;
          continue;
        }
        seen_registration.add(registration_key);
        const code_key = row.registration_code ? `${row.course_id}|${row.registration_code.toLowerCase()}` : "";
        if (code_key && (existing_codes.has(code_key) || seen_code.has(code_key))) {
          code_used.push(row);
          continue;
        }
        if (code_key) seen_code.add(code_key);
        const program_id = batch.existing ? Number(batch.existing.program_id) : null;
        if (program_id && existing_registrations.has(`${row.student_id}|${row.course_id}|${program_id}`)) {
          already.push(row);
          continue;
        }
        ready.push({ ...row, batch, program_id });
      }
    }

    const seen_open = new Set();
    for (const row of open_pending) {
      const registration_key = `${row.student_id}|${row.course_id}`;
      if (seen_open.has(registration_key)) {
        replaced += 1;
        continue;
      }
      seen_open.add(registration_key);
      const code_key = row.registration_code ? `${row.course_id}|${row.registration_code.toLowerCase()}` : "";
      if (code_key && (existing_codes.has(code_key) || seen_code.has(code_key))) {
        code_used.push(row);
        continue;
      }
      if (code_key) seen_code.add(code_key);
      if (registered_on_course.has(registration_key)) {
        already.push(row);
        continue;
      }
      ready_open.push(row);
    }

    const uses_cohort = batches_to_add.length > 0 || batches_existing.length > 0;
    console.log(`\n========== COHORT ==========`);
    if (uses_cohort) {
      console.log(cohort.create ? `  Will add cohort: ${cohort.name}` : `  Cohort already in LMS: ${cohort.name}`);
    } else {
      console.log("  Cohort is not used. Blank batch rows register on the open course.");
    }
    print_list("ONLY ONE OF BATCH NAME AND PROGRAM TYPE IS FILLED", pair_mismatch);
    print_list("COURSE NAME IS EMPTY", blank_course);
    print_list("STUDENT EMAIL IS EMPTY", blank_email);
    print_list("START DATE IS NOT A DATE", bad_start);
    print_list("BATCH NAME IS TOO LONG", long_batch);
    print_list("PROGRAM TYPE IS TOO LONG", long_type);
    print_list("REGISTRATION CODE IS TOO LONG", long_code);
    print_list("DURATION IS NOT A WHOLE NUMBER OF MONTHS", bad_duration);
    print_list("COURSE NAME NOT FOUND", course_missing);
    print_list("MORE THAN ONE COURSE WITH THIS NAME", course_ambiguous);
    print_list("STUDENT EMAIL NOT FOUND", email_missing);
    print_list("MORE THAN ONE PROGRAM WITH THIS NAME", program_ambiguous);
    print_list("PROGRAM TYPE IS EMPTY", type_missing);
    print_list("PROGRAM DETAILS DIFFER", detail_conflict, (row) => row.detail);
    print_list("PROGRAM TYPE WILL BE ADDED", types_to_add, (row) => `type: ${batches.get(row.batch_name.toLowerCase()).type}`);
    print_list("BATCH WILL BE ADDED", batches_to_add, (row) => `batch: ${row.batch_name}`);
    print_list("BATCH ALREADY IN LMS", batches_existing, (row) => `batch: ${row.batch_name}`);
    print_list("REGISTRATION CODE ALREADY USED", code_used, (row) => `code: ${row.registration_code}`);
    print_list("ALREADY REGISTERED", already);
    print_list("OPEN COURSE REGISTRATION", ready_open);

    console.log("\n========== RESULT ==========");
    console.log(`Skipped, older duplicate in the file : ${replaced}`);
    console.log(`To register                         : ${ready.length + ready_open.length}`);
    console.log(`  open course registrations         : ${ready_open.length}`);
    console.log(`  programs to add                   : ${batches_to_add.length}`);
    console.log(`  programs already in LMS           : ${batches_existing.length}`);

    if (!DO_IMPORT) {
      console.log("\nReport only. Run with --import to save.");
      return;
    }

    let cohort_id = cohort.id;
    if (uses_cohort && cohort.create) {
      const [created] = await pool.execute(
        `INSERT INTO tbl_cohorts (cohort_name, is_deleted, created_at) VALUES (?, FALSE, NOW())`,
        [cohort.name]
      );
      cohort_id = Number(created.insertId);
    }

    async function type_id_for(name) {
      const key = name.toLowerCase();
      const found = types.get(key);
      if (found) return found.id;
      const [created] = await pool.execute(
        `INSERT INTO mst_program_types (program_type_name, is_active, is_deleted, created_at)
         VALUES (?, TRUE, FALSE, NOW())`,
        [name]
      );
      const id = Number(created.insertId);
      types.set(key, { id, name });
      return id;
    }

    const program_ids = new Map();
    let saved = 0;
    let failed = 0;
    for (const batch of batches.values()) {
      if (!batch.existing && !batch.type) continue;
      if (!batch.rows.length) continue;
      try {
        let program_id = batch.existing ? Number(batch.existing.program_id) : program_ids.get(batch.name.toLowerCase());
        if (!program_id) {
          const type_id = await type_id_for(batch.type);
          const code = program_code_for(batch.name, taken_codes);
          const [created] = await pool.execute(
            `INSERT INTO tbl_programs (
               program_code, program_name, program_type_id, duration_months, description, is_active, is_deleted, created_at
             ) VALUES (?, ?, ?, ?, ?, TRUE, FALSE, NOW())`,
            [code, batch.name, type_id, batch.months, batch.description || null]
          );
          program_id = Number(created.insertId);
          program_ids.set(batch.name.toLowerCase(), program_id);
        }
        const [linked] = await pool.query(
          `SELECT cohort_program_id
           FROM tbl_cohort_programs
           WHERE cohort_id = ? AND program_id = ? AND is_deleted = FALSE
           LIMIT 1`,
          [cohort_id, program_id]
        );
        if (!linked.length) {
          await pool.execute(
            `INSERT INTO tbl_cohort_programs (cohort_id, program_id, is_deleted, created_at)
             VALUES (?, ?, FALSE, NOW())`,
            [cohort_id, program_id]
          );
        }
        batch.program_id = program_id;
      } catch (error) {
        batch.failed = true;
        console.error(`  batch ${batch.name} failed: ${error.message}`);
      }
    }

    for (const row of ready) {
      if (row.batch.failed || !row.batch.program_id) {
        failed += 1;
        continue;
      }
      try {
        const [course_link] = await pool.query(
          `SELECT program_course_id, is_deleted
           FROM tbl_program_courses
           WHERE program_id = ? AND course_id = ?
           LIMIT 1`,
          [row.batch.program_id, row.course_id]
        );
        if (!course_link.length) {
          await pool.execute(
            `INSERT INTO tbl_program_courses (program_id, course_id, is_active, is_deleted, created_at)
             VALUES (?, ?, TRUE, FALSE, NOW())`,
            [row.batch.program_id, row.course_id]
          );
        } else if (course_link[0].is_deleted) {
          await pool.execute(
            `UPDATE tbl_program_courses
             SET is_deleted = FALSE, is_active = TRUE, updated_at = NOW()
             WHERE program_course_id = ?`,
            [course_link[0].program_course_id]
          );
        }
        await pool.execute(
          `INSERT INTO tbl_course_registrations
             (student_id, course_id, program_id, course_student_id, status, learning_status, progress_percent, is_deleted, created_at)
           VALUES (?, ?, ?, ?, 'registered', 'not_started', 0, FALSE, COALESCE(?, NOW()))`,
          [row.student_id, row.course_id, row.batch.program_id, row.registration_code || null, row.start_date.date ? `${row.start_date.date} 00:00:00` : null]
        );
        saved += 1;
      } catch (error) {
        failed += 1;
        console.error(`${line(row)} failed: ${error.message}`);
      }
    }
    for (const row of ready_open) {
      try {
        await pool.execute(
          `INSERT INTO tbl_course_registrations
             (student_id, course_id, program_id, course_student_id, status, learning_status, progress_percent, is_deleted, created_at)
           VALUES (?, ?, NULL, ?, 'registered', 'not_started', 0, FALSE, COALESCE(?, NOW()))`,
          [row.student_id, row.course_id, row.registration_code || null, row.start_date.date ? `${row.start_date.date} 00:00:00` : null]
        );
        saved += 1;
      } catch (error) {
        failed += 1;
        console.error(`${line(row)} failed: ${error.message}`);
      }
    }
    console.log(`\nRegistered: ${saved}   Failed: ${failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Import stopped:", error.message);
  process.exitCode = 1;
});
