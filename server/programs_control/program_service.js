import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import {
  validateOptionalText,
  validatePositiveInteger,
  validateRequiredText } from
"@datapromr/validation";
import { ensure_cohort_schema } from "../cohorts/schema.js";
import { ensure_course_schema } from "../course_manager/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { ensure_program_dropdown_schema } from "../dropdown_manager/schema.js";
import { get_pool } from "../utils/db_setup.js";
import { save_program_image } from "./program_image.js";
import { delete_stored_file, forget_stored_file } from "../utils/storage_buckets.js";
import { list_program_courses as list_assigned_courses, assign_program_courses as save_program_courses } from "../course_manager/course_programs_service.js";
import { assignment_employee_id, program_assigned_sql, assert_assigned_program } from "../utils/assignment_scope.js";
import { create_stamp_code } from "../utils/codes.js";

const SORTS = {
  name: "p.program_name",
  code: "p.program_code",
  type: "t.program_type_name",
  date: "p.created_at",
  status: "p.is_active",
  duration: "p.duration_months"
};

const PROGRAM_SELECT = `
  p.program_id, p.program_code, p.program_name, p.program_type_id,
  t.program_type_name AS program_type, p.duration_months, p.description,
  (
    SELECT h.profile_url
    FROM tbl_cohort_programs cp
    INNER JOIN tbl_cohorts h ON h.cohort_id = cp.cohort_id AND h.is_deleted = FALSE
    WHERE cp.program_id = p.program_id AND cp.is_deleted = FALSE
    ORDER BY cp.cohort_program_id ASC
    LIMIT 1
  ) AS thumbnail_url,
  p.start_date, p.end_date, p.is_active, p.created_at, p.updated_at,
  (
    SELECT COUNT(DISTINCT r.student_id)
    FROM tbl_course_registrations r
    INNER JOIN tbl_program_courses pc
      ON pc.program_id = p.program_id
     AND pc.course_id = r.course_id
     AND pc.is_deleted = FALSE
     AND pc.is_active = TRUE
    INNER JOIN tbl_courses c
      ON c.course_id = r.course_id
     AND c.is_deleted = FALSE
    WHERE r.program_id = p.program_id
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
  ) AS enrolled_students
`;

