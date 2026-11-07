import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import {
  generate_from_provider,
  parse_options,
  question_difficulty
} from "../course_content_manager/quiz_service.js";
import { get_pool } from "../utils/db_setup.js";
import { ensure_jobs_schema, get_active_job } from "./jobs_service.js";

function read_json(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function draft_answers(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const answers = [];
  for (const item of list) {
    const question_id = Number(item?.question_id);
    const answer = String(item?.answer || "").trim();
    if (!Number.isInteger(question_id) || question_id < 1 || !answer) continue;
    answers.push({ question_id, answer });
  }
  return answers;
}

const SECTIONS = {
  quantitative: "Quantitative aptitude for a fresher hiring test. Write original multiple-choice questions on percentages, ratios, averages, profit and loss, simple interest, time and work, time and distance, number series, and a short data table. Each question has four options and one correct answer. Show the working in the explanation.",
  reasoning: "Logical reasoning for a fresher hiring test. Write original multiple-choice questions on analogies, coding and decoding, blood relations, directions, syllogisms, seating arrangements, odd one out, and a short puzzle. Each question has four options and one correct answer. Explain the rule in the explanation.",
  verbal: "Verbal ability for a fresher hiring test. Write original multiple-choice questions on synonyms, antonyms, fill in the blanks, spotting the error, sentence correction, and one short passage with a question about it. Each question has four options and one correct answer. Explain the choice in the explanation."
};

const LEVELS = ["easy", "medium", "hard"];
const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function read_level(value) {
  const level = String(value || "").trim().toLowerCase();
  if (!LEVELS.includes(level)) throw fail("Choose easy, medium, or hard");
  return level;
}

function read_sections(value) {
  const keys = [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()))];
  if (!keys.length) throw fail("Choose at least one section");
  if (keys.some((key) => !SECTIONS[key])) throw fail("Choose quantitative, reasoning, or verbal");
  return keys;
}

function read_count(value) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw fail("Questions per section must be a whole number from 1 to 10");
  }
  return count;
}

function mixes(level, count) {
  const difficulty = {};
  for (const key of LEVELS) difficulty[key] = key === level ? count : 0;
  const bloom = {};
  for (const key of BLOOM_KEYS) bloom[key] = key === "apply" ? count : 0;
  return { difficulty, bloom };
}

function read_question(item, index, level) {
  const question_text = String(item?.question_text || "").trim();
  const options = parse_options(item?.options).slice(0, 4);
  const correct_answer = String(item?.correct_answer || "").trim();
  if (!question_text) throw fail(`Question ${index + 1} needs text`);
  if (question_text.length > 4000) throw fail(`Question ${index + 1} is too long`);
  if (options.length < 2) throw fail(`Question ${index + 1} needs at least two options`);
  if (options.some((option) => option.length > 500)) throw fail(`Question ${index + 1} has an option that is too long`);
  if (!correct_answer || !options.includes(correct_answer)) {
    throw fail(`Question ${index + 1} needs a correct answer from its options`);
  }
  return {
    question_text,
    options,
    correct_answer,
    explanation: String(item?.explanation || "").trim().slice(0, 4000),
    difficulty: question_difficulty(item?.difficulty) || level
  };
}

function map_saved_question(row) {
  const options = parse_options(row.options_json);
  while (options.length < 4) options.push("");
  return {
    question_id: Number(row.question_id),
    section_key: row.section_key,
    question_number: Number(row.question_number || 0),
    question_text: row.question_text || "",
    options: options.slice(0, 4),
    correct_answer: row.correct_answer || "",
    explanation: row.explanation || "",
    difficulty: row.difficulty || ""
  };
}

function from_generator(item, index, level) {
  const options = parse_options(item?.options).slice(0, 4);
  const raw_answer = String(item?.correct_answer || "").trim();
  const question_text = String(item?.question_text || "").trim();
  const correct_answer = options.find((option) => option.toLowerCase() === raw_answer.toLowerCase()) || "";
  if (!question_text || options.length < 2 || !correct_answer) return null;
  while (options.length < 4) options.push("");
  return {
    question_text,
    options: options.slice(0, 4),
    correct_answer,
    explanation: String(item?.explanation || "").trim(),
    difficulty: question_difficulty(item?.difficulty) || level,
    question_number: index + 1
  };
}

