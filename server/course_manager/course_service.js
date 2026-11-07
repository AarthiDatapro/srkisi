import { sqlQuery } from "@datapromr/auth/server";
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
import { ensure_student_profile_schema } from "../student_authentication/student_auth_service.js";
import { ensure_course_schema } from "./schema.js";
import { save_course_image } from "./course_image.js";
import { delete_stored_file, forget_stored_file } from "../utils/storage_buckets.js";
import { assignment_employee_id, course_assigned_sql } from "../utils/assignment_scope.js";
import { create_stamp_code } from "../utils/codes.js";

const SORTS = {
  name: "c.course_name",
  code: "c.course_code",
  type: "t.course_type_name",
  date: "c.created_at",
  status: "c.is_active",
  duration: "c.duration_hours",
  level: "c.level"
};

const COURSE_JOINS = `
  LEFT JOIN mst_course_types t ON t.course_type_id = c.course_type_id
  LEFT JOIN mst_course_domains d ON d.course_domain_id = c.course_domain_id
  LEFT JOIN mst_course_levels lv ON lv.course_level_id = c.course_level_id
  LEFT JOIN mst_course_tags tg ON tg.course_tag_id = c.course_tag_id
`;

const COURSE_SELECT = `
  c.course_id, c.course_code, c.course_name, c.course_tagline, c.course_description,
  c.course_type_id, t.course_type_name AS course_type,
  c.duration_hours, c.level, c.fee_amount, c.discount_percent, c.thumbnail_url, c.is_offline, c.enroll_passkey,
  c.student_id_format, c.is_active, c.created_at, c.updated_at,
  c.created_by_display, c.real_world_project_count, c.has_completion_certificate,
  c.learn_points, c.audience_points, c.is_paid, c.is_open,
  c.course_domain_id, d.course_domain_name AS course_domain,
  c.course_level_id, lv.course_level_name AS course_level,
  c.course_tag_id, tg.course_tag_name AS course_tag,
  (
    SELECT GROUP_CONCAT(cl.course_language_id)
    FROM tbl_course_languages cl
    WHERE cl.course_id = c.course_id AND cl.is_deleted = FALSE
  ) AS language_ids,
  (
    SELECT GROUP_CONCAT(lang.course_language_name ORDER BY lang.course_language_name SEPARATOR '||')
    FROM tbl_course_languages cl
    INNER JOIN mst_course_languages lang ON lang.course_language_id = cl.course_language_id
    WHERE cl.course_id = c.course_id AND cl.is_deleted = FALSE
  ) AS language_names,
  (
    SELECT COUNT(*)
    FROM tbl_program_courses pc
    INNER JOIN tbl_programs p ON p.program_id = pc.program_id
    WHERE pc.course_id = c.course_id
      AND pc.is_deleted = FALSE
      AND p.is_deleted = FALSE
  ) AS program_count,
  (
    SELECT GROUP_CONCAT(pc.program_id)
    FROM tbl_program_courses pc
    INNER JOIN tbl_programs p ON p.program_id = pc.program_id
    WHERE pc.course_id = c.course_id
      AND pc.is_deleted = FALSE
      AND p.is_deleted = FALSE
  ) AS program_ids,
  (
    SELECT COUNT(DISTINCT r.student_id)
    FROM tbl_course_registrations r
    INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
    WHERE r.course_id = c.course_id
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
  ) AS enrolled_count
`;

export function create_course_code(date = new Date()) {
  return create_stamp_code("CRS", date);
}

export function domain_course_code(letters, number) {
  return `DP-${String(letters || "").trim().toUpperCase()}-${number}`;
}

function matches_domain_code(code, letters) {
  const token = String(letters || "").trim().toUpperCase();
  if (!/^[A-Z]{1,5}$/.test(token)) return false;
  return new RegExp(`^DP-${token}-\\d{1,5}$`).test(String(code || ""));
}

async function allocate_domain_course_code(connection, domain_id) {
  const [rows] = await connection.query(
    `SELECT code_letters, number_next
     FROM mst_course_domains
     WHERE course_domain_id = ? AND is_deleted = FALSE
     FOR UPDATE`,
    [domain_id]
  );
  const domain = rows?.[0];
  const letters = String(domain?.code_letters || "").trim().toUpperCase();
  if (!domain || !/^[A-Z]{1,5}$/.test(letters)) {
    throw fail("Set a letter code and number series on this domain before assigning a course");
  }
  let number = Number(domain.number_next);
  if (!Number.isInteger(number) || number < 0) {
    throw fail("Set a number series of up to 5 digits on this domain");
  }
  if (number > 99999) throw fail("This domain has used every 5-digit number");
  let code = "";
  while (number <= 99999) {
    const candidate = domain_course_code(letters, number);
    const [taken] = await connection.query(
      `SELECT course_id FROM tbl_courses WHERE course_code = ? LIMIT 1`,
      [candidate]
    );
    if (!taken?.length) {
      code = candidate;
      break;
    }
    number += 1;
  }
  if (!code) throw fail("This domain has used every 5-digit number");
  await connection.query(
    `UPDATE mst_course_domains SET number_next = ? WHERE course_domain_id = ?`,
    [number + 1, domain_id]
  );
  return code;
}

function course_update_params(data, id) {
  return [
    data.course_name,
    data.course_tagline,
    data.course_description,
    data.course_type_id,
    data.duration_hours,
    data.level,
    data.fee_amount,
    data.discount_percent,
    data.created_by_display,
    data.real_world_project_count,
    data.has_completion_certificate,
    data.learn_points,
    data.audience_points,
    data.is_paid,
    data.is_open,
    data.course_domain_id,
    data.course_level_id,
    data.course_tag_id,
    data.is_offline,
    data.enroll_passkey,
    data.student_id_format,
    data.is_active,
    id
  ];
}