export function create_program_code(date = new Date()) {
  return create_stamp_code("PRG", date);
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

function date_error(value, label) {
  const raw = String(value || "").trim();
  if (!raw) return `${label} is required`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${label} must be a date`;
  return "";
}

export function validate_program(body = {}) {
  const start = date_error(body.start_date, "Start date");
  const end = date_error(body.end_date, "End date");
  const range = !start && !end && String(body.end_date) < String(body.start_date) ?
    "End date must be on or after the start date" :
    "";
  return {
    program_name: validateRequiredText(body.program_name, "Program name", 150),
    program_type_id: validatePositiveInteger(body.program_type_id, "Program type", true),
    duration_months: validatePositiveInteger(body.duration_months, "Duration", false),
    description: validateOptionalText(body.description, "Description", 2000),
    start_date: start || range,
    end_date: end
  };
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function first_validation_error(body) {
  const errors = validate_program(body);
  return Object.values(errors).find(Boolean) || "";
}

function map_row(row) {
  return {
    program_id: row.program_id,
    program_code: row.program_code,
    program_name: row.program_name,
    program_type_id: row.program_type_id,
    program_type: row.program_type,
    duration_months: row.duration_months,
    description: row.description,
    thumbnail_url: usable_thumbnail_url(row.thumbnail_url),
    start_date: day_text(row.start_date),
    end_date: day_text(row.end_date),
    is_active: Boolean(row.is_active),
    enrolled_students: Number(row.enrolled_students) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function usable_thumbnail_url(value) {
  const url = String(value || "").trim();
  return url || null;
}

async function require_type(pool, type_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT program_type_id FROM mst_program_types
     WHERE program_type_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [type_id]
  );
  if (!rows?.[0]) throw fail("Select a valid program type");
}

export async function list_programs(query = {}, user = {}) {
  await ensure_program_dropdown_schema();
  await ensure_cohort_schema();
  const search = String(query.search || "").trim();
  const type_id = String(query.type || "").trim();
  const status = String(query.status || "").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const page_size = Math.min(500, Math.max(5, Number(query.pageSize) || 10));
  const sort = SORTS[query.sort] || "p.created_at";
  const direction = String(query.dir).toLowerCase() === "asc" ? "ASC" : "DESC";
  const like = `%${search}%`;
  const pool = get_pool();
  const scoped_id = assignment_employee_id(user);

  const where = ["p.is_deleted = FALSE"];
  const params = [];

  if (search) {
    where.push("(p.program_name LIKE ? OR p.program_code LIKE ?)");
    params.push(like, like);
  }

  if (type_id) {
    where.push("p.program_type_id = ?");
    params.push(Number(type_id));
  }

  if (status === "active") {
    where.push("p.is_active = TRUE");
  } else if (status === "inactive") {
    where.push("p.is_active = FALSE");
  }

  const cohort_id = String(query.cohort_id || "").trim();
  if (cohort_id) {
    const id = Number(cohort_id);
    if (!Number.isInteger(id) || id <= 0) throw fail("Select a valid cohort");
    where.push(`EXISTS (
      SELECT 1
      FROM tbl_cohort_programs cp
      WHERE cp.program_id = p.program_id
        AND cp.cohort_id = ?
        AND cp.is_deleted = FALSE
    )`);
    params.push(id);
  }

  if (scoped_id != null) {
    where.push(program_assigned_sql("p"));
    params.push(scoped_id);
  }

  const where_sql = where.join(" AND ");
  const offset = (page - 1) * page_size;

  const [count_rows] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total
     FROM tbl_programs p
     WHERE ${where_sql}`,
    params
  );
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${PROGRAM_SELECT}
     FROM tbl_programs p
     LEFT JOIN mst_program_types t ON t.program_type_id = p.program_type_id
     WHERE ${where_sql}
     ORDER BY ${sort} ${direction}
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

export async function get_program(id, user = {}) {
  await ensure_program_dropdown_schema();
  await ensure_cohort_schema();
  await assert_assigned_program(id, user);
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${PROGRAM_SELECT}
     FROM tbl_programs p
     LEFT JOIN mst_program_types t ON t.program_type_id = p.program_type_id
     WHERE p.program_id = ? AND p.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Program not found", 404);
  return map_row(row);
}

export async function create_program(body = {}) {
  const first_error = first_validation_error(body);
  if (first_error) throw fail(first_error);

  await ensure_program_dropdown_schema();
  const pool = get_pool();
  const type_id = Number(body.program_type_id);
  await require_type(pool, type_id);

  const name = String(body.program_name).trim();
  const description = String(body.description || "").trim() || null;
  const duration = String(body.duration_months || "").trim() ?
  Number(body.duration_months) :
  null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = create_program_code(new Date(Date.now() + attempt * 1000));
    try {
      const [result] = await sqlQuery(
        pool,
        `INSERT INTO tbl_programs (
          program_code, program_name, program_type_id, duration_months, description, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [code, name, type_id, duration, description, String(body.start_date).trim(), String(body.end_date).trim()]
      );
      log.pass("createProgram", `created ${code}`);
      return get_program(result.insertId);
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY" && attempt < 4) continue;
      log.fail("createProgram", err.message);
      throw err;
    }
  }

  throw fail("Unable to generate a unique program code", 500);
}

export async function update_program(id, body = {}) {
  const first_error = first_validation_error(body);
  if (first_error) throw fail(first_error);
  await get_program(id);

  const pool = get_pool();
  const type_id = Number(body.program_type_id);
  await require_type(pool, type_id);

  const name = String(body.program_name).trim();
  const description = String(body.description || "").trim() || null;
  const duration = String(body.duration_months || "").trim() ?
  Number(body.duration_months) :
  null;

  await sqlQuery(
    pool,
    `UPDATE tbl_programs
     SET program_name = ?, program_type_id = ?, duration_months = ?, description = ?,
         start_date = ?, end_date = ?
     WHERE program_id = ? AND is_deleted = FALSE`,
    [name, type_id, duration, description, String(body.start_date).trim(), String(body.end_date).trim(), id]
  );

  log.pass("updateProgram", `updated ${id}`);
  return get_program(id);
}

export async function set_program_active(id, is_active) {
  await get_program(id);
  const pool = get_pool();
  await sqlQuery(
    pool,
    `UPDATE tbl_programs SET is_active = ? WHERE program_id = ? AND is_deleted = FALSE`,
    [is_active, id]
  );
  log.pass("setProgramActive", `${id} ${is_active ? "active" : "inactive"}`);
  return get_program(id);
}

export async function delete_program(id) {
  await get_program(id);
  const pool = get_pool();
  await ensure_course_schema();
  await sqlQuery(
    pool,
    `UPDATE tbl_programs SET is_deleted = TRUE, is_active = FALSE WHERE program_id = ?`,
    [id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_program_employees SET is_deleted = TRUE, is_active = FALSE WHERE program_id = ?`,
    [id]
  );
  log.pass("deleteProgram", `soft_deleted ${id}`);
  return { ok: true };
}

async function thumbnail_still_shared(pool, url, program_id) {
  const [programs] = await sqlQuery(
    pool,
    `SELECT program_id FROM tbl_programs
     WHERE thumbnail_url = ? AND is_deleted = FALSE AND program_id <> ?
     LIMIT 1`,
    [url, program_id]
  );
  if (programs?.[0]) return true;
  const [cohorts] = await sqlQuery(
    pool,
    `SELECT cohort_id FROM tbl_cohorts
     WHERE thumbnail_url = ? AND is_deleted = FALSE
     LIMIT 1`,
    [url]
  );
  return Boolean(cohorts?.[0]);
}

async function stored_program_thumbnail(pool, id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT thumbnail_url FROM tbl_programs WHERE program_id = ? AND is_deleted = FALSE`,
    [id]
  );
  return rows?.[0]?.thumbnail_url || "";
}

export async function upload_program_thumbnail(id, file) {
  const program = await get_program(id);
  const pool = get_pool();
  const previous = await stored_program_thumbnail(pool, id);
  const thumbnail_url = await save_program_image(program.program_id, file);
  await sqlQuery(
    pool,
    `UPDATE tbl_programs SET thumbnail_url = ? WHERE program_id = ? AND is_deleted = FALSE`,
    [thumbnail_url, id]
  );
  if (previous && previous !== thumbnail_url && !(await thumbnail_still_shared(pool, previous, id))) {
    await forget_stored_file(previous);
  }
  log.pass("uploadProgramThumbnail", thumbnail_url);
  return get_program(id);
}

export async function delete_program_thumbnail(id) {
  await get_program(id);
  const pool = get_pool();
  const previous = await stored_program_thumbnail(pool, id);
  if (previous && !(await thumbnail_still_shared(pool, previous, id))) {
    await delete_stored_file(previous);
  }
  await sqlQuery(
    pool,
    `UPDATE tbl_programs SET thumbnail_url = NULL WHERE program_id = ? AND is_deleted = FALSE`,
    [id]
  );
  log.pass("deleteProgramThumbnail", `removed thumbnail for ${id}`);
  return get_program(id);
}

export async function list_program_courses(program_id, user = {}) {
  await get_program(program_id, user);
  return list_assigned_courses(program_id, user);
}

export async function assign_program_courses(program_id, body = {}) {
  await get_program(program_id);
  return save_program_courses(program_id, body);
}

function group_roster(rows, id_key, map_person, map_course) {
  const people = new Map();
  for (const row of rows || []) {
    const id = row[id_key];
    if (!people.has(id)) {
      people.set(id, { ...map_person(row), courses: [] });
    }
    const person = people.get(id);
    const course = map_course(row);
    if (!person.courses.some((item) => item.course_id === course.course_id)) {
      person.courses.push(course);
    }
  }
  return [...people.values()];
}

export async function list_program_students(program_id) {
  await get_program(program_id);
  await ensure_registration_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT s.student_id, s.first_name, s.last_name, s.email, s.mobile_number,
            s.date_of_birth, s.is_active, s.terms_accepted, s.terms_accepted_at,
            s.created_at, s.updated_at,
            c.course_id, c.course_code, c.course_name,
            r.status, r.learning_status, r.progress_percent, r.created_at AS enrolled_at
     FROM tbl_course_registrations r
     INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
     INNER JOIN tbl_courses c ON c.course_id = r.course_id AND c.is_deleted = FALSE
     WHERE r.is_deleted = FALSE
       AND r.status = 'registered'
       AND r.program_id = ?
     ORDER BY s.first_name ASC, s.last_name ASC, c.course_name ASC`,
    [program_id]
  );

  const items = group_roster(
    rows,
    "student_id",
    (row) => ({
      student_id: row.student_id,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
      email: row.email || "",
      mobile_number: row.mobile_number || "",
      date_of_birth: row.date_of_birth || null,
      is_active: row.is_active !== false && row.is_active !== 0,
      terms_accepted: row.terms_accepted === true || row.terms_accepted === 1,
      terms_accepted_at: row.terms_accepted_at || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null
    }),
    (row) => ({
      course_id: row.course_id,
      course_code: row.course_code,
      course_name: row.course_name,
      status: row.status || "registered",
      learning_status: row.learning_status || "not_started",
      progress_percent: Number(row.progress_percent) || 0,
      enrolled_at: row.enrolled_at
    })
  );

  return { items, total: items.length };
}

function faculty_ids(values) {
  return [...new Set((values || []).map((id) => Number(id)).filter((id) => id > 0))];
}

export async function list_program_faculty(program_id) {
  await get_program(program_id);
  await ensure_course_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
            e.email, e.mobile_number, d.department_name AS department,
            des.designation_name AS designation, pe.role
     FROM tbl_program_employees pe
     INNER JOIN tbl_employees e ON e.employee_id = pe.employee_id AND e.is_deleted = FALSE
     LEFT JOIN mst_departments d ON d.department_id = e.department_id
     LEFT JOIN mst_designations des ON des.designation_id = e.designation_id
     WHERE pe.program_id = ? AND pe.is_deleted = FALSE
     ORDER BY e.first_name ASC, e.last_name ASC`,
    [program_id]
  );
  const items = (rows || []).map((row) => ({
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
  return { items, total: items.length };
}

export async function set_program_faculty(program_id, employee_ids) {
  await get_program(program_id);
  await ensure_course_schema();
  const pool = get_pool();
  const ids = faculty_ids(employee_ids);
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    const [people] = await sqlQuery(
      pool,
      `SELECT employee_id FROM tbl_employees
       WHERE employee_id IN (${placeholders}) AND is_deleted = FALSE`,
      ids
    );
    if ((people || []).length !== ids.length) {
      const error = new Error("Select valid employees");
      error.status = 400;
      throw error;
    }
  }

  const [existing] = await sqlQuery(
    pool,
    `SELECT program_employee_id, employee_id, is_deleted
     FROM tbl_program_employees
     WHERE program_id = ?`,
    [program_id]
  );
  const wanted = new Set(ids);
  const by_employee = new Map((existing || []).map((row) => [Number(row.employee_id), row]));

  for (const employee_id of ids) {
    const row = by_employee.get(employee_id);
    if (row) {
      await sqlQuery(
        pool,
        `UPDATE tbl_program_employees
         SET is_deleted = FALSE, is_active = TRUE
         WHERE program_employee_id = ?`,
        [row.program_employee_id]
      );
    } else {
      await sqlQuery(
        pool,
        `INSERT INTO tbl_program_employees (program_id, employee_id, role) VALUES (?, ?, 'instructor')`,
        [program_id, employee_id]
      );
    }
  }

  for (const row of existing || []) {
    if (!wanted.has(Number(row.employee_id)) && !row.is_deleted) {
      await sqlQuery(
        pool,
        `UPDATE tbl_program_employees
         SET is_deleted = TRUE, is_active = FALSE
         WHERE program_employee_id = ?`,
        [row.program_employee_id]
      );
    }
  }

  log.pass("setProgramFaculty", `program ${program_id} linked to ${ids.length} faculty`);
  return list_program_faculty(program_id);
}