export async function generate_fresher_quiz(body = {}) {
  await ensure_jobs_schema();
  const section_keys = read_sections(body.sections);
  const level = read_level(body.difficulty);
  const count = read_count(body.count);
  const mix = mixes(level, count);
  const sections = [];

  for (const section_key of section_keys) {
    const generated = await generate_from_provider({
      content: SECTIONS[section_key],
      count,
      difficulty: mix.difficulty,
      bloom: mix.bloom
    });
    const questions = (generated.questions || []).
      map((item, index) => from_generator(item, index, level)).
      filter(Boolean).
      map((question, index) => ({ ...question, question_number: index + 1 }));
    if (!questions.length) throw fail(`No ${section_key} questions were generated`, 502);
    sections.push({ section_key, questions });
  }

  log.pass("generateFresherQuiz", `generated ${sections.reduce((sum, section) => sum + section.questions.length, 0)} fresher questions`);
  return { difficulty: level, sections };
}

async function require_jobs(job_ids) {
  const ids = [...new Set(job_ids.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
  if (!ids.length) throw fail("Select at least one job");
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT job_id FROM tbl_jobs WHERE is_deleted = FALSE AND job_id IN (${ids.map(() => "?").join(", ")})`,
    ids
  );
  const found = new Set((rows || []).map((row) => Number(row.job_id)));
  if (ids.some((id) => !found.has(id))) throw fail("One of the selected jobs was not found", 404);
  return ids;
}

function read_section_questions(body, level) {
  const raw_sections = Array.isArray(body.sections) ? body.sections : [];
  if (!raw_sections.length) throw fail("Add questions before saving");
  const seen = new Set();
  const sections = [];
  for (const section of raw_sections) {
    const section_key = String(section?.section_key || "").trim();
    if (!SECTIONS[section_key]) throw fail("Choose quantitative, reasoning, or verbal");
    if (seen.has(section_key)) throw fail("Each section can be saved once");
    seen.add(section_key);
    const questions = Array.isArray(section.questions) ? section.questions : [];
    if (!questions.length) throw fail(`Add at least one ${section_key} question`);
    if (questions.length > 20) throw fail("Each section can hold up to 20 questions");
    sections.push({
      section_key,
      questions: questions.map((item, index) => read_question(item, index, level))
    });
  }
  return sections;
}

async function write_job_quiz(job_id, level, sections) {
  const pool = get_pool();
  const [existing] = await sqlQuery(
    pool,
    `SELECT fresher_quiz_id FROM tbl_job_fresher_quizzes
     WHERE job_id = ? AND is_deleted = FALSE
     ORDER BY fresher_quiz_id DESC
     LIMIT 1`,
    [job_id]
  );
  let fresher_quiz_id = Number(existing?.[0]?.fresher_quiz_id || 0);
  const question_count = sections.reduce((sum, section) => sum + section.questions.length, 0);
  if (fresher_quiz_id) {
    await sqlQuery(
      pool,
      `UPDATE tbl_job_fresher_quizzes
       SET difficulty = ?, question_count = ?, updated_at = NOW()
       WHERE fresher_quiz_id = ? AND is_deleted = FALSE`,
      [level, question_count, fresher_quiz_id]
    );
    await sqlQuery(
      pool,
      `UPDATE tbl_job_fresher_questions
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE fresher_quiz_id = ? AND is_deleted = FALSE`,
      [fresher_quiz_id]
    );
  } else {
    const [result] = await sqlQuery(
      pool,
      `INSERT INTO tbl_job_fresher_quizzes (job_id, difficulty, question_count)
       VALUES (?, ?, ?)`,
      [job_id, level, question_count]
    );
    fresher_quiz_id = Number(result.insertId);
  }

  for (const section of sections) {
    for (let index = 0; index < section.questions.length; index += 1) {
      const question = section.questions[index];
      await sqlQuery(
        pool,
        `INSERT INTO tbl_job_fresher_questions
           (fresher_quiz_id, job_id, section_key, question_number, question_text, options_json, correct_answer, explanation, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fresher_quiz_id,
          job_id,
          section.section_key,
          index + 1,
          question.question_text,
          JSON.stringify(question.options),
          question.correct_answer,
          question.explanation || null,
          question.difficulty || level
        ]
      );
    }
  }
  return fresher_quiz_id;
}