export function validate_duration_hours(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return "Duration must be a number with up to 2 decimal places";
  }
  const hours = Number(text);
  if (hours <= 0) return "Duration must be greater than 0";
  if (hours > 9999.99) return "Duration must be 9999.99 hours or less";
  return "";
}

export function as_bool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function clean_points(value) {
  const list = Array.isArray(value) ? value : String(value || "").split("\n");
  return list.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 20);
}

export function validate_points(value, label) {
  const list = Array.isArray(value) ? value : [];
  if (list.length > 20) return `${label} can have at most 20 points`;
  if (list.some((item) => String(item || "").trim().length > 300)) {
    return `Each ${label} point must be 300 characters or less`;
  }
  return "";
}

export function validate_project_count(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!/^\d+$/.test(text)) return "Project count must be a whole number";
  if (Number(text) > 999) return "Project count must be 999 or less";
  return "";
}

export function validate_amount(value, required) {
  const text = String(value ?? "").trim();
  if (!text) return required ? "Enter the course amount" : "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return "Amount must be a number with up to 2 decimal places";
  if (Number(text) <= 0) return "Amount must be greater than 0";
  if (Number(text) > 9999999.99) return "Amount is too large";
  return "";
}

export function validate_discount(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return "Discount must be a percent with up to 2 decimal places";
  const percent = Number(text);
  if (percent < 0 || percent > 100) return "Discount must be between 0 and 100";
  return "";
}

export function read_points(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value && typeof value === "object") return [];
  const text = String(value || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

export function normalize_id_format(value) {
  return String(value || "").
  trim().
  replace(/\s+/g, "").
  replace(/-+$/g, "");
}

export function validate_id_format(value, required = false) {
  const text = normalize_id_format(value);
  if (!text) return required ? "Enter an ID format" : "";
  if (text.length > 24) return "ID format must be 24 characters or less";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(text)) {
    return "Use letters, numbers, dot, hyphen, or underscore";
  }
  return "";
}

export function validate_passkey(value, required = false) {
  const text = String(value || "").trim();
  if (!text) return required ? "Enter a course passkey" : "";
  if (text.length < 4) return "Passkey must be at least 4 characters";
  if (text.length > 40) return "Passkey must be 40 characters or less";
  return "";
}

export function validate_course_student_code(value) {
  const text = String(value || "").trim();
  if (!text) return "Enter a course ID";
  if (text.length > 40) return "Course ID must be 40 characters or less";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(text)) {
    return "Use letters, numbers, dot, hyphen, or underscore";
  }
  return "";
}

export function validate_course(body = {}) {
  const offline = as_bool(body.is_offline);
  const paid = as_bool(body.is_paid);
  return {
    course_name: validateRequiredText(body.course_name, "Course name", 150),
    course_type_id: validatePositiveInteger(body.course_type_id, "Course type", true),
    duration_hours: validate_duration_hours(body.duration_hours),
    course_tagline: validateRequiredText(body.course_tagline, "Tagline", 200),
    course_description: validateOptionalText(body.course_description, "Description", 2000),
    enroll_passkey: validate_passkey(body.enroll_passkey, false),
    student_id_format: validate_id_format(body.student_id_format, offline),
    created_by_display: validateOptionalText(body.created_by_display, "Created by", 150),
    real_world_project_count: validate_project_count(body.real_world_project_count),
    learn_points: validate_points(body.learn_points, "What you'll learn"),
    audience_points: validate_points(body.audience_points, "Who this course is for"),
    course_domain_id: validatePositiveInteger(body.course_domain_id, "Domain", true),
    course_level_id: validatePositiveInteger(body.course_level_id, "Level", true),
    course_tag_id: validatePositiveInteger(body.course_tag_id, "Tag", true),
    language_ids: unique_ids(body.language_ids).length ? "" : "Select at least one language",
    fee_amount: validate_amount(body.fee_amount, paid),
    discount_percent: paid ? validate_discount(body.discount_percent) : ""
  };
}

export function fail(message, status = 400, extras = {}) {
  const error = new Error(message);
  error.status = status;
  if (extras.code) error.code = extras.code;
  if (extras.details != null) error.details = extras.details;
  return error;
}

export function first_validation_error(body) {
  const errors = validate_course(body);
  return Object.values(errors).find(Boolean) || "";
}

export function map_passkey_entries(raw, id_field = "program_id") {
  const map = new Map();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const id = Number(item?.[id_field]);
      const passkey = String(item?.enroll_passkey ?? item?.passkey ?? "").trim();
      if (Number.isInteger(id) && id > 0 && passkey) map.set(id, passkey);
    }
    return map;
  }
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      const id = Number(key);
      const passkey = String(value || "").trim();
      if (Number.isInteger(id) && id > 0 && passkey) map.set(id, passkey);
    }
  }
  return map;
}

export function assert_passkey_value(passkey, required = true) {
  const message = validate_passkey(passkey, required);
  if (message) throw fail(message);
  return String(passkey || "").trim();
}

export function assert_offline_program_passkeys(is_offline, program_ids, passkeys, existing = new Map()) {
  if (!is_offline) return;
  const ids = unique_ids(program_ids);
  if (!ids.length) return;
  for (const program_id of ids) {
    const next = String(passkeys.get(program_id) || "").trim();
    const current = String(existing.get(program_id) || "").trim();
    if (!next && !current) {
      throw fail("Set a passkey for each program assigned to this offline course");
    }
    if (next) assert_passkey_value(next, true);
  }
}

