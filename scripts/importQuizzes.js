// Import quizzes and their questions from an Excel workbook.
//
//   node scripts/importQuizzes.js
//   node scripts/importQuizzes.js --import
//   node scripts/importQuizzes.js "C:\path\quizzes.xlsx" --import
//
// One row is one question. Repeat course_name and quiz_name for the next question.
// The course must already be in tbl_courses. The module must already be on that course.
// A blank module uses the course's first module. A blank lesson keeps the quiz on the module.
// A quiz with the same name already on that course is skipped.
// The insert matches the site: tbl_course_quizzes, tbl_quiz_questions, and a
// tbl_course_content row of type quiz so the quiz appears in the course outline.
// course_id comes from tbl_courses. quiz_id comes from the quiz row just inserted.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(SCRIPT_DIR, "..", "server");
const server_require = createRequire(path.join(SERVER_DIR, "package.json"));

const dotenv = server_require("dotenv");
const mysql = server_require("mysql2/promise");
const AdmZip = server_require("adm-zip");

dotenv.config({ path: path.join(SERVER_DIR, ".env") });

const DO_IMPORT = process.argv.includes("--import");
const EXCEL_PATH = process.argv.map((arg) => String(arg)).find((arg) => arg.toLowerCase().endsWith(".xlsx"))
  || path.join(SCRIPT_DIR, "quizzes.xlsx");

const DIFFICULTY_KEYS = ["easy", "medium", "hard"];
const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate", "create"];
const OPTION_LETTERS = ["a", "b", "c", "d", "e", "f"];

const ALIASES = {
  course_name: ["course_name", "course name", "course_nme", "course"],
  course_code: ["course_code", "course code", "code"],
  quiz_name: ["quiz_name", "quiz_names", "quiz name", "quiz title", "quiz_title", "quiz"],
  quiz_description: ["quiz_description", "quiz description", "description"],
  module_title: ["module", "module title", "module_title"],
  lesson_title: ["lesson", "lesson title", "lesson_title"],
  duration_minutes: ["duration_minutes", "duration in minutes", "quiz duration", "duration"],
  questions_shown: ["questions_shown", "questions shown", "shown to student", "shown"],
  passing_marks: ["passing_marks", "passing marks", "pass mark", "passing"],
  max_attempts: ["max_attempts", "max attempts", "attempts"],
  is_published: ["is_published", "published"],
  question_text: ["question", "question_text", "question text", "questions"],
  options: ["options", "choices"],
  option_a: ["option_a", "option a", "option 1", "option_1"],
  option_b: ["option_b", "option b", "option 2", "option_2"],
  option_c: ["option_c", "option c", "option 3", "option_3"],
  option_d: ["option_d", "option d", "option 4", "option_4"],
  option_e: ["option_e", "option e", "option 5", "option_5"],
  option_f: ["option_f", "option f", "option 6", "option_6"],
  correct_answer: ["correct_answer", "correct answer", "answer"],
  explanation: ["explanation"],
  difficulty: ["difficulty"],
  bloom_level: ["bloom_level", "bloom level", "bloom"]
};

function normalize_header(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s._-]+/g, "");
}

