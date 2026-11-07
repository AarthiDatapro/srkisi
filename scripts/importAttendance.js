// Import attendance from an Excel workbook into tbl_course_attendance.
//
//   node scripts/importAttendance.js
//   node scripts/importAttendance.js --import
//   node scripts/importAttendance.js "C:\path\attendance.xlsx" --import
//
// Columns: course_name, student email, is present (1 or 0).
// 1 is stored as present. 0 is stored as absent. A blank mark is not inserted.
// The mark is saved for today's date. The same course and student later in the sheet replaces the earlier row.

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
  || path.join(SCRIPT_DIR, "attendance.xlsx");

const ALIASES = {
  course_name: ["course name", "course_name", "course"],
  email: ["student email", "email", "email address", "e-mail", "email id"],
  is_present: ["is present", "is_present", "present", "attendance"]
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
  if (grid.length < 2) throw new Error("Excel file contains no attendance rows.");
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
  if (!mapping.course_name) throw new Error("No course_name column found in the Excel.");
  if (!mapping.email) throw new Error("No student email column found in the Excel.");
  if (!mapping.is_present) throw new Error("No is present column found in the Excel.");
  return mapping;
}

function attendance_status(value) {
  if (is_empty(value)) return "";
  const text = String(value).trim().toLowerCase().replace(/\.0+$/, "");
  if (text === "1") return "present";
  if (text === "0") return "absent";
  return null;
}

function today_stamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function line(row) {
  return `  row ${row.row_number} | course: ${row.course_name || "(blank)"} | email: ${row.email || "(blank)"}`;
}

function print_list(title, rows) {
  console.log(`\n========== ${title} (${rows.length}) ==========`);
  if (!rows.length) {
    console.log("  none");
    return;
  }
  for (const row of rows) console.log(line(row));
}

async function main() {
  const { headers, rows } = load_excel();
  const mapping = build_mapping(headers);
  const pick = (row, column) => (mapping[column] ? row.cells[mapping[column]] : null);
  const items = rows.map((row) => ({
    row_number: row.row_number,
    course_name: String(pick(row, "course_name") ?? "").trim(),
    email: String(pick(row, "email") ?? "").trim().toLowerCase(),
    status: attendance_status(pick(row, "is_present"))
  }));

  const attendance_date = today_stamp();
  console.log(`Workbook: ${EXCEL_PATH}`);
  console.log(`Attendance date: ${attendance_date}`);
  console.log(`Rows: ${items.length}`);

  const blank_course = items.filter((row) => !row.course_name);
  const blank_email = items.filter((row) => row.course_name && !row.email);
  const blank_mark = items.filter((row) => row.course_name && row.email && row.status === "");
  const bad_mark = items.filter((row) => row.course_name && row.email && row.status === null);
  const candidates = items.filter((row) => row.course_name && row.email && (row.status === "present" || row.status === "absent"));

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
    const emails = [...new Set(candidates.map((row) => row.email))];
    const courses_by_name = new Map();
    const students_by_email = new Map();

    if (course_names.length) {
      const [courses] = await pool.query(
        `SELECT course_id, course_name
         FROM tbl_courses
         WHERE LOWER(TRIM(course_name)) IN (${course_names.map(() => "?").join(", ")})`,
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

    const course_missing = [];
    const course_ambiguous = [];
    const email_missing = [];
    const ready = [];
    const seen = new Map();
    let replaced = 0;

    for (const row of candidates) {
      const courses = courses_by_name.get(row.course_name.toLowerCase()) || [];
      const student_id = students_by_email.get(row.email);
      if (!courses.length) {
        course_missing.push(row);
        continue;
      }
      if (courses.length > 1) {
        course_ambiguous.push(row);
        continue;
      }
      if (!student_id) {
        email_missing.push(row);
        continue;
      }
      const key = `${courses[0].course_id}|${student_id}`;
      if (seen.has(key)) replaced += 1;
      seen.set(key, {
        ...row,
        course_id: courses[0].course_id,
        student_id
      });
    }
    ready.push(...seen.values());

    print_list("COURSE NAME NOT FOUND", course_missing);
    print_list("MORE THAN ONE COURSE WITH THIS NAME", course_ambiguous);
    print_list("STUDENT EMAIL NOT FOUND", email_missing);
    print_list("IS PRESENT IS EMPTY", blank_mark);
    print_list("IS PRESENT MUST BE 1 OR 0", bad_mark);
    print_list("COURSE NAME IS EMPTY", blank_course);
    print_list("STUDENT EMAIL IS EMPTY", blank_email);

    const present = ready.filter((row) => row.status === "present").length;
    console.log("\n========== RESULT ==========");
    console.log(`Skipped, older duplicate in the file : ${replaced}`);
    console.log(`To save                             : ${ready.length}`);
    console.log(`  present                           : ${present}`);
    console.log(`  absent                            : ${ready.length - present}`);

    if (!DO_IMPORT) {
      console.log("\nReport only. Run with --import to save.");
      return;
    }

    let saved = 0;
    let failed = 0;
    for (const row of ready) {
      try {
        await pool.execute(
          `INSERT INTO tbl_course_attendance
             (course_id, student_id, attendance_date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             status = VALUES(status),
             updated_at = NOW()`,
          [row.course_id, row.student_id, attendance_date, row.status]
        );
        saved += 1;
      } catch (error) {
        failed += 1;
        console.error(`${line(row)} failed: ${error.message}`);
      }
    }
    console.log(`\nSaved: ${saved}   Failed: ${failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Import stopped:", error.message);
  process.exitCode = 1;
});