export async function existing_program_passkeys(pool, course_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT program_id, enroll_passkey
     FROM tbl_program_courses
     WHERE course_id = ? AND is_deleted = FALSE`,
    [course_id]
  );
  return new Map(
    (rows || []).
      map((row) => [Number(row.program_id), String(row.enroll_passkey || "").trim()]).
      filter(([, key]) => Boolean(key))
  );
}

export function map_row(row) {
  return {
    course_id: row.course_id,
    course_code: row.course_code,
    course_name: row.course_name,
    course_tagline: row.course_tagline || "",
    course_description: row.course_description || "",
    course_type_id: row.course_type_id,
    course_type: row.course_type,
    duration_hours: row.duration_hours == null ? null : Number(row.duration_hours),
    level: row.course_level || row.level || "",
    fee_amount: row.fee_amount == null ? null : Number(row.fee_amount),
    discount_percent: row.discount_percent == null ? null : Number(row.discount_percent),
    created_by_display: row.created_by_display || "",
    real_world_project_count: row.real_world_project_count == null ? null : Number(row.real_world_project_count),
    has_completion_certificate: Boolean(row.has_completion_certificate),
    learn_points: read_points(row.learn_points),
    audience_points: read_points(row.audience_points),
    is_paid: Boolean(row.is_paid),
    is_open: Boolean(row.is_open),
    course_domain_id: row.course_domain_id == null ? null : Number(row.course_domain_id),
    course_domain: row.course_domain || "",
    course_level_id: row.course_level_id == null ? null : Number(row.course_level_id),
    course_level: row.course_level || "",
    course_tag_id: row.course_tag_id == null ? null : Number(row.course_tag_id),
    course_tag: row.course_tag || "",
    language_ids: String(row.language_ids || "").split(",").map((id) => Number(id)).filter((id) => id > 0),
    languages: String(row.language_names || "").split("||").map((name) => name.trim()).filter(Boolean),
    thumbnail_url: row.thumbnail_url || "",
    is_offline: Boolean(row.is_offline),
    enroll_passkey: row.enroll_passkey || "",
    student_id_format: row.student_id_format || "",
    is_active: Boolean(row.is_active),
    program_count: Number(row.program_count || 0),
    enrolled_count: Number(row.enrolled_count || 0),
    program_ids: String(row.program_ids || "").
    split(",").
    map((id) => Number(id)).
    filter((id) => id > 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_name: row.created_by_name || "",
    updated_by_name: row.updated_by_name || ""
  };
}

export async function require_type(pool, type_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT course_type_id FROM mst_course_types
     WHERE course_type_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [type_id]
  );
  if (!rows?.[0]) throw fail("Select a valid course type");
}

export function payload(body) {
  const offline = as_bool(body.is_offline);
  const paid = as_bool(body.is_paid);
  const passkey = String(body.enroll_passkey || "").trim() || null;
  const id_format = normalize_id_format(body.student_id_format) || null;
  const learn = clean_points(body.learn_points);
  const audience = clean_points(body.audience_points);
  const discount_text = String(body.discount_percent ?? "").trim();
  return {
    course_name: String(body.course_name).trim(),
    course_tagline: String(body.course_tagline || "").trim(),
    course_type_id: Number(body.course_type_id),
    course_description: String(body.course_description || "").trim() || null,
    duration_hours: String(body.duration_hours || "").trim() ?
    Number(body.duration_hours) :
    null,
    created_by_display: String(body.created_by_display || "").trim() || null,
    real_world_project_count: String(body.real_world_project_count ?? "").trim() ?
    Number(body.real_world_project_count) :
    null,
    has_completion_certificate: as_bool(body.has_completion_certificate),
    learn_points: learn.length ? JSON.stringify(learn) : null,
    audience_points: audience.length ? JSON.stringify(audience) : null,
    is_paid: paid,
    fee_amount: paid ? Number(body.fee_amount) : null,
    discount_percent: paid && discount_text ? Number(discount_text) : null,
    course_domain_id: Number(body.course_domain_id),
    course_level_id: Number(body.course_level_id),
    course_tag_id: Number(body.course_tag_id),
    language_ids: unique_ids(body.language_ids),
    is_open: as_bool(body.is_open),
    is_offline: Boolean(offline),
    enroll_passkey: passkey,
    student_id_format: id_format,
    is_active: body.is_active === false || body.is_active === "false" ? false : true
  };
}

async function require_master(pool, table, column, id, message) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${column} AS id, ${column.replace(/_id$/, "_name")} AS name
     FROM ${table}
     WHERE ${column} = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  if (!rows?.[0]) throw fail(message);
  return rows[0];
}

async function require_languages(pool, ids) {
  if (!ids.length) throw fail("Select at least one language");
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await sqlQuery(
    pool,
    `SELECT course_language_id FROM mst_course_languages
     WHERE course_language_id IN (${placeholders}) AND is_deleted = FALSE`,
    ids
  );
  if ((rows || []).length !== ids.length) throw fail("Select valid languages");
}

async function replace_languages(pool, course_id, ids) {
  await sqlQuery(pool, `DELETE FROM tbl_course_languages WHERE course_id = ?`, [course_id]);
  if (!ids.length) return;
  const marks = ids.map(() => "(?, ?)").join(", ");
  const params = ids.flatMap((id) => [course_id, id]);
  await sqlQuery(
    pool,
    `INSERT INTO tbl_course_languages (course_id, course_language_id) VALUES ${marks}`,
    params
  );
}

async function prepare_course(pool, body) {
  const data = payload(body);
  await require_type(pool, data.course_type_id);
  await require_master(pool, "mst_course_domains", "course_domain_id", data.course_domain_id, "Select a valid domain");
  const level = await require_master(pool, "mst_course_levels", "course_level_id", data.course_level_id, "Select a valid level");
  await require_master(pool, "mst_course_tags", "course_tag_id", data.course_tag_id, "Select a valid tag");
  await require_languages(pool, data.language_ids);
  data.level = level.name;
  return data;
}

export function unique_ids(values) {
  return [...new Set((values || []).map((id) => Number(id)).filter((id) => id > 0))];
}

export async function require_programs(pool, ids) {
  if (!ids.length) return;
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await sqlQuery(
    pool,
    `SELECT program_id FROM tbl_programs
     WHERE program_id IN (${placeholders}) AND is_deleted = FALSE`,
    ids
  );
  if ((rows || []).length !== ids.length) throw fail("Select valid programs");
}

export async function list_assigned_employees(pool, course_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
            e.email, e.mobile_number, d.department_name AS department,
            des.designation_name AS designation, MIN(pe.role) AS role
     FROM tbl_program_employees pe
     INNER JOIN tbl_program_courses pc
       ON pc.program_id = pe.program_id AND pc.course_id = ? AND pc.is_deleted = FALSE
     INNER JOIN tbl_employees e ON e.employee_id = pe.employee_id AND e.is_deleted = FALSE
     LEFT JOIN mst_departments d ON d.department_id = e.department_id
     LEFT JOIN mst_designations des ON des.designation_id = e.designation_id
     WHERE pe.is_deleted = FALSE AND pe.is_active = TRUE
     GROUP BY e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
              e.email, e.mobile_number, d.department_name, des.designation_name
     ORDER BY e.first_name ASC, e.last_name ASC`,
    [course_id]
  );
  return (rows || []).map((row) => ({
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" "),
    email: row.email || "",
    mobile_number: row.mobile_number || "",
    department: row.department || "",
    designation: row.designation || "",
    role: row.role || "instructor"
  }));
}

