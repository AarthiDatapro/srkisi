import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { validateOptionalText, validateRequiredText } from "@datapromr/validation";
import { get_course } from "../course_manager/course_service.js";
import { get_pool } from "../utils/db_setup.js";
import { ensure_learn_schema } from "../course_learning/schema.js";
import { is_zip_upload, save_lesson_file, save_notes_zip } from "./content_file.js";
import { extract_learning_content } from "./document_extract.js";
import { ensure_content_schema } from "./schema.js";

const ITEM_TYPES = new Set(["Video", "Material", "Notes", "Overview", "Announcement"]);
export const TEXT_TYPES = new Set(["Overview", "Announcement"]);

export function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function as_int(value) {
  if (value === 0 || value === "0") return 0;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function parse_learning_json(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.extracted) {
      return { ...parsed, sections: Array.isArray(parsed.sections) ? parsed.sections : [] };
    }
    return parsed?.sections?.length ? parsed : null;
  } catch {
    return null;
  }
}

export function learning_payload(title, learning) {
  if (learning?.sections?.length) {
    return {
      ...learning,
      title: learning.title || title || "Lesson",
      extracted: true
    };
  }
  return { title: title || "Lesson", sections: [], extracted: true };
}

export function map_item(row) {
  return {
    content_id: row.content_id,
    lesson_id: row.lesson_id,
    content_type: row.content_type,
    content_title: row.content_title,
    content_description: row.content_description || "",
    file_name: row.file_name || "",
    file_path: row.file_path || "",
    content_url: row.content_url || "",
    sequence_no: Number(row.sequence_no || 0),
    duration_seconds: as_int(row.duration_seconds),
    file_size_bytes: as_int(row.file_size_bytes),
    learning_json: parse_learning_json(row.learning_json),
    telugu_file_name: row.telugu_file_name || "",
    telugu_file_path: row.telugu_file_path || "",
    telugu_learning_json: parse_learning_json(row.telugu_learning_json),
    is_required: row.is_required !== false && row.is_required !== 0,
    is_active: Boolean(row.is_active),
    created_at: row.created_at || null
  };
}

export function map_lesson(row, items = []) {
  return {
    lesson_id: row.lesson_id,
    course_id: row.course_id,
    module_id: row.module_id ? Number(row.module_id) : null,
    lesson_title: row.lesson_title,
    lesson_description: row.lesson_description || "",
    sequence_no: Number(row.sequence_no || 0),
    duration_minutes: as_int(row.duration_minutes),
    is_active: Boolean(row.is_active),
    created_at: row.created_at || null,
    items
  };
}

export function map_module(row, blocks = []) {
  return {
    module_id: Number(row.module_id),
    course_id: row.course_id,
    module_title: row.module_title,
    module_description: row.module_description || "",
    sequence_no: Number(row.sequence_no || 0),
    is_active: Boolean(row.is_active),
    blocks
  };
}

export function validate_module(body = {}) {
  return {
    module_title: validateRequiredText(body.module_title, "Module title", 200),
    module_description: validateOptionalText(body.module_description, "Description", 2000)
  };
}

export function validate_lesson(body = {}) {
  const minutes = String(body.duration_minutes ?? "").trim();
  let duration_error = "";
  if (minutes) {
    if (!/^\d+$/.test(minutes) || Number(minutes) <= 0) {
      duration_error = "Duration must be a whole number of minutes";
    } else if (Number(minutes) > 6000) {
      duration_error = "Duration must be 6000 minutes or less";
    }
  }
  return {
    lesson_title: validateRequiredText(body.lesson_title, "Lesson title", 200),
    lesson_description: validateOptionalText(body.lesson_description, "Description", 2000),
    duration_minutes: duration_error
  };
}