function is_empty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function decode_xml(text) {
  return String(text)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

function column_index(letters) {
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function first_sheet_path(zip) {
  const workbook = zip.readAsText("xl/workbook.xml");
  const rels = zip.readAsText("xl/_rels/workbook.xml.rels");
  const rel_id = workbook.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const target = rel_id && rels.match(new RegExp(`<Relationship\\b[^>]*Id="${rel_id}"[^>]*Target="([^"]+)"`))?.[1];
  if (!target) return "xl/worksheets/sheet1.xml";
  return target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
}

function load_excel() {
  if (!existsSync(EXCEL_PATH)) throw new Error(`Excel file not found: ${EXCEL_PATH}`);
  const zip = new AdmZip(EXCEL_PATH);
  const shared_xml = zip.getEntry("xl/sharedStrings.xml") ? zip.readAsText("xl/sharedStrings.xml") : "";
  const shared = (shared_xml.match(/<si>[\s\S]*?<\/si>/g) || []).map((item) =>
    decode_xml((item.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((part) => part.replace(/<[^>]+>/g, "")).join(""))
  );
  const sheet = zip.readAsText(first_sheet_path(zip));
  const grid = (sheet.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) || []).map((row) => {
    const values = [];
    for (const cell of row.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const ref = cell.match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!ref) continue;
      const type = cell.match(/\bt="([^"]+)"/)?.[1] || "";
      const raw = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const inline = cell.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
      let value = null;
      if (type === "s" && raw !== undefined) value = shared[Number(raw)] ?? null;
      else if (type === "inlineStr" && inline !== undefined) value = decode_xml(inline);
      else if (raw !== undefined) value = decode_xml(raw);
      values[column_index(ref)] = value;
    }
    return values;
  });
  if (grid.length < 2) throw new Error("Excel file contains no quiz rows.");
  const headers = grid[0].map((header) => String(header ?? "").trim());
  const rows = grid.slice(1)
    .map((values, index) => ({
      row_number: index + 2,
      cells: Object.fromEntries(headers.map((header, column) => [header, values[column] ?? null]))
    }))
    .filter((row) => Object.values(row.cells).some((value) => !is_empty(value)));
  return { headers: headers.filter(Boolean), rows };
}

function build_mapping(headers) {
  const lookup = new Map(headers.map((header) => [normalize_header(header), header]));
  const mapping = {};
  for (const [column, aliases] of Object.entries(ALIASES)) {
    const found = aliases.map(normalize_header).map((alias) => lookup.get(alias)).find(Boolean);
    if (found) mapping[column] = found;
  }
  for (const column of ["course_name", "quiz_name", "question_text", "correct_answer"]) {
    if (!mapping[column]) throw new Error(`No ${column.replaceAll("_", " ")} column found in the Excel.`);
  }
  const has_options = mapping.options || OPTION_LETTERS.some((letter) => mapping[`option_${letter}`]);
  if (!has_options) throw new Error("No options column found in the Excel.");
  return mapping;
}

function text_cell(value) {
  if (is_empty(value)) return "";
  return String(value).trim();
}

function whole_number(value, min, max) {
  if (is_empty(value)) return { ok: true, value: null };
  const text = String(value).trim().replace(/\.0+$/, "");
  if (!/^\d+$/.test(text)) return { ok: false, value: null };
  const number = Number(text);
  if (number < min || number > max) return { ok: false, value: null };
  return { ok: true, value: number };
}

function decimal_number(value, min, max) {
  if (is_empty(value)) return { ok: true, value: null };
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, value: null };
  const number = Number(text);
  if (number < min || number > max) return { ok: false, value: null };
  return { ok: true, value: number };
}

function published_flag(value) {
  if (is_empty(value)) return { ok: true, value: null };
  const text = String(value).trim().toLowerCase();
  if (text === "1" || text === "true" || text === "yes") return { ok: true, value: true };
  if (text === "0" || text === "false" || text === "no") return { ok: true, value: false };
  return { ok: false, value: null };
}

function question_snippet(value) {
  const text = text_cell(value).replace(/\s+/g, " ");
  return text.length > 80 ? `${text.slice(0, 77)}...` : text || "(blank)";
}

function line(row) {
  return `  row ${row.row_number} | course: ${row.course_name || "(blank)"} | quiz: ${row.quiz_name || "(blank)"} | question: ${question_snippet(row.question_text)}`;
}

function print_list(title, rows, extra) {
  console.log(`\n========== ${title} (${rows.length}) ==========`);
  if (!rows.length) {
    console.log("  none");
    return;
  }
  for (const row of rows) console.log(extra ? `${line(row)} | ${extra(row)}` : line(row));
}

function keep_first(quiz, field, value, label, row) {
  if (value === null || value === "") return;
  if (quiz[field] === null || quiz[field] === "") {
    quiz[field] = value;
    return;
  }
  if (String(quiz[field]) !== String(value)) {
    quiz.conflicts.push({ ...row, detail: `${label} kept as ${quiz[field]}` });
  }
}