export async function count_one(pool, sql, params) {
  const [rows] = await sqlQuery(pool, sql, params);
  return Number(rows?.[0]?.total || 0);
}

function day_text(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${date}`;
  }
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

export async function list_assigned_programs(pool, course_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT p.program_id, p.program_code, p.program_name, p.is_active,
            p.duration_months, p.description, p.start_date, p.end_date,
            t.program_type_name AS program_type,
            c.cohort_id, c.cohort_name,
            pc.enroll_passkey
     FROM tbl_program_courses pc
     INNER JOIN tbl_programs p ON p.program_id = pc.program_id
     LEFT JOIN mst_program_types t ON t.program_type_id = p.program_type_id
     LEFT JOIN (
       SELECT cp.program_id, MIN(cp.cohort_id) AS cohort_id
       FROM tbl_cohort_programs cp
       INNER JOIN tbl_cohorts live_cohort
         ON live_cohort.cohort_id = cp.cohort_id AND live_cohort.is_deleted = FALSE
       WHERE cp.is_deleted = FALSE
       GROUP BY cp.program_id
     ) link ON link.program_id = p.program_id
     LEFT JOIN tbl_cohorts c ON c.cohort_id = link.cohort_id
     WHERE pc.course_id = ? AND pc.is_deleted = FALSE AND p.is_deleted = FALSE
     ORDER BY c.cohort_name ASC, p.program_name ASC`,
    [course_id]
  );
  const programs = (rows || []).map((row) => ({
    program_id: row.program_id,
    program_code: row.program_code,
    program_name: row.program_name,
    program_type: row.program_type || "",
    duration_months: row.duration_months,
    description: row.description || "",
    start_date: day_text(row.start_date),
    end_date: day_text(row.end_date),
    cohort_id: row.cohort_id || null,
    cohort_name: row.cohort_name || "",
    cohorts: [],
    is_active: Boolean(row.is_active),
    enroll_passkey: row.enroll_passkey || "",
    has_passkey: Boolean(String(row.enroll_passkey || "").trim())
  }));
  if (!programs.length) return programs;

  const ids = programs.map((program) => program.program_id);
  const [links] = await sqlQuery(
    pool,
    `SELECT cp.program_id, c.cohort_id, c.cohort_name
     FROM tbl_cohort_programs cp
     INNER JOIN tbl_cohorts c
       ON c.cohort_id = cp.cohort_id AND c.is_deleted = FALSE
     WHERE cp.is_deleted = FALSE
       AND cp.program_id IN (${ids.map(() => "?").join(", ")})
     ORDER BY c.cohort_name ASC`,
    ids
  );
  const by_program = new Map();
  for (const link of links || []) {
    const list = by_program.get(link.program_id) || [];
    list.push({
      cohort_id: link.cohort_id,
      cohort_name: link.cohort_name || ""
    });
    by_program.set(link.program_id, list);
  }
  for (const program of programs) {
    program.cohorts = by_program.get(program.program_id) || [];
  }
  return programs;
}

export async function apply_program_passkeys(pool, course_id, passkeys, overwrite = false) {
  if (!passkeys.size) return;
  const conflicts = [];

  for (const [program_id, passkey] of passkeys.entries()) {
    const next_key = assert_passkey_value(passkey, true);
    const [rows] = await sqlQuery(
      pool,
      `SELECT program_course_id, enroll_passkey, is_deleted
       FROM tbl_program_courses
       WHERE program_id = ? AND course_id = ?
       LIMIT 1`,
      [program_id, course_id]
    );
    const row = rows?.[0];
    if (!row || row.is_deleted) {
      throw fail("Assign the course to this program before setting a passkey");
    }
    const current = String(row.enroll_passkey || "").trim();
    if (current && current.toUpperCase() !== next_key.toUpperCase() && !overwrite) {
      conflicts.push({ program_id, course_id });
    }
  }

  if (conflicts.length) {
    throw fail(
      "A passkey already exists for one or more programs. Confirm to replace it.",
      409,
      { code: "PASSKEY_EXISTS", details: { conflicts } }
    );
  }

  for (const [program_id, passkey] of passkeys.entries()) {
    const next_key = assert_passkey_value(passkey, true);
    await sqlQuery(
      pool,
      `UPDATE tbl_program_courses
       SET enroll_passkey = ?, updated_at = NOW()
       WHERE program_id = ? AND course_id = ? AND is_deleted = FALSE`,
      [next_key, program_id, course_id]
    );
  }
}

