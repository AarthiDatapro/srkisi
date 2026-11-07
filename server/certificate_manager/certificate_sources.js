import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "../utils/db_setup.js";

/**
 * Certificate value sources — one file for picker groups + SQL loaders.
 *
 * Types: student, course, hackathon, mock_interview, program, manual
 * Values: only the fields listed under VALUE_SOURCES
 * Rules: load the specific entity the certificate is for (ids in load_issue_context)
 */

export const VALUE_SOURCES = [
  {
    id: "student",
    label: "Students",
    table: "tbl_students",
    fields: [
      { id: "student.name", label: "Name" },
      { id: "student.college", label: "College" },
      { id: "student.higher_study", label: "Higher study" },
      { id: "student.state", label: "State" },
      { id: "student.pincode", label: "Pincode" },
      { id: "student.district", label: "District" },
      { id: "student.degree", label: "Degree" }
    ]
  },
  {
    id: "course",
    label: "Courses",
    table: "tbl_courses",
    fields: [
      { id: "course.course_name", label: "Course name" },
      { id: "course.course_code", label: "Course code" },
      { id: "course.level", label: "Level" },
      { id: "course.course_tagline", label: "Course tagline" }
    ]
  },
  {
    id: "hackathon",
    label: "Hackathons",
    table: "tbl_hackathons",
    fields: [
      { id: "hackathon.title", label: "Hackathon title" },
      { id: "hackathon.description", label: "Description" },
      { id: "hackathon.starts_at", label: "Starts at" },
      { id: "hackathon.ends_at", label: "Ends at" }
    ]
  },
  {
    id: "mock_interview",
    label: "Mock interviews",
    table: "tbl_student_mock_interviews",
    fields: [
      { id: "mock_interview.job_title", label: "Job title" },
      { id: "mock_interview.score", label: "Score" },
      { id: "mock_interview.sentiment_analysis_score", label: "Sentiment analysis score" },
      { id: "mock_interview.technical_score", label: "Technical score" }
    ]
  },
  {
    id: "program",
    label: "Programs",
    table: "tbl_programs",
    fields: [
      { id: "program.program_name", label: "Program name" },
      { id: "program.duration_months", label: "Duration months" },
      { id: "program.start_date", label: "Start date" },
      { id: "program.end_date", label: "End date" }
    ]
  }
];

const SOURCE_IDS = new Set([
  ...VALUE_SOURCES.flatMap((group) => group.fields.map((field) => field.id)),
  "issued.date"
]);
const TYPE_IDS = new Set([...VALUE_SOURCES.map((group) => group.id), "manual"]);

export function known_type(value) {
  return TYPE_IDS.has(String(value || "").trim()) ? String(value).trim() : "";
}

export function list_value_sources() {
  return { groups: VALUE_SOURCES };
}

export function known_source(value) {
  return SOURCE_IDS.has(String(value || "").trim()) ? String(value).trim() : "";
}

function pretty(value) {
  if (value == null || value === "") return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text.includes("T") ? text : text.replace(" ", "T"));
    if (!Number.isNaN(date.getTime())) {
      const with_time = text.length > 10;
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...(with_time ? { hour: "2-digit", minute: "2-digit" } : {})
      });
    }
  }
  return text;
}

