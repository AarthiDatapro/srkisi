import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { list_assigned_programs } from "../course_manager/course_service.js";
import { ensure_cohort_schema } from "../cohorts/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { get_pool } from "../utils/db_setup.js";
import { ensure_content_schema } from "./schema.js";

import {
  fail,
  map_quiz,
  require_quiz
} from "./quiz_service.js";

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function person_name(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Student";
}

function pass_percent(total_marks, passing_marks) {
  const passing = num(passing_marks);
  const total = num(total_marks);
  if (passing > 0 && total > 0) return Math.round(passing / total * 1000) / 10;
  return 50;
}

function open_roster_sql(alias) {
  return `${alias}.program_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM tbl_course_registrations r_prog
    WHERE r_prog.course_id = ${alias}.course_id
      AND r_prog.student_id = ${alias}.student_id
      AND r_prog.program_id IS NOT NULL
      AND r_prog.is_deleted = FALSE
      AND r_prog.status = 'registered'
  )`;
}

function open_attempt_sql(alias) {
  return `EXISTS (
    SELECT 1 FROM tbl_course_registrations r_open
    WHERE r_open.course_id = ${alias}.course_id
      AND r_open.student_id = ${alias}.student_id
      AND r_open.program_id IS NULL
      AND r_open.is_deleted = FALSE
      AND r_open.status = 'registered'
  ) AND NOT EXISTS (
    SELECT 1 FROM tbl_course_registrations r_prog
    WHERE r_prog.course_id = ${alias}.course_id
      AND r_prog.student_id = ${alias}.student_id
      AND r_prog.program_id IS NOT NULL
      AND r_prog.is_deleted = FALSE
      AND r_prog.status = 'registered'
  )`;
}