export async function set_course_programs(pool, course_id, program_ids, options = {}) {
  const ids = unique_ids(program_ids);
  await require_programs(pool, ids);
  const passkeys = options.passkeys instanceof Map ? options.passkeys : map_passkey_entries(options.passkeys);
  const overwrite = Boolean(options.overwrite);

  const [existing] = await sqlQuery(
    pool,
    `SELECT program_course_id, program_id, enroll_passkey, is_deleted
     FROM tbl_program_courses
     WHERE course_id = ?`,
    [course_id]
  );

  const wanted = new Set(ids);
  const by_program = new Map((existing || []).map((row) => [Number(row.program_id), row]));

  for (const program_id of ids) {
    const row = by_program.get(program_id);
    if (row) {
      await sqlQuery(
        pool,
        `UPDATE tbl_program_courses
         SET is_deleted = FALSE, is_active = TRUE
         WHERE program_course_id = ?`,
        [row.program_course_id]
      );
    } else {
      await sqlQuery(
        pool,
        `INSERT INTO tbl_program_courses (program_id, course_id) VALUES (?, ?)`,
        [program_id, course_id]
      );
    }
  }

  for (const row of existing || []) {
    if (!wanted.has(Number(row.program_id)) && !row.is_deleted) {
      await sqlQuery(
        pool,
        `UPDATE tbl_program_courses
         SET is_deleted = TRUE, is_active = FALSE
         WHERE program_course_id = ?`,
        [row.program_course_id]
      );
    }
  }

  if (passkeys.size) {
    await apply_program_passkeys(pool, course_id, passkeys, overwrite);
  }
}

function enrolled_day(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function export_course_enrollments(user = {}, course_id = null) {
  await ensure_course_schema();
  await ensure_registration_schema();
  const pool = get_pool();
  const scoped_id = assignment_employee_id(user);
  const where = ["c.is_deleted = FALSE"];
  const params = [];
  const id = Number(course_id);
  if (Number.isInteger(id) && id > 0) {
    where.push("c.course_id = ?");
    params.push(id);
  }
  if (scoped_id != null) {
    where.push(course_assigned_sql("c"));
    params.push(scoped_id);
  }
  const where_sql = where.join(" AND ");
  const [course_rows] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.course_code, c.course_name, c.duration_hours, c.is_active, c.is_open,
            t.course_type_name AS course_type, lv.course_level_name AS course_level,
            (
              SELECT COUNT(DISTINCT r.student_id)
              FROM tbl_course_registrations r
              INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
              WHERE r.course_id = c.course_id
                AND r.is_deleted = FALSE
                AND r.status = 'registered'
            ) AS enrolled_count
     FROM tbl_courses c
     LEFT JOIN mst_course_types t ON t.course_type_id = c.course_type_id
     LEFT JOIN mst_course_levels lv ON lv.course_level_id = c.course_level_id
     WHERE ${where_sql}
     ORDER BY c.course_name ASC, c.course_id ASC`,
    params
  );
  const [student_rows] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.course_code, c.course_name,
            r.course_student_id,
            s.first_name, s.last_name, s.email, s.mobile_number,
            p.program_name, r.created_at AS enrolled_at
     FROM tbl_course_registrations r
     INNER JOIN tbl_courses c ON c.course_id = r.course_id AND c.is_deleted = FALSE
     INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
     LEFT JOIN tbl_programs p ON p.program_id = r.program_id AND p.is_deleted = FALSE
     WHERE r.is_deleted = FALSE AND r.status = 'registered' AND ${where_sql}
     ORDER BY c.course_name ASC, s.first_name ASC, s.last_name ASC, s.student_id ASC`,
    params
  );
  return {
    courses: (course_rows || []).map((row) => ({
      course_id: row.course_id,
      course_code: row.course_code || "",
      course_name: row.course_name || "",
      course_type: row.course_type || "",
      course_level: row.course_level || "",
      duration_hours: row.duration_hours == null ? "" : Number(row.duration_hours),
      is_open: Boolean(row.is_open),
      is_active: Boolean(row.is_active),
      enrolled_count: Number(row.enrolled_count || 0)
    })),
    students: (student_rows || []).map((row) => ({
      course_id: row.course_id,
      course_code: row.course_code || "",
      course_name: row.course_name || "",
      course_student_id: row.course_student_id || "",
      student_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
      email: row.email || "",
      mobile_number: row.mobile_number || "",
      program_name: row.program_name || "",
      enrolled_on: enrolled_day(row.enrolled_at)
    }))
  };
}

export async function list_courses(query = {}, user = {}) {
  await ensure_course_schema();
  await ensure_registration_schema();
  const search = String(query.search || "").trim();
  const type_id = String(query.type || "").trim();
  const status = String(query.status || "").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const page_size = Math.min(500, Math.max(5, Number(query.pageSize) || 10));
  const sort = SORTS[query.sort] || "c.created_at";
  const direction = String(query.dir).toLowerCase() === "asc" ? "ASC" : "DESC";
  const like = `%${search}%`;
  const pool = get_pool();
  const scoped_id = assignment_employee_id(user);

  const where = ["c.is_deleted = FALSE"];
  const params = [];

  if (search) {
    where.push("(c.course_name LIKE ? OR c.course_code LIKE ?)");
    params.push(like, like);
  }
  if (type_id) {
    where.push("c.course_type_id = ?");
    params.push(Number(type_id));
  }
  if (status === "active") where.push("c.is_active = TRUE");
  if (status === "inactive") where.push("c.is_active = FALSE");
  if (scoped_id != null) {
    where.push(course_assigned_sql("c"));
    params.push(scoped_id);
  }

  const where_sql = where.join(" AND ");
  const offset = (page - 1) * page_size;

  const [count_rows] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_courses c WHERE ${where_sql}`,
    params
  );
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${COURSE_SELECT}
     FROM tbl_courses c
     ${COURSE_JOINS}
     WHERE ${where_sql}
     ORDER BY ${sort} ${direction}, c.course_id DESC
     LIMIT ${page_size} OFFSET ${offset}`,
    params
  );

  return {
    items: (rows || []).map(map_row),
    total: Number(count_rows?.[0]?.total || 0),
    page,
    page_size
  };
}

