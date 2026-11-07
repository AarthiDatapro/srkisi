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
  notes_item_for_english,
  notes_item_for_telugu,
  retire_other_english_notes,
  store_telugu_notes,
  build_learning_json,
  get_course_content,
  TEXT_TYPES
} from "./content_service.js";

function item_payload(body, file_meta = {}) {
  const type = String(body.content_type || "").trim();
  const overview = type === "Overview";
  const announcement = type === "Announcement";
  const description = type === "Notes" ? "" : String(body.content_description || "").trim();
  const title = announcement ?
    (description || String(body.content_title || "").trim()).slice(0, 200) :
    overview ? null :
    String(body.content_title || "").trim();
  return {
    content_type: type,
    content_title: title,
    content_description: type === "Notes" ? null : description || null,
    content_url: type === "Notes" || overview || announcement ? null : normalize_http_url(body.content_url) || null,
    duration_seconds: overview ? null : as_int(body.duration_seconds),
    file_name: overview || announcement ? null : file_meta.file_name || null,
    file_path: overview || announcement ? null : file_meta.file_path || null,
    file_size_bytes: overview || announcement ? null : file_meta.file_size_bytes || null
  };
}

export async function create_lesson_item(course_id, lesson_id, body = {}, file = null) {
  await ensure_content_schema();
  const pool = get_pool();
  await require_lesson(pool, course_id, lesson_id);

  const type = String(body.content_type || "").trim();
  if (type === "Overview" || type === "Announcement") file = null;
  const url = type === "Notes" || type === "Overview" || type === "Announcement" ? "" : normalize_http_url(body.content_url);
  const has_url = Boolean(url);
  const has_text = Boolean(String(body.content_description || "").trim());
  if (type === "Notes" && !is_zip_upload(file)) {
    throw fail("Upload a ZIP of HTML files");
  }
  if (!file && !has_url && !TEXT_TYPES.has(type) && type !== "Notes") {
    throw fail("Add a link or upload a file");
  }
  if (type === "Overview" && !has_text) {
    throw fail("Body is required");
  }
  if (TEXT_TYPES.has(type) && type !== "Overview" && !file && !has_url && !has_text) {
    throw fail("Add text, a link, or a file");
  }

  const error = first_error(validate_item({ ...body, content_url: url }, { has_file: Boolean(file) }));
  if (error) throw fail(error);

  let file_meta = {};
  if (file) {
    file_meta = type === "Notes" ? await save_notes_zip(lesson_id, file) : await save_lesson_file(lesson_id, file);
  }
  const data = item_payload(body, file_meta);

  if (type === "Notes" && notes_language_of(body) === "telugu") {
    const learning = await build_learning_json(
      {
        content_title: data.content_title,
        file_name: data.file_name,
        file_path: data.file_path,
        lesson_id
      },
      file?.buffer,
      file?.mimetype
    );
    if (!has_html_pages(learning)) throw fail("The ZIP must contain HTML files");
    const payload = learning_payload(data.content_title, learning);
    const existing_id = await notes_item_for_telugu(pool, lesson_id);
    if (existing_id) {
      await store_telugu_notes(pool, existing_id, file_meta, payload);
    } else {
      const sequence = await next_sequence(pool, "tbl_lesson_contents", "lesson_id", lesson_id);
      await sqlQuery(
        pool,
        `INSERT INTO tbl_lesson_contents (
          lesson_id, content_type, content_title, content_description,
          file_name, file_path, content_url, sequence_no, duration_seconds, file_size_bytes,
          learning_json,
          telugu_file_name, telugu_file_path, telugu_file_size_bytes, telugu_learning_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lesson_id,
          "Notes",
          data.content_title,
          null,
          null,
          null,
          null,
          sequence,
          null,
          null,
          null,
          file_meta.file_name || null,
          file_meta.file_path || null,
          file_meta.file_size_bytes || null,
          JSON.stringify(payload)
        ]
      );
    }
    log.pass("createLessonItem", `added Telugu notes to lesson ${lesson_id}`);
    return get_course_content(course_id);
  }

  if (type === "Notes") {
    const existing_id = await notes_item_for_english(pool, lesson_id);
    if (existing_id) {
      const learning = await build_learning_json(
        {
          content_id: existing_id,
          content_title: data.content_title,
          file_name: data.file_name,
          file_path: data.file_path,
          lesson_id
        },
        file?.buffer,
        file?.mimetype
      );
      if (!has_html_pages(learning)) throw fail("The ZIP must contain HTML files");
      await sqlQuery(
        pool,
        `UPDATE tbl_lesson_contents
         SET content_title = ?, file_name = ?, file_path = ?, file_size_bytes = ?,
             learning_json = ?, updated_at = CURRENT_TIMESTAMP
         WHERE content_id = ?`,
        [
          data.content_title,
          data.file_name,
          data.file_path,
          data.file_size_bytes,
          JSON.stringify(learning_payload(data.content_title, learning)),
          existing_id
        ]
      );
      await retire_other_english_notes(pool, lesson_id, existing_id);
      log.pass("createLessonItem", `replaced English notes on lesson ${lesson_id}`);
      return get_course_content(course_id);
    }
  }

  if (type === "Overview") {
    const [existing] = await sqlQuery(
      pool,
      `SELECT content_id FROM tbl_lesson_contents
       WHERE lesson_id = ? AND content_type = 'Overview' AND is_deleted = FALSE
       ORDER BY content_id ASC
       LIMIT 1`,
      [lesson_id]
    );
    if (existing?.[0]) {
      return update_lesson_item(course_id, lesson_id, existing[0].content_id, body);
    }
  }

  const sequence = await next_sequence(pool, "tbl_lesson_contents", "lesson_id", lesson_id);

  const [result] = await sqlQuery(
    pool,
    `INSERT INTO tbl_lesson_contents (
      lesson_id, content_type, content_title, content_description,
      file_name, file_path, content_url, sequence_no, duration_seconds, file_size_bytes,
      learning_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
    lesson_id,
    data.content_type,
    data.content_title,
    data.content_description,
    data.file_name,
    data.file_path,
    data.content_url,
    sequence,
    data.duration_seconds,
    data.file_size_bytes,
    null]

  );

  try {
    const learning = await build_learning_json(
      {
        content_id: result?.insertId,
        lesson_id: lesson_id,
        content_title: data.content_title,
        file_name: data.file_name,
        content_url: data.content_url,
        file_path: data.file_path
      },
      file?.buffer,
      file?.mimetype
    );
    if (type === "Notes" && !has_html_pages(learning)) {
      throw fail("The ZIP must contain HTML files");
    }
    if (result?.insertId) {
      await save_learning_json(pool, result.insertId, learning_payload(data.content_title, learning));
    }
  } catch (err) {
    if (type === "Notes" || (file && is_zip_upload(file) && err.status === 400)) {
      if (result?.insertId) {
        await sqlQuery(
          pool,
          `UPDATE tbl_lesson_contents
           SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
           WHERE content_id = ?`,
          [result.insertId]
        );
      }
      throw err.status ? err : fail(err.message || "The ZIP must contain HTML files");
    }
    if (result?.insertId) {
      await save_learning_json(pool, result.insertId, learning_payload(data.content_title, null));
    }
  }

  log.pass("createLessonItem", `added ${data.content_type} to lesson ${lesson_id}`);
  return get_course_content(course_id);
}

export async function update_lesson_item(course_id, lesson_id, item_id, body = {}) {
  await ensure_content_schema();
  const pool = get_pool();
  await require_lesson(pool, course_id, lesson_id);
  const description = String(body.content_description || "").trim();
  const [rows] = await sqlQuery(
    pool,
    `SELECT content_id, content_type FROM tbl_lesson_contents
     WHERE content_id = ? AND lesson_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [item_id, lesson_id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Content item not found", 404);
  const announcement = row.content_type === "Announcement";
  const overview = row.content_type === "Overview";
  const title = announcement ?
    description.slice(0, 200) :
    overview ? null :
    String(body.content_title || "").trim();
  const title_error = announcement || overview ? "" : validateRequiredText(title, "Title", 200);
  if (title_error) throw fail(title_error);
  const description_error = validateOptionalText(description, announcement ? "Message" : "Body", 8000);
  if (description_error) throw fail(description_error);
  if (row.content_type === "Overview" && !description) throw fail("Body is required");
  if (announcement && !description) throw fail("Message is required");
  await sqlQuery(
    pool,
    `UPDATE tbl_lesson_contents
     SET content_title = ?, content_description = ?, updated_at = CURRENT_TIMESTAMP
     WHERE content_id = ? AND lesson_id = ?`,
    [title, description || null, item_id, lesson_id]
  );
  if (row.content_type === "Overview") {
    await sqlQuery(
      pool,
      `UPDATE tbl_lesson_contents
       SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE lesson_id = ? AND content_type = 'Overview' AND content_id <> ? AND is_deleted = FALSE`,
      [lesson_id, item_id]
    );
  }
  log.pass("updateLessonItem", `updated item ${item_id}`);
  return get_course_content(course_id);
}

export async function delete_lesson_item(course_id, lesson_id, item_id) {
  await ensure_content_schema();
  const pool = get_pool();
  await require_lesson(pool, course_id, lesson_id);
  const [rows] = await sqlQuery(
    pool,
    `SELECT content_id FROM tbl_lesson_contents
     WHERE content_id = ? AND lesson_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [item_id, lesson_id]
  );
  if (!rows?.[0]) throw fail("Content item not found", 404);

  await sqlQuery(
    pool,
    `UPDATE tbl_lesson_contents
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE content_id = ? AND lesson_id = ?`,
    [item_id, lesson_id]
  );
  return get_course_content(course_id);
}

export async function list_lesson_feedback(course_id, lesson_id, query = {}) {
  await ensure_content_schema();
  await ensure_learn_schema();
  const pool = get_pool();
  await require_lesson(pool, course_id, lesson_id);
  const program_id = Number(query.program_id);
  const scoped = Number.isInteger(program_id) && program_id > 0;

  const [rows] = await sqlQuery(
    pool,
    `SELECT f.feedback_id, f.lesson_id, f.quiz_id, f.rating, f.remarks,
            s.email, q.quiz_title
     FROM tbl_lesson_feedback f
     LEFT JOIN tbl_students s ON s.student_id = f.student_id
     LEFT JOIN tbl_course_quizzes q ON q.quiz_id = f.quiz_id
     WHERE f.course_id = ? AND f.lesson_id = ?
       ${scoped ? `AND EXISTS (
         SELECT 1 FROM tbl_course_registrations r
         WHERE r.course_id = f.course_id
           AND r.student_id = f.student_id
           AND r.program_id = ?
           AND r.is_deleted = FALSE
           AND r.status = 'registered'
       )` : ""}
     ORDER BY COALESCE(f.updated_at, f.created_at) DESC, f.feedback_id DESC`,
    scoped ? [course_id, lesson_id, program_id] : [course_id, lesson_id]
  );

  const items = (rows || []).map((row) => ({
    feedback_id: Number(row.feedback_id),
    quiz_id: row.quiz_id == null ? null : Number(row.quiz_id),
    quiz_title: row.quiz_title || "",
    email: row.email || "",
    rating: Number(row.rating),
    remarks: row.remarks || ""
  }));
  const count = items.length;
  const average = count ?
  Math.round(items.reduce((sum, item) => sum + item.rating, 0) / count * 10) / 10 :
  0;

  return {
    lesson_id: Number(lesson_id),
    summary: { count, average },
    items
  };
}

export async function reorder_course_content(course_id, body = {}) {
  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  const module_ids = Array.isArray(body.module_ids) ? body.module_ids.map(Number).filter((id) => id > 0) : [];
  const blocks = Array.isArray(body.blocks) ? body.blocks : [];

  if (!module_ids.length && !blocks.length) throw fail("Nothing to reorder");

  for (let index = 0; index < module_ids.length; index += 1) {
    await sqlQuery(
      pool,
      `UPDATE tbl_course_modules
       SET sequence_no = ?, updated_at = CURRENT_TIMESTAMP
       WHERE module_id = ? AND course_id = ? AND is_deleted = FALSE`,
      [index + 1, module_ids[index], course_id]
    );
  }

  const sequence_by_module = new Map();
  for (const block of blocks) {
    const content_id = Number(block.content_id);
    const module_id = Number(block.module_id);
    if (!content_id || !module_id) continue;
    const next_no = (sequence_by_module.get(module_id) || 0) + 1;
    sequence_by_module.set(module_id, next_no);
    await sqlQuery(
      pool,
      `UPDATE tbl_course_content
       SET sequence_no = ?, module_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE content_id = ? AND course_id = ? AND is_deleted = FALSE`,
      [next_no, module_id, content_id, course_id]
    );
    if (block.lesson_id) {
      await sqlQuery(
        pool,
        `UPDATE tbl_course_lessons
         SET sequence_no = ?, module_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE lesson_id = ? AND course_id = ? AND is_deleted = FALSE`,
        [next_no, module_id, Number(block.lesson_id), course_id]
      );
    }
    if (block.quiz_id) {
      await sqlQuery(
        pool,
        `UPDATE tbl_course_quizzes
         SET module_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE quiz_id = ? AND course_id = ? AND is_deleted = FALSE`,
        [module_id, Number(block.quiz_id), course_id]
      );
    }
    if (block.coding_set_id) {
      await sqlQuery(
        pool,
        `UPDATE tbl_lesson_coding_sets
         SET module_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE coding_set_id = ? AND course_id = ? AND is_deleted = FALSE`,
        [module_id, Number(block.coding_set_id), course_id]
      );
    }
  }

  log.pass("reorderCourseContent", `reordered course ${course_id}`);
  return get_course_content(course_id);
}
