import path from "node:path";
import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { save_student_photo } from "../student_authentication/student_image.js";
import { STORAGE_BUCKETS, forget_stored_file, upload_to_bucket } from "../utils/storage_buckets.js";
import { ensure_jobs_schema, get_active_job, list_jobs } from "../jobs_manager/jobs_service.js";
import { get_pool } from "../utils/db_setup.js";
import { student_code } from "../utils/student_code.js";
import { find_assigned_certificate, render_issued_certificate } from "../certificate_manager/certificate_service.js";
import { ensure_certificate_schema } from "../certificate_manager/schema.js";
import { with_course_recommendations } from "./course_recommend.js";

const MOCK_CERTIFICATE_MIN_SCORE = 5;

const ALLOWED_EXT = new Set([".pdf", ".docx", ".pptx", ".txt"]);
const ALLOWED_INTERVIEW_LANGUAGES = new Set([
  "en-IN",
  "hi-IN",
  "raj-IN",
  "te-IN",
  "ta-IN",
  "kn-IN",
  "ml-IN",
  "mr-IN",
  "bn-IN",
  "gu-IN",
  "pa-IN"
]);

function get_interview_language(value) {
  const language = String(value || "en-IN").trim();

  if (!ALLOWED_INTERVIEW_LANGUAGES.has(language)) {
    throw fail("Unsupported interview language");
  }
  log.info("Mock interview language selected", { language });
  return language;
}

function get_experience_level(value) {
  const level = String(value || "").trim().toLowerCase();
  if (level === "fresher" || level === "mid" || level === "senior") return level;
  return "";
}

function with_session_language(started, language) {
  const session = started && typeof started === "object" ? { ...started } : {};
  if (language) session.language = language;
  return session;
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function ai_base() {
  return String(process.env.AI_BACKEND || "http://localhost:8000").replace(/\/+$/, "");
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

function ai_message(payload, fallback) {
  const detail = payload?.detail || payload?.error || payload?.message;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const text = detail.map((item) => item?.msg || item).filter(Boolean).join(", ");
    if (text) return text;
  }
  return fallback;
}

let schema_ready = null;

async function ensure_schema() {
  await ensure_jobs_schema();
  if (!schema_ready) {
    schema_ready = sqlQuery(
      get_pool(),
      `CREATE TABLE IF NOT EXISTS tbl_student_mock_interviews (
         mock_interview_id BIGINT NOT NULL AUTO_INCREMENT,
         student_id VARCHAR(20) NOT NULL,
         job_id BIGINT NULL,
         role_source VARCHAR(20) NOT NULL,
         file_name VARCHAR(255) NULL,
         analysis_json JSON NOT NULL,
         session_id VARCHAR(64) NULL,
         status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
         question_number INT NULL,
         total_questions INT NULL,
         session_json JSON NULL,
         answers_json JSON NULL,
         performance_json JSON NULL,
         experience_level VARCHAR(30) NULL,
         interview_language VARCHAR(20) NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NULL,
         PRIMARY KEY (mock_interview_id),
         KEY idx_mock_interview_student (student_id, mock_interview_id)
       )`
    ).then(() => sqlQuery(
      get_pool(),
      "ALTER TABLE tbl_student_mock_interviews ADD COLUMN experience_level VARCHAR(30) NULL"
    ).catch((err) => {
      if (!/duplicate column/i.test(String(err?.message || err?.sqlMessage || ""))) throw err;
    })).then(() => sqlQuery(
      get_pool(),
      "ALTER TABLE tbl_student_mock_interviews ADD COLUMN interview_language VARCHAR(20) NULL"
    ).catch((err) => {
      if (!/duplicate column/i.test(String(err?.message || err?.sqlMessage || ""))) throw err;
    })).catch((err) => {
      schema_ready = null;
      throw err;
    });
  }
  await schema_ready;
}

function map_row(row) {
  if (!row) return null;
  const session = read_json(row.session_json);
  const analysis = read_json(row.analysis_json);
  return {
    mock_interview_id: Number(row.mock_interview_id),
    job_id: row.job_id == null ? null : Number(row.job_id),
    role_source: row.role_source || "",
    file_name: row.file_name || "",
    analysis,
    session_id: row.session_id || "",
    status: row.status || "",
    question_number: row.question_number == null ? null : Number(row.question_number),
    total_questions: row.total_questions == null ? null : Number(row.total_questions),
    session,
    answers: read_json(row.answers_json) || [],
    performance: read_json(row.performance_json),
    experience_level: get_experience_level(row.experience_level),
    interview_language: String(row.interview_language || session?.language || analysis?.language || "").trim(),
    created_at: row.created_at || null
  };
}

async function load_owned(student_id, mock_interview_id) {
  const id = Number(mock_interview_id);
  if (!Number.isInteger(id) || id < 1) throw fail("Interview was not found", 404);
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT mock_interview_id, job_id, role_source, file_name, analysis_json, session_id, status,
            question_number, total_questions, session_json, answers_json, performance_json,
            experience_level, interview_language, created_at
     FROM tbl_student_mock_interviews
     WHERE mock_interview_id = ? AND student_id = ?
     LIMIT 1`,
    [id, student_id]
  );
  if (!rows?.[0]) throw fail("Interview was not found", 404);
  return map_row(rows[0]);
}

export async function list_open_jobs() {
  return list_jobs({ active_only: true, latest_first: true });
}

async function student_photo_url(student_id) {
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT profile_photo_url
     FROM tbl_students
     WHERE student_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [student_id]
  );
  return String(rows?.[0]?.profile_photo_url || "").trim();
}

export async function mock_interview_profile_photo(user) {
  const url = await student_photo_url(student_code(user));
  return {
    has_photo: Boolean(url),
    profile_photo_url: url
  };
}

export async function save_mock_interview_profile_photo(user, file) {
  if (!file?.buffer) throw fail("Choose a photo to upload");
  const code = student_code(user);
  const previous = await student_photo_url(code);
  const profile_photo_url = await save_student_photo(code, file);
  if (!profile_photo_url) throw fail("Upload failed because no storage bucket is available", 503);
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_students SET profile_photo_url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND is_deleted = FALSE`,
    [profile_photo_url, code]
  );
  if (previous && previous !== profile_photo_url) await forget_stored_file(previous);
  log.pass("saveMockInterviewPhoto", `photo saved for ${code}`);
  return {
    has_photo: true,
    profile_photo_url
  };
}