export async function save_fresher_quiz(body = {}) {
  await ensure_jobs_schema();
  const level = read_level(body.difficulty);
  const sections = read_section_questions(body, level);
  const job_ids = await require_jobs(body.job_ids);
  const saved = [];
  for (const job_id of job_ids) {
    saved.push(await write_job_quiz(job_id, level, sections));
  }
  log.pass("saveFresherQuiz", `saved fresher quiz on ${job_ids.length} jobs`);
  return { saved: job_ids.length, job_ids };
}

export async function get_fresher_quiz(job_id) {
  await ensure_jobs_schema();
  const id = Number(job_id);
  if (!Number.isInteger(id) || id < 1) throw fail("Select a job");
  const [quizzes] = await sqlQuery(
    get_pool(),
    `SELECT fresher_quiz_id, job_id, difficulty, question_count
     FROM tbl_job_fresher_quizzes
     WHERE job_id = ? AND is_deleted = FALSE
     ORDER BY fresher_quiz_id DESC
     LIMIT 1`,
    [id]
  );
  const quiz = quizzes?.[0];
  if (!quiz) throw fail("This job has no fresher quiz yet", 404);
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT question_id, section_key, question_number, question_text, options_json, correct_answer, explanation, difficulty
     FROM tbl_job_fresher_questions
     WHERE fresher_quiz_id = ? AND is_deleted = FALSE
     ORDER BY section_key ASC, question_number ASC, question_id ASC`,
    [quiz.fresher_quiz_id]
  );
  const grouped = new Map();
  for (const row of rows || []) {
    if (!grouped.has(row.section_key)) grouped.set(row.section_key, []);
    grouped.get(row.section_key).push(map_saved_question(row));
  }
  const sections = ["quantitative", "reasoning", "verbal"].
    filter((key) => grouped.has(key)).
    map((section_key) => ({ section_key, questions: grouped.get(section_key) }));
  return {
    job_id: id,
    fresher_quiz_id: Number(quiz.fresher_quiz_id),
    difficulty: quiz.difficulty || "medium",
    sections
  };
}

function public_question(question) {
  return {
    question_id: question.question_id,
    section_key: question.section_key,
    question_number: question.question_number,
    question_text: question.question_text,
    options: question.options,
    difficulty: question.difficulty
  };
}

export async function get_student_fresher_quiz(job_id, student_id = "") {
  const quiz = await get_fresher_quiz(job_id);
  const code = String(student_id || "").trim();
  let saved_answers = [];
  let attempt_id = null;
  if (code) {
    const [rows] = await sqlQuery(
      get_pool(),
      `SELECT attempt_id, answers_json
       FROM tbl_student_fresher_attempts
       WHERE student_id = ? AND job_id = ? AND fresher_quiz_id = ? AND status = 'in_progress'
       ORDER BY attempt_id DESC
       LIMIT 1`,
      [code, quiz.job_id, quiz.fresher_quiz_id]
    );
    const row = rows?.[0];
    if (row) {
      attempt_id = Number(row.attempt_id);
      const parsed = read_json(row.answers_json);
      saved_answers = draft_answers(Array.isArray(parsed) ? parsed : []);
    }
  }
  return {
    job_id: quiz.job_id,
    fresher_quiz_id: quiz.fresher_quiz_id,
    difficulty: quiz.difficulty,
    attempt_id,
    answers: saved_answers,
    sections: quiz.sections.map((section) => ({
      section_key: section.section_key,
      questions: section.questions.map(public_question)
    }))
  };
}

export async function start_student_fresher_quiz(student_id, job_id, body = {}) {
  await ensure_jobs_schema();
  const code = String(student_id || "").trim();
  if (!code) throw fail("Sign in again", 401);
  const job = await get_active_job(job_id);
  const quiz = await get_fresher_quiz(job.job_id);
  const questions = quiz.sections.flatMap((section) => section.questions);
  const total = questions.length;
  if (!total) throw fail("This job has no fresher questions yet", 404);
  const experience_level = "fresher";
  const interview_language = String(body.language || body.interview_language || "").trim() || null;

  const [existing] = await sqlQuery(
    get_pool(),
    `SELECT attempt_id, answers_json, created_at, updated_at, interview_language
     FROM tbl_student_fresher_attempts
     WHERE student_id = ? AND job_id = ? AND status = 'in_progress'
     ORDER BY attempt_id DESC
     LIMIT 1`,
    [code, job.job_id]
  );
  let attempt_id = Number(existing?.[0]?.attempt_id || 0);
  let answers = draft_answers(read_json(existing?.[0]?.answers_json) || []);
  let created_at = existing?.[0]?.created_at || null;
  let saved_language = String(existing?.[0]?.interview_language || "").trim() || interview_language;

  if (attempt_id) {
    await sqlQuery(
      get_pool(),
      `UPDATE tbl_student_fresher_attempts
       SET fresher_quiz_id = ?, total = ?, experience_level = ?,
           interview_language = COALESCE(?, interview_language), updated_at = NOW()
       WHERE attempt_id = ? AND student_id = ?`,
      [quiz.fresher_quiz_id, total, experience_level, interview_language, attempt_id, code]
    );
    if (interview_language) saved_language = interview_language;
  } else {
    const [result] = await sqlQuery(
      get_pool(),
      `INSERT INTO tbl_student_fresher_attempts
         (student_id, job_id, fresher_quiz_id, status, score, total, answers_json,
          experience_level, interview_language, updated_at)
       VALUES (?, ?, ?, 'in_progress', 0, ?, ?, ?, ?, NOW())`,
      [code, job.job_id, quiz.fresher_quiz_id, total, JSON.stringify([]), experience_level, interview_language]
    );
    attempt_id = Number(result.insertId);
    answers = [];
    created_at = new Date();
    saved_language = interview_language;
  }

  // Keep one in-progress attempt per job (Strict Mode / double mount can insert twins).
  await sqlQuery(
    get_pool(),
    `DELETE FROM tbl_student_fresher_attempts
     WHERE student_id = ? AND job_id = ? AND status = 'in_progress' AND attempt_id <> ?`,
    [code, job.job_id, attempt_id]
  );

  log.pass("startStudentFresherQuiz", `${code} opened fresher quiz on job ${job.job_id}`);
  return {
    attempt_id,
    job_id: job.job_id,
    job_title: job.job_title || "",
    company_name: job.company_name || "",
    fresher_quiz_id: quiz.fresher_quiz_id,
    answered: answers.length,
    total_questions: total,
    answers,
    experience_level,
    interview_language: saved_language || "",
    created_at,
    sections: quiz.sections.map((section) => ({
      section_key: section.section_key,
      questions: section.questions.map(public_question)
    }))
  };
}

export async function save_student_fresher_progress(student_id, job_id, body = {}) {
  await ensure_jobs_schema();
  const code = String(student_id || "").trim();
  if (!code) throw fail("Sign in again", 401);
  const id = Number(job_id);
  if (!Number.isInteger(id) || id < 1) throw fail("Select a job");
  const answers = draft_answers(body.answers);
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT attempt_id, total
     FROM tbl_student_fresher_attempts
     WHERE student_id = ? AND job_id = ? AND status = 'in_progress'
     ORDER BY attempt_id DESC
     LIMIT 1`,
    [code, id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Start the fresher quiz first", 404);
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_student_fresher_attempts
     SET answers_json = ?, score = 0, updated_at = NOW()
     WHERE attempt_id = ? AND student_id = ? AND status = 'in_progress'`,
    [JSON.stringify(answers), row.attempt_id, code]
  );
  return {
    attempt_id: Number(row.attempt_id),
    job_id: id,
    answered: answers.length,
    total_questions: Number(row.total) || 0,
    answers
  };
}

export async function list_student_fresher_ongoing(student_id) {
  await ensure_jobs_schema();
  const code = String(student_id || "").trim();
  if (!code) return [];
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT a.attempt_id, a.job_id, a.fresher_quiz_id, a.status, a.total, a.answers_json,
            a.experience_level, a.interview_language, a.created_at, a.updated_at,
            j.job_title, j.company_name
     FROM tbl_student_fresher_attempts a
     INNER JOIN (
       SELECT job_id, MAX(attempt_id) AS attempt_id
       FROM tbl_student_fresher_attempts
       WHERE student_id = ? AND status = 'in_progress'
       GROUP BY job_id
     ) latest ON latest.attempt_id = a.attempt_id
     LEFT JOIN tbl_jobs j ON j.job_id = a.job_id AND j.is_deleted = FALSE
     WHERE a.student_id = ? AND a.status = 'in_progress'
     ORDER BY COALESCE(a.updated_at, a.created_at) DESC, a.attempt_id DESC
     LIMIT 50`,
    [code, code]
  );
  return (rows || []).map((row) => {
    const answers = draft_answers(read_json(row.answers_json) || []);
    const total = Number(row.total) || 0;
    const answered = answers.length;
    const title = String(row.job_title || "").trim() || "Fresher aptitude quiz";
    return {
      kind: "fresher_quiz",
      attempt_id: Number(row.attempt_id),
      mock_interview_id: `fresher-${row.attempt_id}`,
      job_id: Number(row.job_id),
      job_title: row.job_title || "",
      company_name: row.company_name || "",
      fresher_quiz_id: Number(row.fresher_quiz_id),
      status: "in_progress",
      target_role: title,
      answered,
      question_number: Math.min(total, answered + 1) || 1,
      total_questions: total,
      overall_score: null,
      experience_level: String(row.experience_level || "fresher").trim() || "fresher",
      interview_language: String(row.interview_language || "").trim(),
      created_at: row.updated_at || row.created_at || null
    };
  });
}

