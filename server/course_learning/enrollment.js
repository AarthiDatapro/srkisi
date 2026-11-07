import { sqlQuery } from "@datapromr/auth/server";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function registration_id_of(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function require_registration(pool, student_id, course_id, registration_id) {
  const asked = registration_id_of(registration_id);
  const params = [student_id, course_id];
  let registration_sql = "";
  if (asked) {
    registration_sql = "AND r.registration_id = ?";
    params.push(asked);
  }
  const [rows] = await sqlQuery(
    pool,
    `SELECT r.registration_id, r.program_id, r.progress_percent, r.learning_status,
            cp.cohort_id
     FROM tbl_course_registrations r
     LEFT JOIN tbl_cohort_programs cp
       ON cp.program_id = r.program_id AND cp.is_deleted = FALSE
      AND cp.cohort_program_id = (
        SELECT MIN(cp2.cohort_program_id)
        FROM tbl_cohort_programs cp2
        WHERE cp2.program_id = r.program_id AND cp2.is_deleted = FALSE
      )
     WHERE r.student_id = ? AND r.course_id = ? AND r.is_deleted = FALSE AND r.status = 'registered'
       ${registration_sql}
     ORDER BY r.registration_id ASC`,
    params
  );
  if (!rows?.length) throw fail("You are not enrolled in this course", 403);
  if (!asked && rows.length > 1) {
    throw fail("Open this course from the program you are registered in", 409);
  }
  return rows[0];
}
