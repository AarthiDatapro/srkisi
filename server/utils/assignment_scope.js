import { log } from "@datapromr/log";
import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "./db_setup.js";
import { is_bootstrap_admin } from "./screen_access.js";

function fail(message, status = 404) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function assignment_employee_id(user) {
  if (!user || is_bootstrap_admin(user)) return null;
  if (user.sub == null && user.email == null) return null;
  const id = Number(user.sub);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export function course_assigned_sql(alias = "c") {
  return `EXISTS (
    SELECT 1
    FROM tbl_program_courses pc
    INNER JOIN tbl_program_employees pe
      ON pe.program_id = pc.program_id
     AND pe.employee_id = ?
     AND pe.is_deleted = FALSE
     AND pe.is_active = TRUE
    WHERE pc.course_id = ${alias}.course_id
      AND pc.is_deleted = FALSE
  )`;
}

export function program_assigned_sql(alias = "p") {
  return `EXISTS (
    SELECT 1
    FROM tbl_program_employees pe
    WHERE pe.program_id = ${alias}.program_id
      AND pe.employee_id = ?
      AND pe.is_deleted = FALSE
      AND pe.is_active = TRUE
  )`;
}

export async function visible_program_ids(user = {}) {
  if (is_bootstrap_admin(user)) return null;
  const employee_id = Number(user.sub);
  if (!Number.isInteger(employee_id) || employee_id <= 0) return [];
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT DISTINCT program_id
     FROM tbl_program_employees
     WHERE employee_id = ? AND is_deleted = FALSE AND is_active = TRUE`,
    [employee_id]
  );
  return (rows || []).map((row) => Number(row.program_id)).filter((id) => id > 0);
}

export async function assert_assigned_course(course_id, user) {
  const employee_id = assignment_employee_id(user);
  if (employee_id == null) return;
  const id = Number(course_id);
  if (!Number.isInteger(id) || id <= 0) throw fail("Course not found");
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT 1 AS ok FROM tbl_courses c WHERE c.course_id = ? AND c.is_deleted = FALSE AND ${course_assigned_sql("c")} LIMIT 1`,
    [id, employee_id]
  );
  if (!rows?.[0]) {
    log.fail("assert_assigned_course", `employee ${employee_id} cannot access course ${id}`);
    throw fail("Course not found");
  }
}

export async function assert_assigned_program(program_id, user) {
  const employee_id = assignment_employee_id(user);
  if (employee_id == null) return;
  const id = Number(program_id);
  if (!Number.isInteger(id) || id <= 0) throw fail("Program not found");
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT 1 AS ok FROM tbl_programs p WHERE p.program_id = ? AND p.is_deleted = FALSE AND ${program_assigned_sql("p")} LIMIT 1`,
    [id, employee_id]
  );
  if (!rows?.[0]) {
    log.fail("assert_assigned_program", `employee ${employee_id} cannot access program ${id}`);
    throw fail("Program not found");
  }
}
