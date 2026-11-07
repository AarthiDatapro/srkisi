// Register students on an open course from an email-based workbook.
// This script is not part of the app. There is no cohort and no program.
//
//   node scripts/name_course_registrations.js
//   node scripts/name_course_registrations.js --import
//   node scripts/name_course_registrations.js scripts/students.xlsx --import
//
// The default workbook is scripts/students.xlsx.
// A registration is written only when the course name is already in tbl_courses
// and the student email matches one student in tbl_students.
// The match uses email. Student name is not used.
// program_id is left empty, the same way an open course registration is saved.
//
// Columns: email, course, registration_code, start_date.
// Course name and student email are required on every row.
// start_date is optional. When it is blank, a random date from 2018 onward is used.

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

dotenv.config({ path: path.join(SERVER_DIR, ".env"), quiet: true });

const DO_IMPORT = process.argv.includes("--import");
const EXCEL_PATH = process.argv.map((arg) => String(arg)).find((arg) => arg.toLowerCase().endsWith(".xlsx"))
  || path.join(SCRIPT_DIR, "students.xlsx");

const ALIASES = {
  course_name: ["course_name", "course name", "course_nme", "course"],
  email: ["email", "email address", "student email", "student_email", "mail"],
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
  const found = headers.filter(Boolean).join(", ") || "(none)";
  if (!mapping.course_name) {
    throw new Error(`No course name column found in the Excel. Need a header like course or course_name. Found: ${found}`);
  }
  if (!mapping.email) {
    throw new Error(`No email column found in the Excel. Need a header like email. Found: ${found}`);
  }
  return mapping;
}