export function normalize_http_url(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function has_html_pages(learning) {
  return Boolean(
    learning?.packageType === "html" &&
    Array.isArray(learning?.sections) &&
    learning.sections.some((section) => String(section?.html || "").trim())
  );
}

export function validate_item(body = {}, { has_file = false } = {}) {
  const type = String(body.content_type || "").trim();
  if (type === "Overview") {
    const body_text = String(body.content_description || "").trim();
    return {
      content_type: "",
      content_title: "",
      content_description: body_text ?
        validateOptionalText(body.content_description, "Body", 8000) :
        "Body is required",
      content_url: ""
    };
  }
  if (type === "Announcement") {
    const body_text = String(body.content_description || "").trim();
    return {
      content_type: "",
      content_title: "",
      content_description: body_text ?
        validateOptionalText(body.content_description, "Message", 8000) :
        "Message is required",
      content_url: ""
    };
  }
  if (type === "Notes") {
    return {
      content_type: "",
      content_title: validateRequiredText(body.content_title, "Title", 200),
      content_description: "",
      content_url: has_file ? "" : "Upload a ZIP of HTML files"
    };
  }
  const url = normalize_http_url(body.content_url);
  const raw_url = String(body.content_url || "").trim();
  const body_text = String(body.content_description || "").trim();
  let type_error = ITEM_TYPES.has(type) ? "" : "Select a content type";
  let url_error = "";
  if (raw_url && !url) url_error = "Enter a valid http(s) link";else
  if (!url && !has_file && !TEXT_TYPES.has(type)) {
    url_error = "Add a link or upload a file";
  }
  let description_error = validateOptionalText(body.content_description, "Body", 8000);
  if (TEXT_TYPES.has(type) && !has_file && !url && !body_text) {
    description_error = "Add text, a link, or a file";
  }
  return {
    content_type: type_error,
    content_title: validateRequiredText(body.content_title, "Title", 200),
    content_description: description_error,
    content_url: url_error
  };
}

export function first_error(errors) {
  return Object.values(errors).find(Boolean) || "";
}

export async function next_sequence(pool, table, column, id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_no
     FROM ${table}
     WHERE ${column} = ? AND is_deleted = FALSE`,
    [id]
  );
  return Number(rows?.[0]?.next_no || 1);
}

export async function next_content_sequence(pool, course_id, module_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_no
     FROM tbl_course_content
     WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE`,
    [course_id, module_id]
  );
  return Number(rows?.[0]?.next_no || 1);
}

export async function list_modules(pool, course_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT module_id, course_id, module_title, module_description, sequence_no, is_active
     FROM tbl_course_modules
     WHERE course_id = ? AND is_deleted = FALSE
     ORDER BY sequence_no ASC, module_id ASC`,
    [course_id]
  );
  return rows || [];
}

export async function require_module(pool, course_id, module_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT module_id, course_id, module_title, module_description, sequence_no, is_active
     FROM tbl_course_modules
     WHERE module_id = ? AND course_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [module_id, course_id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Module not found", 404);
  return row;
}

export async function resolve_module_id(pool, course_id, requested) {
  const id = as_int(requested);
  if (id) {
    await require_module(pool, course_id, id);
    return id;
  }
  const modules = await list_modules(pool, course_id);
  if (modules.length === 1) return Number(modules[0].module_id);
  if (modules.length === 0) {
    const sequence = await next_sequence(pool, "tbl_course_modules", "course_id", course_id);
    const [result] = await sqlQuery(
      pool,
      `INSERT INTO tbl_course_modules (course_id, module_title, sequence_no)
       VALUES (?, ?, ?)`,
      [course_id, `Module ${sequence}`, sequence]
    );
    return Number(result.insertId);
  }
  throw fail("Select a module");
}

export async function require_lesson(pool, course_id, lesson_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT lesson_id, course_id, module_id, lesson_title, lesson_description, sequence_no,
            duration_minutes, is_active
     FROM tbl_course_lessons
     WHERE lesson_id = ? AND course_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [lesson_id, course_id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Lesson not found", 404);
  return row;
}

export async function list_items(pool, lesson_ids, options = {}) {
  if (!lesson_ids.length) return [];
  const include_html = options.include_html !== false;
  const html_columns = include_html ? "learning_json, telugu_learning_json," : "";
  const placeholders = lesson_ids.map(() => "?").join(",");
  const [rows] = await sqlQuery(
    pool,
    `SELECT content_id, lesson_id, content_type, content_title, content_description,
            file_name, file_path, content_url, sequence_no, duration_seconds,
            file_size_bytes, ${html_columns}
            telugu_file_name, telugu_file_path, is_required, is_active, created_at
     FROM tbl_lesson_contents
     WHERE lesson_id IN (${placeholders}) AND is_deleted = FALSE
     ORDER BY sequence_no ASC, content_id ASC`,
    lesson_ids
  );
  return (rows || []).map(map_item);
}

export async function save_learning_json(pool, content_id, learning) {
  await sqlQuery(
    pool,
    `UPDATE tbl_lesson_contents SET learning_json = ?, updated_at = CURRENT_TIMESTAMP WHERE content_id = ?`,
    [JSON.stringify(learning), content_id]
  );
}

export function notes_language_of(body) {
  return String(body.notes_language || "").toLowerCase() === "telugu" ? "telugu" : "english";
}

export async function notes_item_without_english(pool, lesson_id) {
  return notes_item_for_english(pool, lesson_id);
}

export async function notes_item_for_english(pool, lesson_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT content_id, file_path, learning_json
     FROM tbl_lesson_contents
     WHERE lesson_id = ? AND content_type = 'Notes' AND is_deleted = FALSE
     ORDER BY content_id ASC`,
    [lesson_id]
  );
  if (!rows?.length) return null;
  const with_english = rows.find((row) => row.file_path || row.learning_json);
  return Number((with_english || rows[0]).content_id);
}