export async function get_course(id, user = {}) {
  await ensure_course_schema();
  const pool = get_pool();
  const scoped_id = assignment_employee_id(user);
  const where = ["c.course_id = ?", "c.is_deleted = FALSE"];
  const params = [id];
  if (scoped_id != null) {
    where.push(course_assigned_sql("c"));
    params.push(scoped_id);
  }
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${COURSE_SELECT},
            NULLIF(TRIM(CONCAT_WS(' ', creator.first_name, creator.last_name)), '') AS created_by_name,
            NULLIF(TRIM(CONCAT_WS(' ', updater.first_name, updater.last_name)), '') AS updated_by_name
     FROM tbl_courses c
     ${COURSE_JOINS}
     LEFT JOIN tbl_employees creator
       ON creator.employee_id = c.created_by AND creator.is_deleted = FALSE
     LEFT JOIN tbl_employees updater
       ON updater.employee_id = c.updated_by AND updater.is_deleted = FALSE
     WHERE ${where.join(" AND ")}
     LIMIT 1`,
    params
  );
  const row = rows?.[0];
  if (!row) throw fail("Course not found", 404);
  const course = map_row(row);
  course.programs = await list_assigned_programs(pool, id);
  course.program_count = course.programs.length;
  course.employees = await list_assigned_employees(pool, id);
  return course;
}

export async function create_course(body = {}) {
  const first_error = first_validation_error(body);
  if (first_error) throw fail(first_error);

  await ensure_course_schema();
  const pool = get_pool();
  const data = await prepare_course(pool, body);
  const program_ids = unique_ids(body.program_ids);
  await require_programs(pool, program_ids);
  const program_passkeys = map_passkey_entries(body.program_passkeys);
  assert_offline_program_passkeys(data.is_offline, program_ids, program_passkeys);

  const connection = await pool.getConnection();
  let course_id = 0;
  let code = "";
  try {
    await connection.beginTransaction();
    code = await allocate_domain_course_code(connection, data.course_domain_id);
    const [result] = await connection.query(
      `INSERT INTO tbl_courses (
        course_code, course_name, course_tagline, course_description, course_type_id,
        duration_hours, level, fee_amount, discount_percent, created_by_display,
        real_world_project_count, has_completion_certificate, learn_points, audience_points,
        is_paid, is_open, course_domain_id, course_level_id, course_tag_id,
        is_offline, enroll_passkey, student_id_format, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
      code,
      data.course_name,
      data.course_tagline,
      data.course_description,
      data.course_type_id,
      data.duration_hours,
      data.level,
      data.fee_amount,
      data.discount_percent,
      data.created_by_display,
      data.real_world_project_count,
      data.has_completion_certificate,
      data.learn_points,
      data.audience_points,
      data.is_paid,
      data.is_open,
      data.course_domain_id,
      data.course_level_id,
      data.course_tag_id,
      data.is_offline,
      data.enroll_passkey,
      data.student_id_format,
      data.is_active]
    );
    course_id = result.insertId;
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    log.fail("createCourse", err.message);
    throw err;
  } finally {
    connection.release();
  }

  await replace_languages(pool, course_id, data.language_ids);
  if (program_ids.length) {
    await set_course_programs(pool, course_id, program_ids, {
      passkeys: program_passkeys,
      overwrite: true
    });
  }
  log.pass("createCourse", `created ${code}`);
  return get_course(course_id);
}

export async function update_course(id, body = {}) {
  const first_error = first_validation_error(body);
  if (first_error) throw fail(first_error);
  const current = await get_course(id);

  const pool = get_pool();
  const data = await prepare_course(pool, body);
  const [domain_rows] = await sqlQuery(
    pool,
    `SELECT code_letters FROM mst_course_domains
     WHERE course_domain_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [data.course_domain_id]
  );
  const letters = domain_rows?.[0]?.code_letters || "";
  const same_domain = Number(current.course_domain_id) === Number(data.course_domain_id);
  const format_ready = /^[A-Z]{1,5}$/.test(String(letters).trim().toUpperCase());
  const keep_code = same_domain && (!format_ready || matches_domain_code(current.course_code, letters));

  if (keep_code) {
    await sqlQuery(
      pool,
      `UPDATE tbl_courses
       SET course_name = ?, course_tagline = ?, course_description = ?, course_type_id = ?,
           duration_hours = ?, level = ?, fee_amount = ?, discount_percent = ?,
           created_by_display = ?, real_world_project_count = ?, has_completion_certificate = ?,
           learn_points = ?, audience_points = ?, is_paid = ?, is_open = ?,
           course_domain_id = ?, course_level_id = ?, course_tag_id = ?,
           is_offline = ?, enroll_passkey = ?, student_id_format = ?, is_active = ?
       WHERE course_id = ? AND is_deleted = FALSE`,
      course_update_params(data, id)
    );
  } else {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const code = await allocate_domain_course_code(connection, data.course_domain_id);
      await connection.query(
        `UPDATE tbl_courses
         SET course_code = ?, course_name = ?, course_tagline = ?, course_description = ?, course_type_id = ?,
             duration_hours = ?, level = ?, fee_amount = ?, discount_percent = ?,
             created_by_display = ?, real_world_project_count = ?, has_completion_certificate = ?,
             learn_points = ?, audience_points = ?, is_paid = ?, is_open = ?,
             course_domain_id = ?, course_level_id = ?, course_tag_id = ?,
             is_offline = ?, enroll_passkey = ?, student_id_format = ?, is_active = ?
         WHERE course_id = ? AND is_deleted = FALSE`,
        [code, ...course_update_params(data, id)]
      );
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
  await replace_languages(pool, id, data.language_ids);

  if (body.program_ids !== undefined) {
    const program_ids = unique_ids(body.program_ids);
    const program_passkeys = map_passkey_entries(body.program_passkeys);
    const existing_keys = await existing_program_passkeys(pool, id);
    assert_offline_program_passkeys(data.is_offline, program_ids, program_passkeys, existing_keys);
    await set_course_programs(pool, id, body.program_ids, {
      passkeys: program_passkeys,
      overwrite: body.overwrite_passkeys === true || body.overwrite_passkeys === "true"
    });
  } else if (body.program_passkeys !== undefined) {
    await apply_program_passkeys(
      pool,
      id,
      map_passkey_entries(body.program_passkeys),
      body.overwrite_passkeys === true || body.overwrite_passkeys === "true"
    );
  }

  log.pass("updateCourse", `updated ${id}`);
  return get_course(id);
}

export async function set_course_active(id, is_active) {
  await get_course(id);
  const pool = get_pool();
  await sqlQuery(
    pool,
    `UPDATE tbl_courses SET is_active = ? WHERE course_id = ? AND is_deleted = FALSE`,
    [is_active, id]
  );
  log.pass("setCourseActive", `${id} ${is_active ? "active" : "inactive"}`);
  return get_course(id);
}

export async function upload_course_thumbnail(id, file) {
  const course = await get_course(id);
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT thumbnail_url FROM tbl_courses WHERE course_id = ? AND is_deleted = FALSE`,
    [id]
  );
  const previous = rows?.[0]?.thumbnail_url || "";
  const thumbnail_url = await save_course_image(course.course_id, file);
  await sqlQuery(
    pool,
    `UPDATE tbl_courses SET thumbnail_url = ? WHERE course_id = ? AND is_deleted = FALSE`,
    [thumbnail_url, id]
  );
  if (previous && previous !== thumbnail_url) await forget_stored_file(previous);
  log.pass("uploadCourseThumbnail", thumbnail_url);
  return get_course(id);
}

