import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import {
  validateOptionalText,
  validatePositiveInteger,
  validateRequiredText } from
"@datapromr/validation";
import { get_pool } from "../utils/db_setup.js";
import { ensure_content_schema } from "../course_content_manager/schema.js";
import { ensure_learn_schema } from "../course_learning/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { create_student_id, ensure_student_profile_schema, update_student_password } from "../student_authentication/student_auth_service.js";
import { validate_student_profile } from "../student_profile/profile_service.js";
import { ensure_course_schema } from "./schema.js";
import { save_course_image } from "./course_image.js";
import { assignment_employee_id, course_assigned_sql } from "../utils/assignment_scope.js";

import {
  normalize_id_format,
  validate_course_student_code,
  fail,
  map_passkey_entries,
  assert_passkey_value,
  unique_ids,
  get_course,
  parse_program_id,
  require_course_program
} from "./course_service.js";

const RESET_PASSWORD = "Datapro@123";
const IMPORT_ROW_LIMIT = 5000;
const load_xlsx = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json"));
const XLSX = load_xlsx("xlsx");

const IMPORT_COLUMNS = {
  email: "email",
  "e mail": "email",
  mail: "email",
  "registration id": "registration_id",
  "reg id": "registration_id",
  "course id": "registration_id",
  "course student id": "registration_id",
  "phone number": "phone",
  phone: "phone",
  "phone no": "phone",
  mobile: "phone",
  "mobile no": "phone",
  "mobile number": "phone",
  "first name": "first_name",
  firstname: "first_name",
  "last name": "last_name",
  lastname: "last_name",
  "date of birth": "date_of_birth",
  dob: "date_of_birth",
  "birth date": "date_of_birth",
  college: "college",
  "higher study": "higher_study",
  higherstudy: "higher_study",
  "blood group": "blood_group",
  bloodgroup: "blood_group",
  pincode: "pincode",
  "pin code": "pincode",
  pin: "pincode",
  state: "state",
  district: "district"
};

