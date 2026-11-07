// Import quiz attempts from an Excel workbook.
//
//   node scripts/importQuizAttempts.js
//   node scripts/importQuizAttempts.js --import
//   node scripts/importQuizAttempts.js "C:\path\quiz_attempts.xlsx" --import
//
// One row is one answer. Repeat course_name, quiz_name, and student_email
// for the next answer in the same attempt.
// The course, quiz, student, registration, and question must already exist.
// course_id comes from tbl_courses. quiz_id comes from tbl_course_quizzes on that course.
// student_id comes from tbl_students. registration_id comes from tbl_course_registrations.
// question_id comes from tbl_quiz_questions on that quiz.
// The score is calculated the same way a student submit is saved:
// one mark per correct answer, percent to one decimal, status submitted.

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
  || path.join(SCRIPT_DIR, "quiz_attempts.xlsx");

const ALIASES = {
  course_name: ["course_name", "course name", "course_nme", "course"],
  quiz_name: ["quiz_name", "quiz_names", "quiz name", "quiz title", "quiz_title", "quiz"],
  email: ["student_email", "student email", "email", "email address"],
  program_name: ["batch_name", "batch name", "batch", "program_name", "program name", "program"],
  question_text: ["question", "question_text", "question text"],
  selected_answer: ["selected_answer", "selected answer", "answer", "student answer"],
  duration_seconds: ["duration_seconds", "duration seconds", "duration", "time taken"],
  submitted_at: ["submitted_at", "submitted at", "submitted", "attempt date"]
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
  if (grid.length < 2) throw new Error("Excel file contains no attempt rows.");
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
  for (const column of ["course_name", "quiz_name", "email", "question_text", "selected_answer"]) {
    if (!mapping[column]) throw new Error(`No ${column.replaceAll("_", " ")} column found in the Excel.`);
  }
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

function pad(number) {
  return String(number).padStart(2, "0");
}

function stamp_from_parts(year, month, day, hour, minute, second) {
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) return "";
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function submitted_stamp(value) {
  if (is_empty(value)) return { ok: true, value: null };
  const text = String(value).trim().replace("T", " ");
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial < 20000 || serial > 80000) return { ok: false, value: null };
    const whole = Math.floor(serial);
    const fraction = Math.round((serial - whole) * 86400);
    const utc = new Date(Date.UTC(1899, 11, 30) + whole * 86400000 + fraction * 1000);
    const stamp = stamp_from_parts(
      utc.getUTCFullYear(),
      utc.getUTCMonth() + 1,
      utc.getUTCDate(),
      utc.getUTCHours(),
      utc.getUTCMinutes(),
      utc.getUTCSeconds()
    );
    return stamp ? { ok: true, value: stamp } : { ok: false, value: null };
  }
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return { ok: false, value: null };
  const stamp = stamp_from_parts(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0)
  );
  return stamp ? { ok: true, value: stamp } : { ok: false, value: null };
}

function question_snippet(value) {
  const text = text_cell(value).replace(/\s+/g, " ");
  return text.length > 80 ? `${text.slice(0, 77)}...` : text || "(blank)";
}

function line(row) {
  return `  row ${row.row_number} | course: ${row.course_name || "(blank)"} | quiz: ${row.quiz_name || "(blank)"} | email: ${row.email || "(blank)"} | question: ${question_snippet(row.question_text)}`;
}

function print_list(title, rows, extra) {
  console.log(`\n========== ${title} (${rows.length}) ==========`);
  if (!rows.length) {
    console.log("  none");
    return;
  }
  for (const row of rows) console.log(extra ? `${line(row)} | ${extra(row)}` : line(row));
}

function keep_first(attempt, field, value, label, row) {
  if (value === null || value === "") return;
  if (attempt[field] === null || attempt[field] === "") {
    attempt[field] = value;
    return;
  }
  if (String(attempt[field]) !== String(value)) {
    attempt.conflicts.push({ ...row, detail: `${label} kept as ${attempt[field]}` });
  }
}

