import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { validateRequiredText } from "@datapromr/validation";
import { get_course } from "../course_manager/course_service.js";
import { get_pool } from "../utils/db_setup.js";
import { ai_backend_url } from "../utils/ai_backend.js";

import {
  fail,
  map_question,
  map_quiz,
  shuffle,
  shown_question_count,
  with_display_numbers,
  require_quiz,
  list_questions,
  program_student_sql
} from "./quiz_service.js";
import { student_code } from "../utils/student_code.js";
import { ensure_learn_schema } from "../course_learning/schema.js";
import { require_registration } from "../course_learning/enrollment.js";

export async function get_student_quiz(user, course_id, quiz_id, { include_answers = false, registration_id = null } = {}) {
  await ensure_learn_schema();
  const id = Number(course_id);
  const quiz_key = Number(quiz_id);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(quiz_key) || quiz_key < 1) {
    throw fail("Quiz not found", 404);
  }

  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const enrollment = await require_enrollment(pool, student.student_id, id, registration_id);
  const quiz = map_quiz(await require_quiz(pool, id, quiz_key));
  const pool_questions = await list_questions(pool, quiz_key);
  const by_id = new Map(pool_questions.map((row) => [Number(row.question_id), row]));

  const [attempt_rows] = await sqlQuery(
    pool,
    `SELECT attempt_id, score, total_questions, correct_count, percent, duration_seconds, submitted_at
     FROM tbl_quiz_attempts
     WHERE quiz_id = ? AND student_id = ? AND registration_id = ?
     ORDER BY attempt_id DESC
     LIMIT 1`,
    [quiz_key, student.student_id, enrollment.registration_id]
  );
  const latest = attempt_rows?.[0] || null;
  let attempt = null;
  let questions = [];
  if (latest) {
    const [answer_rows] = await sqlQuery(
      pool,
      `SELECT a.question_id, a.selected_answer, a.is_correct, q.correct_answer, q.explanation,
              q.question_number, q.question_text, q.difficulty, q.bloom_level
       FROM tbl_quiz_attempt_answers a
       INNER JOIN tbl_quiz_questions q ON q.question_id = a.question_id
       WHERE a.attempt_id = ?
       ORDER BY a.answer_id ASC`,
      [latest.attempt_id]
    );
    attempt = {
      attempt_id: Number(latest.attempt_id),
      score: Number(latest.score || 0),
      total_questions: Number(latest.total_questions || 0),
      correct_count: Number(latest.correct_count || 0),
      percent: Number(latest.percent || 0),
      duration_seconds: latest.duration_seconds != null ? Number(latest.duration_seconds) : null,
      submitted_at: latest.submitted_at,
      answers: with_display_numbers(
        (answer_rows || []).map((row) => ({
          question_id: Number(row.question_id),
          question_number: Number(row.question_number || 0),
          question_text: row.question_text,
          selected_answer: row.selected_answer,
          correct_answer: row.correct_answer,
          explanation: row.explanation || "",
          is_correct: Boolean(row.is_correct)
        }))
      )
    };
    questions = with_display_numbers(
      (answer_rows || []).
      map((row) => {
        const source = by_id.get(Number(row.question_id));
        return source ? map_question(source, { includeAnswer: true }) : null;
      }).
      filter(Boolean)
    );
  } else {
    const mapped = pool_questions.map((row) => map_question(row, { includeAnswer: include_answers }));
    const take = shown_question_count(quiz, mapped.length);
    questions = with_display_numbers(shuffle(mapped).slice(0, take));
  }

  return { quiz, questions, attempt };
}

export async function submit_student_quiz(user, course_id, quiz_id, body = {}, registration_id = null) {
  await ensure_learn_schema();
  const id = Number(course_id);
  const quiz_key = Number(quiz_id);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(quiz_key) || quiz_key < 1) {
    throw fail("Quiz not found", 404);
  }

  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const enrollment = await require_enrollment(pool, student.student_id, id, registration_id);
  const quiz = map_quiz(await require_quiz(pool, id, quiz_key));

  const questions = await list_questions(pool, quiz_key);
  if (!questions.length) throw fail("This quiz has no questions");

  const shown = shown_question_count(quiz, questions.length);
  const by_id = new Map(questions.map((row) => [Number(row.question_id), row]));
  const submitted = Array.isArray(body.answers) ? body.answers : [];
  if (submitted.length !== shown) {
    throw fail(`Answer all ${shown} questions before submitting`);
  }

  const seen = new Set();
  let correct_count = 0;
  const graded = [];
  for (const item of submitted) {
    const question_id = Number(item.question_id);
    const row = by_id.get(question_id);
    if (!row || seen.has(question_id)) throw fail("Invalid quiz answers");
    seen.add(question_id);
    const selected = String(item.selected_answer || "").trim();
    if (!selected) throw fail("Answer every question before submitting");
    const is_correct = selected === String(row.correct_answer || "").trim();
    if (is_correct) correct_count += 1;
    graded.push({
      question_id: question_id,
      selected_answer: selected,
      is_correct: is_correct
    });
  }

  const total = shown;
  const percent = total ? Math.round(correct_count / total * 1000) / 10 : 0;
  const duration = Number(body.duration_seconds);
  const duration_seconds =
  Number.isFinite(duration) && duration >= 0 ? Math.min(Math.round(duration), 86400) : null;

  const [result] = await sqlQuery(
    pool,
    `INSERT INTO tbl_quiz_attempts (
      quiz_id, course_id, student_id, registration_id, score, total_questions, correct_count, percent, status, duration_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)`,
    [
      quiz_key,
      id,
      student.student_id,
      enrollment.registration_id,
      correct_count,
      total,
      correct_count,
      percent,
      duration_seconds
    ]
  );

  const attempt_id = Number(result.insertId);
  for (const answer of graded) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_quiz_attempt_answers (attempt_id, question_id, selected_answer, is_correct)
       VALUES (?, ?, ?, ?)`,
      [attempt_id, answer.question_id, answer.selected_answer, answer.is_correct]
    );
  }

  log.pass("submitStudentQuiz", `${student.student_id} scored ${correct_count}/${total} on quiz ${quiz_key}`);
  return get_student_quiz(user, id, quiz_key, {
    includeAnswers: true,
    registration_id: enrollment.registration_id
  });
}

async function get_student(pool, code) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT student_id, first_name, last_name, email
     FROM tbl_students
     WHERE student_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  const student = rows?.[0];
  if (!student) throw fail("Student account was not found", 401);
  return student;
}

async function require_enrollment(pool, student_id, course_id, registration_id) {
  return require_registration(pool, student_id, course_id, registration_id);
}