export async function delete_course_thumbnail(id) {
  await get_course(id);
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT thumbnail_url FROM tbl_courses WHERE course_id = ? AND is_deleted = FALSE`,
    [id]
  );
  const previous = rows?.[0]?.thumbnail_url || "";
  if (previous) await delete_stored_file(previous);
  await sqlQuery(
    pool,
    `UPDATE tbl_courses SET thumbnail_url = NULL WHERE course_id = ? AND is_deleted = FALSE`,
    [id]
  );
  log.pass("deleteCourseThumbnail", `removed thumbnail for ${id}`);
  return get_course(id);
}

export async function delete_course(id) {
  await get_course(id);
  const pool = get_pool();
  await sqlQuery(
    pool,
    `UPDATE tbl_courses SET is_deleted = TRUE, is_active = FALSE WHERE course_id = ?`,
    [id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_program_courses SET is_deleted = TRUE, is_active = FALSE WHERE course_id = ?`,
    [id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_course_employees SET is_deleted = TRUE, is_active = FALSE WHERE course_id = ?`,
    [id]
  );
  log.pass("deleteCourse", `soft_deleted ${id}`);
  return { ok: true };
}

export async function assign_course_programs(id, body = {}) {
  const course = await get_course(id);
  const pool = get_pool();
  const program_ids = unique_ids(body.program_ids);
  const program_passkeys = map_passkey_entries(body.program_passkeys);
  const existing_keys = await existing_program_passkeys(pool, id);
  assert_offline_program_passkeys(course.is_offline, program_ids, program_passkeys, existing_keys);
  await set_course_programs(pool, id, body.program_ids, {
    passkeys: program_passkeys,
    overwrite: body.overwrite_passkeys === true || body.overwrite_passkeys === "true"
  });
  log.pass("assignCoursePrograms", `course ${id} linked to ${program_ids.length} programs`);
  return get_course(id);
}

export async function set_course_program_passkey(id, body = {}) {
  const course = await get_course(id);
  if (!course.is_offline) throw fail("Passkeys are only used for offline courses");
  const program_id = Number(body.program_id);
  if (!Number.isInteger(program_id) || program_id < 1) throw fail("Select a program");
  const passkey = assert_passkey_value(body.enroll_passkey || body.passkey, true);
  const overwrite = body.overwrite === true || body.overwrite === "true";
  const pool = get_pool();

  const [programs] = await sqlQuery(
    pool,
    `SELECT program_id FROM tbl_programs
     WHERE program_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [program_id]
  );
  if (!programs?.[0]) throw fail("Program not found", 404);

  const [links] = await sqlQuery(
    pool,
    `SELECT program_course_id, enroll_passkey, is_deleted
     FROM tbl_program_courses
     WHERE program_id = ? AND course_id = ?
     LIMIT 1`,
    [program_id, id]
  );
  let link = links?.[0];
  if (!link) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_program_courses (program_id, course_id, enroll_passkey)
       VALUES (?, ?, ?)`,
      [program_id, id, passkey]
    );
    log.pass("setCourseProgramPasskey", `course ${id} program ${program_id} created`);
    return get_course(id);
  }
  if (link.is_deleted) {
    await sqlQuery(
      pool,
      `UPDATE tbl_program_courses
       SET is_deleted = FALSE, is_active = TRUE, enroll_passkey = ?, updated_at = NOW()
       WHERE program_course_id = ?`,
      [passkey, link.program_course_id]
    );
    log.pass("setCourseProgramPasskey", `course ${id} program ${program_id} restored`);
    return get_course(id);
  }

  const current = String(link.enroll_passkey || "").trim();
  if (current && current.toUpperCase() !== passkey.toUpperCase() && !overwrite) {
    throw fail("A passkey already exists for this program. Confirm to replace it.", 409, {
      code: "PASSKEY_EXISTS",
      details: { program_id, course_id: id }
    });
  }

  await sqlQuery(
    pool,
    `UPDATE tbl_program_courses
     SET enroll_passkey = ?, updated_at = NOW()
     WHERE program_course_id = ?`,
    [passkey, link.program_course_id]
  );
  log.pass("setCourseProgramPasskey", `course ${id} program ${program_id} updated`);
  return get_course(id);
}

export async function get_course_analytics(id, query = {}) {
  const course = await get_course(id);
  await ensure_registration_schema();
  await ensure_content_schema();
  await ensure_learn_schema();
  const pool = get_pool();
  const program_id = parse_program_id(query.program_id);
  const program_sql = program_id ? " AND program_id = ?" : "";
  const program_params = program_id ? [program_id] : [];

  const enrolled = await count_one(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_course_registrations
     WHERE course_id = ? AND is_deleted = FALSE AND status = 'registered'${program_sql}`,
    [id, ...program_params]
  );

  const [status_rows] = await sqlQuery(
    pool,
    `SELECT learning_status, COUNT(*) AS total
     FROM tbl_course_registrations
     WHERE course_id = ? AND is_deleted = FALSE AND status = 'registered'${program_sql}
     GROUP BY learning_status`,
    [id, ...program_params]
  );
  const by_status = Object.fromEntries(
    (status_rows || []).map((row) => [String(row.learning_status || "not_started"), Number(row.total || 0)])
  );

  const [progress_rows] = await sqlQuery(
    pool,
    `SELECT AVG(progress_percent) AS average_progress,
            SUM(CASE WHEN progress_percent >= 100 THEN 1 ELSE 0 END) AS completed
     FROM tbl_course_registrations
     WHERE course_id = ? AND is_deleted = FALSE AND status = 'registered'${program_sql}`,
    [id, ...program_params]
  );
  const completed = Number(progress_rows?.[0]?.completed || by_status.completed || 0);
  const average_progress = Math.round(Number(progress_rows?.[0]?.average_progress || 0) * 10) / 10;

  const [today_rows] = await sqlQuery(
    pool,
    program_id ?
    `SELECT a.status, COUNT(*) AS total
     FROM tbl_course_attendance a
     INNER JOIN tbl_course_registrations r
       ON r.course_id = a.course_id
      AND r.student_id = a.student_id
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
      AND r.program_id = ?
     WHERE a.course_id = ? AND a.attendance_date = CURDATE()
     GROUP BY a.status` :
    `SELECT status, COUNT(*) AS total
     FROM tbl_course_attendance
     WHERE course_id = ? AND attendance_date = CURDATE()
     GROUP BY status`,
    program_id ? [program_id, id] : [id]
  );
  const today_by_status = Object.fromEntries(
    (today_rows || []).map((row) => [String(row.status || ""), Number(row.total || 0)])
  );
  const marked_today = Object.values(today_by_status).reduce((sum, value) => sum + value, 0);
  const present_today = Number(today_by_status.present || 0);
  const late_today = Number(today_by_status.late || 0);
  const absent_today = Number(today_by_status.absent || 0);
  const unmarked_today = Math.max(0, enrolled - marked_today);
  const attendance_percent = enrolled ?
  Math.round((present_today + late_today) / enrolled * 1000) / 10 :
  0;

  const opened_today = await count_one(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_course_registrations
     WHERE course_id = ? AND is_deleted = FALSE AND status = 'registered'
       AND last_accessed_at IS NOT NULL AND DATE(last_accessed_at) = CURDATE()${program_sql}`,
    [id, ...program_params]
  );
  const opened_percent = enrolled ? Math.round(opened_today / enrolled * 1000) / 10 : 0;

  const modules = await count_one(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_course_modules
     WHERE course_id = ? AND is_deleted = FALSE`,
    [id]
  );
  const lessons = await count_one(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_course_lessons
     WHERE course_id = ? AND is_deleted = FALSE`,
    [id]
  );
  const quizzes = await count_one(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_course_quizzes
     WHERE course_id = ? AND is_deleted = FALSE`,
    [id]
  );
  const content_items = await count_one(
    pool,
    `SELECT COUNT(*) AS total
     FROM tbl_lesson_contents lc
     INNER JOIN tbl_course_lessons l ON l.lesson_id = lc.lesson_id
     WHERE l.course_id = ? AND l.is_deleted = FALSE AND lc.is_deleted = FALSE`,
    [id]
  );

  const [rating_rows] = await sqlQuery(
    pool,
    program_id ?
    `SELECT COUNT(*) AS total, AVG(f.rating) AS average_rating
     FROM tbl_lesson_feedback f
     INNER JOIN tbl_course_registrations r
       ON r.course_id = f.course_id
      AND r.student_id = f.student_id
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
      AND r.program_id = ?
     WHERE f.course_id = ?` :
    `SELECT COUNT(*) AS total, AVG(rating) AS average_rating
     FROM tbl_lesson_feedback
     WHERE course_id = ?`,
    program_id ? [program_id, id] : [id]
  );

  return {
    course_id: course.course_id,
    enrolled,
    present_today: present_today,
    absent_today: absent_today,
    late_today: late_today,
    unmarked_today: unmarked_today,
    marked_today: marked_today,
    attendance_percent: attendance_percent,
    opened_today: opened_today,
    opened_percent: opened_percent,
    not_started: Number(by_status.not_started || 0),
    in_progress: Number(by_status.in_progress || 0),
    completed,
    average_progress: average_progress,
    modules,
    lessons,
    quizzes,
    content_items: content_items,
    feedback_count: Number(rating_rows?.[0]?.total || 0),
    average_rating: Math.round(Number(rating_rows?.[0]?.average_rating || 0) * 10) / 10,
    employees: (course.employees || []).length,
    programs: (course.programs || []).length
  };
}

export function parse_program_id(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

export async function require_course_program(pool, course_id, program_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT program_id
     FROM tbl_program_courses
     WHERE course_id = ? AND program_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [course_id, program_id]
  );
  if (!rows?.[0]) throw fail("This course is not assigned to that program", 404);
}
