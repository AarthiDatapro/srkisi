import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import {
  validateOptionalText,
  validatePositiveInteger,
  validateRequiredText } from
"@datapromr/validation";
import { create_stamp_code } from "../utils/codes.js";
import { get_pool } from "../utils/db_setup.js";
import { delete_stored_file, forget_stored_file } from "../utils/storage_buckets.js";
import { save_cohort_image } from "./cohort_image.js";
import { ensure_cohort_schema } from "./schema.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function day(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${date}`;
  }
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function read_date(value, label, required = false) {
  const raw = String(value || "").trim();
  if (!raw) {
    if (required) return { value: null, error: `${label} is required` };
    return { value: null, error: "" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { value: null, error: `${label} must be a date` };
  return { value: raw, error: "" };
}

function usable_thumbnail_url(value) {
  const url = String(value || "").trim();
  return url || null;
}

function map_cohort(row) {
  return {
    cohort_id: row.cohort_id,
    cohort_name: row.cohort_name,
    description: row.description || "",
    thumbnail_url: usable_thumbnail_url(row.thumbnail_url),
    profile_url: usable_thumbnail_url(row.profile_url),
    program_count: Number(row.program_count) || 0
  };
}

function map_program(row, cohort_image) {
  return {
    program_id: row.program_id,
    program_code: row.program_code,
    program_name: row.program_name,
    program_type_id: row.program_type_id,
    program_type: row.program_type || "",
    duration_months: row.duration_months,
    description: row.description || "",
    thumbnail_url: cohort_image || null,
    start_date: day(row.start_date),
    end_date: day(row.end_date),
    enrolled: Number(row.enrolled) || 0,
    is_active: Boolean(row.is_active)
  };
}

async function cohort_row(pool, id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT c.cohort_id, c.cohort_name, c.description, c.thumbnail_url, c.profile_url,
            (
              SELECT COUNT(*)
              FROM tbl_cohort_programs cp
              INNER JOIN tbl_programs p ON p.program_id = cp.program_id AND p.is_deleted = FALSE
              WHERE cp.cohort_id = c.cohort_id AND cp.is_deleted = FALSE
            ) AS program_count
     FROM tbl_cohorts c
     WHERE c.cohort_id = ? AND c.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  return rows?.[0] || null;
}

async function require_cohort(pool, id) {
  const row = await cohort_row(pool, id);
  if (!row) throw fail("Cohort not found", 404);
  return row;
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

function read_cohort_body(body = {}) {
  const name = validateRequiredText(body.cohort_name, "Cohort name", 150);
  const description = validateOptionalText(body.description, "Description", 2000);
  return {
    error: name || description,
    name: String(body.cohort_name || "").trim(),
    description: String(body.description || "").trim() || null
  };
}

function read_program_body(body = {}) {
  const name = validateRequiredText(body.program_name, "Program name", 150);
  const type_id = validatePositiveInteger(body.program_type_id, "Program type", true);
  const duration = validatePositiveInteger(body.duration_months, "Duration", false);
  const description = validateOptionalText(body.description, "Description", 2000);
  const start = read_date(body.start_date, "Start date", true);
  const end = read_date(body.end_date, "End date", true);
  const range = start.value && end.value && end.value < start.value ?
    "End date must be on or after the start date" :
    "";
  const error = name || type_id || duration || description || start.error || end.error || range;
  return {
    error,
    name: String(body.program_name || "").trim(),
    type_id: Number(body.program_type_id),
    duration: String(body.duration_months || "").trim() ? Number(body.duration_months) : null,
    description: String(body.description || "").trim() || null,
    start_date: start.value,
    end_date: end.value
  };
}

async function copy_thumbnail(pool, cohort_id, program_id, url) {
  if (!url) return;
  await sqlQuery(
    pool,
    `UPDATE tbl_programs SET thumbnail_url = ? WHERE program_id = ? AND is_deleted = FALSE`,
    [url, program_id]
  );
  log.pass("copy_thumbnail", `cohort ${cohort_id} image set on program ${program_id}`);
}

async function copy_thumbnail_to_cohort(pool, cohort_id, url) {
  await sqlQuery(
    pool,
    `UPDATE tbl_programs p
     INNER JOIN tbl_cohort_programs cp ON cp.program_id = p.program_id
     SET p.thumbnail_url = ?
     WHERE cp.cohort_id = ? AND cp.is_deleted = FALSE AND p.is_deleted = FALSE`,
    [url, cohort_id]
  );
}

async function program_types(pool) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT program_type_id AS id, program_type_name AS name
     FROM mst_program_types
     WHERE is_deleted = FALSE AND is_active = TRUE
     ORDER BY program_type_name ASC`
  );
  return rows || [];
}

async function cohort_programs(pool, cohort) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT p.program_id, p.program_code, p.program_name, p.program_type_id,
            t.program_type_name AS program_type, p.duration_months, p.description,
            p.thumbnail_url, p.is_active, p.start_date, p.end_date,
            (
              SELECT COUNT(*)
              FROM tbl_course_registrations r
              WHERE r.program_id = p.program_id
                AND r.is_deleted = FALSE
                AND r.status = 'registered'
            ) AS enrolled
     FROM tbl_cohort_programs cp
     INNER JOIN tbl_programs p ON p.program_id = cp.program_id AND p.is_deleted = FALSE
     LEFT JOIN mst_program_types t ON t.program_type_id = p.program_type_id
     WHERE cp.cohort_id = ? AND cp.is_deleted = FALSE
     ORDER BY p.start_date ASC, p.program_name ASC`,
    [cohort.cohort_id]
  );
  const image = usable_thumbnail_url(cohort.profile_url);
  return (rows || []).map((row) => map_program(row, image));
}

export async function list_cohorts() {
  await ensure_cohort_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT c.cohort_id, c.cohort_name, c.description, c.thumbnail_url, c.profile_url,
            (
              SELECT COUNT(*)
              FROM tbl_cohort_programs cp
              INNER JOIN tbl_programs p ON p.program_id = cp.program_id AND p.is_deleted = FALSE
              WHERE cp.cohort_id = c.cohort_id AND cp.is_deleted = FALSE
            ) AS program_count
     FROM tbl_cohorts c
     WHERE c.is_deleted = FALSE
     ORDER BY c.cohort_name ASC`
  );
  return { items: (rows || []).map(map_cohort) };
}

export async function get_cohort(id) {
  await ensure_cohort_schema();
  const pool = get_pool();
  const row = await require_cohort(pool, id);
  return {
    cohort: map_cohort(row),
    programs: await cohort_programs(pool, row),
    program_types: await program_types(pool)
  };
}

export async function create_cohort(body = {}) {
  const fields = read_cohort_body(body);
  if (fields.error) throw fail(fields.error);
  await ensure_cohort_schema();
  const pool = get_pool();
  const [result] = await sqlQuery(
    pool,
    `INSERT INTO tbl_cohorts (cohort_name, description)
     VALUES (?, ?)`,
    [fields.name, fields.description]
  );
  log.pass("createCohort", `created ${result.insertId}`);
  return get_cohort(result.insertId);
}

export async function update_cohort(id, body = {}) {
  const fields = read_cohort_body(body);
  if (fields.error) throw fail(fields.error);
  await ensure_cohort_schema();
  const pool = get_pool();
  await require_cohort(pool, id);
  await sqlQuery(
    pool,
    `UPDATE tbl_cohorts
     SET cohort_name = ?, description = ?
     WHERE cohort_id = ? AND is_deleted = FALSE`,
    [fields.name, fields.description, id]
  );
  log.pass("updateCohort", `updated ${id}`);
  return get_cohort(id);
}

export async function delete_cohort(id) {
  await ensure_cohort_schema();
  const pool = get_pool();
  await require_cohort(pool, id);
  await sqlQuery(
    pool,
    `UPDATE tbl_cohort_programs SET is_deleted = TRUE WHERE cohort_id = ? AND is_deleted = FALSE`,
    [id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_cohorts SET is_deleted = TRUE WHERE cohort_id = ?`,
    [id]
  );
  log.pass("deleteCohort", `soft_deleted ${id}`);
  return { ok: true };
}