function check_file(file) {
  if (!file?.buffer?.length) throw fail("Choose a resume file");
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) throw fail("Use a PDF, DOCX, PPTX, or TXT resume");
}

function audio_ext(file) {
  const ext = path.extname(String(file?.originalname || "")).toLowerCase();
  if ([".webm", ".mp4", ".m4a", ".mp3", ".ogg", ".wav"].includes(ext)) return ext;
  const type = String(file?.mimetype || "").toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return ".m4a";
  if (type.includes("mpeg")) return ".mp3";
  if (type.includes("ogg")) return ".ogg";
  if (type.includes("wav")) return ".wav";
  return ".webm";
}

function is_audio_file(file) {
  const type = String(file?.mimetype || "").toLowerCase();
  return type.startsWith("audio/") || type.includes("webm") || type.includes("mp4") || type.includes("ogg");
}

async function save_mock_answer_audio(student_id, mock_interview_id, question_number, file) {
  if (!file?.buffer?.length) return "";
  if (!is_audio_file(file)) throw fail("Use an audio recording");
  const filename = `records/${student_id}-mock-${mock_interview_id}-q${question_number}-${Date.now()}${audio_ext(file)}`;
  const url = await upload_to_bucket(
    STORAGE_BUCKETS.STUDENTS,
    filename,
    file.buffer,
    String(file.mimetype || "audio/webm").split(";")[0] || "audio/webm"
  );
  log.pass("saveMockAnswerAudio", `${filename} ${file.buffer.length} bytes`);
  return url;
}

async function call_ai(url, options, fallback) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw fail("Mock interview is unavailable right now", 503);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw fail(ai_message(payload, fallback), response.status || 502);
  }
  return payload;
}

function session_gone(error) {
  return error?.status === 404 || /not found/i.test(error?.message || "");
}

async function live_session(session_id) {
  if (!session_id) return false;
  let response;
  try {
    response = await fetch(`${ai_base()}/api/mock-interview/${encodeURIComponent(session_id)}`);
  } catch {
    return true;
  }
  if (response.status === 404) return false;
  if (!response.ok) return true;
  const payload = await response.json().catch(() => null);
  return payload?.status === "in_progress" && Boolean(payload?.question);
}

async function close_interview(student_id, row, status) {
  const [result] = await sqlQuery(
    get_pool(),
    `UPDATE tbl_student_mock_interviews
     SET status = ?, session_json = NULL, updated_at = NOW()
     WHERE mock_interview_id = ? AND student_id = ? AND status IN ('in_progress', 'finishing')`,
    [status, row.mock_interview_id, student_id]
  );
  if (!result?.affectedRows) return load_owned(student_id, row.mock_interview_id);
  return { ...row, status, session: null };
}

function job_text(job) {
  return [job.job_title, job.company_name, job.location, job.job_description].filter(Boolean).join("\n");
}

function resume_role_text(target_role) {
  const role = String(target_role || "").trim();
  if (role) {
    return `Target role from the resume: ${role}. Interview the candidate for this position using the experience in the resume.`;
  }
  return "Use the target role written in this resume. Interview the candidate for that position.";
}

function course_context_of(body) {
  let context = body.course_context;
  if (typeof context === "string") {
    try {
      context = JSON.parse(context);
    } catch {
      context = null;
    }
  }
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    throw fail("Course progress was not included");
  }
  if (!Array.isArray(context.modules) || !context.modules.length) {
    throw fail("No lessons are available for this interview");
  }
  return context;
}