function option_list(value) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function resolve_selected(selected, options) {
  if (options.includes(selected)) return selected;
  const letter = selected.toLowerCase().match(/^([a-f])$/);
  if (letter) return options[letter[1].charCodeAt(0) - 97] || "";
  const number = selected.match(/^([1-8])$/);
  if (number) return options[Number(number[1]) - 1] || "";
  return "";
}

function shown_count(quiz, pool_size) {
  const size = Number(pool_size || 0);
  if (size < 1) return 0;
  const shown = Number(quiz.questions_shown);
  if (!Number.isInteger(shown) || shown < 1) return size;
  return Math.min(shown, size);
}

function percent_for(correct_count, total) {
  if (!total) return 0;
  return Math.round(correct_count / total * 1000) / 10;
}

function group_rows(rows) {
  const attempts = new Map();
  for (const row of rows) {
    const key = `${row.course_name.toLowerCase()}|${row.quiz_name.toLowerCase()}|${row.email}`;
    let attempt = attempts.get(key);
    if (!attempt) {
      attempt = {
        key,
        course_name: row.course_name,
        quiz_name: row.quiz_name,
        email: row.email,
        program_name: "",
        duration: null,
        submitted_at: null,
        rows: [],
        answers: [],
        conflicts: [],
        warnings: [],
        skip: "",
        first: row
      };
      attempts.set(key, attempt);
    }
    keep_first(attempt, "program_name", row.program_name, "program", row);
    if (row.duration.ok) keep_first(attempt, "duration", row.duration.value, "duration", row);
    else attempt.warnings.push({ ...row, detail: "duration" });
    if (row.submitted.ok) keep_first(attempt, "submitted_at", row.submitted.value, "submitted at", row);
    else attempt.warnings.push({ ...row, detail: "submitted at" });
    attempt.rows.push(row);
  }
  return attempts;
}