export async function upload_cohort_thumbnail(id, file) {
  await ensure_cohort_schema();
  const pool = get_pool();
  const row = await require_cohort(pool, id);
  const previous = row.thumbnail_url || "";
  const thumbnail_url = await save_cohort_image(id, file, "banner");
  await sqlQuery(
    pool,
    `UPDATE tbl_cohorts SET thumbnail_url = ? WHERE cohort_id = ? AND is_deleted = FALSE`,
    [thumbnail_url, id]
  );
  if (previous && previous !== thumbnail_url) await forget_stored_file(previous);
  log.pass("uploadCohortThumbnail", thumbnail_url);
  return get_cohort(id);
}

async function thumbnail_still_used(pool, url) {
  const [programs] = await sqlQuery(
    pool,
    `SELECT program_id FROM tbl_programs
     WHERE thumbnail_url = ? AND is_deleted = FALSE
     LIMIT 1`,
    [url]
  );
  if (programs?.[0]) return true;
  const [cohorts] = await sqlQuery(
    pool,
    `SELECT cohort_id FROM tbl_cohorts
     WHERE is_deleted = FALSE AND (thumbnail_url = ? OR profile_url = ?)
     LIMIT 1`,
    [url, url]
  );
  return Boolean(cohorts?.[0]);
}