function email_key(value) {
  return String(value || "").trim().toLowerCase();
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

function random_start_date() {
  const start = Date.UTC(2018, 0, 1);
  const end = Date.now();
  const pick = new Date(start + Math.floor(Math.random() * Math.max(1, end - start)));
  return calendar_date(pick.getUTCFullYear(), pick.getUTCMonth() + 1, pick.getUTCDate());
}

function start_date_of(value) {
  if (is_empty(value)) return { ok: true, date: random_start_date(), reason: "random" };
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

function line(row, extra) {
  const base = `  row ${row.row_number} | course: ${row.course_name || "(blank)"} | email: ${row.email || "(blank)"} | start: ${row.start_date?.date || "(default)"}`;
  return extra ? `${base} | ${extra}` : base;
}

function list_text(title, rows, extra) {
  const lines = [`========== ${title} (${rows.length}) ==========`];
  if (!rows.length) lines.push("  none");
  else for (const row of rows) lines.push(line(row, extra ? extra(row) : ""));
  return lines.join("\n");
}

async function main() {
  const { headers, rows } = load_excel();
  const mapping = build_mapping(headers);
  const pick = (row, column) => (mapping[column] ? row.cells[mapping[column]] : null);
  const items = rows.map((row) => ({
    row_number: row.row_number,
    course_name: text_cell(pick(row, "course_name")),
    email: text_cell(pick(row, "email")),
    registration_code: text_cell(pick(row, "registration_code")),
    start_date: start_date_of(pick(row, "start_date"))
  }));

  const blank_course = items.filter((row) => !row.course_name);
  const blank_email = items.filter((row) => !row.email);
  const bad_start = items.filter((row) => row.start_date.reason === "invalid");
  const long_code = items.filter((row) => row.registration_code.length > 40);
  const blocked = new Set([...blank_course, ...blank_email, ...bad_start, ...long_code]);
  const candidates = items.filter((row) => !blocked.has(row));
  const missing_emails = blank_email.length;

  console.log(`Workbook: ${EXCEL_PATH}`);
  console.log("Registration: open course");
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
    const course_names = [...new Set(candidates.map((row) => row.course_name.toLowerCase()))];
    const courses_by_name = new Map();
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

    const students_by_email = new Map();
    const [students] = await pool.query(
      `SELECT student_id, email
       FROM tbl_students
       WHERE is_deleted = FALSE`
    );
    for (const student of students) {
      const key = email_key(student.email);
      if (!key) continue;
      const list = students_by_email.get(key) || [];
      list.push(student.student_id);
      students_by_email.set(key, list);
    }

    const course_missing = [];
    const course_ambiguous = [];
    const email_missing = [];
    const email_ambiguous = [];
    const pending = [];

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
      const matches = students_by_email.get(email_key(row.email)) || [];
      if (!matches.length) {
        email_missing.push(row);
        continue;
      }
      if (matches.length > 1) {
        email_ambiguous.push(row);
        continue;
      }
      pending.push({
        ...row,
        course_id: Number(courses[0].course_id),
        student_id: matches[0]
      });
    }

    const course_ids = [...new Set(pending.map((row) => row.course_id))];
    const registered_on_course = new Set();
    const existing_codes = new Set();
    if (course_ids.length) {
      const [registrations] = await pool.query(
        `SELECT student_id, course_id, course_student_id, status, is_deleted
         FROM tbl_course_registrations
         WHERE course_id IN (${course_ids.map(() => "?").join(", ")})`,
        course_ids
      );
      for (const row of registrations) {
        if (!row.is_deleted && String(row.status) === "registered") {
          registered_on_course.add(`${row.student_id}|${row.course_id}`);
        }
        const code = String(row.course_student_id || "").trim().toLowerCase();
        if (!row.is_deleted && code) existing_codes.add(`${row.course_id}|${code}`);
      }
    }

    const ready = [];
    const code_used = [];
    const already = [];
    const seen = new Set();
    const seen_code = new Set();
    let replaced = 0;
    for (const row of pending) {
      const registration_key = `${row.student_id}|${row.course_id}`;
      if (seen.has(registration_key)) {
        replaced += 1;
        continue;
      }
      seen.add(registration_key);
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
      ready.push(row);
    }

    const reasons = [
      ["Course name is empty", blank_course.length],
      ["Student email is empty", blank_email.length],
      ["Start date is filled but is not a real date", bad_start.length],
      ["Registration code is longer than 40 characters", long_code.length],
      ["Course name is not in the LMS", course_missing.length],
      ["More than one course has this name", course_ambiguous.length],
      ["Student email is not in the LMS", email_missing.length],
      ["More than one student has this email", email_ambiguous.length],
      ["Same student and course is repeated later in the file", replaced],
      ["Registration code is already used on that course", code_used.length],
      ["Student is already registered on that course", already.length]
    ];
    const skipped = reasons.reduce((sum, [, count]) => sum + count, 0);

    const result_lines = [
      "========== RESULT ==========",
      `Rows in the file                    : ${items.length}`,
      `To register                         : ${ready.length}`,
      `Missing emails                      : ${missing_emails}`,
      `Skipped                             : ${skipped}`,
      ...reasons.map(([reason, count]) => `  ${String(count).padStart(6)}  ${reason}`)
    ];

    console.log(`\n${result_lines.join("\n")}`);
    console.log(`\n${list_text("COURSE NAME NOT FOUND", course_missing)}`);
    console.log(`\n${list_text("STUDENT EMAIL NOT FOUND", email_missing)}`);
    console.log(`\nMissing emails: ${missing_emails}`);

    if (!DO_IMPORT) {
      console.log("\nReport only. Run with --import to save.");
      return;
    }

    let saved = 0;
    let failed = 0;
    for (const row of ready) {
      try {
        const start_at = row.start_date.date
          ? `${row.start_date.date} 00:00:00`
          : `${random_start_date()} 00:00:00`;
        await pool.execute(
          `INSERT INTO tbl_course_registrations
             (student_id, course_id, program_id, course_student_id, status, learning_status, progress_percent, is_deleted, created_at)
           VALUES (?, ?, NULL, ?, 'registered', 'not_started', 0, FALSE, ?)`,
          [row.student_id, row.course_id, row.registration_code || null, start_at]
        );
        saved += 1;
      } catch (error) {
        failed += 1;
        console.error(`${line(row)} failed: ${error.message}`);
      }
    }
    console.log(`\nRegistered: ${saved}   Failed: ${failed}   Missing emails: ${missing_emails}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Import stopped:", error.message);
  process.exitCode = 1;
});

