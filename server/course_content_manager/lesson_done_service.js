import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_lesson_done_schema } from "./lesson_done_schema.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function positive_id(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw fail(`${label} was not found`, 404);
  return id;
}

async function require_scope(pool, course_id, program_id, cohort_id, lesson_id) {
  const [lessons] = await sqlQuery(
    pool,
    `SELECT lesson_id FROM tbl_course_lessons
     WHERE lesson_id = ? AND course_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [lesson_id, course_id]
  );
  if (!lessons?.[0]) throw fail("Lesson was not found", 404);

  const [programs] = await sqlQuery(
    pool,
    `SELECT program_course_id FROM tbl_program_courses
     WHERE program_id = ? AND course_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [program_id, course_id]
  );
  if (!programs?.[0]) throw fail("This course is not in that program", 400);

  const [cohorts] = await sqlQuery(
    pool,
    `SELECT cohort_program_id FROM tbl_cohort_programs
     WHERE cohort_id = ? AND program_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [cohort_id, program_id]
  );
  if (!cohorts?.[0]) throw fail("This program is not in that cohort", 400);
}

export async function list_lesson_done(course_id, query = {}) {
  await ensure_lesson_done_schema();
  const course = positive_id(course_id, "Course");
  const program_id = positive_id(query.program_id, "Program");
  const cohort_id = positive_id(query.cohort_id, "Cohort");
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT lesson_id, marked_at
     FROM tbl_lesson_done
     WHERE course_id = ? AND program_id = ? AND cohort_id = ?
     ORDER BY lesson_id ASC`,
    [course, program_id, cohort_id]
  );
  return {
    cohort_id,
    program_id,
    course_id: course,
    lesson_ids: (rows || []).map((row) => Number(row.lesson_id))
  };
}

export async function set_lesson_done(user, course_id, lesson_id, body = {}) {
  await ensure_lesson_done_schema();
  const course = positive_id(course_id, "Course");
  const lesson = positive_id(lesson_id, "Lesson");
  const program_id = positive_id(body.program_id, "Program");
  const cohort_id = positive_id(body.cohort_id, "Cohort");
  const done = body.done !== false;
  const pool = get_pool();
  await require_scope(pool, course, program_id, cohort_id, lesson);

  const marker = Number(user?.sub);
  const marked_by = Number.isInteger(marker) && marker > 0 ? marker : null;

  if (!done) {
    await sqlQuery(
      pool,
      `DELETE FROM tbl_lesson_done
       WHERE cohort_id = ? AND program_id = ? AND course_id = ? AND lesson_id = ?`,
      [cohort_id, program_id, course, lesson]
    );
    log.pass("setLessonDone", `cleared lesson ${lesson}`);
    return { lesson_id: lesson, is_done: false };
  }

  await sqlQuery(
    pool,
    `INSERT INTO tbl_lesson_done (
       cohort_id, program_id, course_id, lesson_id, marked_by, marked_at
     ) VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE marked_by = VALUES(marked_by), marked_at = NOW()`,
    [cohort_id, program_id, course, lesson, marked_by]
  );
  log.pass("setLessonDone", `marked lesson ${lesson}`);
  return { lesson_id: lesson, is_done: true };
}
