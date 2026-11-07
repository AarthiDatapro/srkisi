import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { student_code } from "../utils/student_code.js";
import { ask_code_help, grade_code, parse_json, public_grade, starter_code } from "../utils/coding_compiler.js";
import { ensure_learn_schema } from "./schema.js";
import { require_registration } from "./enrollment.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}


function public_case(row) {
  return {
    test_case: Number(row.test_case || 0),
    inputs: row.inputs || [],
    output: row.output
  };
}

export function public_coding_set(set) {
  return {
    coding_set_id: set.coding_set_id,
    set_title: set.set_title,
    language: set.language,
    lesson_id: set.lesson_id,
    exercises: (set.exercises || []).map((exercise) => ({
      exercise_id: exercise.exercise_id,
      exercise_number: exercise.exercise_number,
      description: exercise.description,
      language: exercise.language,
      function_name: exercise.function_name,
      template: starter_code(exercise),
      test_cases: (exercise.test_cases || []).map(public_case)
    }))
  };
}

function parse_results(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function attach_coding_submissions(pool, student_id, course_id, modules, registration_id) {
  const exercise_ids = [];
  for (const module of modules) {
    for (const lesson of module.lessons || []) {
      for (const set of lesson.coding_sets || []) {
        for (const exercise of set.exercises || []) exercise_ids.push(exercise.exercise_id);
      }
    }
  }
  if (!exercise_ids.length) return modules;
  const marks = exercise_ids.map(() => "?").join(",");
  const [rows] = await sqlQuery(
    pool,
    `SELECT s.exercise_id, s.student_code, s.status, s.passed_count, s.failed_count,
            s.total_count, s.score, s.results_json
     FROM tbl_coding_submissions s
     INNER JOIN (
       SELECT exercise_id, MAX(submission_id) AS submission_id
       FROM tbl_coding_submissions
       WHERE student_id = ? AND course_id = ? AND registration_id = ? AND exercise_id IN (${marks})
       GROUP BY exercise_id
     ) latest ON latest.submission_id = s.submission_id`,
    [student_id, course_id, registration_id, ...exercise_ids]
  );
  const by_exercise = new Map((rows || []).map((row) => [Number(row.exercise_id), {
    student_code: row.student_code || "",
    status: row.status || "",
    passed: Number(row.passed_count || 0),
    failed: Number(row.failed_count || 0),
    total: Number(row.total_count || 0),
    score: Number(row.score || 0),
    results: parse_results(row.results_json)
  }]));
  for (const module of modules) {
    for (const lesson of module.lessons || []) {
      for (const set of lesson.coding_sets || []) {
        for (const exercise of set.exercises || []) {
          exercise.submission = by_exercise.get(exercise.exercise_id) || null;
        }
      }
    }
  }
  return modules;
}

async function require_student(pool, user, course_id, registration_id) {
  const code = student_code(user);
  const [students] = await sqlQuery(
    pool,
    `SELECT student_id FROM tbl_students
     WHERE student_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  const student = students?.[0];
  if (!student) throw fail("Student account was not found", 401);
  const enrollment = await require_registration(pool, student.student_id, course_id, registration_id);
  return { student, enrollment };
}

async function load_exercise(pool, course_id, exercise_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT e.exercise_id, e.coding_set_id, e.description, e.language, e.function_name,
            e.reference_code, e.validation_status, e.validation_errors, s.lesson_id
     FROM tbl_coding_exercises e
     JOIN tbl_lesson_coding_sets s ON s.coding_set_id = e.coding_set_id
     WHERE e.exercise_id = ? AND s.course_id = ? AND e.is_deleted = FALSE AND s.is_deleted = FALSE
       AND s.is_published = TRUE
     LIMIT 1`,
    [exercise_id, course_id]
  );
  const exercise = rows?.[0];
  if (!exercise) throw fail("Coding exercise was not found", 404);
  const [cases] = await sqlQuery(
    pool,
    `SELECT test_case_no, inputs_json, expected_output
     FROM tbl_coding_test_cases
     WHERE exercise_id = ? AND is_deleted = FALSE
     ORDER BY test_case_no ASC, test_case_id ASC`,
    [exercise.exercise_id]
  );
  const test_cases = (cases || []).map((row) => ({
    test_case: Number(row.test_case_no || 0),
    inputs: parse_json(row.inputs_json),
    output: parse_json(row.expected_output),
    error: null
  }));
  if (!test_cases.length) throw fail("This exercise has no test cases");
  return { ...exercise, test_cases };
}

async function prepare(user, course_id, exercise_id, body, registration_id) {
  await ensure_learn_schema();
  const course = Number(course_id);
  const exercise = Number(exercise_id);
  if (!Number.isInteger(course) || course < 1 || !Number.isInteger(exercise) || exercise < 1) {
    throw fail("Coding exercise was not found", 404);
  }
  const pool = get_pool();
  const { student, enrollment } = await require_student(pool, user, course, registration_id);
  const row = await load_exercise(pool, course, exercise);
  const result = await grade_code(row, body?.student_code);
  return { pool, student, enrollment, course, row, result, code: String(body.student_code || "") };
}

export async function run_coding_exercise(user, course_id, exercise_id, body = {}, registration_id = null) {
  const { row, result, code } = await prepare(user, course_id, exercise_id, body, registration_id);
  const help = result.failed > 0 ? await ask_code_help(row, code, result) : "";
  return { saved: false, ...public_grade(result), help };
}

export async function submit_coding_exercise(user, course_id, exercise_id, body = {}, registration_id = null) {
  const { pool, student, enrollment, course, row, result, code } = await prepare(
    user,
    course_id,
    exercise_id,
    body,
    registration_id
  );
  const grade_result = public_grade(result);
  const [insert] = await sqlQuery(
    pool,
    `INSERT INTO tbl_coding_submissions (
       exercise_id, coding_set_id, course_id, lesson_id, registration_id, student_id, student_code,
       status, passed_count, failed_count, total_count, score, results_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.exercise_id,
      row.coding_set_id,
      course,
      row.lesson_id || null,
      enrollment.registration_id,
      student.student_id,
      code,
      grade_result.status,
      grade_result.passed,
      grade_result.failed,
      grade_result.total,
      grade_result.score,
      JSON.stringify(grade_result.results)
    ]
  );
  log.pass("submitCodingExercise", `${student.student_id} submitted exercise ${row.exercise_id}`);
  return { saved: true, submission_id: Number(insert.insertId), ...grade_result };
}
