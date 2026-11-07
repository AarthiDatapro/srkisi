import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_content_schema } from "../course_content_manager/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { ensure_feedback_questions_schema } from "./feedback_questions_service.js";
import { add_column, add_fk } from "../utils/schema_ddl.js";

const CREATE_PROGRESS = `
CREATE TABLE IF NOT EXISTS tbl_lesson_progress (
    progress_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    lesson_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    registration_id BIGINT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    CONSTRAINT uq_lesson_progress UNIQUE (registration_id, lesson_id)
)
`;

const CREATE_CODING_SUBMISSIONS = `
CREATE TABLE IF NOT EXISTS tbl_coding_submissions (
    submission_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    exercise_id BIGINT NOT NULL,
    coding_set_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    lesson_id BIGINT NULL,
    registration_id BIGINT NULL,
    student_id VARCHAR(20) NOT NULL,
    student_code MEDIUMTEXT NOT NULL,
    status VARCHAR(30) NOT NULL,
    passed_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    total_count INT NOT NULL DEFAULT 0,
    score DECIMAL(6,2) NOT NULL DEFAULT 0,
    results_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`;

const CREATE_FEEDBACK = `
CREATE TABLE IF NOT EXISTS tbl_lesson_feedback (
    feedback_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    lesson_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    registration_id BIGINT NULL,
    quiz_id BIGINT NULL,
    rating TINYINT NOT NULL,
    remarks TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
)
`;

async function scope_existing_activity(pool) {
  const owner = `
    SELECT student_id, course_id, MIN(registration_id) AS registration_id
    FROM tbl_course_registrations
    WHERE is_deleted = FALSE AND status = 'registered'
    GROUP BY student_id, course_id
  `;
  const tables = ["tbl_lesson_progress", "tbl_lesson_feedback", "tbl_quiz_attempts", "tbl_coding_submissions"];
  for (const table of tables) {
    try {
      await pool.query(
        `UPDATE ${table} activity
         INNER JOIN (${owner}) owner
           ON owner.student_id = activity.student_id AND owner.course_id = activity.course_id
         SET activity.registration_id = owner.registration_id
         WHERE activity.registration_id IS NULL`
      );
    } catch {
      // table may not be ready yet
    }
  }
  try {
    await pool.query("ALTER TABLE tbl_lesson_progress DROP INDEX uq_lesson_progress");
  } catch {
    // old student-lesson key is already gone
  }
  try {
    await pool.query(
      `ALTER TABLE tbl_lesson_progress
       ADD UNIQUE KEY uq_lesson_progress (registration_id, lesson_id)`
    );
  } catch {
    // registration key already exists
  }
  try {
    await pool.query(
      `UPDATE tbl_course_registrations registration
       SET registration.progress_percent = 0,
           registration.learning_status = 'not_started',
           registration.updated_at = NOW()
       WHERE registration.is_deleted = FALSE
         AND registration.progress_percent > 0
         AND NOT EXISTS (
           SELECT 1 FROM tbl_lesson_progress progress
           WHERE progress.registration_id = registration.registration_id
             AND progress.is_completed = TRUE
         )
         AND EXISTS (
           SELECT 1 FROM tbl_course_registrations other
           WHERE other.student_id = registration.student_id
             AND other.course_id = registration.course_id
             AND other.registration_id <> registration.registration_id
             AND other.is_deleted = FALSE
         )`
    );
  } catch {
    // progress split can wait until the column exists
  }
}

export async function ensure_learn_schema() {
  log.info("ensure_learn_schema", "ensuring learning tables");
  await ensure_registration_schema();
  await ensure_content_schema();
  const pool = get_pool();
  await pool.query(CREATE_PROGRESS);
  await pool.query(CREATE_FEEDBACK);
  await pool.query(CREATE_CODING_SUBMISSIONS);
  await add_column(pool, "tbl_lesson_feedback", "quiz_id", "BIGINT NULL");
  await add_column(pool, "tbl_lesson_progress", "registration_id", "BIGINT NULL");
  await add_column(pool, "tbl_lesson_feedback", "registration_id", "BIGINT NULL");
  await add_column(pool, "tbl_coding_submissions", "registration_id", "BIGINT NULL");
  await add_column(pool, "tbl_quiz_attempts", "registration_id", "BIGINT NULL");
  await scope_existing_activity(pool);
  try {
    await pool.query(
      "ALTER TABLE tbl_lesson_feedback ADD INDEX idx_lesson_feedback_student (student_id)"
    );
  } catch {
    // student index already exists
  }
  try {
    await pool.query("ALTER TABLE tbl_lesson_feedback DROP INDEX uq_lesson_feedback");
  } catch {
    // unique key already gone, or still held by a foreign key
  }
  await ensure_feedback_questions_schema();
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_progress
     ADD CONSTRAINT fk_lesson_progress_student
     FOREIGN KEY (student_id) REFERENCES tbl_students(student_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_progress
     ADD CONSTRAINT fk_lesson_progress_lesson
     FOREIGN KEY (lesson_id) REFERENCES tbl_course_lessons(lesson_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_progress
     ADD CONSTRAINT fk_lesson_progress_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_feedback
     ADD CONSTRAINT fk_lesson_feedback_student
     FOREIGN KEY (student_id) REFERENCES tbl_students(student_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_feedback
     ADD CONSTRAINT fk_lesson_feedback_lesson
     FOREIGN KEY (lesson_id) REFERENCES tbl_course_lessons(lesson_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_feedback
     ADD CONSTRAINT fk_lesson_feedback_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_feedback
     ADD CONSTRAINT fk_lesson_feedback_quiz
     FOREIGN KEY (quiz_id) REFERENCES tbl_course_quizzes(quiz_id)`
  );
  log.pass("ensure_learn_schema", "learning tables ready");
}
