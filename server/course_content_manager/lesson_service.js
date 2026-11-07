import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { validateOptionalText, validateRequiredText } from "@datapromr/validation";
import { get_course } from "../course_manager/course_service.js";
import { get_pool } from "../utils/db_setup.js";
import { ensure_learn_schema } from "../course_learning/schema.js";
import { is_zip_upload, save_lesson_file, save_notes_zip } from "./content_file.js";
import { extract_learning_content } from "./document_extract.js";
import { ensure_content_schema } from "./schema.js";

import {
  fail,
  as_int,
  learning_payload,
  validate_module,
  validate_lesson,
  normalize_http_url,
  has_html_pages,
  validate_item,
  first_error,
  next_sequence,
  next_content_sequence,
  require_module,
  resolve_module_id,
  require_lesson,
  save_learning_json,
  notes_language_of,
  notes_item_without_english,
  notes_item_for_telugu,
  store_telugu_notes,
  build_learning_json,
  get_course_content,
  TEXT_TYPES
} from "./content_service.js";

export async function create_module(course_id, body = {}) {
  const error = first_error(validate_module(body));
  if (error) throw fail(error);

  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  const sequence = await next_sequence(pool, "tbl_course_modules", "course_id", course_id);
  await sqlQuery(
    pool,
    `INSERT INTO tbl_course_modules (course_id, module_title, module_description, sequence_no, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [
    course_id,
    String(body.module_title).trim(),
    String(body.module_description || "").trim() || null,
    sequence,
    body.is_active === false ? false : true]

  );
  log.pass("createModule", `created module for course ${course_id}`);
  return get_course_content(course_id);
}

export async function update_module(course_id, module_id, body = {}) {
  const error = first_error(validate_module(body));
  if (error) throw fail(error);

  await ensure_content_schema();
  const pool = get_pool();
  await require_module(pool, course_id, module_id);
  await sqlQuery(
    pool,
    `UPDATE tbl_course_modules
     SET module_title = ?, module_description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE module_id = ? AND course_id = ? AND is_deleted = FALSE`,
    [
    String(body.module_title).trim(),
    String(body.module_description || "").trim() || null,
    body.is_active === false ? false : true,
    module_id,
    course_id]

  );
  return get_course_content(course_id);
}

export async function delete_module(course_id, module_id) {
  await ensure_content_schema();
  const pool = get_pool();
  await require_module(pool, course_id, module_id);

  const [lessons] = await sqlQuery(
    pool,
    `SELECT lesson_id FROM tbl_course_lessons
     WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE`,
    [course_id, module_id]
  );
  for (const row of lessons || []) {
    await delete_lesson(course_id, row.lesson_id);
  }

  await sqlQuery(
    pool,
    `UPDATE tbl_course_content
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE`,
    [course_id, module_id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_course_modules
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE module_id = ? AND course_id = ?`,
    [module_id, course_id]
  );
  log.pass("deleteModule", `deleted module ${module_id}`);
  return get_course_content(course_id);
}

