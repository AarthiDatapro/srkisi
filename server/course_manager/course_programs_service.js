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
import { ensure_cohort_schema } from "../cohorts/schema.js";
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

export async function assign_program_courses(program_id, body = {}) {
  await ensure_course_schema();
  const pool = get_pool();
  const [programs] = await sqlQuery(
    pool,
    `SELECT program_id FROM tbl_programs
     WHERE program_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [program_id]
  );
  if (!programs?.[0]) throw fail("Program not found", 404);

  const ids = unique_ids(body.course_ids);
  const passkeys = map_passkey_entries(body.course_passkeys, "course_id");
  const overwrite = body.overwrite_passkeys === true || body.overwrite_passkeys === "true";

  const [existing] = await sqlQuery(
    pool,
    `SELECT program_course_id, course_id, enroll_passkey, is_deleted
     FROM tbl_program_courses
     WHERE program_id = ?`,
    [program_id]
  );
  const wanted = new Set(ids);
  const by_course = new Map((existing || []).map((row) => [Number(row.course_id), row]));
  const conflicts = [];

  let course_rows = [];
  if (ids.length) {
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await sqlQuery(
      pool,
      `SELECT course_id, is_offline FROM tbl_courses
       WHERE course_id IN (${placeholders}) AND is_deleted = FALSE`,
      ids
    );
    course_rows = rows || [];
    if (course_rows.length !== ids.length) throw fail("Select valid courses");
    for (const row of course_rows) {
      if (!row.is_offline) continue;
      const course_id = Number(row.course_id);
      const link = by_course.get(course_id);
      const current =
        link && !link.is_deleted ? String(link.enroll_passkey || "").trim() : "";
      const next = String(passkeys.get(course_id) || "").trim();
      if (!next && !current) {
        throw fail("Set a passkey for each offline course assigned to this program");
      }
      if (next) assert_passkey_value(next, true);
    }
  }

  for (const course_id of ids) {
    if (!passkeys.has(course_id)) continue;
    const next_key = assert_passkey_value(passkeys.get(course_id), true);
    const row = by_course.get(course_id);
    const current = String(row?.enroll_passkey || "").trim();
    if (
      row &&
      !row.is_deleted &&
      current &&
      current.toUpperCase() !== next_key.toUpperCase() &&
      !overwrite
    ) {
      conflicts.push({ program_id, course_id });
    }
  }

  if (conflicts.length) {
    throw fail(
      "A passkey already exists for one or more courses. Confirm to replace it.",
      409,
      { code: "PASSKEY_EXISTS", details: { conflicts } }
    );
  }

  for (const course_id of ids) {
    const row = by_course.get(course_id);
    const next_key = passkeys.has(course_id) ? assert_passkey_value(passkeys.get(course_id), true) : null;
    if (row) {
      if (next_key) {
        await sqlQuery(
          pool,
          `UPDATE tbl_program_courses
           SET is_deleted = FALSE, is_active = TRUE, enroll_passkey = ?, updated_at = NOW()
           WHERE program_course_id = ?`,
          [next_key, row.program_course_id]
        );
      } else {
        await sqlQuery(
          pool,
          `UPDATE tbl_program_courses
           SET is_deleted = FALSE, is_active = TRUE
           WHERE program_course_id = ?`,
          [row.program_course_id]
        );
      }
    } else {
      await sqlQuery(
        pool,
        `INSERT INTO tbl_program_courses (program_id, course_id, enroll_passkey)
         VALUES (?, ?, ?)`,
        [program_id, course_id, next_key]
      );
    }
  }

  for (const row of existing || []) {
    if (!wanted.has(Number(row.course_id)) && !row.is_deleted) {
      await sqlQuery(
        pool,
        `UPDATE tbl_program_courses
         SET is_deleted = TRUE, is_active = FALSE
         WHERE program_course_id = ?`,
        [row.program_course_id]
      );
    }
  }

  log.pass("assignProgramCourses", `program ${program_id} linked to ${ids.length} courses`);
  return list_program_courses(program_id);
}

export async function list_program_courses(program_id, user = {}) {
  await ensure_course_schema();
  await ensure_cohort_schema();
  const pool = get_pool();
  const scoped_id = assignment_employee_id(user);
  const where = [
  "pc.program_id = ?",
  "pc.is_deleted = FALSE",
  "c.is_deleted = FALSE"];

  const params = [program_id];
  if (scoped_id != null) {
    where.push(course_assigned_sql("c"));
    params.push(scoped_id);
  }
  const [rows] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.course_code, c.course_name, c.course_description,
            c.course_type_id, t.course_type_name AS course_type,
            c.duration_hours, c.level, c.is_active, c.is_offline,
            pc.enroll_passkey,
            (
              SELECT COUNT(DISTINCT r.student_id)
              FROM tbl_course_registrations r
              INNER JOIN tbl_cohort_programs cp
                ON cp.program_id = r.program_id
               AND cp.is_deleted = FALSE
               AND cp.cohort_program_id = (
                 SELECT MIN(cp2.cohort_program_id)
                 FROM tbl_cohort_programs cp2
                 WHERE cp2.program_id = pc.program_id
                   AND cp2.is_deleted = FALSE
               )
              INNER JOIN tbl_cohorts h
                ON h.cohort_id = cp.cohort_id
               AND h.is_deleted = FALSE
              WHERE r.course_id = c.course_id
                AND r.program_id = pc.program_id
                AND r.is_deleted = FALSE
                AND r.status = 'registered'
            ) AS registered_students
     FROM tbl_program_courses pc
     INNER JOIN tbl_courses c ON c.course_id = pc.course_id
     LEFT JOIN mst_course_types t ON t.course_type_id = c.course_type_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.course_name ASC`,
    params
  );

  return {
    courses: (rows || []).map((row) => ({
      course_id: row.course_id,
      course_code: row.course_code,
      course_name: row.course_name,
      course_description: row.course_description || "",
      course_type_id: row.course_type_id,
      course_type: row.course_type,
      duration_hours: row.duration_hours == null ? null : Number(row.duration_hours),
      level: row.level || "",
      is_active: Boolean(row.is_active),
      is_offline: Boolean(row.is_offline),
      enroll_passkey: row.enroll_passkey || "",
      has_passkey: Boolean(String(row.enroll_passkey || "").trim()),
      registered_students: Number(row.registered_students) || 0
    }))
  };
}