async function start_course_interview(user, context, language, experience_level = "") {
  const code = student_code(user);
  const started = await call_ai(
    `${ai_base()}/api/mock-interview/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysis: context,
        candidate_id: code,
        language
      })
    },
    "Could not start the mock interview"
  );
  const [result] = await sqlQuery(
    get_pool(),
    `INSERT INTO tbl_student_mock_interviews
      (student_id, job_id, role_source, file_name, analysis_json, session_id, status,
       question_number, total_questions, session_json, answers_json,
       experience_level, interview_language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      null,
      "course",
      null,
      JSON.stringify(context),
      started.session_id || null,
      started.status || "in_progress",
      started.question_number || null,
      started.total_questions || null,
      JSON.stringify(with_session_language(started, language)),
      JSON.stringify([]),
      experience_level || null,
      language
    ]
  );
  log.pass("startMockInterview", `${code} started course interview ${result.insertId}`);
  return with_course_recommendations(await load_owned(code, result.insertId));
}

async function latest_saved_analysis(student_id) {
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT file_name, job_id, analysis_json
     FROM tbl_student_mock_interviews
     WHERE student_id = ? AND analysis_json IS NOT NULL
     ORDER BY mock_interview_id DESC
     LIMIT 1`,
    [student_id]
  );
  const row = rows?.[0];
  const analysis = read_json(row?.analysis_json);
  if (!row || !analysis || typeof analysis !== "object") {
    throw fail("No previous interview data was found");
  }
  return {
    analysis,
    file_name: row.file_name || null,
    job_id: row.job_id == null ? null : Number(row.job_id)
  };
}

async function start_previous_interview(user, language, experience_level = "") {
  const code = student_code(user);
  const saved = await latest_saved_analysis(code);
  const started = await call_ai(
    `${ai_base()}/api/mock-interview/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysis: saved.analysis,
        candidate_id: code,
        language
      })
    },
    "Could not start the mock interview"
  );
  const [result] = await sqlQuery(
    get_pool(),
    `INSERT INTO tbl_student_mock_interviews
      (student_id, job_id, role_source, file_name, analysis_json, session_id, status,
       question_number, total_questions, session_json, answers_json,
       experience_level, interview_language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      saved.job_id,
      "previous",
      saved.file_name,
      JSON.stringify(saved.analysis),
      started.session_id || null,
      started.status || "in_progress",
      started.question_number || null,
      started.total_questions || null,
      JSON.stringify(with_session_language(started, language)),
      JSON.stringify([]),
      experience_level || null,
      language
    ]
  );
  log.pass("startMockInterview", `${code} continued from saved analysis ${result.insertId}`);
  return with_course_recommendations(await load_owned(code, result.insertId));
}

export async function start_mock_interview(user, file, body = {}) {
  await ensure_schema();
  const language = get_interview_language(body.language);
  const experience_level = get_experience_level(body.experience_level);
  if (body.role_source === "course") {
  return start_course_interview(
    user,
    course_context_of(body),
    language,
    experience_level
  );
}

if (body.role_source === "previous") {
  return start_previous_interview(user, language, experience_level);
}
  check_file(file);
  const code = student_code(user);
  const role_source = body.role_source === "job" ? "job" : "resume";
  let job = null;
  let description = resume_role_text(body.target_role);
  if (role_source === "job") {
    job = await get_active_job(body.job_id);
    description = job_text(job);
  }

  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" });
  form.append("file", blob, path.basename(file.originalname || "resume.pdf"));
  form.append("job_description", description);
  const analyzed = await call_ai(
    `${ai_base()}/api/resume/analyze-with-job`,
    { method: "POST", body: form },
    "Resume and job matching failed"
  );
  if (!analyzed.analysis || typeof analyzed.analysis !== "object") {
    throw fail("Resume analysis did not return a result", 502);
  }

  const started = await call_ai(
    `${ai_base()}/api/mock-interview/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysis: analyzed.analysis,
        candidate_id: code,
        language
      })
    },
    "Could not start the mock interview"
  );

  const [result] = await sqlQuery(
    get_pool(),
    `INSERT INTO tbl_student_mock_interviews
      (student_id, job_id, role_source, file_name, analysis_json, session_id, status,
       question_number, total_questions, session_json, answers_json,
       experience_level, interview_language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      job?.job_id || null,
      role_source,
      String(analyzed.filename || file.originalname || "resume").slice(0, 255),
      JSON.stringify(analyzed.analysis),
      started.session_id || null,
      started.status || "in_progress",
      started.question_number || null,
      started.total_questions || null,
      JSON.stringify(with_session_language(started, language)),
      JSON.stringify([]),
      experience_level || null,
      language
    ]
  );
  log.pass("startMockInterview", `${code} started ${result.insertId}`);
  return with_course_recommendations(await load_owned(code, result.insertId));
}

export async function current_mock_interview(user) {
  await ensure_schema();
  const code = student_code(user);
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT mock_interview_id, job_id, role_source, file_name, analysis_json, session_id, status,
            question_number, total_questions, session_json, answers_json, performance_json,
            experience_level, interview_language, created_at
     FROM tbl_student_mock_interviews
     WHERE student_id = ?
     ORDER BY mock_interview_id DESC
     LIMIT 1`,
    [code]
  );
  const item = map_row(rows?.[0]);
  if (!item || item.status !== "in_progress") return with_course_recommendations(item);
  if (await live_session(item.session_id)) return with_course_recommendations(item);
  log.pass("currentMockInterview", `${code} session ended ${item.mock_interview_id}`);
  return with_course_recommendations(await close_interview(code, item, "expired"));
}