export async function create_lesson(course_id, body = {}) {
  const error = first_error(validate_lesson(body));
  if (error) throw fail(error);

  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  const module_id = await resolve_module_id(pool, course_id, body.module_id);
  const sequence = await next_content_sequence(pool, course_id, module_id);
  const [result] = await sqlQuery(
    pool,
    `INSERT INTO tbl_course_lessons (
      course_id, module_id, lesson_title, lesson_description, sequence_no, duration_minutes, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
    course_id,
    module_id,
    String(body.lesson_title).trim(),
    String(body.lesson_description || "").trim() || null,
    sequence,
    as_int(body.duration_minutes),
    body.is_active === false ? false : true]

  );

  await sqlQuery(
    pool,
    `INSERT INTO tbl_course_content (course_id, module_id, content_type, lesson_id, sequence_no)
     VALUES (?, ?, 'lesson', ?, ?)`,
    [course_id, module_id, result.insertId, sequence]
  );

  log.pass("createLesson", `created lesson ${result.insertId} in module ${module_id}`);
  return get_course_content(course_id);
}

export async function update_lesson(course_id, lesson_id, body = {}) {
  const error = first_error(validate_lesson(body));
  if (error) throw fail(error);

  await ensure_content_schema();
  const pool = get_pool();
  await require_lesson(pool, course_id, lesson_id);
  const module_id = body.module_id ? await resolve_module_id(pool, course_id, body.module_id) : null;
  await sqlQuery(
    pool,
    `UPDATE tbl_course_lessons
     SET lesson_title = ?, lesson_description = ?, duration_minutes = ?, is_active = ?,
         module_id = COALESCE(?, module_id), updated_at = CURRENT_TIMESTAMP
     WHERE lesson_id = ? AND course_id = ? AND is_deleted = FALSE`,
    [
    String(body.lesson_title).trim(),
    String(body.lesson_description || "").trim() || null,
    as_int(body.duration_minutes),
    body.is_active === false ? false : true,
    module_id,
    lesson_id,
    course_id]

  );
  if (module_id) {
    await sqlQuery(
      pool,
      `UPDATE tbl_course_content
       SET module_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE course_id = ? AND lesson_id = ? AND is_deleted = FALSE`,
      [module_id, course_id, lesson_id]
    );
    await sqlQuery(
      pool,
      `UPDATE tbl_course_quizzes
       SET module_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE course_id = ? AND lesson_id = ? AND is_deleted = FALSE`,
      [module_id, course_id, lesson_id]
    );
    await sqlQuery(
      pool,
      `UPDATE tbl_lesson_coding_sets
       SET module_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE course_id = ? AND lesson_id = ? AND is_deleted = FALSE`,
      [module_id, course_id, lesson_id]
    );
  }
  return get_course_content(course_id);
}

export async function delete_lesson(course_id, lesson_id) {
  await ensure_content_schema();
  const pool = get_pool();
  await require_lesson(pool, course_id, lesson_id);

  const [quiz_rows] = await sqlQuery(
    pool,
    `SELECT quiz_id FROM tbl_course_quizzes
     WHERE course_id = ? AND lesson_id = ? AND is_deleted = FALSE`,
    [course_id, lesson_id]
  );
  const quiz_ids = (quiz_rows || []).map((row) => Number(row.quiz_id)).filter(Boolean);
  if (quiz_ids.length) {
    const placeholders = quiz_ids.map(() => "?").join(", ");
    await sqlQuery(
      pool,
      `UPDATE tbl_quiz_questions
       SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE quiz_id IN (${placeholders}) AND is_deleted = FALSE`,
      quiz_ids
    );
    await sqlQuery(
      pool,
      `UPDATE tbl_course_quizzes
       SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE quiz_id IN (${placeholders}) AND course_id = ?`,
      [...quiz_ids, course_id]
    );
    await sqlQuery(
      pool,
      `UPDATE tbl_course_content
       SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE course_id = ? AND quiz_id IN (${placeholders}) AND is_deleted = FALSE`,
      [course_id, ...quiz_ids]
    );
  }

  const [coding_rows] = await sqlQuery(
    pool,
    `SELECT coding_set_id FROM tbl_lesson_coding_sets
     WHERE course_id = ? AND lesson_id = ? AND is_deleted = FALSE`,
    [course_id, lesson_id]
  );
  const coding_ids = (coding_rows || []).map((row) => Number(row.coding_set_id)).filter(Boolean);
  if (coding_ids.length) {
    const coding_marks = coding_ids.map(() => "?").join(", ");
    const [exercise_rows] = await sqlQuery(
      pool,
      `SELECT exercise_id FROM tbl_coding_exercises
       WHERE coding_set_id IN (${coding_marks}) AND is_deleted = FALSE`,
      coding_ids
    );
    const exercise_ids = (exercise_rows || []).map((row) => Number(row.exercise_id)).filter(Boolean);
    if (exercise_ids.length) {
      const exercise_marks = exercise_ids.map(() => "?").join(", ");
      await sqlQuery(
        pool,
        `UPDATE tbl_coding_test_cases
         SET is_deleted = TRUE
         WHERE exercise_id IN (${exercise_marks}) AND is_deleted = FALSE`,
        exercise_ids
      );
      await sqlQuery(
        pool,
        `UPDATE tbl_coding_exercises
         SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE exercise_id IN (${exercise_marks})`,
        exercise_ids
      );
    }
    await sqlQuery(
      pool,
      `UPDATE tbl_lesson_coding_sets
       SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE coding_set_id IN (${coding_marks}) AND course_id = ?`,
      [...coding_ids, course_id]
    );
  }

  await sqlQuery(
    pool,
    `UPDATE tbl_lesson_contents
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE lesson_id = ? AND is_deleted = FALSE`,
    [lesson_id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_course_lessons
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE lesson_id = ? AND course_id = ?`,
    [lesson_id, course_id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_course_content
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND lesson_id = ? AND is_deleted = FALSE`,
    [course_id, lesson_id]
  );
  log.pass("deleteLesson", `deleted lesson ${lesson_id}`);
  return get_course_content(course_id);
}
