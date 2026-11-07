import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { validateRequiredText } from "@datapromr/validation";
import { get_course } from "../course_manager/course_service.js";
import { get_pool } from "../utils/db_setup.js";
import { ai_backend_url } from "../utils/ai_backend.js";
import { get_course_content } from "./content_service.js";
import { ensure_content_schema } from "./schema.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function as_int(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function compiler_message(data) {
  const detail = data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (detail && typeof detail === "object" && detail.message) return String(detail.message);
  return data?.error || data?.message || "Coding generator did not return an exercise";
}

async function resolve_module_id(pool, course_id, module_id) {
  const id = as_int(module_id);
  if (!id) throw fail("Select a module");
  const [rows] = await sqlQuery(
    pool,
    `SELECT module_id FROM tbl_course_modules
     WHERE module_id = ? AND course_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id, course_id]
  );
  if (!rows?.[0]) throw fail("Select a valid module");
  return id;
}

async function resolve_lesson_id(pool, course_id, module_id, lesson_id) {
  const id = as_int(lesson_id);
  if (!id) throw fail("Select a lesson. Coding exercises cannot be created on a module.");
  const [rows] = await sqlQuery(
    pool,
    `SELECT lesson_id FROM tbl_course_lessons
     WHERE lesson_id = ? AND course_id = ? AND module_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id, course_id, module_id]
  );
  if (!rows?.[0]) throw fail("Select a lesson in this module");
  return id;
}

async function next_sequence(pool, course_id, module_id, lesson_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT COALESCE(MAX(sequence_no), 0) AS seq
     FROM tbl_course_content
     WHERE course_id = ? AND module_id = ? AND lesson_id = ? AND is_deleted = FALSE`,
    [course_id, module_id, lesson_id]
  );
  const seq = Number(rows?.[0]?.seq || 0);
  if (!seq) {
    const [fallback] = await sqlQuery(
      pool,
      `SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_no
       FROM tbl_course_content
       WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE`,
      [course_id, module_id]
    );
    return Number(fallback?.[0]?.next_no || 1);
  }
  await sqlQuery(
    pool,
    `UPDATE tbl_course_content
     SET sequence_no = sequence_no + 1, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE AND sequence_no > ?`,
    [course_id, module_id, seq]
  );
  return seq + 1;
}

async function require_programming_language(pool, programming_language_id) {
  const id = as_int(programming_language_id);
  if (!id) throw fail("Select a programming language");
  const [rows] = await sqlQuery(
    pool,
    `SELECT programming_language_id, programming_language_name
     FROM mst_programming_languages
     WHERE programming_language_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [id]
  );
  const row = rows?.[0];
  const name = String(row?.programming_language_name || "").trim();
  if (!row || !name) throw fail("Select an active programming language");
  return {
    programming_language_id: Number(row.programming_language_id),
    language: name
  };
}

async function generate_one(prompt, language) {
  let url;
  try {
    url = ai_backend_url("/api/compiler/generate");
  } catch (err) {
    throw fail(err.message || "AI_BACKEND is not configured", err.status || 500);
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ prompt, language }),
      signal: AbortSignal.timeout(180000)
    });
  } catch (err) {
    log.fail("generateCoding", err.message);
    throw fail("Unable to reach the coding generator", 502);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw fail(compiler_message(data), 502);
  }
  return normalize_exercise(data, language);
}

function normalize_exercise(data, language) {
  const description = String(data.description || "").trim();
  const function_name = String(data.function_name || "").trim();
  const reference_code = String(data.reference_code || "").trim();
  const returned_language = String(data.language || language).trim();
  const cases = Array.isArray(data.test_cases) ? data.test_cases : [];
  const validation = data.validation && typeof data.validation === "object" ? data.validation : {};
  const status = String(validation.status || "").trim().toLowerCase();
  const errors = Array.isArray(validation.errors) ? validation.errors.map((item) => String(item || "").trim()).filter(Boolean) : [];

  if (!description) throw fail("Coding generator returned an exercise without a description", 502);
  if (!function_name) throw fail("Coding generator returned an exercise without a function name", 502);
  if (!reference_code) throw fail("Coding generator returned an exercise without a reference solution", 502);
  if (returned_language.toLowerCase() !== language.toLowerCase()) {
    throw fail(`Coding generator returned ${returned_language || "an unknown language"} instead of ${language}`, 502);
  }
  if (!cases.length) throw fail("Coding generator returned an exercise without test cases", 502);
  if (status && status !== "valid") {
    throw fail(errors[0] || "Coding generator returned an exercise that did not validate", 502);
  }

  return {
    description,
    language,
    function_name,
    reference_code,
    validation_status: status || "valid",
    validation_errors: errors,
    test_cases: cases.map((item, index) => ({
      test_case_no: as_int(item.test_case) || index + 1,
      inputs: Array.isArray(item.inputs) ? item.inputs : [],
      output: Object.prototype.hasOwnProperty.call(item, "output") ? item.output : null,
      error: item.error == null ? null : String(item.error)
    }))
  };
}

