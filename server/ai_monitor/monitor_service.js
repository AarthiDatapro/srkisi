import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "../utils/db_setup.js";
import { visible_program_ids } from "../utils/assignment_scope.js";
import { ensure_ai_monitor_schema } from "./schema.js";

const DAY_MS = 86400000;
const ROW_LIMIT = 500;
const SOURCE_LABEL = { resume: "Resume upload", job: "Job posting", course: "Course progress", previous: "Previous resume" };

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
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

function as_list(value) {
  return Array.isArray(value) ? value : [];
}

function round(value, places = 1) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

function average(values) {
  const list = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
}

function finite_or_null(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function voice_of(performance) {
  const analysis = performance?.llm_analysis;
  if (!analysis || typeof analysis !== "object") return null;
  if (analysis.status === "failed" || analysis.status === "unavailable") return null;
  const sentiment = analysis.sentiment_analysis || {};
  const communication = analysis.communication_analysis || {};
  const vocabulary = analysis.vocabulary_analysis || {};
  const voice = {
    sentiment: String(sentiment.overall_sentiment || "").trim().toLowerCase(),
    positive: finite_or_null(sentiment.positive_percentage),
    negative: finite_or_null(sentiment.negative_percentage),
    neutral: finite_or_null(sentiment.neutral_percentage),
    communication: finite_or_null(communication.communication_score),
    clarity: finite_or_null(communication.clarity),
    fluency: finite_or_null(communication.fluency_of_expression),
    structure: finite_or_null(communication.answer_structure),
    logic: finite_or_null(communication.logical_flow),
    articulation: finite_or_null(communication.articulation),
    relevance: finite_or_null(communication.relevance),
    conciseness: finite_or_null(communication.conciseness),
    explanation: finite_or_null(communication.explanation_ability),
    vocabulary: finite_or_null(vocabulary.vocabulary_score),
    technical: finite_or_null(vocabulary.technical_vocabulary),
    grammar: finite_or_null(vocabulary.grammar),
    professional: finite_or_null(vocabulary.professional_language),
    richness: finite_or_null(vocabulary.vocabulary_richness),
    variety: finite_or_null(vocabulary.vocabulary_variety)
  };
  if (!voice.sentiment && voice.communication == null && voice.vocabulary == null) return null;
  return voice;
}

function percentile(values, p) {
  const list = values.filter((value) => Number.isFinite(Number(value))).map(Number).sort((a, b) => a - b);
  if (!list.length) return null;
  return list[Math.min(list.length - 1, Math.floor((p / 100) * list.length))];
}

function iso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function day_key(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sql_time(date) {
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function read_range(query = {}) {
  const now = new Date();
  const end = query.to ? new Date(`${query.to}T23:59:59`) : now;
  if (Number.isNaN(end.getTime())) throw fail("Choose a valid end date");
  let start = null;
  if (query.from) {
    start = new Date(`${query.from}T00:00:00`);
    if (Number.isNaN(start.getTime())) throw fail("Choose a valid start date");
  } else if (query.days && query.days !== "all") {
    const days = Math.min(Math.max(Number(query.days) || 30, 1), 3650);
    start = new Date(end.getTime() - (days - 1) * DAY_MS);
    start.setHours(0, 0, 0, 0);
  } else if (!query.days) {
    start = new Date(end.getTime() - 29 * DAY_MS);
    start.setHours(0, 0, 0, 0);
  }
  if (start && start > end) throw fail("Start date must be before the end date");
  const previous = start ? { start: new Date(start.getTime() - (end.getTime() - start.getTime())), end: start } : null;
  return { start, end, previous };
}

function range_sql(column, range, params) {
  const parts = [];
  if (range.start) {
    parts.push(`${column} >= ?`);
    params.push(sql_time(range.start));
  }
  parts.push(`${column} <= ?`);
  params.push(sql_time(range.end));
  return parts.join(" AND ");
}

function trend_days(range, rows, date_of) {
  const first = range.start || (rows.length ? new Date(Math.min(...rows.map((row) => new Date(date_of(row)).getTime()))) : range.end);
  const start = new Date(first);
  start.setHours(0, 0, 0, 0);
  const days = Math.min(Math.round((range.end.getTime() - start.getTime()) / DAY_MS) + 1, 400);
  const map = new Map();
  for (let index = 0; index < days; index += 1) {
    map.set(day_key(new Date(start.getTime() + index * DAY_MS)), []);
  }
  for (const row of rows) {
    const key = day_key(date_of(row));
    if (map.has(key)) map.get(key).push(row);
  }
  return [...map.entries()];
}

function count_by(items, key_of, limit = 8) {
  const map = new Map();
  for (const item of items) {
    const keys = [].concat(key_of(item)).map((key) => String(key || "").trim()).filter(Boolean);
    for (const key of keys) {
      const label = key.length > 80 ? `${key.slice(0, 77)}…` : key;
      const lower = label.toLowerCase();
      const current = map.get(lower) || { label, count: 0 };
      current.count += 1;
      map.set(lower, current);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function change(current, previous) {
  if (previous == null || !Number.isFinite(previous)) return null;
  if (!previous) return current ? 100 : 0;
  return round(((current - previous) / previous) * 100, 0);
}

export async function table_exists(pool, name) {
  const [rows] = await sqlQuery(
    pool,
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [name]
  );
  return Number(rows?.[0]?.n) > 0;
}

async function student_directory(pool, student_ids) {
  const ids = [...new Set(student_ids.filter(Boolean).map(String))];
  const map = new Map();
  if (!ids.length) return map;
  for (let offset = 0; offset < ids.length; offset += 500) {
    const chunk = ids.slice(offset, offset + 500);
    const marks = chunk.map(() => "?").join(",");
    const [students] = await sqlQuery(
      pool,
      `SELECT student_id, first_name, last_name, email, mobile_number
       FROM tbl_students
       WHERE student_id COLLATE utf8mb4_unicode_ci IN (${marks})`,
      chunk
    );
    for (const row of students || []) {
      map.set(String(row.student_id), {
        student_id: String(row.student_id),
        name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || String(row.student_id),
        email: row.email || "",
        mobile: row.mobile_number || "",
        program_ids: [],
        programs: [],
        course_ids: [],
        itda_id: ""
      });
    }
    const [regs] = await sqlQuery(
      pool,
      `SELECT r.student_id, r.program_id, r.course_id, r.course_student_id, p.program_name
       FROM tbl_course_registrations r
       LEFT JOIN tbl_programs p ON p.program_id = r.program_id
       WHERE r.is_deleted = FALSE AND r.status = 'registered'
         AND r.student_id COLLATE utf8mb4_unicode_ci IN (${marks})`,
      chunk
    ).catch(() => [[]]);
    for (const row of regs || []) {
      const entry = map.get(String(row.student_id));
      if (!entry) continue;
      const program_id = Number(row.program_id) || 0;
      if (program_id && !entry.program_ids.includes(program_id)) {
        entry.program_ids.push(program_id);
        if (row.program_name) entry.programs.push(row.program_name);
      }
      const course_id = Number(row.course_id) || 0;
      if (course_id && !entry.course_ids.includes(course_id)) entry.course_ids.push(course_id);
      if (!entry.itda_id && row.course_student_id) entry.itda_id = String(row.course_student_id);
    }
  }
  return map;
}

function student_of(directory, student_id) {
  return directory.get(String(student_id)) || {
    student_id: String(student_id || ""),
    name: student_id ? String(student_id) : "Unknown",
    email: "",
    mobile: "",
    program_ids: [],
    programs: [],
    course_ids: [],
    itda_id: ""
  };
}

function keep_student(student, query) {
  const allowed = Array.isArray(query.allowed_program_ids) ? query.allowed_program_ids : null;
  const program_id = Number(query.program_id) || 0;
  const program_ids = student.program_ids || [];
  if (allowed) {
    if (program_id && !allowed.includes(program_id)) return false;
    if (program_id) {
      if (!program_ids.includes(program_id)) return false;
    } else if (!program_ids.some((id) => allowed.includes(id))) return false;
  } else if (program_id && !program_ids.includes(program_id)) return false;
  const course_id = Number(query.course_id) || 0;
  if (course_id && !(student.course_ids || []).includes(course_id)) return false;
  const needle = String(query.q || "").trim().toLowerCase();
  if (!needle) return true;
  let digits = needle.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (String(student.email || "").toLowerCase().includes(needle)) return true;
  return digits.length > 0 && digits.length === needle.replace(/[\s+()-]/g, "").length &&
    String(student.mobile || "").replace(/\D/g, "").includes(digits);
}

function public_student(student) {
  return {
    student_id: student.student_id,
    name: student.name,
    email: student.email,
    itda_id: student.itda_id,
    programs: student.programs
  };
}

async function with_program_scope(query = {}, user = {}) {
  const allowed = await visible_program_ids(user);
  if (allowed == null) return query;
  return { ...query, allowed_program_ids: allowed };
}

export async function list_monitor_options(user = {}) {
  const pool = get_pool();
  const allowed = await visible_program_ids(user);
  const [[program_rows], [course_rows]] = await Promise.all([
    sqlQuery(
      pool,
      `SELECT program_id, program_name FROM tbl_programs WHERE is_deleted = FALSE ORDER BY program_name ASC`
    ).catch(() => [[]]),
    sqlQuery(
      pool,
      `SELECT course_id, course_name, course_code, is_open
       FROM tbl_courses
       WHERE is_deleted = FALSE
       ORDER BY course_name ASC`
    ).catch(() => [[]])
  ]);
  const allow = allowed == null ? null : new Set(allowed);
  let courses = (course_rows || []).map((row) => ({
    id: Number(row.course_id),
    name: row.course_name,
    code: row.course_code || "",
    is_open: Boolean(row.is_open)
  }));
  if (allow) {
    if (!allow.size) {
      courses = [];
    } else {
      const marks = [...allow].map(() => "?").join(",");
      const [links] = await sqlQuery(
        pool,
        `SELECT DISTINCT course_id
         FROM tbl_program_courses
         WHERE is_deleted = FALSE AND program_id IN (${marks})`,
        [...allow]
      ).catch(() => [[]]);
      const course_ids = new Set((links || []).map((row) => Number(row.course_id)));
      courses = courses.filter((course) => course_ids.has(course.id));
    }
  }
  return {
    programs: (program_rows || []).
      map((row) => ({ id: Number(row.program_id), name: row.program_name })).
      filter((program) => !allow || allow.has(program.id)),
    courses
  };
}

/* ---------- Mock interviews ---------- */

export function mock_row(row) {
  const analysis = read_json(row.analysis_json) || {};
  const answers = as_list(read_json(row.answers_json));
  const performance = read_json(row.performance_json) || {};
  const session = read_json(row.session_json) || {};
  const answered = answers.length;
  const scores = answers.map((item) => Number(item?.evaluation?.score)).filter(Number.isFinite);
  const overall = Number(performance.overall_score);
  const score = answered && Number.isFinite(overall) ? overall : scores.length ? average(scores) : null;
  const started = performance.started_at ? new Date(performance.started_at) : new Date(row.created_at);
  const finished = performance.finished_at ? new Date(performance.finished_at) : row.updated_at ? new Date(row.updated_at) : null;
  const minutes = finished && !Number.isNaN(finished.getTime()) && !Number.isNaN(started.getTime()) ?
    Math.max(0, (finished.getTime() - started.getTime()) / 60000) :
    null;
  return {
    mock_interview_id: Number(row.mock_interview_id),
    student_id: String(row.student_id),
    source: row.role_source || "",
    source_label: SOURCE_LABEL[row.role_source] || row.role_source || "",
    status: row.status || "",
    target_role: String(analysis.target_role || session.target_role || performance.target_role || "").trim(),
    match_score: Number.isFinite(Number(analysis.overall_match_score)) ? Number(analysis.overall_match_score) : null,
    answered,
    total_questions: Number(row.total_questions) || Number(session.total_questions) || null,
    score: score == null ? null : round(score, 2),
    minutes: minutes == null ? null : round(minutes, 1),
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at || row.created_at),
    topics: answers.map((item) => ({ topic: item?.question?.topic || "", score: Number(item?.evaluation?.score) })),
    gaps: as_list(performance.gaps),
    voice: voice_of(performance)
  };
}

async function load_mock_rows(pool, range) {
  if (!await table_exists(pool, "tbl_student_mock_interviews")) return [];
  const params = [];
  const where = range_sql("created_at", range, params);
  const [rows] = await sqlQuery(
    pool,
    `SELECT mock_interview_id, student_id, role_source, status, total_questions, analysis_json,
            answers_json, performance_json, session_json, created_at, updated_at
     FROM tbl_student_mock_interviews
     WHERE ${where}
     ORDER BY mock_interview_id DESC
     LIMIT 20000`,
    params
  );
  return (rows || []).map(mock_row);
}

async function count_previous(pool, table, column, range) {
  if (!range.previous) return null;
  const [rows] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS n, COUNT(DISTINCT student_id) AS s FROM ${table} WHERE ${column} >= ? AND ${column} < ?`,
    [sql_time(range.previous.start), sql_time(range.previous.end)]
  );
  return { count: Number(rows?.[0]?.n) || 0, students: Number(rows?.[0]?.s) || 0 };
}

function mean_bar(voices, key, label) {
  const avg = average(voices.map((item) => item[key]));
  return { label, avg: round(avg, 1), count: voices.filter((item) => item[key] != null).length };
}

function sentiment_report(rows) {
  const voices = rows.map((row) => row.voice).filter(Boolean);
  const mix = new Map();
  for (const voice of voices) {
    if (voice.sentiment) mix.set(voice.sentiment, (mix.get(voice.sentiment) || 0) + 1);
  }
  const label_of = (value) => value.charAt(0).toUpperCase() + value.slice(1);
  return {
    analysed: voices.length,
    sentiment_mix: [...mix.entries()].map(([label, count]) => ({ label: label_of(label), count })).sort((a, b) => b.count - a.count),
    tone: [
      { label: "Positive answers", avg: round(average(voices.map((item) => item.positive)), 0) },
      { label: "Neutral answers", avg: round(average(voices.map((item) => item.neutral)), 0) },
      { label: "Negative answers", avg: round(average(voices.map((item) => item.negative)), 0) }
    ].filter((item) => item.avg != null),
    communication: [
      mean_bar(voices, "communication", "Overall"),
      mean_bar(voices, "clarity", "Clarity"),
      mean_bar(voices, "fluency", "Fluency"),
      mean_bar(voices, "structure", "Structure"),
      mean_bar(voices, "logic", "Logical flow"),
      mean_bar(voices, "articulation", "Articulation"),
      mean_bar(voices, "relevance", "Relevance"),
      mean_bar(voices, "conciseness", "Conciseness"),
      mean_bar(voices, "explanation", "Explanation")
    ].filter((item) => item.avg != null),
    vocabulary: [
      mean_bar(voices, "vocabulary", "Overall"),
      mean_bar(voices, "technical", "Technical terms"),
      mean_bar(voices, "grammar", "Grammar"),
      mean_bar(voices, "professional", "Professional language"),
      mean_bar(voices, "richness", "Richness"),
      mean_bar(voices, "variety", "Variety")
    ].filter((item) => item.avg != null)
  };
}

export async function mock_interview_report(query = {}, user = {}) {
  query = await with_program_scope(query, user);
  const pool = get_pool();
  const range = read_range(query);
  const all = await load_mock_rows(pool, range);
  const directory = await student_directory(pool, all.map((row) => row.student_id));
  const rows = all
    .map((row) => ({ ...row, student: student_of(directory, row.student_id) }))
    .filter((row) => keep_student(row.student, query));
  const previous = query.allowed_program_ids || query.program_id || query.course_id || query.q ? null : await count_previous(pool, "tbl_student_mock_interviews", "created_at", range).catch(() => null);

  const completed = rows.filter((row) => row.status === "completed");
  const scored = rows.filter((row) => row.score != null && row.answered > 0);
  const students = new Set(rows.map((row) => row.student_id));
  const stale_cutoff = Date.now() - DAY_MS;

  const per_student = new Map();
  for (const row of rows) {
    const current = per_student.get(row.student_id) || { student: row.student, sessions: 0, completed: 0, scores: [], last: "", answered: 0 };
    current.sessions += 1;
    if (row.status === "completed") current.completed += 1;
    if (row.score != null && row.answered > 0) current.scores.push(row.score);
    current.answered += row.answered;
    if (!current.last || row.created_at > current.last) current.last = row.created_at;
    per_student.set(row.student_id, current);
  }
  const people = [...per_student.values()].map((entry) => ({
    ...public_student(entry.student),
    sessions: entry.sessions,
    completed: entry.completed,
    answered: entry.answered,
    best_score: entry.scores.length ? round(Math.max(...entry.scores), 2) : null,
    avg_score: entry.scores.length ? round(average(entry.scores), 2) : null,
    last_active: entry.last
  }));

  const topic_map = new Map();
  for (const row of rows) {
    for (const item of row.topics) {
      if (!item.topic || !Number.isFinite(item.score)) continue;
      const current = topic_map.get(item.topic) || { label: item.topic, scores: [] };
      current.scores.push(item.score);
      topic_map.set(item.topic, current);
    }
  }
  const topics = [...topic_map.values()]
    .map((entry) => ({ label: entry.label, count: entry.scores.length, avg_score: round(average(entry.scores), 2) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const buckets = [
    { label: "0–2", min: 0, max: 2 },
    { label: "2–4", min: 2, max: 4 },
    { label: "4–6", min: 4, max: 6 },
    { label: "6–8", min: 6, max: 8 },
    { label: "8–10", min: 8, max: 10.01 }
  ].map((bucket) => ({ label: bucket.label, count: scored.filter((row) => row.score >= bucket.min && row.score < bucket.max).length }));

  const role_map = new Map();
  for (const row of rows) {
    if (!row.target_role) continue;
    const key = row.target_role.toLowerCase();
    const current = role_map.get(key) || { label: row.target_role, count: 0, scores: [] };
    current.count += 1;
    if (row.score != null && row.answered > 0) current.scores.push(row.score);
    role_map.set(key, current);
  }

  return {
    range: { from: range.start ? day_key(range.start) : "", to: day_key(range.end) },
    summary: {
      sessions: rows.length,
      students: students.size,
      completed: completed.length,
      completion_rate: rows.length ? round((completed.length / rows.length) * 100, 0) : 0,
      avg_score: round(average(scored.map((row) => row.score)), 2),
      scored: scored.length,
      avg_answered: round(average(rows.map((row) => row.answered)), 1),
      avg_minutes: round(average(completed.map((row) => row.minutes)), 1),
      in_progress: rows.filter((row) => row.status !== "completed").length,
      stalled: rows.filter((row) => row.status !== "completed" && new Date(row.updated_at).getTime() < stale_cutoff).length,
      sessions_change: previous ? change(rows.length, previous.count) : null,
      students_change: previous ? change(students.size, previous.students) : null
    },
    trend: trend_days(range, rows, (row) => row.created_at).map(([day, list]) => ({
      day,
      count: list.length,
      completed: list.filter((row) => row.status === "completed").length
    })),
    score_buckets: buckets,
    sources: count_by(rows, (row) => row.source_label, 6),
    roles: [...role_map.values()]
      .map((entry) => ({ label: entry.label, count: entry.count, avg_score: round(average(entry.scores), 2) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topics,
    weak_topics: [...topics].filter((item) => item.avg_score != null).sort((a, b) => a.avg_score - b.avg_score).slice(0, 5),
    top_students: people.filter((item) => item.best_score != null).sort((a, b) => b.best_score - a.best_score || b.sessions - a.sessions).slice(0, 8),
    attention: people
      .filter((item) => (item.avg_score != null && item.avg_score < 4) || !item.completed)
      .sort((a, b) => (a.avg_score ?? -1) - (b.avg_score ?? -1))
      .slice(0, 8)
      .map((item) => ({ ...item, reason: !item.completed ? "Never finished an interview" : `Career readiness ${item.avg_score}/10` })),
    sentiment: sentiment_report(rows),
    rows: rows.slice(0, ROW_LIMIT).map(({ topics: _topics, gaps: _gaps, voice: _voice, student, ...row }) => ({ ...row, student: public_student(student) })),
    total_rows: rows.length
  };
}

export async function mock_interview_detail(id) {
  const pool = get_pool();
  const interview_id = Number(id);
  if (!Number.isInteger(interview_id) || interview_id < 1) throw fail("Interview not found", 404);
  const [rows] = await sqlQuery(
    pool,
    `SELECT mock_interview_id, student_id, job_id, role_source, file_name, status, total_questions,
            analysis_json, answers_json, performance_json, session_json, created_at, updated_at
     FROM tbl_student_mock_interviews WHERE mock_interview_id = ? LIMIT 1`,
    [interview_id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Interview not found", 404);
  const base = mock_row(row);
  const analysis = read_json(row.analysis_json) || {};
  const performance = read_json(row.performance_json) || {};
  const session = read_json(row.session_json) || {};
  const directory = await student_directory(pool, [row.student_id]);
  const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
  const text = (value) => (typeof value === "string" ? value : value?.question || "");
  const stored = as_list(read_json(row.answers_json));
  const turns = as_list(performance.turns);
  const source = stored.length ? stored : turns;
  const transcript = source.map((item, index) => {
    const evaluation = item?.evaluation || item || {};
    const question = item?.question && typeof item.question === "object" ? item.question : {};
    return {
      number: index + 1,
      topic: question.topic || item?.topic || "",
      difficulty: question.difficulty || item?.difficulty || "",
      type: question.question_type || item?.question_type || "",
      question: text(item?.question),
      expected: as_list(question.expected_areas || item?.expected_areas),
      answer: String(item?.answer || ""),
      answered: Boolean(String(item?.answer || "").trim()),
      score: num(evaluation.score),
      correctness: evaluation.correctness || "",
      feedback: evaluation.feedback || "",
      strengths: as_list(evaluation.strengths),
      gaps: as_list(evaluation.gaps),
      follow_up: Boolean(evaluation.follow_up_required)
    };
  });
  const pending = session.question && typeof session.question === "object" ? session.question : null;
  if (pending?.question && !transcript.some((item) => item.question === pending.question)) {
    transcript.push({
      number: transcript.length + 1,
      topic: pending.topic || "",
      difficulty: pending.difficulty || "",
      type: pending.question_type || "",
      question: pending.question,
      expected: as_list(pending.expected_areas),
      answer: "",
      answered: false,
      score: null,
      correctness: "",
      feedback: "",
      strengths: [],
      gaps: [],
      follow_up: false
    });
  }
  const topic_scores = new Map(as_list(performance.topic_performance).map((item) => [String(item?.topic || "").toLowerCase(), item]));
  const planned = as_list(session.topics).length ?
    as_list(session.topics) :
    [...new Map(transcript.filter((item) => item.topic).map((item) => [item.topic.toLowerCase(), { name: item.topic, difficulty: item.difficulty }])).values()];
  const plan = planned.map((topic) => {
    const name = String(topic?.name || "");
    const asked = transcript.filter((item) => item.topic.toLowerCase() === name.toLowerCase());
    const scored = asked.map((item) => item.score).filter((value) => value != null);
    const perf = topic_scores.get(name.toLowerCase());
    return {
      name,
      difficulty: topic?.difficulty || "",
      target: Number(topic?.questions_target) || null,
      asked: asked.length,
      answered: asked.filter((item) => item.answered).length,
      avg_score: scored.length ? round(average(scored), 1) : num(perf?.average_score) || null,
      status: perf?.status || (asked.length ? "in_progress" : "not_started")
    };
  });
  return {
    ...base,
    student: public_student(student_of(directory, row.student_id)),
    file_name: row.file_name || "",
    analysis: {
      matched_skills: as_list(analysis.matched_skills),
      missing_skills: as_list(analysis.missing_skills),
      strengths_for_role: as_list(analysis.strengths_for_role),
      gaps: as_list(analysis.gaps),
      skills_match_score: analysis.skills_match_score ?? null,
      experience_match_score: analysis.experience_match_score ?? null,
      keyword_coverage_score: analysis.keyword_coverage_score ?? null,
      total_experience: analysis.total_experience || ""
    },
    candidate_name: analysis.candidate_name || performance.candidate_name || "",
    performance: {
      strengths: as_list(performance.strengths),
      gaps: as_list(performance.gaps),
      recommendations: as_list(performance.recommendations),
      topics_covered: as_list(performance.topics_covered),
      llm_analysis: performance.llm_analysis && typeof performance.llm_analysis === "object" ? performance.llm_analysis : null
    },
    plan,
    transcript
  };
}

/* ---------- Resume analyser ---------- */

export function resume_row(row) {
  const analysis = read_json(row.analysis_json) || {};
  const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
  return {
    analysis_id: Number(row.analysis_id),
    student_id: String(row.student_id),
    file_name: row.file_name || "",
    overall_score: num(row.overall_score ?? analysis.overall_score),
    impact_score: num(analysis.impact_score),
    clarity_score: num(analysis.clarity_score),
    completeness_score: num(analysis.completeness_score),
    target_role: String(analysis.target_role || "").trim(),
    experience: String(analysis.total_experience || "").trim(),
    saved_to_profile: Boolean(row.resume_url),
    created_at: iso(row.created_at),
    missing_sections: as_list(analysis.missing_resume_sections),
    skills: [...as_list(analysis.technical_skills), ...as_list(analysis.skills)]
  };
}

export async function resume_report(query = {}, user = {}) {
  query = await with_program_scope(query, user);
  const pool = get_pool();
  const range = read_range(query);
  let all = [];
  if (await table_exists(pool, "tbl_student_resume_analysis")) {
    const params = [];
    const where = range_sql("created_at", range, params);
    const [rows] = await sqlQuery(
      pool,
      `SELECT analysis_id, student_id, file_name, analysis_json, overall_score, resume_url, created_at
       FROM tbl_student_resume_analysis
       WHERE ${where}
       ORDER BY analysis_id DESC
       LIMIT 20000`,
      params
    );
    all = (rows || []).map(resume_row);
  }
  const directory = await student_directory(pool, all.map((row) => row.student_id));
  const rows = all
    .map((row) => ({ ...row, student: student_of(directory, row.student_id) }))
    .filter((row) => keep_student(row.student, query));
  const previous = query.allowed_program_ids || query.program_id || query.course_id || query.q ? null : await count_previous(pool, "tbl_student_resume_analysis", "created_at", range).catch(() => null);
  const students = new Set(rows.map((row) => row.student_id));

  const per_student = new Map();
  for (const row of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const current = per_student.get(row.student_id) || { student: row.student, list: [] };
    current.list.push(row);
    per_student.set(row.student_id, current);
  }
  const people = [...per_student.values()].map((entry) => {
    const first = entry.list[0];
    const latest = entry.list[entry.list.length - 1];
    const best = Math.max(...entry.list.map((row) => row.overall_score ?? -1));
    return {
      ...public_student(entry.student),
      attempts: entry.list.length,
      first_score: first.overall_score,
      latest_score: latest.overall_score,
      best_score: best < 0 ? null : best,
      improvement: entry.list.length > 1 && first.overall_score != null && latest.overall_score != null ?
        round(latest.overall_score - first.overall_score, 1) :
        null,
      saved_to_profile: entry.list.some((row) => row.saved_to_profile),
      last_active: latest.created_at
    };
  });
  const repeaters = people.filter((item) => item.improvement != null);

  const buckets = [0, 20, 40, 60, 80].map((min) => ({
    label: `${min}–${min + 20}`,
    count: rows.filter((row) => row.overall_score != null && row.overall_score >= min && row.overall_score < (min === 80 ? 100.01 : min + 20)).length
  }));

  return {
    range: { from: range.start ? day_key(range.start) : "", to: day_key(range.end) },
    summary: {
      analyses: rows.length,
      students: students.size,
      avg_score: round(average(rows.map((row) => row.overall_score)), 1),
      avg_impact: round(average(rows.map((row) => row.impact_score)), 1),
      avg_clarity: round(average(rows.map((row) => row.clarity_score)), 1),
      avg_completeness: round(average(rows.map((row) => row.completeness_score)), 1),
      saved_rate: people.length ? round((people.filter((item) => item.saved_to_profile).length / people.length) * 100, 0) : 0,
      job_ready: people.filter((item) => (item.latest_score ?? 0) >= 70).length,
      improved: repeaters.filter((item) => item.improvement > 0).length,
      avg_improvement: round(average(repeaters.map((item) => item.improvement)), 1),
      analyses_change: previous ? change(rows.length, previous.count) : null,
      students_change: previous ? change(students.size, previous.students) : null
    },
    trend: trend_days(range, rows, (row) => row.created_at).map(([day, list]) => ({
      day,
      count: list.length,
      avg_score: round(average(list.map((row) => row.overall_score)), 1)
    })),
    score_buckets: buckets,
    missing_sections: count_by(rows, (row) => row.missing_sections, 8),
    skills: count_by(rows, (row) => row.skills, 10),
    roles: count_by(rows, (row) => row.target_role, 8),
    top_improvers: repeaters.filter((item) => item.improvement > 0).sort((a, b) => b.improvement - a.improvement).slice(0, 8),
    top_students: people.filter((item) => item.best_score != null).sort((a, b) => b.best_score - a.best_score).slice(0, 8),
    attention: people
      .filter((item) => item.latest_score != null && item.latest_score < 50)
      .sort((a, b) => a.latest_score - b.latest_score)
      .slice(0, 8)
      .map((item) => ({ ...item, reason: `Latest score ${item.latest_score}/100` })),
    rows: rows.slice(0, ROW_LIMIT).map(({ missing_sections: _m, skills: _s, student, ...row }) => ({ ...row, student: public_student(student) })),
    total_rows: rows.length
  };
}

export async function resume_detail(id) {
  const pool = get_pool();
  const analysis_id = Number(id);
  if (!Number.isInteger(analysis_id) || analysis_id < 1) throw fail("Analysis not found", 404);
  const [rows] = await sqlQuery(
    pool,
    `SELECT analysis_id, student_id, file_name, analysis_json, overall_score, resume_url, created_at
     FROM tbl_student_resume_analysis WHERE analysis_id = ? LIMIT 1`,
    [analysis_id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Analysis not found", 404);
  const analysis = read_json(row.analysis_json) || {};
  const directory = await student_directory(pool, [row.student_id]);
  const [history] = await sqlQuery(
    pool,
    `SELECT analysis_id, overall_score, created_at FROM tbl_student_resume_analysis
     WHERE student_id = ? ORDER BY analysis_id ASC LIMIT 50`,
    [row.student_id]
  );
  return {
    ...resume_row(row),
    student: public_student(student_of(directory, row.student_id)),
    resume_url: row.resume_url || "",
    summary: analysis.professional_summary || "",
    feedback: analysis.feedback || "",
    strengths: as_list(analysis.strengths),
    improvements: as_list(analysis.areas_for_improvement),
    recommendations: as_list(analysis.recommendations),
    technical_skills: as_list(analysis.technical_skills),
    soft_skills: as_list(analysis.soft_skills),
    education: as_list(analysis.education),
    projects: as_list(analysis.projects),
    certifications: as_list(analysis.certifications),
    history: (history || []).map((item) => ({
      analysis_id: Number(item.analysis_id),
      overall_score: item.overall_score == null ? null : Number(item.overall_score),
      created_at: iso(item.created_at)
    }))
  };
}

/* ---------- Chatbot usage ---------- */

export async function chatbot_report(query = {}, user = {}) {
  query = await with_program_scope(query, user);
  await ensure_ai_monitor_schema();
  const pool = get_pool();
  const range = read_range(query);
  const params = [];
  const where = range_sql("created_at", range, params);
  const [raw] = await sqlQuery(
    pool,
    `SELECT chat_log_id, student_id, user_role, course_name, topic, question, answer_chars, history_turns,
            fast_mode, first_token_ms, total_ms, status, created_at
     FROM tbl_ai_chat_logs
     WHERE ${where}
     ORDER BY chat_log_id DESC
     LIMIT 50000`,
    params
  );
  const all = (raw || []).map((row) => ({
    chat_log_id: Number(row.chat_log_id),
    student_id: row.student_id ? String(row.student_id) : "",
    user_role: row.user_role || "",
    course_name: row.course_name || "",
    topic: row.topic || "",
    question: String(row.question || "").slice(0, 300),
    answer_chars: Number(row.answer_chars) || 0,
    history_turns: Number(row.history_turns) || 0,
    fast_mode: Boolean(row.fast_mode),
    first_token_ms: row.first_token_ms == null ? null : Number(row.first_token_ms),
    total_ms: row.total_ms == null ? null : Number(row.total_ms),
    status: row.status || "ok",
    created_at: iso(row.created_at)
  }));
  const directory = await student_directory(pool, all.map((row) => row.student_id));
  const rows = all
    .map((row) => ({ ...row, student: student_of(directory, row.student_id) }))
    .filter((row) => (row.student_id ? keep_student(row.student, query) : !query.allowed_program_ids && !query.program_id && !query.course_id && !query.q));
  const previous = query.allowed_program_ids || query.program_id || query.course_id || query.q ? null : await count_previous(pool, "tbl_ai_chat_logs", "created_at", range).catch(() => null);

  const students = new Set(rows.map((row) => row.student_id).filter(Boolean));
  const ok = rows.filter((row) => row.status === "ok");
  const per_student = new Map();
  for (const row of rows) {
    if (!row.student_id) continue;
    const current = per_student.get(row.student_id) || { student: row.student, questions: 0, courses: new Set(), last: "" };
    current.questions += 1;
    if (row.course_name) current.courses.add(row.course_name);
    if (!current.last || row.created_at > current.last) current.last = row.created_at;
    per_student.set(row.student_id, current);
  }
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => ({ label, count: 0 }));
  for (const row of rows) {
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) continue;
    hours[date.getHours()].count += 1;
    weekdays[date.getDay()].count += 1;
  }
  const first_log = await sqlQuery(pool, "SELECT MIN(created_at) AS first FROM tbl_ai_chat_logs").then(([r]) => iso(r?.[0]?.first)).catch(() => "");

  return {
    range: { from: range.start ? day_key(range.start) : "", to: day_key(range.end) },
    tracking_since: first_log,
    summary: {
      questions: rows.length,
      students: students.size,
      per_student: students.size ? round(rows.filter((row) => row.student_id).length / students.size, 1) : 0,
      avg_first_token_s: round((average(ok.map((row) => row.first_token_ms)) ?? 0) / 1000, 2),
      avg_total_s: round((average(ok.map((row) => row.total_ms)) ?? 0) / 1000, 1),
      p90_total_s: round((percentile(ok.map((row) => row.total_ms), 90) ?? 0) / 1000, 1),
      error_rate: rows.length ? round((rows.filter((row) => row.status === "error").length / rows.length) * 100, 1) : 0,
      aborted_rate: rows.length ? round((rows.filter((row) => row.status === "aborted").length / rows.length) * 100, 1) : 0,
      fast_rate: rows.length ? round((rows.filter((row) => row.fast_mode).length / rows.length) * 100, 0) : 0,
      follow_up_rate: rows.length ? round((rows.filter((row) => row.history_turns > 0).length / rows.length) * 100, 0) : 0,
      avg_answer_chars: round(average(ok.map((row) => row.answer_chars)), 0),
      questions_change: previous ? change(rows.length, previous.count) : null,
      students_change: previous ? change(students.size, previous.students) : null
    },
    trend: trend_days(range, rows, (row) => row.created_at).map(([day, list]) => ({
      day,
      count: list.length,
      errors: list.filter((row) => row.status === "error").length
    })),
    hours,
    weekdays,
    courses: count_by(rows, (row) => row.course_name, 8),
    topics: count_by(rows, (row) => row.topic, 10),
    top_students: [...per_student.values()]
      .map((entry) => ({ ...public_student(entry.student), questions: entry.questions, courses: entry.courses.size, last_active: entry.last }))
      .sort((a, b) => b.questions - a.questions)
      .slice(0, 8),
    rows: rows.slice(0, ROW_LIMIT).map(({ student, ...row }) => ({ ...row, student: public_student(student) })),
    total_rows: rows.length
  };
}

export async function chatbot_detail(id) {
  await ensure_ai_monitor_schema();
  const pool = get_pool();
  const log_id = Number(id);
  if (!Number.isInteger(log_id) || log_id < 1) throw fail("Chat not found", 404);
  const [rows] = await sqlQuery(pool, "SELECT * FROM tbl_ai_chat_logs WHERE chat_log_id = ? LIMIT 1", [log_id]);
  const row = rows?.[0];
  if (!row) throw fail("Chat not found", 404);
  const directory = await student_directory(pool, [row.student_id]);
  const [recent] = row.student_id ?
    await sqlQuery(
      pool,
      `SELECT chat_log_id, question, course_name, topic, created_at FROM tbl_ai_chat_logs
       WHERE student_id = ? AND chat_log_id <> ? ORDER BY chat_log_id DESC LIMIT 10`,
      [row.student_id, log_id]
    ) :
    [[]];
  return {
    chat_log_id: Number(row.chat_log_id),
    student: row.student_id ? public_student(student_of(directory, row.student_id)) : null,
    user_role: row.user_role,
    course_name: row.course_name || "",
    topic: row.topic || "",
    question: row.question || "",
    answer_preview: row.answer_preview || "",
    answer_chars: Number(row.answer_chars) || 0,
    history_turns: Number(row.history_turns) || 0,
    fast_mode: Boolean(row.fast_mode),
    first_token_ms: row.first_token_ms == null ? null : Number(row.first_token_ms),
    total_ms: row.total_ms == null ? null : Number(row.total_ms),
    status: row.status,
    error_text: row.error_text || "",
    created_at: iso(row.created_at),
    recent: (recent || []).map((item) => ({
      chat_log_id: Number(item.chat_log_id),
      question: String(item.question || "").slice(0, 200),
      course_name: item.course_name || "",
      topic: item.topic || "",
      created_at: iso(item.created_at)
    }))
  };
}

function public_certificate(item) {
  if (!item) return null;
  return {
    certificate_id: item.certificate_id,
    certificate_name: item.certificate_name || ""
  };
}

export async function mock_interview_certificate() {
  const { ensure_certificate_schema } = await import("../certificate_manager/schema.js");
  const { find_assigned_certificate, list_certificates } = await import("../certificate_manager/certificate_service.js");
  await ensure_certificate_schema();
  const listed = await list_certificates();
  const assigned = await find_assigned_certificate("mock_interview");
  return {
    items: (listed.items || []).map(public_certificate).filter(Boolean),
    assigned_id: assigned?.certificate_id || ""
  };
}

export async function save_mock_interview_certificate(body = {}) {
  const { ensure_certificate_schema } = await import("../certificate_manager/schema.js");
  const { assign_certificate_for } = await import("../certificate_manager/certificate_service.js");
  await ensure_certificate_schema();
  const saved = await assign_certificate_for("mock_interview", body.certificate_id);
  return {
    assigned_id: saved.item?.certificate_id || "",
    item: public_certificate(saved.item)
  };
}