function day_value(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

export function map_course_student(row) {
  return {
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
    email: row.email || "",
    mobile_number: row.mobile_number || "",
    college: row.college || "",
    higher_study: row.higher_study || "",
    blood_group: row.blood_group || "",
    address_line: row.address_line || "",
    pincode: row.pincode || "",
    state: row.state || "",
    district: row.district || "",
    date_of_birth: day_value(row.date_of_birth),
    profile_photo_url: row.profile_photo_url || "",
    program_id: row.program_id == null ? null : Number(row.program_id),
    program_name: row.program_name || "",
    cohort_name: row.cohort_name || "",
    course_student_id: row.course_student_id || "",
    enrolled_at: row.enrolled_at || null,
    learning_status: row.learning_status || "not_started",
    progress_percent: Number(row.progress_percent) || 0,
    last_accessed_at: row.last_accessed_at || null
  };
}

export async function list_course_students(id, query = {}) {
  await get_course(id);
  await ensure_registration_schema();
  await ensure_student_profile_schema();
  const program_id = parse_program_id(query.program_id);
  const pool = get_pool();
  if (program_id) await require_course_program(pool, id, program_id);
  const [rows] = await sqlQuery(
    pool,
    `SELECT s.student_id, s.first_name, s.last_name, s.email, s.mobile_number,
            s.college, s.higher_study, s.blood_group, s.address_line, s.pincode,
            s.state, s.district, s.date_of_birth, s.profile_photo_url,
            r.program_id, p.program_name, h.cohort_name,
            r.course_student_id, r.learning_status, r.progress_percent, r.last_accessed_at,
            r.created_at AS enrolled_at
     FROM tbl_course_registrations r
     INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
     LEFT JOIN tbl_programs p ON p.program_id = r.program_id AND p.is_deleted = FALSE
     LEFT JOIN tbl_cohort_programs cp
       ON cp.program_id = r.program_id AND cp.is_deleted = FALSE
      AND cp.cohort_program_id = (
        SELECT MIN(cp2.cohort_program_id)
        FROM tbl_cohort_programs cp2
        WHERE cp2.program_id = r.program_id AND cp2.is_deleted = FALSE
      )
     LEFT JOIN tbl_cohorts h ON h.cohort_id = cp.cohort_id AND h.is_deleted = FALSE
     WHERE r.course_id = ? AND r.is_deleted = FALSE AND r.status = 'registered'
       AND (? IS NULL OR r.program_id = ?)
     ORDER BY s.first_name ASC, s.last_name ASC, s.student_id ASC`,
    [id, program_id, program_id]
  );
  const items = (rows || []).map(map_course_student);
  log.pass("listCourseStudents", `course ${id} program ${program_id} ${items.length} students`);
  return { items, total: items.length, program_id };
}

export async function remove_course_student(id, student_id, query = {}) {
  await get_course(id);
  await ensure_registration_schema();
  const pool = get_pool();
  const code = String(student_id || "").trim();
  if (!code) throw fail("Select a student to remove");
  const program_id = parse_program_id(query.program_id);
  if (!program_id) throw fail("Select a program to load students");
  await require_course_program(pool, id, program_id);

  const [rows] = await sqlQuery(
    pool,
    `SELECT registration_id
     FROM tbl_course_registrations
     WHERE course_id = ? AND program_id = ? AND student_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id, program_id, code]
  );
  if (!rows?.[0]) throw fail("This student is not enrolled in that program", 404);

  await sqlQuery(
    pool,
    `UPDATE tbl_course_registrations
     SET is_deleted = TRUE, updated_at = NOW()
     WHERE course_id = ? AND program_id = ? AND student_id = ? AND is_deleted = FALSE`,
    [id, program_id, code]
  );
  log.pass("removeCourseStudent", `course ${id} program ${program_id} removed ${code}`);
  return { ok: true, student_id: code };
}

export async function generate_course_student_ids(id, body = {}) {
  const course = await get_course(id);
  if (!course.is_offline) {
    throw fail("Course IDs are only generated for offline courses");
  }
  const format = normalize_id_format(course.student_id_format);
  if (!format) throw fail("Set an ID format on this course first");
  const program_id = parse_program_id(body.program_id);
  if (!program_id) throw fail("Select a program to generate IDs");

  await ensure_registration_schema();
  const pool = get_pool();
  await require_course_program(pool, id, program_id);
  const [all_rows] = await sqlQuery(
    pool,
    `SELECT student_id, program_id, course_student_id
     FROM tbl_course_registrations
     WHERE course_id = ? AND is_deleted = FALSE AND status = 'registered'
     ORDER BY created_at ASC, registration_id ASC`,
    [id]
  );

  const used = new Set();
  let max_serial = 0;
  const prefix = `${format}-`.toUpperCase();
  for (const row of all_rows || []) {
    const code = String(row.course_student_id || "").trim();
    if (!code) continue;
    used.add(code.toUpperCase());
    if (code.toUpperCase().startsWith(prefix)) {
      const serial = Number(code.slice(format.length + 1));
      if (Number.isInteger(serial) && serial > max_serial) max_serial = serial;
    }
  }

  const missing = (all_rows || []).filter(
    (row) =>
      Number(row.program_id) === program_id && !String(row.course_student_id || "").trim()
  );
  let serial = max_serial;
  let generated = 0;
  for (const row of missing) {
    let next = "";
    do {
      serial += 1;
      next = `${format}-${serial}`;
    } while (used.has(next.toUpperCase()));
    used.add(next.toUpperCase());
    await sqlQuery(
      pool,
      `UPDATE tbl_course_registrations
       SET course_student_id = ?, updated_at = NOW()
       WHERE course_id = ? AND program_id = ? AND student_id = ? AND is_deleted = FALSE`,
      [next, id, program_id, row.student_id]
    );
    generated += 1;
  }

  log.pass("generateCourseStudentIds", `course ${id} program ${program_id} generated ${generated}`);
  const roster = await list_course_students(id, { program_id });
  return { generated, total: roster.total, items: roster.items, program_id };
}

export async function update_course_student_id(id, student_id, course_student_id, query = {}) {
  await get_course(id);
  await ensure_registration_schema();
  const pool = get_pool();
  const code = String(student_id || "").trim();
  const next = String(course_student_id || "").trim();
  const error = validate_course_student_code(next);
  if (error) throw fail(error);
  if (!code) throw fail("Select a student");
  const program_id = parse_program_id(query.program_id);
  if (!program_id) throw fail("Select a program to load students");
  await require_course_program(pool, id, program_id);

  const [rows] = await sqlQuery(
    pool,
    `SELECT registration_id
     FROM tbl_course_registrations
     WHERE course_id = ? AND program_id = ? AND student_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id, program_id, code]
  );
  if (!rows?.[0]) throw fail("This student is not enrolled in that program", 404);

  const [dupes] = await sqlQuery(
    pool,
    `SELECT registration_id
     FROM tbl_course_registrations
     WHERE course_id = ? AND course_student_id = ? AND student_id <> ? AND is_deleted = FALSE
     LIMIT 1`,
    [id, next, code]
  );
  if (dupes?.[0]) throw fail("That course ID is already assigned");

  await sqlQuery(
    pool,
    `UPDATE tbl_course_registrations
     SET course_student_id = ?, updated_at = NOW()
     WHERE course_id = ? AND program_id = ? AND student_id = ? AND is_deleted = FALSE`,
    [next, id, program_id, code]
  );
  log.pass("updateCourseStudentId", `course ${id} program ${program_id} ${code} -> ${next}`);
  const roster = await list_course_students(id, { program_id });
  const student = roster.items.find((item) => item.student_id === code) || null;
  return { student, items: roster.items };
}

