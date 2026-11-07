import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { validateRequiredText } from "@datapromr/validation";
import { get_course } from "../course_manager/course_service.js";
import { get_pool } from "../utils/db_setup.js";
import { get_course_content } from "./content_service.js";
import { ensure_content_schema } from "./schema.js";
import { ai_backend_url } from "../utils/ai_backend.js";

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const BLOOM_LEVELS = new Set(["remember", "understand", "apply", "analyze", "evaluate", "create"]);
const DIFFICULTY_KEYS = ["easy", "medium", "hard"];
const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

export function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function as_int(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function as_count(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

export function parse_json_object(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

export function read_mix(source, keys, label) {
  const raw = parse_json_object(source) || {};
  const mix = {};
  let total = 0;
  for (const key of keys) {
    const count = as_count(raw[key] ?? 0);
    if (count == null) throw fail(`${label} ${key} must be 0 or more`);
    mix[key] = count;
    total += count;
  }
  return { mix, total };
}

export function mix_summary(mix) {
  const used = Object.entries(mix || {}).filter(([, count]) => Number(count) > 0);
  if (used.length === 1) return used[0][0];
  return used.length ? "mixed" : "";
}

export function question_difficulty(value) {
  const text = String(value || "").trim().toLowerCase();
  return DIFFICULTIES.has(text) ? text : "";
}

export function question_bloom(value) {
  const text = String(value || "").trim().toLowerCase();
  return BLOOM_LEVELS.has(text) ? text : "";
}

export function parse_options(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parse_options(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

export function map_question(row, { include_answer = false } = {}) {
  const question = {
    question_id: Number(row.question_id),
    question_number: Number(row.question_number || 0),
    question_text: row.question_text,
    options: parse_options(row.options_json),
    difficulty: row.difficulty || "",
    bloom_level: row.bloom_level || ""
  };
  if (include_answer) {
    question.correct_answer = row.correct_answer;
    question.explanation = row.explanation || "";
  }
  return question;
}

export function map_quiz(row) {
  return {
    quiz_id: Number(row.quiz_id),
    course_id: Number(row.course_id),
    module_id: row.module_id ? Number(row.module_id) : null,
    lesson_id: row.lesson_id ? Number(row.lesson_id) : null,
    quiz_title: row.quiz_title,
    quiz_description: row.quiz_description || "",
    difficulty: row.difficulty || "",
    bloom_level: row.bloom_level || "",
    difficulty_mix: parse_json_object(row.difficulty_mix),
    bloom_mix: parse_json_object(row.bloom_mix),
    question_count: Number(row.question_count || 0),
    questions_shown: Number(row.questions_shown || row.question_count || 0),
    total_marks: row.total_marks == null ? null : Number(row.total_marks),
    passing_marks: row.passing_marks == null ? null : Number(row.passing_marks),
    is_published: Boolean(row.is_published),
    is_active: Boolean(row.is_active),
    created_at: row.created_at || null
  };
}

export function shuffle(list) {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function shown_question_count(quiz, pool_size) {
  const size = Number(pool_size || quiz?.question_count || 0);
  if (size < 1) return 0;
  const shown = Number(quiz?.questions_shown);
  if (!Number.isInteger(shown) || shown < 1) return size;
  return Math.min(shown, size);
}

export function with_display_numbers(questions) {
  return questions.map((item, index) => ({ ...item, question_number: index + 1 }));
}

export function resolve_questions_shown(value, pool_size, fallback) {
  const size = Number(pool_size) || 0;
  const requested = as_int(value);
  if (requested) {
    if (size && requested > size) throw fail(`Questions shown cannot exceed ${size}`);
    return requested;
  }
  const previous = as_int(fallback);
  if (previous) return size ? Math.min(previous, size) : previous;
  return size || null;
}

export async function next_content_sequence(pool, course_id, module_id, after_lesson_id = null) {
  if (after_lesson_id) {
    const [rows] = await sqlQuery(
      pool,
      `SELECT COALESCE(MAX(cc.sequence_no), 0) AS seq
       FROM tbl_course_content cc
       LEFT JOIN tbl_course_quizzes q
         ON q.quiz_id = cc.quiz_id AND q.is_deleted = FALSE
       WHERE cc.course_id = ? AND cc.module_id = ? AND cc.is_deleted = FALSE
         AND (cc.lesson_id = ? OR q.lesson_id = ?)`,
      [course_id, module_id, after_lesson_id, after_lesson_id]
    );
    const seq = Number(rows?.[0]?.seq || 0);
    if (seq) {
      await sqlQuery(
        pool,
        `UPDATE tbl_course_content
         SET sequence_no = sequence_no + 1, updated_at = CURRENT_TIMESTAMP
         WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE AND sequence_no > ?`,
        [course_id, module_id, seq]
      );
      return seq + 1;
    }
  }
  const [rows] = await sqlQuery(
    pool,
    `SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_no
     FROM tbl_course_content
     WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE`,
    [course_id, module_id]
  );
  return Number(rows?.[0]?.next_no || 1);
}

export async function resolve_module_id(pool, course_id, module_id) {
  const id = as_int(module_id);
  if (id) {
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
  const [rows] = await sqlQuery(
    pool,
    `SELECT module_id FROM tbl_course_modules
     WHERE course_id = ? AND is_deleted = FALSE
     ORDER BY sequence_no ASC, module_id ASC
     LIMIT 1`,
    [course_id]
  );
  if (rows?.[0]?.module_id) return Number(rows[0].module_id);
  throw fail("Create a module before adding a quiz");
}

export async function resolve_lesson_id(pool, course_id, module_id, lesson_id) {
  const id = as_int(lesson_id);
  if (!id) throw fail("Select a lesson for this quiz");
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

export async function require_quiz(pool, course_id, quiz_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT quiz_id, course_id, module_id, lesson_id, quiz_title, quiz_description, difficulty, bloom_level,
            difficulty_mix, bloom_mix, question_count, questions_shown, total_marks, passing_marks, is_published, is_active, created_at
     FROM tbl_course_quizzes
     WHERE quiz_id = ? AND course_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [quiz_id, course_id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Quiz not found", 404);
  return row;
}

export async function list_questions(pool, quiz_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT question_id, quiz_id, question_number, question_text, options_json, correct_answer,
            explanation, difficulty, bloom_level
     FROM tbl_quiz_questions
     WHERE quiz_id = ? AND is_deleted = FALSE
     ORDER BY question_number ASC, question_id ASC`,
    [quiz_id]
  );
  return rows || [];
}

export async function generate_from_provider(payload) {
  let url;
  try {
    url = ai_backend_url("/api/quiz/generate_from_text");
  } catch (err) {
    throw fail(err.message || "AI_BACKEND is not configured", err.status || 500);
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000)
    });
  } catch (err) {
    log.fail("generateQuiz", err.message);
    throw fail("Unable to reach the quiz generator", 502);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw fail(data.error || data.message || "Quiz generator did not return a quiz", 502);
  }
  if (!Array.isArray(data.questions) || !data.questions.length) {
    throw fail("Quiz generator returned no questions", 502);
  }
  return data;
}

export async function generate_quiz(course_id, body = {}) {
  await get_course(course_id);
  await ensure_content_schema();

  const quiz_name = String(body.quiz_name || "").trim();
  const text = String(body.content || body.text || "").trim();
  const count = as_int(body.count) || 10;
  const questions_shown_input = as_int(body.questions_shown);
  const difficulty_mix = read_mix(body.difficulty, DIFFICULTY_KEYS, "Difficulty");
  const bloom_mix = read_mix(body.bloom, BLOOM_KEYS, "Bloom");

  const name_error = validateRequiredText(quiz_name, "Quiz name", 200);
  if (name_error) throw fail(name_error);
  if (text.length < 20) throw fail("Paste at least 20 characters of source text");
  if (text.length > 20000) throw fail("Source text must be 20000 characters or less");
  if (count < 1 || count > 100) throw fail("Question count must be between 1 and 100");
  if (!questions_shown_input || questions_shown_input < 1 || questions_shown_input > 100) {
    throw fail("Questions shown to students must be between 1 and 100");
  }
  if (questions_shown_input > count) {
    throw fail("Questions shown cannot exceed the number of generated questions");
  }
  if (difficulty_mix.total !== count) {
    throw fail(`Difficulty counts must add up to ${count}`);
  }
  if (bloom_mix.total !== count) {
    throw fail(`Bloom counts must add up to ${count}`);
  }

  const pool = get_pool();
  const module_id = await resolve_module_id(pool, course_id, body.module_id);
  const lesson_id = as_int(body.lesson_id) ?
    await resolve_lesson_id(pool, course_id, module_id, body.lesson_id) :
    null;
  const generated = await generate_from_provider({
    content: text,
    count,
    difficulty: difficulty_mix.mix,
    bloom: bloom_mix.mix
  });

  const questions = generated.questions.
  map((item, index) => {
    const options = parse_options(item.options);
    const correct = String(item.correct_answer || "").trim();
    const question_text = String(item.question_text || "").trim();
    if (!question_text || options.length < 2 || !correct) return null;
    return {
      question_number: as_int(item.question_number) || index + 1,
      question_text: question_text,
      options,
      correct_answer: correct,
      explanation: String(item.explanation || "").trim(),
      difficulty: question_difficulty(item.difficulty),
      bloom_level: question_bloom(item.bloom_level)
    };
  }).
  filter(Boolean);

  if (!questions.length) throw fail("Quiz generator returned invalid questions", 502);

  const title = String(generated.quiz_name || quiz_name).trim();
  const total = questions.length;
  const questions_shown = Math.min(questions_shown_input, total);
  const passing = Math.ceil(total * 0.5);
  const sequence = await next_content_sequence(pool, course_id, module_id, lesson_id);
  const saved_difficulty = read_mix(
    generated.settings?.difficulty || difficulty_mix.mix,
    DIFFICULTY_KEYS,
    "Difficulty"
  ).mix;
  const saved_bloom = read_mix(
    generated.settings?.bloom_level || generated.settings?.bloom || bloom_mix.mix,
    BLOOM_KEYS,
    "Bloom"
  ).mix;
  const difficulty_label = mix_summary(saved_difficulty);
  const bloom_label = mix_summary(saved_bloom);

  const [result] = await sqlQuery(
    pool,
    `INSERT INTO tbl_course_quizzes (
      course_id, module_id, lesson_id, quiz_title, quiz_description, total_marks, passing_marks,
      question_count, questions_shown, difficulty, bloom_level, difficulty_mix, bloom_mix,
      external_quiz_id, source_text, source_type, source_characters, source_words, moodle_xml, xml_file,
      is_published, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
    [
    course_id,
    module_id,
    lesson_id,
    title,
    `Generated from text · ${difficulty_label} · ${bloom_label}`,
    total,
    passing,
    total,
    questions_shown,
    difficulty_label,
    bloom_label,
    JSON.stringify(saved_difficulty),
    JSON.stringify(saved_bloom),
    generated.quiz_id || null,
    text,
    generated.source?.type || "text",
    generated.source?.characters ?? text.length,
    generated.source?.words ?? null,
    generated.moodle_xml || null,
    generated.xml_file || null]

  );

  const quiz_id = Number(result.insertId);
  for (const question of questions) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_quiz_questions
         (quiz_id, question_number, question_text, options_json, correct_answer, explanation, difficulty, bloom_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
      quiz_id,
      question.question_number,
      question.question_text,
      JSON.stringify(question.options),
      question.correct_answer,
      question.explanation || null,
      question.difficulty || null,
      question.bloom_level || null]

    );
  }

  await sqlQuery(
    pool,
    `INSERT INTO tbl_course_content (course_id, module_id, content_type, quiz_id, lesson_id, sequence_no)
     VALUES (?, ?, 'quiz', ?, ?, ?)`,
    [course_id, module_id, quiz_id, lesson_id, sequence]
  );

  log.pass(
    "generateQuiz",
    `created quiz ${quiz_id} with ${total} questions (${questions_shown} shown) for course ${course_id}`
  );
  return get_course_content(course_id);
}

export function normalize_questions(list) {
  if (!Array.isArray(list) || !list.length) throw fail("Add at least one question");
  return list.map((item, index) => {
    const options = parse_options(item.options);
    const correct = String(item.correct_answer || "").trim();
    const question_text = String(item.question_text || "").trim();
    if (!question_text) throw fail(`Question ${index + 1} needs text`);
    if (options.length < 2) throw fail(`Question ${index + 1} needs at least two options`);
    if (!correct || !options.includes(correct)) {
      throw fail(`Question ${index + 1} needs a correct answer from its options`);
    }
    return {
      question_id: as_int(item.question_id),
      question_number: index + 1,
      question_text: question_text,
      options,
      correct_answer: correct,
      explanation: String(item.explanation || "").trim(),
      difficulty: question_difficulty(item.difficulty),
      bloom_level: question_bloom(item.bloom_level)
    };
  });
}

export async function get_employee_quiz(course_id, quiz_id) {
  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  const quiz = map_quiz(await require_quiz(pool, course_id, quiz_id));
  const questions = (await list_questions(pool, quiz_id)).map((row) =>
  map_question(row, { includeAnswer: true })
  );
  return { quiz, questions };
}

export async function update_quiz(course_id, quiz_id, body = {}) {
  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  const existing = await require_quiz(pool, course_id, quiz_id);

  const title = String(body.quiz_name || body.quiz_title || "").trim();
  if (!title) throw fail("Quiz name is required");

  const module_id = await resolve_module_id(pool, course_id, body.module_id || existing.module_id);
  const lesson_requested = Object.prototype.hasOwnProperty.call(body, "lesson_id") ?
    body.lesson_id :
    existing.lesson_id;
  const lesson_id = as_int(lesson_requested) ?
    await resolve_lesson_id(pool, course_id, module_id, lesson_requested) :
    null;
  const questions = Array.isArray(body.questions) ? normalize_questions(body.questions) : null;
  const published = body.is_published === false || body.is_active === false ? false : true;
  const pool_size = questions ? questions.length : Number(existing.question_count || 0);
  const questions_shown = resolve_questions_shown(
    body.questions_shown,
    pool_size,
    existing.questions_shown
  );

  await sqlQuery(
    pool,
    `UPDATE tbl_course_quizzes
     SET quiz_title = ?, module_id = ?, lesson_id = ?,
         questions_shown = ?, is_published = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE quiz_id = ? AND course_id = ? AND is_deleted = FALSE`,
    [title, module_id, lesson_id, questions_shown, published, published, quiz_id, course_id]
  );

  if (questions) {
    const current = await list_questions(pool, quiz_id);
    const keep = new Set();
    for (const question of questions) {
      if (question.question_id && current.some((row) => Number(row.question_id) === question.question_id)) {
        await sqlQuery(
          pool,
          `UPDATE tbl_quiz_questions
           SET question_number = ?, question_text = ?, options_json = ?, correct_answer = ?,
               explanation = ?, difficulty = ?, bloom_level = ?, updated_at = CURRENT_TIMESTAMP
           WHERE question_id = ? AND quiz_id = ? AND is_deleted = FALSE`,
          [
          question.question_number,
          question.question_text,
          JSON.stringify(question.options),
          question.correct_answer,
          question.explanation || null,
          question.difficulty || null,
          question.bloom_level || null,
          question.question_id,
          quiz_id]

        );
        keep.add(question.question_id);
      } else {
        const [result] = await sqlQuery(
          pool,
          `INSERT INTO tbl_quiz_questions
             (quiz_id, question_number, question_text, options_json, correct_answer, explanation, difficulty, bloom_level)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
          quiz_id,
          question.question_number,
          question.question_text,
          JSON.stringify(question.options),
          question.correct_answer,
          question.explanation || null,
          question.difficulty || null,
          question.bloom_level || null]

        );
        keep.add(Number(result.insertId));
      }
    }
    for (const row of current) {
      if (keep.has(Number(row.question_id))) continue;
      await sqlQuery(
        pool,
        `UPDATE tbl_quiz_questions
         SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE question_id = ? AND quiz_id = ?`,
        [row.question_id, quiz_id]
      );
    }
    const total = questions.length;
    await sqlQuery(
      pool,
      `UPDATE tbl_course_quizzes
       SET question_count = ?, questions_shown = ?, total_marks = ?, passing_marks = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE quiz_id = ? AND course_id = ?`,
      [total, questions_shown, total, Math.ceil(total * 0.5), quiz_id, course_id]
    );
  }

  await sqlQuery(
    pool,
    `UPDATE tbl_course_content
     SET module_id = ?, lesson_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND quiz_id = ? AND is_deleted = FALSE`,
    [module_id, lesson_id, course_id, quiz_id]
  );

  log.pass("updateQuiz", `updated quiz ${quiz_id} for course ${course_id}`);
  return get_course_content(course_id);
}

export async function delete_quiz(course_id, quiz_id) {
  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  await require_quiz(pool, course_id, quiz_id);
  await sqlQuery(
    pool,
    `UPDATE tbl_quiz_questions
     SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE quiz_id = ? AND is_deleted = FALSE`,
    [quiz_id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_course_quizzes
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE quiz_id = ? AND course_id = ?`,
    [quiz_id, course_id]
  );
  await sqlQuery(
    pool,
    `UPDATE tbl_course_content
     SET is_deleted = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND quiz_id = ? AND is_deleted = FALSE`,
    [course_id, quiz_id]
  );
  log.pass("deleteQuiz", `deleted quiz ${quiz_id}`);
  return get_course_content(course_id);
}

export function program_student_sql(program_id, course_sql, student_sql) {
  if (!program_id) return "";
  return `AND EXISTS (
    SELECT 1 FROM tbl_course_registrations r
    WHERE r.course_id = ${course_sql}
      AND r.student_id = ${student_sql}
      AND r.program_id = ?
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
  )`;
}