function read_options(row) {
  const named = OPTION_LETTERS.map((letter) => row[`option_${letter}`]).filter(Boolean);
  const packed = row.options ? row.options.split(/\r?\n|\||;/).map((item) => item.trim()).filter(Boolean) : [];
  const options = [];
  let too_long = false;
  for (const option of [...named, ...packed]) {
    if (option.length > 1000) {
      too_long = true;
      continue;
    }
    if (options.includes(option)) continue;
    options.push(option);
    if (options.length === 8) break;
  }
  return { options, too_long };
}

function resolve_correct(correct, options) {
  if (options.includes(correct)) return correct;
  const letter = correct.toLowerCase().match(/^([a-f])$/);
  if (letter) return options[letter[1].charCodeAt(0) - 97] || "";
  const number = correct.match(/^([1-8])$/);
  if (number) return options[Number(number[1]) - 1] || "";
  return "";
}

function mix_from(questions, field, keys) {
  const mix = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const question of questions) mix[question[field]] += 1;
  return mix;
}

function mix_summary(mix) {
  const used = Object.entries(mix).filter(([, count]) => Number(count) > 0);
  if (used.length === 1) return used[0][0];
  return used.length ? "mixed" : "";
}

function group_rows(course_rows) {
  const quizzes = new Map();
  for (const row of course_rows) {
    const key = `${row.course_name.toLowerCase()}|${row.quiz_name.toLowerCase()}`;
    let quiz = quizzes.get(key);
    if (!quiz) {
      quiz = {
        key,
        name: row.quiz_name,
        course_name: row.course_name,
        course_code: "",
        description: "",
        module_title: "",
        lesson_title: "",
        duration: null,
        shown: null,
        passing: null,
        attempts: null,
        published: null,
        rows: [],
        questions: [],
        conflicts: [],
        warnings: [],
        skip: "",
        first: row
      };
      quizzes.set(key, quiz);
    }
    keep_first(quiz, "course_code", row.course_code, "course code", row);
    keep_first(quiz, "description", row.quiz_description, "description", row);
    keep_first(quiz, "module_title", row.module_title, "module", row);
    keep_first(quiz, "lesson_title", row.lesson_title, "lesson", row);
    if (row.duration.ok) keep_first(quiz, "duration", row.duration.value, "duration", row);
    else quiz.warnings.push({ ...row, detail: "duration" });
    if (row.shown.ok) keep_first(quiz, "shown", row.shown.value, "questions shown", row);
    else quiz.warnings.push({ ...row, detail: "questions shown" });
    if (row.passing.ok) keep_first(quiz, "passing", row.passing.value, "passing marks", row);
    else quiz.warnings.push({ ...row, detail: "passing marks" });
    if (row.attempts.ok) keep_first(quiz, "attempts", row.attempts.value, "max attempts", row);
    else quiz.warnings.push({ ...row, detail: "max attempts" });
    if (row.published.ok) keep_first(quiz, "published", row.published.value, "published", row);
    else quiz.warnings.push({ ...row, detail: "published" });
    quiz.rows.push(row);
  }
  return quizzes;
}

async function place_quiz(connection, course_id, module_id, lesson_id, quiz_id) {
  let sequence = 0;
  if (lesson_id) {
    const [rows] = await connection.query(
      `SELECT COALESCE(MAX(cc.sequence_no), 0) AS seq
       FROM tbl_course_content cc
       LEFT JOIN tbl_course_quizzes q
         ON q.quiz_id = cc.quiz_id AND q.is_deleted = FALSE
       WHERE cc.course_id = ? AND cc.module_id = ? AND cc.is_deleted = FALSE
         AND (cc.lesson_id = ? OR q.lesson_id = ?)`,
      [course_id, module_id, lesson_id, lesson_id]
    );
    const seq = Number(rows[0]?.seq || 0);
    if (seq) {
      await connection.execute(
        `UPDATE tbl_course_content
         SET sequence_no = sequence_no + 1, updated_at = NOW()
         WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE AND sequence_no > ?`,
        [course_id, module_id, seq]
      );
      sequence = seq + 1;
    }
  }
  if (!sequence) {
    const [rows] = await connection.query(
      `SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_no
       FROM tbl_course_content
       WHERE course_id = ? AND module_id = ? AND is_deleted = FALSE`,
      [course_id, module_id]
    );
    sequence = Number(rows[0]?.next_no || 1);
  }
  await connection.execute(
    `INSERT INTO tbl_course_content (course_id, module_id, content_type, quiz_id, lesson_id, sequence_no)
     VALUES (?, ?, 'quiz', ?, ?, ?)`,
    [course_id, module_id, quiz_id, lesson_id, sequence]
  );
}