export async function upload_cohort_profile(id, file) {
  await ensure_cohort_schema();
  const pool = get_pool();
  const row = await require_cohort(pool, id);
  const previous = row.profile_url || "";
  const profile_url = await save_cohort_image(id, file, "profile");
  await sqlQuery(
    pool,
    `UPDATE tbl_cohorts SET profile_url = ? WHERE cohort_id = ? AND is_deleted = FALSE`,
    [profile_url, id]
  );
  await copy_thumbnail_to_cohort(pool, id, profile_url);
  if (previous && previous !== profile_url) await forget_stored_file(previous);
  log.pass("uploadCohortProfile", profile_url);
  return get_cohort(id);
}

export async function delete_cohort_profile(id) {
  await ensure_cohort_schema();
  const pool = get_pool();
  const row = await require_cohort(pool, id);
  const previous = row.profile_url || "";
  await sqlQuery(
    pool,
    `UPDATE tbl_cohorts SET profile_url = NULL WHERE cohort_id = ? AND is_deleted = FALSE`,
    [id]
  );
  if (previous) {
    await sqlQuery(
      pool,
      `UPDATE tbl_programs p
       INNER JOIN tbl_cohort_programs cp ON cp.program_id = p.program_id
       SET p.thumbnail_url = NULL
       WHERE cp.cohort_id = ? AND cp.is_deleted = FALSE AND p.is_deleted = FALSE
         AND p.thumbnail_url = ?`,
      [id, previous]
    );
    if (!(await thumbnail_still_used(pool, previous))) await delete_stored_file(previous);
  }
  log.pass("deleteCohortProfile", `removed profile for ${id}`);
  return get_cohort(id);
}

export async function delete_cohort_thumbnail(id) {
  await ensure_cohort_schema();
  const pool = get_pool();
  const row = await require_cohort(pool, id);
  const previous = row.thumbnail_url || "";
  await sqlQuery(
    pool,
    `UPDATE tbl_cohorts SET thumbnail_url = NULL WHERE cohort_id = ? AND is_deleted = FALSE`,
    [id]
  );
  if (previous && !(await thumbnail_still_used(pool, previous))) await delete_stored_file(previous);
  log.pass("deleteCohortThumbnail", `removed image for ${id}`);
  return get_cohort(id);
}