export async function answer_mock_interview(user, mock_interview_id, body = {}, file) {
  await ensure_schema();
  const code = student_code(user);
  const row = await load_owned(code, mock_interview_id);
  const answer = String(body.answer || "").trim();
  if (!answer) throw fail("Type or speak an answer first");
  if (answer.length > 3000) throw fail("Answer must be 3000 characters or less");
  if (!row.session_id) throw fail("This interview has no session", 409);
  if (row.status === "completed") throw fail("This interview is already finished");
  if (row.status === "expired") throw fail("Interview session not found", 404);

  const answers = Array.isArray(row.answers) ? row.answers.slice() : [];
  const wants_audio = String(body.has_audio || "") === "1" || Boolean(file?.buffer?.length);
  let audio_url = "";
  if (wants_audio) {
    if (!file?.buffer?.length) throw fail("The recording did not upload. Please record again.");
    audio_url = await save_mock_answer_audio(code, row.mock_interview_id, answers.length + 1, file);
    if (!audio_url) throw fail("Unable to save the recording", 503);
  }

  let payload;
  try {
    payload = await call_ai(
      `${ai_base()}/api/mock-interview/${encodeURIComponent(row.session_id)}/answer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer })
      },
      "Answer evaluation failed"
    );
  } catch (err) {
    if (session_gone(err)) {
      await close_interview(code, row, "expired");
      throw fail("Interview session not found", 404);
    }
    throw err;
  }

  answers.push({
    question: row.session?.question || null,
    answer,
    evaluation: payload.evaluation || null,
    ...(audio_url ? { audio_url } : {})
  });
  const status = payload.status || "in_progress";
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_student_mock_interviews
     SET status = ?, question_number = ?, total_questions = ?, session_json = ?, answers_json = ?,
         performance_json = ?, updated_at = NOW()
     WHERE mock_interview_id = ? AND student_id = ?`,
    [
      status,
      payload.question_number || row.question_number,
      payload.total_questions || row.total_questions,
      JSON.stringify(payload),
      JSON.stringify(answers),
      payload.performance ? JSON.stringify(payload.performance) : null,
      row.mock_interview_id,
      code
    ]
  );
  log.pass("answerMockInterview", `${code} answered ${row.mock_interview_id}`);
  return with_course_recommendations(await load_owned(code, row.mock_interview_id));
}

export async function finish_mock_interview(user, mock_interview_id) {
  await ensure_schema();
  const code = student_code(user);
  const row = await load_owned(code, mock_interview_id);
  if (!row.session_id) throw fail("This interview has no session", 409);
  if (row.performance && row.status === "completed") {
    return with_certificate_flag(await with_course_recommendations(row));
  }
  if (row.status === "expired") return row;

  await sqlQuery(
    get_pool(),
    `UPDATE tbl_student_mock_interviews
     SET status = 'finishing', updated_at = NOW()
     WHERE mock_interview_id = ? AND student_id = ? AND status = 'in_progress'`,
    [row.mock_interview_id, code]
  );

  let payload;
  try {
    payload = await call_ai(
      `${ai_base()}/api/mock-interview/${encodeURIComponent(row.session_id)}/finish`,
      { method: "POST" },
      "Could not finish the mock interview"
    );
  } catch (err) {
    log.pass("finishMockInterview", `${code} closed ${row.mock_interview_id}: ${err.message}`);
    return with_course_recommendations(await close_interview(code, row, "expired"));
  }
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_student_mock_interviews
     SET status = 'completed', performance_json = ?, updated_at = NOW()
     WHERE mock_interview_id = ? AND student_id = ?`,
    [JSON.stringify(payload.performance || {}), row.mock_interview_id, code]
  );
  log.pass("finishMockInterview", `${code} finished ${row.mock_interview_id}`);
  return with_certificate_flag(await with_course_recommendations(await load_owned(code, row.mock_interview_id)));
}

function score_of(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function brief_lines(list, limit = 2) {
  const seen = new Set();
  const lines = [];
  for (const item of Array.isArray(list) ? list : []) {
    const text = String(item || "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    lines.push(text);
    if (lines.length >= limit) break;
  }
  return lines;
}

function mood_from_score(score) {
  if (score == null) return "";
  if (score >= 7) return "positive";
  if (score < 4) return "negative";
  return "neutral";
}

function sentiment_by_question(item) {
  const list = item?.performance?.llm_analysis?.sentiment_analysis?.answer_sentiments;
  const map = new Map();
  for (const row of Array.isArray(list) ? list : []) {
    const number = Number(row?.question_number);
    if (!Number.isInteger(number) || number < 1) continue;
    map.set(number, {
      sentiment: String(row.sentiment || "").trim().toLowerCase(),
      explanation: String(row.explanation || "").trim()
    });
  }
  return map;
}

function sentiment_brief(item) {
  const llm = item?.performance?.llm_analysis && typeof item.performance.llm_analysis === "object" ?
    item.performance.llm_analysis :
    {};
  const mood = llm.sentiment_analysis && typeof llm.sentiment_analysis === "object" ? llm.sentiment_analysis : {};
  const communication = llm.communication_analysis && typeof llm.communication_analysis === "object" ? llm.communication_analysis : {};
  const vocabulary = llm.vocabulary_analysis && typeof llm.vocabulary_analysis === "object" ? llm.vocabulary_analysis : {};
  const overall = String(mood.overall_sentiment || "").trim().toLowerCase();
  return {
    overall_sentiment: overall,
    positive_percentage: score_of(mood.positive_percentage),
    neutral_percentage: score_of(mood.neutral_percentage),
    negative_percentage: score_of(mood.negative_percentage),
    summary: String(mood.sentiment_summary || "").trim(),
    communication_score: score_of(communication.communication_score),
    vocabulary_score: score_of(vocabulary.vocabulary_score),
    available: Boolean(overall || score_of(communication.communication_score) != null || score_of(vocabulary.vocabulary_score) != null)
  };
}

function topics_from_answers(answers) {
  const grouped = new Map();
  for (const entry of Array.isArray(answers) ? answers : []) {
    const topic = String(entry?.question?.topic || entry?.topic || "").trim();
    if (!topic) continue;
    const row = grouped.get(topic) || { topic, scores: [] };
    const score = score_of(entry?.evaluation?.score);
    if (score != null) row.scores.push(score);
    grouped.set(topic, row);
  }
  return [...grouped.values()].map((row) => ({
    topic: row.topic,
    average_score: row.scores.length ?
      Math.round((row.scores.reduce((sum, value) => sum + value, 0) / row.scores.length) * 10) / 10 :
      null
  })).slice(0, 4);
}

function brief_result(item) {
  const performance = item.performance && typeof item.performance === "object" ? item.performance : {};
  const answers = Array.isArray(item.answers) ? item.answers : [];
  const llm = performance.llm_analysis && typeof performance.llm_analysis === "object" ? performance.llm_analysis : {};
  const overall = llm.overall_assessment && typeof llm.overall_assessment === "object" ? llm.overall_assessment : {};
  const answer_scores = answers.map((entry) => score_of(entry?.evaluation?.score)).filter((value) => value != null);
  let overall_score = score_of(performance.overall_score);
  if ((overall_score == null || (overall_score === 0 && answer_scores.some((value) => value > 0))) && answer_scores.length) {
    overall_score = Math.round((answer_scores.reduce((sum, value) => sum + value, 0) / answer_scores.length) * 10) / 10;
  }
  const stored_topics = (Array.isArray(performance.topic_performance) ? performance.topic_performance : []).
    map((row) => ({
      topic: String(row?.topic || "").trim(),
      average_score: score_of(row?.average_score)
    })).
    filter((row) => row.topic);
  const topics = (stored_topics.length ? stored_topics : topics_from_answers(answers)).slice(0, 4);
  const answer_strengths = answers.flatMap((entry) => Array.isArray(entry?.evaluation?.strengths) ? entry.evaluation.strengths : []);
  const answer_gaps = answers.flatMap((entry) => Array.isArray(entry?.evaluation?.gaps) ? entry.evaluation.gaps : []);
  const strengths = brief_lines([
    ...(Array.isArray(performance.strengths) ? performance.strengths : []),
    ...(Array.isArray(overall.top_strengths) ? overall.top_strengths : []),
    ...answer_strengths
  ]);
  const gaps = brief_lines([
    ...(Array.isArray(performance.gaps) ? performance.gaps : []),
    ...(Array.isArray(overall.areas_for_improvement) ? overall.areas_for_improvement : []),
    ...(Array.isArray(overall.areas_to_improve) ? overall.areas_to_improve : []),
    ...answer_gaps
  ]);
  const recommendation = brief_lines([
    ...(Array.isArray(performance.recommendations) ? performance.recommendations : []),
    ...(Array.isArray(overall.personalized_recommendations) ? overall.personalized_recommendations : []),
    ...(Array.isArray(overall.what_to_do_next) ? overall.what_to_do_next : [])
  ], 1)[0] || "";
  const summary = String(overall.overall_interview_assessment || overall.summary || overall.verdict || llm.summary || "").trim();
  let verdict = "none";
  if (overall_score != null) {
    if (overall_score >= 7) verdict = "strong";
    else if (overall_score >= 4) verdict = "fair";
    else verdict = "needs_practice";
  }
  const moods = sentiment_by_question(item);
  const total = Number(item.total_questions) || Number(item.session?.total_questions) || answers.length || 0;
  const timeline = Array.from({ length: Math.max(total, answers.length) }, (_, index) => {
    const entry = answers[index];
    const score = score_of(entry?.evaluation?.score);
    const mood = moods.get(index + 1) || {};
    return {
      question_number: index + 1,
      status: entry ? "answered" : "pending",
      score,
      topic: String(entry?.question?.topic || entry?.topic || "").trim(),
      sentiment: mood.sentiment || mood_from_score(score)
    };
  });
  return {
    overall_score,
    answered: answers.length,
    total_questions: total,
    topics,
    strengths,
    gaps,
    recommendation,
    summary,
    verdict,
    sentiment: sentiment_brief(item),
    timeline
  };
}

function certificate_file_name(title) {
  const stem = String(title || "mock-interview").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${stem || "mock-interview"}-certificate.png`;
}

function cert_flags(item, template) {
  if (!template || item.status !== "completed") {
    return { certificate_ready: false, certificate_locked: false };
  }
  const score = brief_result(item).overall_score;
  const earned = score != null && score >= MOCK_CERTIFICATE_MIN_SCORE;
  return { certificate_ready: earned, certificate_locked: !earned };
}

async function mock_certificate_template() {
  await ensure_certificate_schema();
  return find_assigned_certificate("mock_interview");
}

async function with_certificate_flag(item) {
  if (!item) return item;
  const template = await mock_certificate_template();
  return { ...item, ...cert_flags(item, template) };
}

function list_card(item, template) {
  const analysis = item.analysis && typeof item.analysis === "object" ? item.analysis : {};
  const session = item.session && typeof item.session === "object" ? item.session : {};
  const answers = Array.isArray(item.answers) ? item.answers : [];
  const total = Number(item.total_questions) || Number(session.total_questions) || answers.length || 0;
  const answered = answers.length;
  const overall_score = score_of(item.performance?.overall_score);
  const result = item.status === "completed" ? brief_result(item) : null;
  return {
    mock_interview_id: item.mock_interview_id,
    job_id: item.job_id,
    role_source: item.role_source,
    status: item.status,
    target_role: String(analysis.target_role || session.target_role || item.performance?.target_role || "").trim() || "Mock interview",
    question_number: item.question_number,
    answered,
    total_questions: total,
    overall_score: result?.overall_score ?? overall_score,
    experience_level: get_experience_level(item.experience_level),
    interview_language: String(item.interview_language || session.language || analysis.language || "").trim(),
    result,
    created_at: item.created_at,
    ...cert_flags(item, template)
  };
}

function question_entry(entry, index, status, moods) {
  const evaluation = entry?.evaluation && typeof entry.evaluation === "object" ? entry.evaluation : null;
  const question = entry?.question && typeof entry.question === "object" ? entry.question : entry?.question || null;
  const number = index + 1;
  const score = score_of(evaluation?.score);
  const mood = moods.get(number) || {};
  return {
    question_number: number,
    status,
    question,
    answer: String(entry?.answer || ""),
    evaluation,
    score,
    topic: String(question?.topic || entry?.topic || "").trim(),
    strengths: brief_lines(evaluation?.strengths, 3),
    gaps: brief_lines(evaluation?.gaps, 3),
    sentiment: mood.sentiment || mood_from_score(score),
    sentiment_note: mood.explanation || "",
    audio_url: String(entry?.audio_url || "").trim()
  };
}

function question_board(item, template) {
  const answers = Array.isArray(item.answers) ? item.answers : [];
  const pending = item.session?.question && typeof item.session.question === "object" ? item.session.question : null;
  const total = Number(item.total_questions) || Number(item.session?.total_questions) || 0;
  const moods = sentiment_by_question(item);
  const questions = answers.map((entry, index) => question_entry(entry, index, "answered", moods));
  const unfinished = item.status === "in_progress" || item.status === "finishing" || item.status === "expired";
  if (unfinished && pending?.question) {
    const same = questions.some((entry) => entry.question?.question === pending.question);
    if (!same) questions.push(question_entry({ question: pending }, questions.length, "current", moods));
  } else if (unfinished && questions.length < total) {
    questions.push(question_entry(null, questions.length, "current", moods));
  }
  while (unfinished && questions.length < total) {
    questions.push(question_entry(null, questions.length, "pending", moods));
  }
  return {
    ...list_card(item, template),
    questions,
    performance: item.performance || null,
    analysis: item.analysis || null,
    session_id: item.session_id || "",
    status: item.status
  };
}

export async function list_mock_interviews(user) {
  await ensure_schema();
  const code = student_code(user);
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT mock_interview_id, job_id, role_source, file_name, analysis_json, session_id, status,
            question_number, total_questions, session_json, answers_json, performance_json,
            experience_level, interview_language, created_at
     FROM tbl_student_mock_interviews
     WHERE student_id = ?
     ORDER BY mock_interview_id DESC
     LIMIT 100`,
    [code]
  );
  const items = (rows || []).map(map_row);
  const template = await mock_certificate_template();
  const ongoing = [];
  const completed = [];
  for (const item of items) {
    if (item.status === "completed") completed.push(list_card(item, template));
    else if (item.status === "in_progress" || item.status === "finishing" || item.status === "expired") {
      ongoing.push(list_card(item, template));
    }
  }

  const { list_student_fresher_ongoing } = await import("../jobs_manager/fresher_quiz_service.js");
  const fresher = await list_student_fresher_ongoing(code);
  for (const item of fresher) ongoing.push(item);
  ongoing.sort((left, right) => {
    const a = left.created_at ? new Date(left.created_at).getTime() : 0;
    const b = right.created_at ? new Date(right.created_at).getTime() : 0;
    return b - a;
  });

  return { ongoing, completed };
}

async function revive_interview(student_id, row) {
  if (!row?.analysis || typeof row.analysis !== "object") {
    throw fail("No interview data was found to continue");
  }
  if (row.status === "in_progress" && await live_session(row.session_id)) return row;

  const language = get_interview_language(
    row.interview_language || row.session?.language || row.analysis?.language || "en-IN"
  );
  const started = await call_ai(
    `${ai_base()}/api/mock-interview/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysis: row.analysis,
        candidate_id: student_id,
        language
      })
    },
    "Could not resume the mock interview"
  );

  await sqlQuery(
    get_pool(),
    `UPDATE tbl_student_mock_interviews
     SET session_id = ?, status = ?, question_number = ?, total_questions = ?,
         session_json = ?, answers_json = ?, performance_json = NULL,
         interview_language = ?, updated_at = NOW()
     WHERE mock_interview_id = ? AND student_id = ?`,
    [
      started.session_id || null,
      started.status || "in_progress",
      started.question_number || null,
      started.total_questions || null,
      JSON.stringify(with_session_language(started, language)),
      JSON.stringify([]),
      language,
      row.mock_interview_id,
      student_id
    ]
  );
  log.pass("reviveMockInterview", `${student_id} revived ${row.mock_interview_id}`);
  return load_owned(student_id, row.mock_interview_id);
}