async function main() {
  const { headers, rows } = load_excel();
  const mapping = build_mapping(headers);
  const pick = (row, column) => (mapping[column] ? row.cells[mapping[column]] : null);
  const items = rows.map((row) => ({
    row_number: row.row_number,
    course_name: text_cell(pick(row, "course_name")),
    quiz_name: text_cell(pick(row, "quiz_name")),
    email: text_cell(pick(row, "email")).toLowerCase(),
    program_name: text_cell(pick(row, "program_name")),
    question_text: text_cell(pick(row, "question_text")),
    selected_answer: text_cell(pick(row, "selected_answer")),
    duration: whole_number(pick(row, "duration_seconds"), 0, 86400),
    submitted: submitted_stamp(pick(row, "submitted_at"))
  }));

  const blank_course = items.filter((row) => !row.course_name);
  const blank_quiz = items.filter((row) => row.course_name && !row.quiz_name);
  const blank_email = items.filter((row) => row.course_name && row.quiz_name && !row.email);
  const blocked = new Set([...blank_course, ...blank_quiz, ...blank_email]);
  const attempts = group_rows(items.filter((row) => !blocked.has(row)));

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
  const quiz_missing = [];
  const quiz_ambiguous = [];
  const email_missing = [];
  const email_ambiguous = [];
  const student_inactive = [];
  const not_registered = [];
  const program_missing = [];
  const registration_ambiguous = [];
  const already = [];
  const question_empty = [];
  const question_missing = [];
  const question_ambiguous = [];
  const answer_empty = [];
  const answer_bad = [];
  const duplicate_answer = [];
  const count_mismatch = [];
  const no_questions = [];
  const detail_conflict = [];
  const bad_duration = [];
  const bad_submitted = [];
  const ready = [];

  try {
    const course_names = [...new Set([...attempts.values()].map((attempt) => attempt.course_name.toLowerCase()))];
    const courses_by_name = new Map();
    if (course_names.length) {
      const [courses] = await pool.query(
        `SELECT course_id, course_name
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

    const emails = [...new Set([...attempts.values()].map((attempt) => attempt.email))];
    const students_by_email = new Map();
    if (emails.length) {
      const [students] = await pool.query(
        `SELECT student_id, email, is_active
         FROM tbl_students
         WHERE is_deleted = FALSE
           AND LOWER(TRIM(email)) IN (${emails.map(() => "?").join(", ")})`,
        emails
      );
      for (const student of students) {
        const key = String(student.email).trim().toLowerCase();
        const list = students_by_email.get(key) || [];
        list.push(student);
        students_by_email.set(key, list);
      }
    }

    const course_ids = [];
    for (const attempt of attempts.values()) {
      const matches = courses_by_name.get(attempt.course_name.toLowerCase()) || [];
      if (!matches.length) {
        attempt.skip = "course_missing";
        course_missing.push(...attempt.rows);
        continue;
      }
      if (matches.length > 1) {
        attempt.skip = "course_ambiguous";
        course_ambiguous.push(...attempt.rows);
        continue;
      }
      attempt.course_id = Number(matches[0].course_id);
      course_ids.push(attempt.course_id);

      const people = students_by_email.get(attempt.email) || [];
      if (!people.length) {
        attempt.skip = "email_missing";
        email_missing.push(...attempt.rows);
        continue;
      }
      if (people.length > 1) {
        attempt.skip = "email_ambiguous";
        email_ambiguous.push(...attempt.rows);
        continue;
      }
      if (!people[0].is_active) {
        attempt.skip = "inactive";
        student_inactive.push(...attempt.rows);
        continue;
      }
      attempt.student_id = String(people[0].student_id);
    }

    const unique_course_ids = [...new Set(course_ids)];
    const quizzes_by_course = new Map();
    const questions_by_quiz = new Map();
    const registrations_by_pair = new Map();
    const existing_attempts = new Set();
    if (unique_course_ids.length) {
      const marks = unique_course_ids.map(() => "?").join(", ");
      const [quizzes] = await pool.query(
        `SELECT quiz_id, course_id, quiz_title, questions_shown, question_count
         FROM tbl_course_quizzes
         WHERE is_deleted = FALSE AND course_id IN (${marks})`,
        unique_course_ids
      );
      for (const quiz of quizzes) {
        const key = `${quiz.course_id}|${String(quiz.quiz_title).trim().toLowerCase()}`;
        const list = quizzes_by_course.get(key) || [];
        list.push(quiz);
        quizzes_by_course.set(key, list);
      }
      const quiz_ids = quizzes.map((quiz) => Number(quiz.quiz_id));
      if (quiz_ids.length) {
        const quiz_marks = quiz_ids.map(() => "?").join(", ");
        const [questions] = await pool.query(
          `SELECT question_id, quiz_id, question_text, options_json, correct_answer
           FROM tbl_quiz_questions
           WHERE is_deleted = FALSE AND quiz_id IN (${quiz_marks})`,
          quiz_ids
        );
        for (const question of questions) {
          const list = questions_by_quiz.get(Number(question.quiz_id)) || [];
          list.push(question);
          questions_by_quiz.set(Number(question.quiz_id), list);
        }
      }
      const student_ids = [...new Set([...attempts.values()].filter((attempt) => attempt.student_id).map((attempt) => attempt.student_id))];
      if (student_ids.length) {
        const student_marks = student_ids.map(() => "?").join(", ");
        const [registrations] = await pool.query(
          `SELECT r.registration_id, r.student_id, r.course_id, r.program_id, p.program_name
           FROM tbl_course_registrations r
           LEFT JOIN tbl_programs p ON p.program_id = r.program_id AND p.is_deleted = FALSE
           WHERE r.is_deleted = FALSE AND r.status = 'registered'
             AND r.course_id IN (${marks})
             AND r.student_id IN (${student_marks})`,
          [...unique_course_ids, ...student_ids]
        );
        for (const registration of registrations) {
          const key = `${registration.student_id}|${registration.course_id}`;
          const list = registrations_by_pair.get(key) || [];
          list.push(registration);
          registrations_by_pair.set(key, list);
        }
        if (quiz_ids.length) {
          const quiz_marks = quiz_ids.map(() => "?").join(", ");
          const [saved] = await pool.query(
            `SELECT quiz_id, student_id, registration_id
             FROM tbl_quiz_attempts
             WHERE quiz_id IN (${quiz_marks}) AND student_id IN (${student_marks})`,
            [...quiz_ids, ...student_ids]
          );
          for (const row of saved) {
            existing_attempts.add(`${row.quiz_id}|${row.student_id}|${row.registration_id ?? ""}`);
          }
        }
      }
    }

    for (const attempt of attempts.values()) {
      if (attempt.skip) continue;
      const quiz_matches = quizzes_by_course.get(`${attempt.course_id}|${attempt.quiz_name.toLowerCase()}`) || [];
      if (!quiz_matches.length) {
        attempt.skip = "quiz_missing";
        quiz_missing.push(...attempt.rows);
        continue;
      }
      if (quiz_matches.length > 1) {
        attempt.skip = "quiz_ambiguous";
        quiz_ambiguous.push(...attempt.rows);
        continue;
      }
      const quiz = quiz_matches[0];
      attempt.quiz_id = Number(quiz.quiz_id);
      const questions = questions_by_quiz.get(attempt.quiz_id) || [];
      attempt.shown = shown_count(quiz, questions.length);
      if (!attempt.shown) {
        attempt.skip = "no_questions";
        no_questions.push(attempt.first);
        continue;
      }

      const registrations = registrations_by_pair.get(`${attempt.student_id}|${attempt.course_id}`) || [];
      let chosen = registrations;
      if (attempt.program_name) {
        const program_key = attempt.program_name.toLowerCase();
        const named = registrations.filter((row) => String(row.program_name || "").trim().toLowerCase() === program_key);
        if (!named.length) {
          attempt.skip = registrations.length ? "program_missing" : "not_registered";
          (registrations.length ? program_missing : not_registered).push(...attempt.rows);
          continue;
        }
        chosen = named;
      }
      if (!chosen.length) {
        attempt.skip = "not_registered";
        not_registered.push(...attempt.rows);
        continue;
      }
      if (chosen.length > 1) {
        attempt.skip = "registration_ambiguous";
        registration_ambiguous.push(...attempt.rows);
        continue;
      }
      attempt.registration_id = Number(chosen[0].registration_id);
      if (existing_attempts.has(`${attempt.quiz_id}|${attempt.student_id}|${attempt.registration_id}`)) {
        attempt.skip = "already";
        already.push(...attempt.rows);
        continue;
      }

      const by_text = new Map();
      for (const question of questions) {
        const key = String(question.question_text || "").trim().toLowerCase();
        const list = by_text.get(key) || [];
        list.push(question);
        by_text.set(key, list);
      }
      const seen_question = new Set();
      for (const row of attempt.rows) {
        if (!row.question_text) {
          question_empty.push(row);
          continue;
        }
        const found = by_text.get(row.question_text.toLowerCase()) || [];
        if (!found.length) {
          question_missing.push(row);
          continue;
        }
        if (found.length > 1) {
          question_ambiguous.push(row);
          continue;
        }
        if (!row.selected_answer) {
          answer_empty.push(row);
          continue;
        }
        const question = found[0];
        const options = option_list(question.options_json);
        const selected = resolve_selected(row.selected_answer, options);
        if (!selected) {
          answer_bad.push(row);
          continue;
        }
        const question_id = Number(question.question_id);
        if (seen_question.has(question_id)) {
          duplicate_answer.push(row);
          continue;
        }
        seen_question.add(question_id);
        const correct = String(question.correct_answer || "").trim();
        attempt.answers.push({
          question_id,
          selected_answer: selected,
          is_correct: selected === correct
        });
      }
      if (attempt.answers.length !== attempt.shown) {
        attempt.skip = "count";
        count_mismatch.push({
          ...attempt.first,
          detail: `answers ${attempt.answers.length}, quiz shows ${attempt.shown}`
        });
        continue;
      }
      detail_conflict.push(...attempt.conflicts);
      bad_duration.push(...attempt.warnings.filter((row) => row.detail === "duration"));
      bad_submitted.push(...attempt.warnings.filter((row) => row.detail === "submitted at"));
      ready.push(attempt);
    }

    const answer_count = ready.reduce((sum, attempt) => sum + attempt.answers.length, 0);
    print_list("COURSE NAME IS EMPTY", blank_course);
    print_list("QUIZ NAME IS EMPTY", blank_quiz);
    print_list("STUDENT EMAIL IS EMPTY", blank_email);
    print_list("COURSE NAME NOT FOUND", course_missing);
    print_list("MORE THAN ONE COURSE WITH THIS NAME", course_ambiguous);
    print_list("QUIZ NAME NOT FOUND", quiz_missing);
    print_list("MORE THAN ONE QUIZ WITH THIS NAME", quiz_ambiguous);
    print_list("STUDENT EMAIL NOT FOUND", email_missing);
    print_list("MORE THAN ONE STUDENT WITH THIS EMAIL", email_ambiguous);
    print_list("STUDENT IS NOT ACTIVE", student_inactive);
    print_list("STUDENT IS NOT REGISTERED ON THIS COURSE", not_registered);
    print_list("PROGRAM NOT FOUND FOR THIS REGISTRATION", program_missing);
    print_list("MORE THAN ONE REGISTRATION", registration_ambiguous);
    print_list("ATTEMPT ALREADY IN LMS", already);
    print_list("QUIZ HAS NO QUESTIONS", no_questions);
    print_list("QUESTION IS EMPTY", question_empty);
    print_list("QUESTION NOT FOUND", question_missing);
    print_list("MORE THAN ONE QUESTION WITH THIS TEXT", question_ambiguous);
    print_list("SELECTED ANSWER IS EMPTY", answer_empty);
    print_list("SELECTED ANSWER IS NOT ONE OF THE OPTIONS", answer_bad);
    print_list("DUPLICATE ANSWER IN THIS ATTEMPT", duplicate_answer);
    print_list("ANSWER COUNT DOES NOT MATCH QUESTIONS SHOWN", count_mismatch, (row) => row.detail);
    print_list("ATTEMPT DETAILS DIFFER", detail_conflict, (row) => row.detail);
    print_list("DURATION IS NOT A WHOLE NUMBER OF SECONDS", bad_duration);
    print_list("SUBMITTED AT IS NOT A DATE", bad_submitted);

    console.log("\n========== RESULT ==========");
    console.log(`To add                              : ${ready.length}`);
    console.log(`  answers to add                   : ${answer_count}`);

    if (!DO_IMPORT) {
      console.log("\nReport only. Run with --import to save.");
      return;
    }

    let saved = 0;
    let saved_answers = 0;
    let failed = 0;
    for (const attempt of ready) {
      const correct_count = attempt.answers.filter((answer) => answer.is_correct).length;
      const total = attempt.answers.length;
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const submitted_sql = attempt.submitted_at ? ", submitted_at" : "";
        const submitted_mark = attempt.submitted_at ? ", ?" : "";
        const params = [
          attempt.quiz_id,
          attempt.course_id,
          attempt.student_id,
          attempt.registration_id,
          correct_count,
          total,
          correct_count,
          percent_for(correct_count, total),
          attempt.duration
        ];
        if (attempt.submitted_at) params.push(attempt.submitted_at);
        const [created] = await connection.execute(
          `INSERT INTO tbl_quiz_attempts (
             quiz_id, course_id, student_id, registration_id, score, total_questions, correct_count, percent, status, duration_seconds${submitted_sql}
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?${submitted_mark})`,
          params
        );
        const attempt_id = Number(created.insertId);
        for (const answer of attempt.answers) {
          await connection.execute(
            `INSERT INTO tbl_quiz_attempt_answers (attempt_id, question_id, selected_answer, is_correct)
             VALUES (?, ?, ?, ?)`,
            [attempt_id, answer.question_id, answer.selected_answer, answer.is_correct]
          );
        }
        await connection.commit();
        saved += 1;
        saved_answers += total;
        console.log(`  attempt ${attempt_id} | quiz ${attempt.quiz_id} | student ${attempt.student_id} | ${correct_count}/${total}`);
      } catch (error) {
        await connection.rollback();
        failed += 1;
        console.error(`  attempt ${attempt.email} on ${attempt.quiz_name} failed: ${error.message}`);
      } finally {
        connection.release();
      }
    }
    console.log(`\nSaved attempts: ${saved}   Answers: ${saved_answers}   Failed: ${failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