async function main() {
  const { headers, rows } = load_excel();
  const mapping = build_mapping(headers);
  const pick = (row, column) => (mapping[column] ? row.cells[mapping[column]] : null);
  const items = rows.map((row) => {
    const record = {
      row_number: row.row_number,
      course_name: text_cell(pick(row, "course_name")),
      course_code: text_cell(pick(row, "course_code")),
      quiz_name: text_cell(pick(row, "quiz_name")),
      quiz_description: text_cell(pick(row, "quiz_description")).slice(0, 5000),
      module_title: text_cell(pick(row, "module_title")),
      lesson_title: text_cell(pick(row, "lesson_title")),
      duration: whole_number(pick(row, "duration_minutes"), 1, 600),
      shown: whole_number(pick(row, "questions_shown"), 1, 100),
      passing: decimal_number(pick(row, "passing_marks"), 0, 1000),
      attempts: whole_number(pick(row, "max_attempts"), 1, 100),
      published: published_flag(pick(row, "is_published")),
      question_text: text_cell(pick(row, "question_text")),
      options: text_cell(pick(row, "options")),
      correct_answer: text_cell(pick(row, "correct_answer")),
      explanation: text_cell(pick(row, "explanation")).slice(0, 5000),
      difficulty: text_cell(pick(row, "difficulty")).toLowerCase(),
      bloom_level: text_cell(pick(row, "bloom_level")).toLowerCase()
    };
    for (const letter of OPTION_LETTERS) record[`option_${letter}`] = text_cell(pick(row, `option_${letter}`));
    return record;
  });

  const blank_course = items.filter((row) => !row.course_name);
  const blank_quiz = items.filter((row) => row.course_name && !row.quiz_name);
  const long_quiz = items.filter((row) => row.quiz_name.length > 200);
  const blocked = new Set([...blank_course, ...blank_quiz, ...long_quiz]);
  const quizzes = group_rows(items.filter((row) => !blocked.has(row)));

  console.log(`Workbook: ${EXCEL_PATH}`);
  console.log(`Rows: ${items.length}`);

  const config = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "datapro_lms"
  };
  const pool = mysql.createPool({ ...config, waitForConnections: true, connectionLimit: 4 });

  const course_missing = [];
  const course_ambiguous = [];
  const code_mismatch = [];
  const module_missing = [];
  const module_ambiguous = [];
  const lesson_missing = [];
  const lesson_ambiguous = [];
  const already = [];
  const question_empty = [];
  const question_long = [];
  const option_long = [];
  const option_few = [];
  const answer_bad = [];
  const difficulty_bad = [];
  const bloom_bad = [];
  const duplicate_question = [];
  const no_questions = [];
  const detail_conflict = [];
  const bad_duration = [];
  const bad_shown = [];
  const bad_passing = [];
  const bad_attempts = [];
  const bad_published = [];
  const shown_reduced = [];
  const passing_high = [];
  const ready = [];

  try {
    const course_names = [...new Set([...quizzes.values()].map((quiz) => quiz.course_name.toLowerCase()))];
    const courses_by_name = new Map();
    if (course_names.length) {
      const [courses] = await pool.query(
        `SELECT course_id, course_name, course_code
         FROM tbl_courses
         WHERE is_deleted = FALSE
           AND LOWER(TRIM(course_name)) IN (${course_names.map(() => "?").join(", ")})`,
        course_names
      );
      for (const course of courses) {
        const key = String(course.course_name).trim().toLowerCase();
        const list = courses_by_name.get(key) || [];
        list.push(course);
        courses_by_name.set(key, list);
      }
    }

    const course_ids = [];
    for (const quiz of quizzes.values()) {
      const matches = courses_by_name.get(quiz.course_name.toLowerCase()) || [];
      if (!matches.length) {
        quiz.skip = "course_missing";
        course_missing.push(...quiz.rows);
        continue;
      }
      if (matches.length > 1) {
        quiz.skip = "course_ambiguous";
        course_ambiguous.push(...quiz.rows);
        continue;
      }
      const course = matches[0];
      if (quiz.course_code && String(course.course_code).trim().toLowerCase() !== quiz.course_code.toLowerCase()) {
        quiz.skip = "code_mismatch";
        code_mismatch.push(...quiz.rows);
        continue;
      }
      quiz.course_id = Number(course.course_id);
      course_ids.push(quiz.course_id);
    }

    const modules_by_course = new Map();
    const lessons_by_module = new Map();
    const quizzes_by_course = new Map();
    const unique_course_ids = [...new Set(course_ids)];
    if (unique_course_ids.length) {
      const marks = unique_course_ids.map(() => "?").join(", ");
      const [modules] = await pool.query(
        `SELECT module_id, course_id, module_title, sequence_no
         FROM tbl_course_modules
         WHERE is_deleted = FALSE AND course_id IN (${marks})
         ORDER BY sequence_no ASC, module_id ASC`,
        unique_course_ids
      );
      for (const module of modules) {
        const list = modules_by_course.get(Number(module.course_id)) || [];
        list.push(module);
        modules_by_course.set(Number(module.course_id), list);
      }
      const [lessons] = await pool.query(
        `SELECT lesson_id, course_id, module_id, lesson_title
         FROM tbl_course_lessons
         WHERE is_deleted = FALSE AND course_id IN (${marks})`,
        unique_course_ids
      );
      for (const lesson of lessons) {
        const key = `${lesson.course_id}|${lesson.module_id}`;
        const list = lessons_by_module.get(key) || [];
        list.push(lesson);
        lessons_by_module.set(key, list);
      }
      const [existing] = await pool.query(
        `SELECT quiz_id, course_id, quiz_title
         FROM tbl_course_quizzes
         WHERE is_deleted = FALSE AND course_id IN (${marks})`,
        unique_course_ids
      );
      for (const quiz of existing) {
        const key = `${quiz.course_id}|${String(quiz.quiz_title).trim().toLowerCase()}`;
        quizzes_by_course.set(key, Number(quiz.quiz_id));
      }
    }

    for (const quiz of quizzes.values()) {
      if (quiz.skip) continue;
      const modules = modules_by_course.get(quiz.course_id) || [];
      let module_row = null;
      if (!quiz.module_title) {
        module_row = modules[0] || null;
        if (!module_row) {
          quiz.skip = "module_missing";
          module_missing.push(...quiz.rows);
          continue;
        }
      } else {
        const found = modules.filter((module) => String(module.module_title).trim().toLowerCase() === quiz.module_title.toLowerCase());
        if (!found.length) {
          quiz.skip = "module_missing";
          module_missing.push(...quiz.rows);
          continue;
        }
        if (found.length > 1) {
          quiz.skip = "module_ambiguous";
          module_ambiguous.push(...quiz.rows);
          continue;
        }
        module_row = found[0];
      }
      quiz.module_id = Number(module_row.module_id);
      quiz.lesson_id = null;
      if (quiz.lesson_title) {
        const lessons = (lessons_by_module.get(`${quiz.course_id}|${quiz.module_id}`) || [])
          .filter((lesson) => String(lesson.lesson_title).trim().toLowerCase() === quiz.lesson_title.toLowerCase());
        if (!lessons.length) {
          quiz.skip = "lesson_missing";
          lesson_missing.push(...quiz.rows);
          continue;
        }
        if (lessons.length > 1) {
          quiz.skip = "lesson_ambiguous";
          lesson_ambiguous.push(...quiz.rows);
          continue;
        }
        quiz.lesson_id = Number(lessons[0].lesson_id);
      }
      if (quizzes_by_course.has(`${quiz.course_id}|${quiz.name.toLowerCase()}`)) {
        quiz.skip = "already";
        already.push(...quiz.rows);
        continue;
      }

      const seen_question = new Set();
      for (const row of quiz.rows) {
        if (!row.question_text) {
          question_empty.push(row);
          continue;
        }
        if (row.question_text.length > 8000) {
          question_long.push(row);
          continue;
        }
        const { options, too_long } = read_options(row);
        if (too_long) option_long.push(row);
        if (options.length < 2) {
          option_few.push(row);
          continue;
        }
        const correct = resolve_correct(row.correct_answer, options);
        if (!correct) {
          answer_bad.push(row);
          continue;
        }
        let difficulty = "medium";
        if (row.difficulty) {
          if (!DIFFICULTY_KEYS.includes(row.difficulty)) {
            difficulty_bad.push(row);
            continue;
          }
          difficulty = row.difficulty;
        }
        let bloom_level = "understand";
        if (row.bloom_level) {
          if (!BLOOM_KEYS.includes(row.bloom_level)) {
            bloom_bad.push(row);
            continue;
          }
          bloom_level = row.bloom_level;
        }
        const question_key = row.question_text.toLowerCase();
        if (seen_question.has(question_key)) {
          duplicate_question.push(row);
          continue;
        }
        seen_question.add(question_key);
        quiz.questions.push({
          question_text: row.question_text,
          options,
          correct_answer: correct,
          explanation: row.explanation || null,
          difficulty,
          bloom_level
        });
      }
      if (!quiz.questions.length) {
        quiz.skip = "no_questions";
        no_questions.push(quiz.first);
        continue;
      }
      const total = quiz.questions.length;
      if (quiz.shown != null && quiz.shown > total) {
        shown_reduced.push({ ...quiz.first, detail: `shown ${quiz.shown}, quiz has ${total}` });
        quiz.shown = total;
      }
      if (quiz.passing != null && quiz.passing > total) {
        passing_high.push({ ...quiz.first, detail: `passing ${quiz.passing}, quiz has ${total} marks` });
        quiz.passing = null;
      }
      detail_conflict.push(...quiz.conflicts);
      bad_duration.push(...quiz.warnings.filter((row) => row.detail === "duration"));
      bad_shown.push(...quiz.warnings.filter((row) => row.detail === "questions shown"));
      bad_passing.push(...quiz.warnings.filter((row) => row.detail === "passing marks"));
      bad_attempts.push(...quiz.warnings.filter((row) => row.detail === "max attempts"));
      bad_published.push(...quiz.warnings.filter((row) => row.detail === "published"));
      ready.push(quiz);
    }

    const question_count = ready.reduce((sum, quiz) => sum + quiz.questions.length, 0);
    print_list("COURSE NAME IS EMPTY", blank_course);
    print_list("QUIZ NAME IS EMPTY", blank_quiz);
    print_list("QUIZ NAME IS TOO LONG", long_quiz);
    print_list("COURSE NAME NOT FOUND", course_missing);
    print_list("MORE THAN ONE COURSE WITH THIS NAME", course_ambiguous);
    print_list("COURSE CODE DOES NOT MATCH", code_mismatch);
    print_list("MODULE NOT FOUND", module_missing);
    print_list("MORE THAN ONE MODULE WITH THIS NAME", module_ambiguous);
    print_list("LESSON NOT FOUND", lesson_missing);
    print_list("MORE THAN ONE LESSON WITH THIS NAME", lesson_ambiguous);
    print_list("QUIZ ALREADY IN LMS", already);
    print_list("QUESTION IS EMPTY", question_empty);
    print_list("QUESTION IS TOO LONG", question_long);
    print_list("OPTION IS TOO LONG", option_long);
    print_list("OPTIONS NEED AT LEAST TWO", option_few);
    print_list("CORRECT ANSWER IS NOT ONE OF THE OPTIONS", answer_bad);
    print_list("DIFFICULTY MUST BE EASY, MEDIUM, OR HARD", difficulty_bad);
    print_list("BLOOM LEVEL IS NOT RECOGNISED", bloom_bad);
    print_list("DUPLICATE QUESTION IN THIS QUIZ", duplicate_question);
    print_list("QUIZ HAS NO VALID QUESTIONS", no_questions);
    print_list("QUIZ DETAILS DIFFER", detail_conflict, (row) => row.detail);
    print_list("DURATION IS NOT A WHOLE NUMBER OF MINUTES", bad_duration);
    print_list("QUESTIONS SHOWN IS NOT A WHOLE NUMBER", bad_shown);
    print_list("PASSING MARKS ARE NOT A NUMBER", bad_passing);
    print_list("MAX ATTEMPTS IS NOT A WHOLE NUMBER", bad_attempts);
    print_list("PUBLISHED MUST BE 1 OR 0", bad_published);
    print_list("QUESTIONS SHOWN WAS REDUCED TO THE QUESTION COUNT", shown_reduced, (row) => row.detail);
    print_list("PASSING MARKS ARE ABOVE THE QUESTION COUNT", passing_high, (row) => row.detail);

    console.log("\n========== RESULT ==========");
    console.log(`To add                              : ${ready.length}`);
    console.log(`  questions to add                 : ${question_count}`);

    if (!DO_IMPORT) {
      console.log("\nReport only. Run with --import to save.");
      return;
    }

    let saved = 0;
    let saved_questions = 0;
    let failed = 0;
    for (const quiz of ready) {
      const total = quiz.questions.length;
      const difficulty_mix = mix_from(quiz.questions, "difficulty", DIFFICULTY_KEYS);
      const bloom_mix = mix_from(quiz.questions, "bloom_level", BLOOM_KEYS);
      const published = quiz.published !== false;
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [created] = await connection.execute(
          `INSERT INTO tbl_course_quizzes (
             course_id, module_id, lesson_id, quiz_title, quiz_description,
             duration_minutes, total_marks, passing_marks, max_attempts,
             question_count, questions_shown, difficulty, bloom_level, difficulty_mix, bloom_mix,
             source_type, is_published, is_active
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'excel', ?, ?)`,
          [
            quiz.course_id,
            quiz.module_id,
            quiz.lesson_id,
            quiz.name,
            quiz.description || null,
            quiz.duration,
            total,
            quiz.passing == null ? Math.ceil(total * 0.5) : quiz.passing,
            quiz.attempts,
            total,
            quiz.shown == null ? total : quiz.shown,
            mix_summary(difficulty_mix),
            mix_summary(bloom_mix),
            JSON.stringify(difficulty_mix),
            JSON.stringify(bloom_mix),
            published,
            published
          ]
        );
        const quiz_id = Number(created.insertId);
        for (let index = 0; index < quiz.questions.length; index += 1) {
          const question = quiz.questions[index];
          await connection.execute(
            `INSERT INTO tbl_quiz_questions
               (quiz_id, question_number, question_text, options_json, correct_answer, explanation, difficulty, bloom_level)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              quiz_id,
              index + 1,
              question.question_text,
              JSON.stringify(question.options),
              question.correct_answer,
              question.explanation,
              question.difficulty,
              question.bloom_level
            ]
          );
        }
        await place_quiz(connection, quiz.course_id, quiz.module_id, quiz.lesson_id, quiz_id);
        await connection.commit();
        saved += 1;
        saved_questions += total;
        console.log(`  quiz ${quiz_id} | course ${quiz.course_id} | ${quiz.name} | questions ${total}`);
      } catch (error) {
        await connection.rollback();
        failed += 1;
        console.error(`  quiz ${quiz.name} failed: ${error.message}`);
      } finally {
        connection.release();
      }
    }
    console.log(`\nSaved quizzes: ${saved}   Questions: ${saved_questions}   Failed: ${failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