export async function retire_other_english_notes(pool, lesson_id, keep_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT content_id, telugu_file_path, telugu_learning_json
     FROM tbl_lesson_contents
     WHERE lesson_id = ? AND content_type = 'Notes' AND is_deleted = FALSE`,
    [lesson_id]
  );
  for (const row of rows || []) {
    if (Number(row.content_id) === Number(keep_id)) continue;
    if (row.telugu_file_path || row.telugu_learning_json) {
      await sqlQuery(
        pool,
        `UPDATE tbl_lesson_contents
         SET file_name = NULL, file_path = NULL, file_size_bytes = NULL, learning_json = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE content_id = ?`,
        [row.content_id]
      );
    } else {
      await sqlQuery(
        pool,
        `UPDATE tbl_lesson_contents
         SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE content_id = ?`,
        [row.content_id]
      );
    }
  }
}

export async function notes_item_for_telugu(pool, lesson_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT content_id, telugu_learning_json
     FROM tbl_lesson_contents
     WHERE lesson_id = ? AND content_type = 'Notes' AND is_deleted = FALSE
     ORDER BY content_id ASC`,
    [lesson_id]
  );
  if (!rows?.length) return null;
  const with_telugu = rows.find((row) => row.telugu_learning_json);
  return Number((with_telugu || rows[rows.length - 1]).content_id);
}

export async function store_telugu_notes(pool, content_id, file_meta, learning) {
  await sqlQuery(
    pool,
    `UPDATE tbl_lesson_contents
     SET telugu_file_name = ?, telugu_file_path = ?, telugu_file_size_bytes = ?,
         telugu_learning_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE content_id = ?`,
    [
      file_meta.file_name || null,
      file_meta.file_path || null,
      file_meta.file_size_bytes || null,
      JSON.stringify(learning),
      content_id
    ]
  );
}

export async function build_learning_json(item, file_buffer, mime) {
  return extract_learning_content({
    title: item.content_title,
    fileName: item.file_name,
    mime,
    url: item.content_url,
    filePath: item.file_path,
    fileBuffer: file_buffer,
    file_buffer,
    lessonId: item.lesson_id,
    contentId: item.content_id
  });
}

const extract_jobs = new Map();

export async function persist_learning_json(pool, item, learning) {
  const payload = learning_payload(item.content_title, learning);
  await save_learning_json(pool, item.content_id, payload);
  item.learning_json = payload;
  return payload;
}

export async function extract_item_once(pool, item, file_buffer, mime) {
  const id = item.content_id;
  if (item.learning_json) return item.learning_json;
  if (extract_jobs.has(id)) return extract_jobs.get(id);

  const job = (async () => {
    try {
      const learning = await build_learning_json(item, file_buffer, mime);
      return persist_learning_json(pool, item, learning);
    } catch (err) {
      log.warn("extractLearningContent", err.message);
      return persist_learning_json(pool, item, null);
    } finally {
      extract_jobs.delete(id);
    }
  })();

  extract_jobs.set(id, job);
  return job;
}

export async function hydrate_learning_json(pool, items) {
  const pending = items.filter(
    (item) =>
    !item.learning_json &&
    ["Material", "Notes"].includes(item.content_type) && (
    item.file_path || item.content_url)
  );
  for (const item of pending) {
    await extract_item_once(pool, item);
  }
}