export async function generate_coding_set(course_id, body = {}) {
  await get_course(course_id);
  await ensure_content_schema();

  const set_title = String(body.set_title || body.title || "").trim();
  const prompt = String(body.prompt || "").trim();
  const name_error = validateRequiredText(set_title, "Exercise name", 200);

  if (name_error) throw fail(name_error);
  if (prompt.length < 10) throw fail("Describe the exercise in at least 10 characters");
  if (prompt.length > 4000) throw fail("The prompt must be 4000 characters or less");

  const pool = get_pool();
  const chosen = await require_programming_language(pool, body.programming_language_id);
  const module_id = await resolve_module_id(pool, course_id, body.module_id);
  const lesson_id = await resolve_lesson_id(pool, course_id, module_id, body.lesson_id);
  const exercise = await generate_one(prompt, chosen.language);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const sequence = await next_sequence(connection, course_id, module_id, lesson_id);
    const [number_rows] = await sqlQuery(
      connection,
      `SELECT COALESCE(MAX(e.exercise_number), 0) + 1 AS next_no
       FROM tbl_coding_exercises e
       INNER JOIN tbl_lesson_coding_sets s ON s.coding_set_id = e.coding_set_id
       WHERE s.course_id = ? AND s.lesson_id = ? AND s.is_deleted = FALSE AND e.is_deleted = FALSE`,
      [course_id, lesson_id]
    );
    const exercise_number = Number(number_rows?.[0]?.next_no || 1);
    const [set_result] = await sqlQuery(
      connection,
      `INSERT INTO tbl_lesson_coding_sets (
        course_id, module_id, lesson_id, programming_language_id, set_title, prompt, language,
        exercise_count, is_published, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, TRUE, TRUE)`,
      [
        course_id,
        module_id,
        lesson_id,
        chosen.programming_language_id,
        set_title,
        prompt,
        chosen.language
      ]
    );
    const coding_set_id = Number(set_result.insertId);

    const [exercise_result] = await sqlQuery(
      connection,
      `INSERT INTO tbl_coding_exercises (
        coding_set_id, exercise_number, description, language, function_name, reference_code,
        validation_status, validation_errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        coding_set_id,
        exercise_number,
        exercise.description,
        exercise.language,
        exercise.function_name,
        exercise.reference_code,
        exercise.validation_status,
        JSON.stringify(exercise.validation_errors)
      ]
    );
      const exercise_id = Number(exercise_result.insertId);
      for (const test_case of exercise.test_cases) {
        await sqlQuery(
          connection,
          `INSERT INTO tbl_coding_test_cases (
            exercise_id, test_case_no, inputs_json, expected_output, error_text
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            exercise_id,
            test_case.test_case_no,
            JSON.stringify(test_case.inputs),
            JSON.stringify(test_case.output),
            test_case.error
          ]
        );
      }

    await sqlQuery(
      connection,
      `INSERT INTO tbl_course_content (
        course_id, module_id, content_type, lesson_id, coding_set_id, sequence_no
      ) VALUES (?, ?, 'coding', ?, ?, ?)`,
      [course_id, module_id, lesson_id, coding_set_id, sequence]
    );
    await connection.commit();
    log.pass("generateCoding", `created coding set ${coding_set_id} for lesson ${lesson_id}`);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return get_course_content(course_id);
}

export async function delete_coding_set(course_id, coding_set_id) {
  await get_course(course_id);
  await ensure_content_schema();
  const id = as_int(coding_set_id);
  if (!id) throw fail("Coding exercise set was not found", 404);
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT coding_set_id FROM tbl_lesson_coding_sets
     WHERE coding_set_id = ? AND course_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id, course_id]
  );
  if (!rows?.[0]) throw fail("Coding exercise set was not found", 404);

  const [exercise_rows] = await sqlQuery(
    pool,
    `SELECT exercise_id FROM tbl_coding_exercises
     WHERE coding_set_id = ? AND is_deleted = FALSE`,
    [id]
  );
  const exercise_ids = (exercise_rows || []).map((row) => Number(row.exercise_id)).filter(Boolean);
  if (exercise_ids.length) {
    const marks = exercise_ids.map(() => "?").join(", ");
    await sqlQuery(
      pool,
      `UPDATE tbl_coding_test_cases
       SET is_deleted = TRUE
       WHERE exercise_id IN (${marks}) AND is_deleted = FALSE`,
      exercise_ids
    );
    await sqlQuery(
      pool,
      `UPDATE tbl_coding_exercises
       SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE exercise_id IN (${marks})`,
      exercise_ids
    );
  }
  await sqlQuery(
    pool,
    `UPDATE tbl_lesson_coding_sets
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE coding_set_id = ? AND course_id = ?`,
    [id, course_id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_course_content
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND coding_set_id = ? AND is_deleted = FALSE`,
    [course_id, id]
  );
  log.pass("deleteCoding", `deleted coding set ${id}`);
  return get_course_content(course_id);
}