export async function get_mock_interview(user, mock_interview_id) {
  await ensure_schema();
  const item = await with_course_recommendations(await load_owned(student_code(user), mock_interview_id));
  const template = await mock_certificate_template();
  return {
    item: { ...item, ...cert_flags(item, template) },
    board: question_board(item, template)
  };
}

export async function download_mock_interview_certificate(user, mock_interview_id) {
  await ensure_schema();
  const code = student_code(user);
  const item = await load_owned(code, mock_interview_id);
  if (item.status !== "completed") throw fail("Finish the interview to unlock your certificate", 403);
  const score = brief_result(item).overall_score;
  if (score == null || score < MOCK_CERTIFICATE_MIN_SCORE) {
    throw fail("Score at least 50% to unlock your certificate", 403);
  }
  const template = await mock_certificate_template();
  if (!template) throw fail("No mock interview certificate template is assigned", 400);
  const issued = await render_issued_certificate(template.certificate_id, {
    student_id: code,
    mock_interview_id: item.mock_interview_id
  });
  const analysis = item.analysis && typeof item.analysis === "object" ? item.analysis : {};
  const session = item.session && typeof item.session === "object" ? item.session : {};
  const role = String(analysis.target_role || session.target_role || "mock-interview").trim();
  return {
    buffer: issued.buffer,
    content_type: issued.content_type,
    file_name: certificate_file_name(role)
  };
}