async function require_enrolled_student(pool, course_id, student_id, query = {}) {
  const code = String(student_id || "").trim();
  if (!code) throw fail("Select a student");
  const program_id = parse_program_id(query.program_id);
  if (!program_id) throw fail("Select a program to load students");
  await require_course_program(pool, course_id, program_id);
  const [rows] = await sqlQuery(
    pool,
    `SELECT registration_id
     FROM tbl_course_registrations
     WHERE course_id = ? AND program_id = ? AND student_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [course_id, program_id, code]
  );
  if (!rows?.[0]) throw fail("This student is not enrolled in that program", 404);
  return { code, program_id };
}

export async function update_course_student_profile(id, student_id, body = {}, query = {}) {
  await get_course(id);
  await ensure_student_profile_schema();
  const errors = validate_student_profile(body);
  const first_error = Object.values(errors).find(Boolean);
  if (first_error) throw fail(first_error);

  const pool = get_pool();
  const { code, program_id } = await require_enrolled_student(pool, id, student_id, {
    program_id: body.program_id || query.program_id
  });
  const mobile = String(body.mobile_number).trim();
  const email = String(body.email).trim().toLowerCase();
  const [taken] = await sqlQuery(
    pool,
    `SELECT student_id FROM tbl_students
     WHERE mobile_number = ? AND student_id <> ? AND is_deleted = FALSE
     LIMIT 1`,
    [mobile, code]
  );
  if (taken?.[0]) throw fail("This mobile number is already registered", 409);
  const [email_taken] = await sqlQuery(
    pool,
    `SELECT student_id FROM tbl_students
     WHERE email = ? AND student_id <> ? AND is_deleted = FALSE
     LIMIT 1`,
    [email, code]
  );
  if (email_taken?.[0]) throw fail("This email is already registered", 409);

  await sqlQuery(
    pool,
    `UPDATE tbl_students
     SET first_name = ?, last_name = ?, email = ?, mobile_number = ?, date_of_birth = ?,
         college = ?, higher_study = ?, blood_group = ?, address_line = ?,
         pincode = ?, state = ?, district = ?, updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND is_deleted = FALSE`,
    [
      String(body.first_name).trim(),
      String(body.last_name).trim(),
      email,
      mobile,
      String(body.date_of_birth || "").trim() || null,
      String(body.college).trim(),
      String(body.higher_study).trim(),
      String(body.blood_group || "").trim() || null,
      String(body.address_line || "").trim() || null,
      String(body.pincode || "").trim() || null,
      String(body.state || "").trim() || null,
      String(body.district || "").trim() || null,
      code
    ]
  );
  log.pass("updateCourseStudentProfile", `course ${id} updated ${code}`);
  const roster = await list_course_students(id, { program_id });
  const student = roster.items.find((item) => item.student_id === code) || null;
  return { student, items: roster.items };
}

export async function reset_course_student_password(id, student_id, query = {}) {
  await get_course(id);
  await ensure_student_profile_schema();
  const pool = get_pool();
  const { code } = await require_enrolled_student(pool, id, student_id, query);
  await update_student_password(code, await hashPassword(RESET_PASSWORD));
  log.pass("resetCourseStudentPassword", `course ${id} reset ${code}`);
  return { ok: true, student_id: code };
}

function header_name(value) {
  return String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function cell_text(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return String(value).trim();
}

function phone_digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function phones_match(left, right) {
  const a = phone_digits(left);
  const b = phone_digits(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10);
}

function pad_date(value) {
  return String(value).padStart(2, "0");
}

function iso_date(year, month, day) {
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) return "";
  return `${date.getFullYear()}-${pad_date(date.getMonth() + 1)}-${pad_date(date.getDate())}`;
}

function birth_date(value) {
  const text = cell_text(value);
  if (!text) return { ok: true, value: null };
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return { ok: false, value: null };
    const iso = iso_date(parsed.y, parsed.m, parsed.d);
    return iso ? { ok: true, value: iso } : { ok: false, value: null };
  }
  const parts = text.split(/[./\-\s]+/).filter(Boolean);
  if (parts.length === 3 && parts[0].length === 4) {
    const iso = iso_date(parts[0], parts[1], parts[2]);
    return iso ? { ok: true, value: iso } : { ok: false, value: null };
  }
  if (parts.length === 3 && parts[2].length === 4) {
    const iso = iso_date(parts[2], parts[1], parts[0]);
    return iso ? { ok: true, value: iso } : { ok: false, value: null };
  }
  return { ok: false, value: null };
}

function limited(value, max) {
  const text = cell_text(value);
  if (text.length > max) return { ok: false, text };
  return { ok: true, text };
}

function read_import_rows(buffer) {
  const book = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet) throw fail("The workbook has no sheet");
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  const header = matrix[0] || [];
  const fields = {};
  header.forEach((label, index) => {
    const key = IMPORT_COLUMNS[header_name(label)];
    if (key && fields[key] == null) fields[key] = index;
  });
  if (fields.email == null || fields.phone == null) {
    throw fail("The sheet needs Email and Phone number columns");
  }
  const rows = [];
  for (let index = 1; index < matrix.length; index += 1) {
    const line = matrix[index] || [];
    const record = {};
    for (const [key, column] of Object.entries(fields)) {
      record[key] = line[column];
    }
    const blank = Object.values(record).every((value) => !cell_text(value));
    if (!blank) rows.push({ row: index + 1, ...record });
  }
  if (!rows.length) throw fail("The sheet has no student rows");
  if (rows.length > IMPORT_ROW_LIMIT) throw fail(`Import up to ${IMPORT_ROW_LIMIT} students at a time`);
  return rows;
}

async function find_import_student(pool, email, phone) {
  const [by_email] = await sqlQuery(
    pool,
    `SELECT student_id, email, mobile_number, is_deleted
     FROM tbl_students
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  const digits = phone_digits(phone);
  const tail = digits.length >= 10 ? `%${digits.slice(-10)}` : digits;
  const [by_phone] = await sqlQuery(
    pool,
    `SELECT student_id, email, mobile_number, is_deleted
     FROM tbl_students
     WHERE mobile_number = ? OR mobile_number = ? OR mobile_number LIKE ?
     LIMIT 8`,
    [phone, digits, tail]
  );
  const email_row = by_email?.[0] || null;
  const phone_row = (by_phone || []).find((row) => phones_match(row.mobile_number, phone)) || null;
  if (email_row && phone_row && email_row.student_id !== phone_row.student_id) {
    return { conflict: "Email and phone number belong to different students" };
  }
  if (!email_row && phone_row) {
    const stored = String(phone_row.email || "").trim().toLowerCase();
    if (stored && stored !== email) {
      return { conflict: "This phone number is already used by another student" };
    }
  }
  return { student: email_row || phone_row || null };
}

async function insert_import_student(pool, row, password_hash) {
  const first_name = row.first_name;
  const last_name = row.last_name;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const student_id = create_student_id(new Date(Date.now() + attempt * 1000));
    try {
      await sqlQuery(
        pool,
        `INSERT INTO tbl_students (
          student_id, first_name, last_name, email, mobile_number,
          password_hash, date_of_birth, college, higher_study, blood_group,
          pincode, state, district, terms_accepted, terms_accepted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student_id,
          first_name,
          last_name,
          row.email,
          row.phone,
          password_hash,
          row.date_of_birth,
          row.college,
          row.higher_study,
          row.blood_group || null,
          row.pincode || null,
          row.state || null,
          row.district || null,
          true,
          new Date()
        ]
      );
      return student_id;
    } catch (err) {
      if (err?.code === "ER_DUP_ENTRY" && String(err.message || "").includes("student_id")) continue;
      throw err;
    }
  }
  throw fail("Could not create a student id");
}

async function register_import_student(pool, course_id, program_id, student_id, registration_id) {
  const [existing] = await sqlQuery(
    pool,
    `SELECT registration_id, status, is_deleted, course_student_id
     FROM tbl_course_registrations
     WHERE student_id = ? AND course_id = ? AND program_id = ?
     ORDER BY registration_id DESC
     LIMIT 1`,
    [student_id, course_id, program_id]
  );
  const current = existing?.[0];
  if (current && !current.is_deleted && current.status === "registered") {
    return "skipped";
  }
  if (registration_id) {
    const [taken] = await sqlQuery(
      pool,
      `SELECT registration_id
       FROM tbl_course_registrations
       WHERE course_id = ? AND course_student_id = ? AND student_id <> ? AND is_deleted = FALSE
       LIMIT 1`,
      [course_id, registration_id, student_id]
    );
    if (taken?.[0]) return "id_taken";
  }
  if (current) {
    await sqlQuery(
      pool,
      `UPDATE tbl_course_registrations
       SET status = 'registered', is_deleted = FALSE, program_id = ?,
           learning_status = 'not_started', progress_percent = 0,
           course_student_id = COALESCE(?, course_student_id), updated_at = NOW()
       WHERE registration_id = ?`,
      [program_id, registration_id || null, current.registration_id]
    );
    return "registered";
  }
  await sqlQuery(
    pool,
    `INSERT INTO tbl_course_registrations
       (student_id, course_id, program_id, status, learning_status, progress_percent, course_student_id)
     VALUES (?, ?, ?, 'registered', 'not_started', 0, ?)`,
    [student_id, course_id, program_id, registration_id || null]
  );
  return "registered";
}

function import_issue(row, reason) {
  return { row, reason };
}

export async function import_course_students(id, body = {}, file) {
  await get_course(id);
  await ensure_registration_schema();
  await ensure_student_profile_schema();
  const program_id = parse_program_id(body.program_id);
  if (!program_id) throw fail("Select a program to import students");
  if (!file?.buffer?.length) throw fail("Choose an Excel file");
  const name = String(file.originalname || "").toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) throw fail("Upload an Excel file (.xlsx)");

  const pool = get_pool();
  await require_course_program(pool, id, program_id);
  const source_rows = read_import_rows(file.buffer);
  const password_hash = await hashPassword(RESET_PASSWORD);
  const result = {
    created: 0,
    registered: 0,
    skipped: 0,
    missing_both: 0,
    missing_one: 0,
    failed: 0,
    issues: []
  };

  for (const source of source_rows) {
    const email = cell_text(source.email).toLowerCase();
    const phone = cell_text(source.phone);
    if (!email && !phone) {
      result.missing_both += 1;
      continue;
    }
    if (!email || !phone) {
      result.missing_one += 1;
      result.issues.push(import_issue(source.row, "Email and phone number are both required"));
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.failed += 1;
      result.issues.push(import_issue(source.row, "Email is not valid"));
      continue;
    }
    if (phone_digits(phone).length < 10 || phone.length > 20) {
      result.failed += 1;
      result.issues.push(import_issue(source.row, "Phone number is not valid"));
      continue;
    }

    const registration = limited(source.registration_id, 40);
    const first_name = limited(source.first_name, 100);
    const last_name = limited(source.last_name, 100);
    const college = limited(source.college, 200);
    const higher_study = limited(source.higher_study, 200);
    const blood_group = limited(source.blood_group, 20);
    const pincode = limited(source.pincode, 12);
    const state = limited(source.state, 100);
    const district = limited(source.district, 100);
    const born = birth_date(source.date_of_birth);
    const registration_id = registration.text;
    if (registration_id && validate_course_student_code(registration_id)) {
      result.failed += 1;
      result.issues.push(import_issue(source.row, validate_course_student_code(registration_id)));
      continue;
    }
    if (!first_name.ok || !last_name.ok || !college.ok || !higher_study.ok || !blood_group.ok || !pincode.ok || !state.ok || !district.ok) {
      result.failed += 1;
      result.issues.push(import_issue(source.row, "One of the fields is too long"));
      continue;
    }
    if (!born.ok) {
      result.failed += 1;
      result.issues.push(import_issue(source.row, "Date of birth is not a valid date"));
      continue;
    }

    const found = await find_import_student(pool, email, phone);
    if (found.conflict) {
      result.failed += 1;
      result.issues.push(import_issue(source.row, found.conflict));
      continue;
    }

    let student_id = found.student?.student_id || "";
    let created = false;
    if (!student_id) {
      try {
        student_id = await insert_import_student(pool, {
          email,
          phone,
          first_name: first_name.text,
          last_name: last_name.text,
          date_of_birth: born.value,
          college: college.text,
          higher_study: higher_study.text,
          blood_group: blood_group.text,
          pincode: pincode.text,
          state: state.text,
          district: district.text
        }, password_hash);
        created = true;
      } catch (err) {
        if (err?.code !== "ER_DUP_ENTRY") throw err;
        const again = await find_import_student(pool, email, phone);
        if (!again.student) {
          result.failed += 1;
          result.issues.push(import_issue(source.row, "This email or phone number is already used"));
          continue;
        }
        student_id = again.student.student_id;
      }
    } else if (found.student.is_deleted) {
      await sqlQuery(
        pool,
        `UPDATE tbl_students
         SET is_deleted = FALSE, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = ?`,
        [student_id]
      );
    }

    let outcome = "";
    try {
      outcome = await register_import_student(pool, id, program_id, student_id, registration_id);
    } catch (err) {
      if (err?.code !== "ER_DUP_ENTRY") throw err;
      outcome = "id_taken";
    }
    if (outcome === "id_taken") {
      result.failed += 1;
      result.issues.push(import_issue(source.row, "Registration id is already used in this course"));
      continue;
    }
    if (outcome === "skipped") {
      result.skipped += 1;
      continue;
    }
    if (created) result.created += 1;
    else result.registered += 1;
  }

  if (result.issues.length > 40) result.issues = result.issues.slice(0, 40);
  const roster = await list_course_students(id, { program_id });
  log.pass(
    "importCourseStudents",
    `course ${id} program ${program_id} created ${result.created} registered ${result.registered} skipped ${result.skipped}`
  );
  return { ...result, items: roster.items };
}