export function parse_options(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      return parse_options(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

export async function list_quiz_questions(pool, quiz_ids) {
  if (!quiz_ids.length) return [];
  const placeholders = quiz_ids.map(() => "?").join(",");
  const [rows] = await sqlQuery(
    pool,
    `SELECT question_id, quiz_id, question_number, question_text, options_json, correct_answer,
            explanation, difficulty, bloom_level
     FROM tbl_quiz_questions
     WHERE quiz_id IN (${placeholders}) AND is_deleted = FALSE
     ORDER BY question_number ASC, question_id ASC`,
    quiz_ids
  );
  return (rows || []).map((row) => ({
    question_id: Number(row.question_id),
    quiz_id: Number(row.quiz_id),
    question_number: Number(row.question_number || 0),
    question_text: row.question_text,
    options: parse_options(row.options_json),
    correct_answer: row.correct_answer,
    explanation: row.explanation || "",
    difficulty: row.difficulty || "",
    bloom_level: row.bloom_level || ""
  }));
}

function parse_json_value(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function list_coding_exercises(pool, coding_set_ids) {
  if (!coding_set_ids.length) return new Map();
  const marks = coding_set_ids.map(() => "?").join(",");
  const [exercise_rows] = await sqlQuery(
    pool,
    `SELECT exercise_id, coding_set_id, exercise_number, description, language, function_name,
            reference_code, validation_status, validation_errors
     FROM tbl_coding_exercises
     WHERE coding_set_id IN (${marks}) AND is_deleted = FALSE
     ORDER BY exercise_number ASC, exercise_id ASC`,
    coding_set_ids
  );
  const exercise_ids = (exercise_rows || []).map((row) => Number(row.exercise_id));
  const cases_by_exercise = new Map();
  if (exercise_ids.length) {
    const case_marks = exercise_ids.map(() => "?").join(",");
    const [case_rows] = await sqlQuery(
      pool,
      `SELECT test_case_id, exercise_id, test_case_no, inputs_json, expected_output, error_text
       FROM tbl_coding_test_cases
       WHERE exercise_id IN (${case_marks}) AND is_deleted = FALSE
       ORDER BY test_case_no ASC, test_case_id ASC`,
      exercise_ids
    );
    for (const row of case_rows || []) {
      const key = Number(row.exercise_id);
      const list = cases_by_exercise.get(key) || [];
      list.push({
        test_case_id: Number(row.test_case_id),
        test_case: Number(row.test_case_no || 0),
        inputs: parse_json_value(row.inputs_json) || [],
        output: parse_json_value(row.expected_output),
        error: row.error_text || null
      });
      cases_by_exercise.set(key, list);
    }
  }

  const by_set = new Map();
  for (const row of exercise_rows || []) {
    const key = Number(row.coding_set_id);
    const list = by_set.get(key) || [];
    const errors = parse_json_value(row.validation_errors);
    list.push({
      exercise_id: Number(row.exercise_id),
      exercise_number: Number(row.exercise_number || 0),
      description: row.description,
      language: row.language,
      function_name: row.function_name,
      reference_code: row.reference_code,
      validation_status: row.validation_status || "",
      validation_errors: Array.isArray(errors) ? errors : [],
      test_cases: cases_by_exercise.get(Number(row.exercise_id)) || []
    });
    by_set.set(key, list);
  }
  return by_set;
}

export async function get_course_content(course_id, options = {}) {
  await ensure_content_schema();
  const course = await get_course(course_id, options.user);
  const pool = get_pool();
  const module_rows = await list_modules(pool, course_id);
  const [rows] = await sqlQuery(
    pool,
    `SELECT cc.content_id, cc.content_type, cc.sequence_no, cc.lesson_id, cc.quiz_id, cc.coding_set_id, cc.module_id,
            l.lesson_title, l.lesson_description, l.duration_minutes, l.is_active AS lesson_active,
            l.sequence_no AS lesson_sequence, l.course_id, l.created_at, l.module_id AS lesson_module_id,
            q.quiz_title, q.question_count, q.questions_shown, q.difficulty, q.bloom_level, q.is_published,
            q.is_active AS quiz_active, q.module_id AS quiz_module_id, q.lesson_id AS quiz_lesson_id,
            ql.lesson_title AS quiz_lesson_title,
            s.set_title, s.prompt AS coding_prompt,
            COALESCE(pl.programming_language_name, s.language) AS coding_language,
            s.exercise_count, s.is_published AS coding_published, s.lesson_id AS coding_lesson_id,
            s.module_id AS coding_module_id
     FROM tbl_course_content cc
     LEFT JOIN tbl_course_lessons l
       ON l.lesson_id = cc.lesson_id AND cc.content_type = 'lesson' AND l.is_deleted = FALSE
     LEFT JOIN tbl_course_quizzes q
       ON q.quiz_id = cc.quiz_id AND q.is_deleted = FALSE
     LEFT JOIN tbl_course_lessons ql
       ON ql.lesson_id = q.lesson_id AND ql.is_deleted = FALSE
     LEFT JOIN tbl_lesson_coding_sets s
       ON s.coding_set_id = cc.coding_set_id AND s.is_deleted = FALSE
     LEFT JOIN mst_programming_languages pl
       ON pl.programming_language_id = s.programming_language_id AND pl.is_deleted = FALSE
     LEFT JOIN tbl_course_modules m
       ON m.module_id = COALESCE(cc.module_id, l.module_id, q.module_id, s.module_id) AND m.is_deleted = FALSE
     WHERE cc.course_id = ? AND cc.is_deleted = FALSE
     ORDER BY COALESCE(m.sequence_no, 9999) ASC, cc.sequence_no ASC, cc.content_id ASC`,
    [course_id]
  );

  const lesson_ids = (rows || []).
  filter((row) => row.content_type === "lesson" && row.lesson_id).
  map((row) => row.lesson_id);
  const include_html = options.include_html !== false;
  const items = await list_items(pool, lesson_ids, { include_html });
  if (include_html && options.hydrate !== false) await hydrate_learning_json(pool, items);
  const items_by_lesson = new Map();
  for (const item of items) {
    const list = items_by_lesson.get(item.lesson_id) || [];
    list.push(item);
    items_by_lesson.set(item.lesson_id, list);
  }

  const quiz_ids = (rows || []).
  filter((row) => row.quiz_id).
  map((row) => row.quiz_id);
  const questions = await list_quiz_questions(pool, quiz_ids);
  const questions_by_quiz = new Map();
  for (const question of questions) {
    const list = questions_by_quiz.get(question.quiz_id) || [];
    list.push(question);
    questions_by_quiz.set(question.quiz_id, list);
  }

  const coding_ids = (rows || []).
  filter((row) => row.coding_set_id).
  map((row) => Number(row.coding_set_id));
  const exercises_by_set = await list_coding_exercises(pool, coding_ids);

  const blocks = (rows || []).map((row) => {
    const module_id = Number(row.module_id || row.lesson_module_id || row.quiz_module_id || row.coding_module_id || 0) || null;
    if (row.content_type === "coding") {
      if (!row.coding_set_id || !row.set_title) return null;
      const coding_set_id = Number(row.coding_set_id);
      return {
        content_id: row.content_id,
        content_type: "coding",
        sequence_no: Number(row.sequence_no || 0),
        module_id: module_id,
        coding: {
          coding_set_id,
          set_title: row.set_title,
          prompt: row.coding_prompt || "",
          language: row.coding_language || "",
          exercise_count: Number(row.exercise_count || 0),
          is_published: row.coding_published !== false && row.coding_published !== 0,
          module_id: module_id,
          lesson_id: Number(row.coding_lesson_id || row.lesson_id || 0) || null,
          exercises: exercises_by_set.get(coding_set_id) || []
        }
      };
    }
    if (row.content_type === "lesson" && row.lesson_id) {
      return {
        content_id: row.content_id,
        content_type: "lesson",
        sequence_no: Number(row.sequence_no || 0),
        module_id: module_id,
        lesson: map_lesson(
          {
            lesson_id: row.lesson_id,
            course_id: row.course_id,
            module_id: module_id,
            lesson_title: row.lesson_title,
            lesson_description: row.lesson_description,
            sequence_no: row.lesson_sequence,
            duration_minutes: row.duration_minutes,
            is_active: row.lesson_active,
            created_at: row.created_at
          },
          items_by_lesson.get(row.lesson_id) || []
        )
      };
    }
    return {
      content_id: row.content_id,
      content_type: row.content_type || "quiz",
      sequence_no: Number(row.sequence_no || 0),
      module_id: module_id,
      quiz: row.quiz_id ?
      {
        quiz_id: Number(row.quiz_id),
        quiz_title: row.quiz_title || "Quiz",
        question_count: Number(row.question_count || 0),
        questions_shown: Number(row.questions_shown || row.question_count || 0),
        difficulty: row.difficulty || "",
        bloom_level: row.bloom_level || "",
        is_published: row.is_published !== false && row.is_published !== 0,
        is_active: Boolean(row.quiz_active),
        module_id: module_id,
        lesson_id: Number(row.quiz_lesson_id || 0) || null,
        lesson_title: row.quiz_lesson_title || "",
        questions: questions_by_quiz.get(Number(row.quiz_id)) || []
      } :
      null
    };
  }).filter(Boolean);

  const blocks_by_module = new Map();
  for (const block of blocks) {
    const key = block.module_id || 0;
    const list = blocks_by_module.get(key) || [];
    list.push(block);
    blocks_by_module.set(key, list);
  }

  const modules = module_rows.map((row) => {
    const nested = (blocks_by_module.get(Number(row.module_id)) || []).slice().sort(
      (a, b) => a.sequence_no - b.sequence_no || a.content_id - b.content_id
    );
    return map_module(row, nested);
  });

  return { course, modules, blocks };
}