export async function get_quiz_analytics(course_id, query = {}) {
  const program_id = Number(query?.program_id) > 0 ? Number(query.program_id) : null;
  const open_only = query.enrollment === "open";
  await ensure_content_schema();
  await ensure_registration_schema();
  await ensure_cohort_schema();
  const pool = get_pool();
  const id = num(course_id);

  const assigned = await list_assigned_programs(pool, id);
  const programs = assigned.map((program) => ({
    program_id: num(program.program_id),
    program_name: program.program_name || "Program",
    cohort_id: program.cohort_id == null ? null : num(program.cohort_id),
    cohort_name: program.cohort_name || ""
  }));
  const batches = [];
  const seen_batches = new Set();
  for (const program of programs) {
    if (!program.cohort_id || seen_batches.has(program.cohort_id)) continue;
    seen_batches.add(program.cohort_id);
    batches.push({ cohort_id: program.cohort_id, cohort_name: program.cohort_name || "Batch" });
  }

  const [quiz_rows] = await sqlQuery(
    pool,
    `SELECT q.quiz_id, q.quiz_title, q.question_count, q.total_marks, q.passing_marks, q.lesson_id,
            DATE_FORMAT(q.created_at, '%Y-%m-%d') AS created_day,
            m.module_title, m.sequence_no
     FROM tbl_course_quizzes q
     LEFT JOIN tbl_course_modules m
       ON m.module_id = q.module_id AND m.course_id = q.course_id AND m.is_deleted = FALSE
     WHERE q.course_id = ? AND q.is_deleted = FALSE
     ORDER BY q.created_at ASC, q.quiz_id ASC`,
    [id]
  );
  const quizzes = (quiz_rows || []).map((row) => ({
    quiz_id: num(row.quiz_id),
    quiz_title: row.quiz_title || "Quiz",
    module_title: row.module_title || "",
    module_no: num(row.sequence_no),
    question_count: num(row.question_count),
    pass_percent: pass_percent(row.total_marks, row.passing_marks),
    created_day: row.created_day || "",
    kind: quiz_kind(row)
  }));

  const [student_rows] = await sqlQuery(
    pool,
    `SELECT s.student_id, s.first_name, s.last_name,
            (
              SELECT r3.course_student_id
              FROM tbl_course_registrations r3
              WHERE r3.course_id = r.course_id
                AND r3.student_id = r.student_id
                AND r3.is_deleted = FALSE
                AND r3.status = 'registered'
                AND r3.course_student_id IS NOT NULL
                AND TRIM(r3.course_student_id) <> ''
                AND (? IS NULL OR r3.program_id = ?)
                ${open_only ? "AND r3.program_id IS NULL" : ""}
              ORDER BY r3.registration_id ASC
              LIMIT 1
            ) AS course_student_id,
            r.program_id, p.program_name, h.cohort_id, h.cohort_name
     FROM tbl_course_registrations r
     INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
     LEFT JOIN tbl_programs p ON p.program_id = r.program_id AND p.is_deleted = FALSE
     LEFT JOIN tbl_cohort_programs cp
       ON cp.program_id = r.program_id AND cp.is_deleted = FALSE
      AND cp.cohort_program_id = (
        SELECT MIN(cp2.cohort_program_id)
        FROM tbl_cohort_programs cp2
        WHERE cp2.program_id = r.program_id AND cp2.is_deleted = FALSE
      )
     LEFT JOIN tbl_cohorts h ON h.cohort_id = cp.cohort_id AND h.is_deleted = FALSE
     WHERE r.course_id = ? AND r.is_deleted = FALSE AND r.status = 'registered'
       AND r.registration_id = (
         SELECT MIN(r2.registration_id)
         FROM tbl_course_registrations r2
         WHERE r2.course_id = r.course_id
           AND r2.student_id = r.student_id
           AND r2.is_deleted = FALSE
           AND r2.status = 'registered'
           ${open_only ? "AND r2.program_id IS NULL" : ""}
       )
       ${open_only ? `AND ${open_roster_sql("r")}` : ""}
     ORDER BY s.first_name ASC, s.last_name ASC, s.student_id ASC`,
    [program_id, program_id, id]
  );
  const students = (student_rows || []).map((row) => ({
    student_id: String(row.student_id),
    course_student_id: row.course_student_id || "",
    name: person_name(row),
    program_id: row.program_id == null ? null : num(row.program_id),
    program_name: row.program_name || "",
    cohort_id: row.cohort_id == null ? null : num(row.cohort_id),
    cohort_name: row.cohort_name || ""
  }));
  const student_by_id = new Map(students.map((student) => [student.student_id, student]));

  const [attempt_rows] = await sqlQuery(
    pool,
    `SELECT a.attempt_id, a.quiz_id, a.student_id, a.percent, a.status,
            DATE_FORMAT(a.submitted_at, '%Y-%m-%d') AS day,
            q.quiz_title, q.total_marks, q.passing_marks,
            s.first_name, s.last_name
     FROM tbl_quiz_attempts a
     INNER JOIN tbl_course_quizzes q
       ON q.quiz_id = a.quiz_id AND q.course_id = a.course_id AND q.is_deleted = FALSE
     LEFT JOIN tbl_students s ON s.student_id = a.student_id
     WHERE a.course_id = ?
     ORDER BY a.submitted_at ASC, a.attempt_id ASC`,
    [id]
  );
  const attempts = (attempt_rows || []).map((row) => {
    const student = student_by_id.get(String(row.student_id));
    const percent = Math.round(num(row.percent) * 10) / 10;
    const line = pass_percent(row.total_marks, row.passing_marks);
    return {
      attempt_id: num(row.attempt_id),
      quiz_id: num(row.quiz_id),
      quiz_title: row.quiz_title || "Quiz",
      student_id: String(row.student_id),
      course_student_id: student?.course_student_id || "",
      student_name: student?.name || person_name(row),
      program_id: student?.program_id ?? null,
      program_name: student?.program_name || "",
      cohort_id: student?.cohort_id ?? null,
      cohort_name: student?.cohort_name || "",
      percent,
      passed: percent >= line,
      status: row.status || "submitted",
      day: row.day || ""
    };
  }).filter((attempt) => !open_only || student_by_id.has(attempt.student_id));

  const hackathons = await hackathon_scores(
    pool,
    open_only ? [] : programs.map((program) => program.program_id).filter((value) => !program_id || value === program_id),
    students.map((student) => student.student_id)
  );

  log.pass(
    "get_quiz_analytics",
    `course ${id} ${quizzes.length} quizzes, ${attempts.length} attempts, ${students.length} students`
  );
  return { quizzes, programs, batches, students, attempts, hackathons };
}

function quiz_kind(row) {
  const title = String(row.quiz_title || "");
  if (!row.lesson_id || /\b(overall|module)\b/i.test(title)) return "module";
  return "daily";
}