export async function resume_mock_interview(user, mock_interview_id) {
  await ensure_schema();
  const code = student_code(user);
  let item = await load_owned(code, mock_interview_id);
  if (item.status === "completed") throw fail("This interview is already finished");
  if (item.status === "expired" || !(await live_session(item.session_id))) {
    item = await revive_interview(code, item);
  }
  return with_course_recommendations(item);
}

export async function delete_mock_interview(user, mock_interview_id) {
  await ensure_schema();
  const code = student_code(user);
  const raw = String(mock_interview_id || "");
  if (raw.startsWith("fresher-")) {
    const { delete_student_fresher_attempt } = await import("../jobs_manager/fresher_quiz_service.js");
    return delete_student_fresher_attempt(code, raw.slice("fresher-".length));
  }
  const item = await load_owned(code, mock_interview_id);
  await sqlQuery(
    get_pool(),
    `DELETE FROM tbl_student_mock_interviews
     WHERE mock_interview_id = ? AND student_id = ?`,
    [item.mock_interview_id, code]
  );
  log.pass("deleteMockInterview", `${code} deleted ${item.mock_interview_id}`);
  return { deleted: true, mock_interview_id: item.mock_interview_id };
}

export async function reattempt_mock_interview(user, mock_interview_id, body = {}, file) {
  await ensure_schema();
  const code = student_code(user);
  const row = await load_owned(code, mock_interview_id);
  const answer = String(body.answer || "").trim();
  const question_number = Number(body.question_number);
  if (!answer) throw fail("Type or speak an answer first");
  if (answer.length > 3000) throw fail("Answer must be 3000 characters or less");
  if (!Number.isInteger(question_number) || question_number < 1) throw fail("Choose a question to reattempt");

  const answers = Array.isArray(row.answers) ? row.answers.slice() : [];
  const index = question_number - 1;
  if (index < 0 || index >= answers.length) throw fail("That question cannot be reattempted");
  const previous = answers[index];
  const question = previous?.question && typeof previous.question === "object" ? previous.question : null;
  if (!question?.question) throw fail("That question cannot be reattempted");

  const previous_audio = String(previous?.audio_url || "").trim();
  const wants_audio = String(body.has_audio || "") === "1" || Boolean(file?.buffer?.length);
  let audio_url = "";
  if (wants_audio) {
    if (!file?.buffer?.length) throw fail("The recording did not upload. Please record again.");
    audio_url = await save_mock_answer_audio(code, row.mock_interview_id, question_number, file);
    if (!audio_url) throw fail("Unable to save the recording", 503);
  }

  let evaluation = null;
  let performance = row.performance || null;
  if (row.session_id && row.status === "in_progress") {
    try {
      const payload = await call_ai(
        `${ai_base()}/api/mock-interview/${encodeURIComponent(row.session_id)}/reattempt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answer, question_number })
        },
        "Answer evaluation failed"
      );
      evaluation = payload.evaluation || null;
      if (payload.performance) performance = payload.performance;
    } catch (err) {
      if (!session_gone(err)) throw err;
    }
  }
  if (!evaluation) {
    const language = String(row.session?.language || row.analysis?.language || "en-IN");
    const payload = await call_ai(
      `${ai_base()}/api/mock-interview/evaluate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: row.analysis || {},
          question,
          answer,
          language
        })
      },
      "Answer evaluation failed"
    );
    evaluation = payload.evaluation || null;
  }

  if (previous_audio && previous_audio !== audio_url) {
    await forget_stored_file(previous_audio);
  }
  answers[index] = {
    question,
    answer,
    evaluation,
    ...(audio_url ? { audio_url } : {})
  };
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_student_mock_interviews
     SET answers_json = ?, performance_json = ?, updated_at = NOW()
     WHERE mock_interview_id = ? AND student_id = ?`,
    [
      JSON.stringify(answers),
      performance ? JSON.stringify(performance) : null,
      row.mock_interview_id,
      code
    ]
  );
  log.pass("reattemptMockInterview", `${code} reattempted Q${question_number} on ${row.mock_interview_id}`);
  const item = await with_course_recommendations(await load_owned(code, row.mock_interview_id));
  return { item, board: question_board(item) };
}

export async function retry_mock_interview(user, mock_interview_id, body = {}) {
  await ensure_schema();
  const code = student_code(user);
  const source = await load_owned(code, mock_interview_id);
  if (!source.analysis || typeof source.analysis !== "object") {
    throw fail("No interview data was found to try again");
  }
  const language = get_interview_language(body.language || source.interview_language || "en-IN");
  const experience_level = get_experience_level(body.experience_level || source.experience_level);
  const started = await call_ai(
    `${ai_base()}/api/mock-interview/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysis: source.analysis,
        candidate_id: code,
        language
      })
    },
    "Could not start the mock interview"
  );
  const [result] = await sqlQuery(
    get_pool(),
    `INSERT INTO tbl_student_mock_interviews
      (student_id, job_id, role_source, file_name, analysis_json, session_id, status,
       question_number, total_questions, session_json, answers_json,
       experience_level, interview_language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      source.job_id,
      "previous",
      source.file_name || null,
      JSON.stringify(source.analysis),
      started.session_id || null,
      started.status || "in_progress",
      started.question_number || null,
      started.total_questions || null,
      JSON.stringify(with_session_language(started, language)),
      JSON.stringify([]),
      experience_level || null,
      language
    ]
  );
  log.pass("retryMockInterview", `${code} retried ${source.mock_interview_id} as ${result.insertId}`);
  return with_course_recommendations(await load_owned(code, result.insertId));
}
