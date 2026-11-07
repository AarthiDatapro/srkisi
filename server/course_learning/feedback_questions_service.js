import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";

export const DEFAULT_FEEDBACK_QUESTIONS = [
  {
    question_text: "How was the lesson pace?",
    options: ["Too fast", "Just right", "Too slow"],
    sequence_no: 1
  },
  {
    question_text: "How clear was the explanation?",
    options: ["Very clear", "Mostly clear", "Needs improvement"],
    sequence_no: 2
  },
  {
    question_text: "Did this lesson help you learn the topic?",
    options: ["Yes, a lot", "Somewhat", "Not really"],
    sequence_no: 3
  }
];

const CREATE_QUESTIONS = `
CREATE TABLE IF NOT EXISTS tbl_feedback_questions (
  question_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NULL,
  question_text VARCHAR(255) NOT NULL,
  options_json JSON NOT NULL,
  sequence_no INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_feedback_questions_course (course_id, is_active, sequence_no)
)
`;

function parse_options(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      return parse_options(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

function map_question(row) {
  return {
    question_id: row.question_id,
    course_id: row.course_id == null ? null : Number(row.course_id),
    question_text: row.question_text || "",
    options: parse_options(row.options_json),
    sequence_no: Number(row.sequence_no) || 1,
    is_active: row.is_active !== false && row.is_active !== 0
  };
}

export async function ensure_feedback_questions_schema() {
  const pool = get_pool();
  await pool.query(CREATE_QUESTIONS);
  try {
    await pool.query(
      `ALTER TABLE tbl_feedback_questions
       ADD CONSTRAINT fk_feedback_questions_course
       FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
    );
  } catch {
    /* may already exist */
  }

  const [rows] = await sqlQuery(
    pool,
    `SELECT question_id FROM tbl_feedback_questions WHERE course_id IS NULL LIMIT 1`
  );
  if (rows?.[0]) return;

  for (const item of DEFAULT_FEEDBACK_QUESTIONS) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_feedback_questions (course_id, question_text, options_json, sequence_no, is_active)
       VALUES (NULL, ?, CAST(? AS JSON), ?, TRUE)`,
      [item.question_text, JSON.stringify(item.options), item.sequence_no]
    );
  }
  log.pass("ensure_feedback_questions_schema", "seeded global feedback questions");
}

export async function list_feedback_questions(course_id = null) {
  await ensure_feedback_questions_schema();
  const pool = get_pool();
  const id = course_id == null || course_id === "" ? null : Number(course_id);

  if (id != null && Number.isInteger(id) && id > 0) {
    const [course_rows] = await sqlQuery(
      pool,
      `SELECT question_id, course_id, question_text, options_json, sequence_no, is_active
       FROM tbl_feedback_questions
       WHERE course_id = ? AND is_active = TRUE
       ORDER BY sequence_no ASC, question_id ASC`,
      [id]
    );
    if (course_rows?.length) {
      return {
        source: "course",
        questions: course_rows.map(map_question)
      };
    }
  }

  const [global_rows] = await sqlQuery(
    pool,
    `SELECT question_id, course_id, question_text, options_json, sequence_no, is_active
     FROM tbl_feedback_questions
     WHERE course_id IS NULL AND is_active = TRUE
     ORDER BY sequence_no ASC, question_id ASC`
  );
  return {
    source: "default",
    questions: (global_rows || []).map(map_question)
  };
}

function normalize_questions(body_questions = []) {
  if (!Array.isArray(body_questions)) return [];
  return body_questions.
  map((item, index) => {
    const question_text = String(item?.question_text || "").trim();
    const options = (Array.isArray(item?.options) ? item.options : []).
    map((option) => String(option || "").trim()).
    filter(Boolean);
    return {
      question_text,
      options,
      sequence_no: Number(item?.sequence_no) || index + 1
    };
  }).
  filter((item) => item.question_text && item.options.length >= 2);
}

export async function save_course_feedback_questions(course_id, body = {}) {
  await ensure_feedback_questions_schema();
  const id = Number(course_id);
  if (!Number.isInteger(id) || id < 1) {
    const err = new Error("Course was not found");
    err.status = 404;
    throw err;
  }

  const pool = get_pool();
  const [courses] = await sqlQuery(
    pool,
    `SELECT course_id FROM tbl_courses WHERE course_id = ? AND is_deleted = FALSE LIMIT 1`,
    [id]
  );
  if (!courses?.[0]) {
    const err = new Error("Course was not found");
    err.status = 404;
    throw err;
  }

  const questions = normalize_questions(body.questions);
  if (!questions.length) {
    const err = new Error("Add at least one question with two or more options");
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM tbl_feedback_questions WHERE course_id = ?`, [id]);
    for (const item of questions) {
      await connection.query(
        `INSERT INTO tbl_feedback_questions (course_id, question_text, options_json, sequence_no, is_active)
         VALUES (?, ?, CAST(? AS JSON), ?, TRUE)`,
        [id, item.question_text, JSON.stringify(item.options), item.sequence_no]
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  log.pass("save_course_feedback_questions", `saved ${questions.length} questions for course ${id}`);
  return list_feedback_questions(id);
}

export async function reset_course_feedback_questions(course_id) {
  await ensure_feedback_questions_schema();
  const id = Number(course_id);
  if (!Number.isInteger(id) || id < 1) {
    const err = new Error("Course was not found");
    err.status = 404;
    throw err;
  }
  const pool = get_pool();
  await sqlQuery(pool, `DELETE FROM tbl_feedback_questions WHERE course_id = ?`, [id]);
  log.pass("reset_course_feedback_questions", `course ${id} back to defaults`);
  return list_feedback_questions(id);
}