function pick(row, column) {
  if (!row) return "";
  return pretty(row[column]);
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

function score_of(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function average_scores(values) {
  const list = values.filter((value) => value != null);
  if (!list.length) return null;
  return Math.round((list.reduce((sum, value) => sum + value, 0) / list.length) * 10) / 10;
}

/** Students: find by student_id in tbl_students. */
async function load_student(pool, student_id) {
  if (!student_id) return null;
  try {
    const [rows] = await sqlQuery(
      pool,
      `SELECT first_name, last_name, college, higher_study, state, pincode, district, degree
       FROM tbl_students
       WHERE student_id COLLATE utf8mb4_unicode_ci = ? AND is_deleted = FALSE
       LIMIT 1`,
      [student_id]
    );
    const row = rows?.[0];
    if (!row) return null;
    return {
      name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
      college: row.college || "",
      higher_study: row.higher_study || "",
      state: row.state || "",
      pincode: row.pincode || "",
      district: row.district || "",
      degree: row.degree || ""
    };
  } catch {
    const [rows] = await sqlQuery(
      pool,
      `SELECT first_name, last_name
       FROM tbl_students
       WHERE student_id COLLATE utf8mb4_unicode_ci = ? AND is_deleted = FALSE
       LIMIT 1`,
      [student_id]
    );
    const row = rows?.[0];
    if (!row) return null;
    return {
      name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim(),
      college: "",
      higher_study: "",
      state: "",
      pincode: "",
      district: "",
      degree: ""
    };
  }
}

/** Courses: only the course this certificate is for. */
async function load_course(pool, course_id) {
  const id = Number(course_id);
  if (!Number.isInteger(id) || id < 1) return null;
  try {
    const [rows] = await sqlQuery(
      pool,
      `SELECT course_name, course_code, level, course_tagline
       FROM tbl_courses
       WHERE course_id = ? AND is_deleted = FALSE
       LIMIT 1`,
      [id]
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

/** Hackathons: only the hackathon this certificate is for. */
async function load_hackathon(pool, hackathon_id) {
  const id = Number(hackathon_id);
  if (!Number.isInteger(id) || id < 1) return null;
  try {
    const [rows] = await sqlQuery(
      pool,
      `SELECT title, description,
              DATE_FORMAT(starts_at, '%Y-%m-%d %H:%i') AS starts_at,
              DATE_FORMAT(ends_at, '%Y-%m-%d %H:%i') AS ends_at
       FROM tbl_hackathons
       WHERE hackathon_id = ? AND is_deleted = FALSE
       LIMIT 1`,
      [id]
    );
    return rows?.[0] || null;
  } catch {
    const [rows] = await sqlQuery(
      pool,
      `SELECT title,
              DATE_FORMAT(starts_at, '%Y-%m-%d %H:%i') AS starts_at,
              DATE_FORMAT(ends_at, '%Y-%m-%d %H:%i') AS ends_at
       FROM tbl_hackathons
       WHERE hackathon_id = ? AND is_deleted = FALSE
       LIMIT 1`,
      [id]
    );
    const row = rows?.[0];
    return row ? { ...row, description: "" } : null;
  }
}

/** Programs: only the program this certificate is for. */
async function load_program(pool, program_id) {
  const id = Number(program_id);
  if (!Number.isInteger(id) || id < 1) return null;
  try {
    const [rows] = await sqlQuery(
      pool,
      `SELECT program_name, duration_months,
              DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
       FROM tbl_programs
       WHERE program_id = ? AND is_deleted = FALSE
       LIMIT 1`,
      [id]
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

function mock_interview_scores(performance, answers_json) {
  const llm = performance?.llm_analysis && typeof performance.llm_analysis === "object" ?
    performance.llm_analysis :
    {};
  const communication = llm.communication_analysis && typeof llm.communication_analysis === "object" ?
    llm.communication_analysis :
    {};
  const sentiment = llm.sentiment_analysis && typeof llm.sentiment_analysis === "object" ?
    llm.sentiment_analysis :
    {};

  const score = score_of(performance?.overall_score);

  const sentiment_analysis_score =
    score_of(communication.communication_score) ??
    score_of(sentiment.positive_percentage) ??
    score_of(sentiment.sentiment_score) ??
    null;

  const answers = Array.isArray(answers_json) ? answers_json : [];
  const technical_from_answers = average_scores(
    answers
      .filter((entry) => {
        const type = String(entry?.question?.question_type || entry?.question_type || "").toLowerCase();
        return type.includes("technical") || type.includes("tech");
      })
      .map((entry) => score_of(entry?.evaluation?.score ?? entry?.score))
  );
  const technical_score =
    score_of(performance?.technical_score) ??
    technical_from_answers ??
    score;

  return {
    score: score == null ? "" : score,
    sentiment_analysis_score: sentiment_analysis_score == null ? "" : sentiment_analysis_score,
    technical_score: technical_score == null ? "" : technical_score
  };
}

/** Mock interviews: only the interview this certificate is for. */
async function load_mock_interview(pool, student_id, mock_interview_id) {
  if (!student_id) return null;
  const id = Number(mock_interview_id);
  if (!Number.isInteger(id) || id < 1) return null;
  try {
    const [rows] = await sqlQuery(
      pool,
      `SELECT m.job_id, m.role_source, m.performance_json, m.analysis_json, m.session_json, m.answers_json,
              j.job_title
       FROM tbl_student_mock_interviews m
       LEFT JOIN tbl_jobs j ON j.job_id = m.job_id
       WHERE m.student_id COLLATE utf8mb4_unicode_ci = ?
         AND m.mock_interview_id = ?
       LIMIT 1`,
      [student_id, id]
    );
    const row = rows?.[0];
    if (!row) return null;
    const performance = read_json(row.performance_json);
    const analysis = read_json(row.analysis_json);
    const session = read_json(row.session_json);
    const answers = read_json(row.answers_json);
    const scores = mock_interview_scores(performance, answers);
    const job_title = String(
      row.job_title ||
      analysis?.target_role ||
      session?.target_role ||
      performance?.target_role ||
      ""
    ).trim();
    return {
      job_title,
      score: scores.score,
      sentiment_analysis_score: scores.sentiment_analysis_score,
      technical_score: scores.technical_score
    };
  } catch {
    try {
      const [rows] = await sqlQuery(
        pool,
        `SELECT performance_json, analysis_json, session_json, answers_json
         FROM tbl_student_mock_interviews
         WHERE student_id COLLATE utf8mb4_unicode_ci = ?
           AND mock_interview_id = ?
         LIMIT 1`,
        [student_id, id]
      );
      const row = rows?.[0];
      if (!row) return null;
      const performance = read_json(row.performance_json);
      const analysis = read_json(row.analysis_json);
      const session = read_json(row.session_json);
      const answers = read_json(row.answers_json);
      const scores = mock_interview_scores(performance, answers);
      return {
        job_title: String(analysis?.target_role || session?.target_role || performance?.target_role || "").trim(),
        score: scores.score,
        sentiment_analysis_score: scores.sentiment_analysis_score,
        technical_score: scores.technical_score
      };
    } catch {
      return null;
    }
  }
}

/**
 * Load only the entities for this certificate issue.
 * Pass the ids of the hackathon / mock interview / course / program they are earning.
 * Manual fields do not use this context.
 */
export async function load_issue_context({
  student_id,
  hackathon_id,
  mock_interview_id,
  course_id,
  program_id
} = {}) {
  const pool = get_pool();
  const [student, hackathon, course, mock_interview, program] = await Promise.all([
    load_student(pool, student_id),
    load_hackathon(pool, hackathon_id),
    load_course(pool, course_id),
    load_mock_interview(pool, student_id, mock_interview_id),
    load_program(pool, program_id)
  ]);
  return {
    student,
    hackathon,
    course,
    mock_interview,
    program,
    issued: {
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    }
  };
}

export function value_for_field(field, context) {
  if (field?.value_mode === "static" || field?.value_type === "manual") {
    return String(field.static_value || "").trim();
  }
  const source = known_source(field?.value_source);
  if (!source) return "";
  const [group, column] = source.split(".");
  return pick(context?.[group], column);
}