export async function delete_student_fresher_attempt(student_id, attempt_id) {
  await ensure_jobs_schema();
  const code = String(student_id || "").trim();
  const id = Number(attempt_id);
  if (!code) throw fail("Sign in again", 401);
  if (!Number.isInteger(id) || id < 1) throw fail("Attempt was not found", 404);
  const [result] = await sqlQuery(
    get_pool(),
    `DELETE FROM tbl_student_fresher_attempts
     WHERE attempt_id = ? AND student_id = ? AND status = 'in_progress'`,
    [id, code]
  );
  if (!result?.affectedRows) throw fail("Attempt was not found", 404);
  log.pass("deleteStudentFresherAttempt", `${code} deleted fresher attempt ${id}`);
  return { deleted: true, attempt_id: id };
}

export async function submit_student_fresher_quiz(student_id, job_id, body = {}) {
  const code = String(student_id || "").trim();
  if (!code) throw fail("Sign in again", 401);
  const quiz = await get_fresher_quiz(job_id);
  const questions = quiz.sections.flatMap((section) => section.questions);
  if (!questions.length) throw fail("This job has no fresher questions yet", 404);

  const answers = draft_answers(body.answers);
  const picked = new Map(answers.map((item) => [item.question_id, item.answer]));

  let score = 0;
  const graded = [];
  for (const question of questions) {
    const answer = picked.get(question.question_id) || "";
    const correct = Boolean(answer) && answer === question.correct_answer;
    if (correct) score += 1;
    graded.push({
      question_id: question.question_id,
      section_key: question.section_key,
      answer,
      correct,
      correct_answer: question.correct_answer,
      explanation: question.explanation || ""
    });
  }

  const unanswered = graded.filter((item) => !item.answer).length;
  if (unanswered) throw fail(`Answer all questions before continuing (${unanswered} left)`);

  const [existing] = await sqlQuery(
    get_pool(),
    `SELECT attempt_id
     FROM tbl_student_fresher_attempts
     WHERE student_id = ? AND job_id = ? AND status = 'in_progress'
     ORDER BY attempt_id DESC
     LIMIT 1`,
    [code, quiz.job_id]
  );
  let attempt_id = Number(existing?.[0]?.attempt_id || 0);
  if (attempt_id) {
    await sqlQuery(
      get_pool(),
      `UPDATE tbl_student_fresher_attempts
       SET status = 'completed', fresher_quiz_id = ?, score = ?, total = ?, answers_json = ?, updated_at = NOW()
       WHERE attempt_id = ? AND student_id = ?`,
      [quiz.fresher_quiz_id, score, questions.length, JSON.stringify(graded), attempt_id, code]
    );
  } else {
    const [result] = await sqlQuery(
      get_pool(),
      `INSERT INTO tbl_student_fresher_attempts
         (student_id, job_id, fresher_quiz_id, status, score, total, answers_json, updated_at)
       VALUES (?, ?, ?, 'completed', ?, ?, ?, NOW())`,
      [code, quiz.job_id, quiz.fresher_quiz_id, score, questions.length, JSON.stringify(graded)]
    );
    attempt_id = Number(result.insertId);
  }

  log.pass("submitStudentFresherQuiz", `${code} scored ${score}/${questions.length} on job ${quiz.job_id}`);
  return {
    attempt_id,
    job_id: quiz.job_id,
    fresher_quiz_id: quiz.fresher_quiz_id,
    score,
    total: questions.length,
    sections: quiz.sections.map((section) => ({
      section_key: section.section_key,
      correct: graded.filter((item) => item.section_key === section.section_key && item.correct).length,
      total: section.questions.length
    }))
  };
}