function read_json(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function hackathon_scores(pool, program_ids, student_ids) {
  const empty = { list: [], scores: [] };
  if (!program_ids.length || !student_ids.length) return empty;
  try {
    const [hackathon_rows] = await sqlQuery(
      pool,
      `SELECT DISTINCT h.hackathon_id, h.title
       FROM tbl_hackathons h
       INNER JOIN tbl_hackathon_programs hp ON hp.hackathon_id = h.hackathon_id AND hp.is_deleted = FALSE
       WHERE h.is_deleted = FALSE AND h.status = 'published'
         AND hp.program_id IN (${program_ids.map(() => "?").join(",")})
       ORDER BY h.hackathon_id ASC`,
      program_ids
    );
    const ids = (hackathon_rows || []).map((row) => num(row.hackathon_id));
    if (!ids.length) return empty;
    const [item_rows] = await sqlQuery(
      pool,
      `SELECT item_id, hackathon_id, body_json FROM tbl_hackathon_items
       WHERE is_deleted = FALSE AND hackathon_id IN (${ids.map(() => "?").join(",")})`,
      ids
    );
    const items = new Map();
    const scorable = new Map();
    for (const row of item_rows || []) {
      const body = read_json(row.body_json) || {};
      const kind = body.item_type || "";
      if (kind !== "mcq" && kind !== "coding") continue;
      items.set(num(row.item_id), { hackathon_id: num(row.hackathon_id), kind, correct: String(body.correct_answer || "").trim() });
      scorable.set(num(row.hackathon_id), (scorable.get(num(row.hackathon_id)) || 0) + 1);
    }
    const list = (hackathon_rows || [])
      .filter((row) => scorable.get(num(row.hackathon_id)))
      .map((row) => ({ hackathon_id: num(row.hackathon_id), title: row.title || "Hackathon", items: scorable.get(num(row.hackathon_id)) }));
    if (!list.length) return empty;
    const [response_rows] = await sqlQuery(
      pool,
      `SELECT hackathon_id, item_id, student_id, answer_text FROM tbl_hackathon_responses
       WHERE is_deleted = FALSE AND hackathon_id IN (${ids.map(() => "?").join(",")})
         AND student_id COLLATE utf8mb4_unicode_ci IN (${student_ids.map(() => "?").join(",")})`,
      [...ids, ...student_ids]
    );
    const points = new Map();
    for (const row of response_rows || []) {
      const item = items.get(num(row.item_id));
      if (!item) continue;
      let value = 0;
      if (item.kind === "mcq") {
        value = String(row.answer_text || "").trim() && String(row.answer_text).trim() === item.correct ? 1 : 0;
      } else {
        const grade = read_json(row.answer_text);
        value = grade && Number.isFinite(Number(grade.score)) ? Math.max(0, Math.min(100, Number(grade.score))) / 100 : 0;
      }
      const key = `${row.student_id}|${item.hackathon_id}`;
      points.set(key, (points.get(key) || 0) + value);
    }
    const scores = [];
    for (const [key, total] of points) {
      const [student_id, hackathon_id] = key.split("|");
      const count = scorable.get(num(hackathon_id)) || 0;
      if (!count) continue;
      scores.push({ student_id, hackathon_id: num(hackathon_id), percent: Math.round((total / count) * 1000) / 10 });
    }
    return { list, scores };
  } catch (err) {
    log.fail("hackathon_scores", err.message);
    return empty;
  }
}

const SCORE_BUCKETS = [
{ id: "0_20", label: "0–20", min: 0, max: 20 },
{ id: "21_40", label: "21–40", min: 21, max: 40 },
{ id: "41_60", label: "41–60", min: 41, max: 60 },
{ id: "61_80", label: "61–80", min: 61, max: 80 },
{ id: "81_100", label: "81–100", min: 81, max: 100 }];


export function score_bucket(percent) {
  const value = Number(percent) || 0;
  if (value <= 20) return "0_20";
  if (value <= 40) return "21_40";
  if (value <= 60) return "41_60";
  if (value <= 80) return "61_80";
  return "81_100";
}

export function full_name(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "Student";
}

export function pass_mark(quiz) {
  const passing = Number(quiz.passing_marks);
  const total = Number(quiz.total_marks);
  if (passing > 0 && total > 0) return Math.round(passing / total * 1000) / 10;
  return 50;
}

export function build_insights(questions, stats) {
  const strong = questions.filter((item) => item.correct_percent >= 90);
  const weak = questions.filter((item) => item.answers && item.correct_percent < 80);
  const lines = [];
  if (!stats.submissions) {
    return {
      summary: "No submissions yet. Insights appear after students take this quiz.",
      strengths: [],
      weak_questions: [],
      recommendations: []
    };
  }
  if (stats.average_percent >= 90) {
    lines.push(`Class average is ${stats.average_percent}%. Students are handling this quiz well.`);
  } else if (stats.average_percent >= 70) {
    lines.push(`Class average is ${stats.average_percent}%. Most students are passing, with room to tighten weak items.`);
  } else {
    lines.push(`Class average is ${stats.average_percent}%. This quiz needs a review before the next cohort.`);
  }
  return {
    summary: lines.join(" "),
    strengths: strong.map((item) => `Q${item.question_number}: ${item.question_text}`),
    weak_questions: weak.map(
      (item) => `Q${item.question_number} (${item.correct_percent}%): ${item.question_text}`
    ),
    recommendations: weak.length ?
    weak.map((item) => `Revisit Q${item.question_number} in class — only ${item.correct_percent}% answered it correctly.`) :
    ["Keep the current question set. No weak items showed up in this run."]
  };
}

export async function get_quiz_sheet(course_id, quiz_id, query = {}) {
  await ensure_content_schema();
  const id = Number(course_id);
  const quiz_key = Number(quiz_id);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(quiz_key) || quiz_key < 1) {
    throw fail("Quiz not found", 404);
  }

  const pool = get_pool();
  const program_id = Number(query.program_id);
  const open_only = query.enrollment === "open";
  const scoped = !open_only && Number.isInteger(program_id) && program_id > 0;
  const open_attempt = open_only ? `AND ${open_attempt_sql("a")}` : "";
  const quiz = map_quiz(await require_quiz(pool, id, quiz_key));
  const passing_percent = pass_mark(quiz);

  const [attempt_rows] = await sqlQuery(
    pool,
    `SELECT a.attempt_id, a.student_id, a.score, a.total_questions, a.correct_count, a.percent,
            a.duration_seconds, a.submitted_at,
            s.first_name, s.last_name, s.email, s.mobile_number, s.college
     FROM tbl_quiz_attempts a
     LEFT JOIN tbl_students s ON s.student_id = a.student_id
     WHERE a.quiz_id = ? AND a.course_id = ?
       ${open_attempt}
       ${scoped ? `AND EXISTS (
         SELECT 1 FROM tbl_course_registrations r
         WHERE r.course_id = a.course_id
           AND r.student_id = a.student_id
           AND r.program_id = ?
           AND r.is_deleted = FALSE
           AND r.status = 'registered'
       )` : ""}
     ORDER BY a.percent DESC,
              CASE WHEN a.duration_seconds IS NULL THEN 1 ELSE 0 END ASC,
              a.duration_seconds ASC,
              a.submitted_at ASC`,
    scoped ? [quiz_key, id, program_id] : [quiz_key, id]
  );

  const submissions = (attempt_rows || []).map((row, index) => ({
    rank: index + 1,
    attempt_id: Number(row.attempt_id),
    student_id: row.student_id,
    name: full_name(row),
    email: row.email || "",
    college: row.college || "",
    phone: row.mobile_number || "",
    score: Number(row.score || 0),
    correct_count: Number(row.correct_count || 0),
    total_questions: Number(row.total_questions || 0),
    percent: Number(row.percent || 0),
    duration_seconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    submitted_at: row.submitted_at,
    passed: Number(row.percent || 0) >= passing_percent
  }));

  const percents = submissions.map((item) => item.percent);
  const average = percents.length ?
  Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length * 10) / 10 :
  0;
  const highest = percents.length ? Math.max(...percents) : 0;
  const passed = submissions.filter((item) => item.passed).length;
  const pass_rate = submissions.length ? Math.round(passed / submissions.length * 1000) / 10 : 0;

  const [question_rows] = await sqlQuery(
    pool,
    `SELECT qn.question_id, qn.question_number, qn.question_text,
            COUNT(ans.answer_id) AS answers,
            SUM(CASE WHEN ans.is_correct THEN 1 ELSE 0 END) AS correct
     FROM tbl_quiz_questions qn
     LEFT JOIN tbl_quiz_attempt_answers ans ON ans.question_id = qn.question_id
       ${open_only ? `AND EXISTS (
         SELECT 1 FROM tbl_quiz_attempts att
         WHERE att.attempt_id = ans.attempt_id
           AND ${open_attempt_sql("att")}
       )` : ""}
       ${scoped ? `AND EXISTS (
         SELECT 1 FROM tbl_quiz_attempts att
         INNER JOIN tbl_course_registrations r
           ON r.student_id = att.student_id
          AND r.course_id = ?
          AND r.program_id = ?
          AND r.is_deleted = FALSE
          AND r.status = 'registered'
         WHERE att.attempt_id = ans.attempt_id
       )` : ""}
     WHERE qn.quiz_id = ? AND qn.is_deleted = FALSE
     GROUP BY qn.question_id, qn.question_number, qn.question_text
     ORDER BY qn.question_number ASC`,
    scoped ? [id, program_id, quiz_key] : [quiz_key]
  );

  const questions = (question_rows || []).map((item) => {
    const answers = Number(item.answers || 0);
    const correct = Number(item.correct || 0);
    return {
      question_id: Number(item.question_id),
      question_number: Number(item.question_number || 0),
      question_text: item.question_text,
      answers,
      correct,
      correct_percent: answers ? Math.round(correct / answers * 1000) / 10 : 0
    };
  });

  const stats = {
    submissions: submissions.length,
    average_percent: average,
    highest_percent: highest,
    pass_rate: pass_rate,
    passed,
    passing_percent: passing_percent
  };

  const distribution = SCORE_BUCKETS.map((bucket) => ({
    ...bucket,
    count: submissions.filter((item) => score_bucket(item.percent) === bucket.id).length
  }));

  return {
    quiz,
    stats,
    insights: build_insights(questions, stats),
    distribution,
    submissions,
    leaderboard: submissions.slice(0, 25),
    questions
  };
}