async function insert_program(pool, fields) {
  await require_type(pool, fields.type_id);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = create_stamp_code("PRG", new Date(Date.now() + attempt * 1000));
    try {
      const [result] = await sqlQuery(
        pool,
        `INSERT INTO tbl_programs (
          program_code, program_name, program_type_id, duration_months, description, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [code, fields.name, fields.type_id, fields.duration, fields.description, fields.start_date, fields.end_date]
      );
      return result.insertId;
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY" && attempt < 4) continue;
      throw err;
    }
  }
  throw fail("Unable to generate a unique program code", 500);
}

async function link_program(pool, cohort, program_id) {
  const [taken] = await sqlQuery(
    pool,
    `SELECT cohort_id FROM tbl_cohort_programs
     WHERE program_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [program_id]
  );
  if (taken?.[0]) throw fail("This program is already in a cohort");
  await sqlQuery(
    pool,
    `INSERT INTO tbl_cohort_programs (cohort_id, program_id)
     VALUES (?, ?)`,
    [cohort.cohort_id, program_id]
  );
  await copy_thumbnail(pool, cohort.cohort_id, program_id, cohort.profile_url);
}

export async function create_cohort_program(cohort_id, body = {}) {
  const fields = read_program_body(body);
  if (fields.error) throw fail(fields.error);
  await ensure_cohort_schema();
  const pool = get_pool();
  const cohort = await require_cohort(pool, cohort_id);
  const program_id = await insert_program(pool, fields);
  await link_program(pool, cohort, program_id);
  log.pass("createCohortProgram", `program ${program_id} in cohort ${cohort_id}`);
  return get_cohort(cohort_id);
}

export async function assign_cohort_program(cohort_id, body = {}) {
  const program_id = Number(body.program_id);
  if (!Number.isInteger(program_id) || program_id <= 0) throw fail("Select a program");
  const start = read_date(body.start_date, "Start date", true);
  const end = read_date(body.end_date, "End date", true);
  const range = start.value && end.value && end.value < start.value ?
    "End date must be on or after the start date" :
    "";
  const error = start.error || end.error || range;
  if (error) throw fail(error);
  await ensure_cohort_schema();
  const pool = get_pool();
  const cohort = await require_cohort(pool, cohort_id);
  const [rows] = await sqlQuery(
    pool,
    `SELECT program_id FROM tbl_programs WHERE program_id = ? AND is_deleted = FALSE LIMIT 1`,
    [program_id]
  );
  if (!rows?.[0]) throw fail("Program not found", 404);
  await link_program(pool, cohort, program_id);
  await sqlQuery(
    pool,
    `UPDATE tbl_programs SET start_date = ?, end_date = ? WHERE program_id = ? AND is_deleted = FALSE`,
    [start.value, end.value, program_id]
  );
  log.pass("assignCohortProgram", `program ${program_id} assigned to cohort ${cohort_id}`);
  return get_cohort(cohort_id);
}

export async function update_cohort_program(cohort_id, program_id, body = {}) {
  const fields = read_program_body(body);
  if (fields.error) throw fail(fields.error);
  await ensure_cohort_schema();
  const pool = get_pool();
  const cohort = await require_cohort(pool, cohort_id);
  const [links] = await sqlQuery(
    pool,
    `SELECT cohort_program_id FROM tbl_cohort_programs
     WHERE cohort_id = ? AND program_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [cohort_id, program_id]
  );
  if (!links?.[0]) throw fail("Program is not in this cohort", 404);
  await require_type(pool, fields.type_id);
  await sqlQuery(
    pool,
    `UPDATE tbl_programs
     SET program_name = ?, program_type_id = ?, duration_months = ?, description = ?,
         start_date = ?, end_date = ?
     WHERE program_id = ? AND is_deleted = FALSE`,
    [fields.name, fields.type_id, fields.duration, fields.description, fields.start_date, fields.end_date, program_id]
  );
  await copy_thumbnail(pool, cohort_id, program_id, cohort.profile_url);
  log.pass("updateCohortProgram", `program ${program_id} in cohort ${cohort_id}`);
  return get_cohort(cohort_id);
}

export async function delete_cohort_program(cohort_id, program_id) {
  await ensure_cohort_schema();
  const pool = get_pool();
  await require_cohort(pool, cohort_id);
  const [links] = await sqlQuery(
    pool,
    `SELECT cohort_program_id FROM tbl_cohort_programs
     WHERE cohort_id = ? AND program_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [cohort_id, program_id]
  );
  if (!links?.[0]) throw fail("Program is not in this cohort", 404);
  await sqlQuery(
    pool,
    `UPDATE tbl_cohort_programs SET is_deleted = TRUE
     WHERE cohort_id = ? AND program_id = ? AND is_deleted = FALSE`,
    [cohort_id, program_id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_programs SET is_deleted = TRUE, is_active = FALSE WHERE program_id = ?`,
    [program_id]
  );
  log.pass("deleteCohortProgram", `removed program ${program_id} from cohort ${cohort_id}`);
  return get_cohort(cohort_id);
}
