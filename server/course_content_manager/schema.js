import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_course_schema } from "../course_manager/schema.js";
import { add_column, add_fk } from "../utils/schema_ddl.js";

const CREATE_CONTENT_TYPES = `
CREATE TABLE IF NOT EXISTS mst_content_types (
    content_type_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_type_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_MODULES = `
CREATE TABLE IF NOT EXISTS tbl_course_modules (
    module_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    module_title VARCHAR(200) NOT NULL,
    module_description TEXT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_LESSONS = `
CREATE TABLE IF NOT EXISTS tbl_course_lessons (
    lesson_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    lesson_title VARCHAR(200) NOT NULL,
    lesson_description TEXT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    duration_minutes INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_QUIZZES = `
CREATE TABLE IF NOT EXISTS tbl_course_quizzes (
    quiz_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    quiz_title VARCHAR(200) NOT NULL,
    quiz_description TEXT NULL,
    duration_minutes INT NULL,
    total_marks DECIMAL(8,2) NULL,
    passing_marks DECIMAL(8,2) NULL,
    max_attempts INT NULL,
    questions_shown INT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_LESSON_CONTENTS = `
CREATE TABLE IF NOT EXISTS tbl_lesson_contents (
    content_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    lesson_id BIGINT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_title VARCHAR(200) NULL,
    content_description TEXT NULL,
    file_name VARCHAR(255) NULL,
    file_path TEXT NULL,
    content_url TEXT NULL,
    sequence_no INT NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_COURSE_CONTENT = `
CREATE TABLE IF NOT EXISTS tbl_course_content (
    content_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    lesson_id BIGINT NULL,
    quiz_id BIGINT NULL,
    sequence_no INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_DAILY_REPORTS = `
CREATE TABLE IF NOT EXISTS tbl_course_daily_reports (
    report_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    report_date DATE NOT NULL,
    day_no INT NULL,
    week_no INT NULL,
    trainer_name VARCHAR(150) NULL,
    teaching_assistant VARCHAR(150) NULL,
    module_course VARCHAR(200) NULL,
    session_timings VARCHAR(100) NULL,
    program_title VARCHAR(200) NULL,
    venue VARCHAR(300) NULL,
    association_line VARCHAR(300) NULL,
    course_track VARCHAR(200) NULL,
    enrolled INT NOT NULL DEFAULT 0,
    present_today INT NOT NULL DEFAULT 0,
    absent_today INT NOT NULL DEFAULT 0,
    attendance_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
    morning_count INT NOT NULL DEFAULT 0,
    afternoon_count INT NOT NULL DEFAULT 0,
    daily_assignment BOOLEAN NOT NULL DEFAULT FALSE,
    daily_attempts INT NULL,
    daily_reason TEXT NULL,
    weekly_assignment BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_attempts INT NULL,
    weekly_reason TEXT NULL,
    lab_work TEXT NULL,
    lab_comments TEXT NULL,
    other_activities TEXT NULL,
    submitted_by VARCHAR(150) NULL,
    submitted_date DATE NULL,
    reviewed_by VARCHAR(150) NULL,
    reviewed_date DATE NULL,
    sessions_json JSON NULL,
    photos_json JSON NULL,
    pdf_file_name VARCHAR(255) NULL,
    pdf_file_path TEXT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_QUIZ_QUESTIONS = `
CREATE TABLE IF NOT EXISTS tbl_quiz_questions (
    question_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    quiz_id BIGINT NOT NULL,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    options_json JSON NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT NULL,
    difficulty VARCHAR(30) NULL,
    bloom_level VARCHAR(40) NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
)
`;

const CREATE_QUIZ_ATTEMPTS = `
CREATE TABLE IF NOT EXISTS tbl_quiz_attempts (
    attempt_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    quiz_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    score DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
)
`;

const CREATE_CODING_SETS = `
CREATE TABLE IF NOT EXISTS tbl_lesson_coding_sets (
    coding_set_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    module_id BIGINT NOT NULL,
    lesson_id BIGINT NOT NULL,
    set_title VARCHAR(200) NOT NULL,
    prompt TEXT NOT NULL,
    programming_language_id BIGINT NULL,
    language VARCHAR(100) NOT NULL,
    exercise_count INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_CODING_EXERCISES = `
CREATE TABLE IF NOT EXISTS tbl_coding_exercises (
    exercise_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    coding_set_id BIGINT NOT NULL,
    exercise_number INT NOT NULL,
    description TEXT NOT NULL,
    language VARCHAR(100) NOT NULL,
    function_name VARCHAR(80) NOT NULL,
    reference_code LONGTEXT NOT NULL,
    validation_status VARCHAR(20) NULL,
    validation_errors JSON NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
)
`;

const CREATE_CODING_CASES = `
CREATE TABLE IF NOT EXISTS tbl_coding_test_cases (
    test_case_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    exercise_id BIGINT NOT NULL,
    test_case_no INT NOT NULL,
    inputs_json JSON NOT NULL,
    expected_output JSON NULL,
    error_text TEXT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`;

const CREATE_QUIZ_ANSWERS = `
CREATE TABLE IF NOT EXISTS tbl_quiz_attempt_answers (
    answer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`;

export async function ensure_content_schema() {
  log.info("ensure_content_schema", "ensuring course content tables");
  await ensure_course_schema();
  const pool = get_pool();

  await pool.query(CREATE_CONTENT_TYPES);
  await pool.query(CREATE_MODULES);
  await pool.query(CREATE_LESSONS);
  await pool.query(CREATE_QUIZZES);
  await pool.query(CREATE_LESSON_CONTENTS);
  await pool.query(CREATE_COURSE_CONTENT);
  await pool.query(CREATE_DAILY_REPORTS);
  await pool.query(CREATE_QUIZ_QUESTIONS);
  await pool.query(CREATE_QUIZ_ATTEMPTS);
  await pool.query(CREATE_QUIZ_ANSWERS);
  await pool.query(CREATE_CODING_SETS);
  await pool.query(CREATE_CODING_EXERCISES);
  await pool.query(CREATE_CODING_CASES);

  await add_column(pool, "tbl_lesson_contents", "duration_seconds", "INT NULL");
  await add_column(pool, "tbl_lesson_contents", "file_size_bytes", "BIGINT NULL");
  await add_column(pool, "tbl_lesson_contents", "learning_json", "LONGTEXT NULL");
  for (const column of ["pdf_start_page", "pdf_end_page"]) {
    try {
      await pool.query(`ALTER TABLE tbl_lesson_contents DROP COLUMN ${column}`);
    } catch {

      // column is already gone
    }
  }
  await add_column(pool, "tbl_lesson_contents", "telugu_file_name", "VARCHAR(255) NULL");
  await add_column(pool, "tbl_lesson_contents", "telugu_file_path", "TEXT NULL");
  await add_column(pool, "tbl_lesson_contents", "telugu_file_size_bytes", "BIGINT NULL");
  await add_column(pool, "tbl_lesson_contents", "telugu_learning_json", "LONGTEXT NULL");
  await pool.query(
    `ALTER TABLE tbl_lesson_contents
     MODIFY content_title VARCHAR(200) NULL`
  );
  await pool.query(
    `UPDATE tbl_lesson_contents
     SET content_title = NULL
     WHERE content_type = 'Overview'`
  );
  await add_column(pool, "tbl_course_lessons", "module_id", "BIGINT NULL");
  await add_column(pool, "tbl_course_quizzes", "module_id", "BIGINT NULL");
  await add_column(pool, "tbl_course_quizzes", "lesson_id", "BIGINT NULL");
  await add_column(pool, "tbl_course_quizzes", "external_quiz_id", "VARCHAR(64) NULL");
  await add_column(pool, "tbl_course_quizzes", "source_text", "TEXT NULL");
  await add_column(pool, "tbl_course_quizzes", "source_type", "VARCHAR(30) NULL");
  await add_column(pool, "tbl_course_quizzes", "source_characters", "INT NULL");
  await add_column(pool, "tbl_course_quizzes", "source_words", "INT NULL");
  await add_column(pool, "tbl_course_quizzes", "difficulty", "VARCHAR(30) NULL");
  await add_column(pool, "tbl_course_quizzes", "bloom_level", "VARCHAR(40) NULL");
  await add_column(pool, "tbl_course_quizzes", "difficulty_mix", "JSON NULL");
  await add_column(pool, "tbl_course_quizzes", "bloom_mix", "JSON NULL");
  await add_column(pool, "tbl_course_quizzes", "question_count", "INT NULL");
  await add_column(pool, "tbl_quiz_questions", "explanation", "TEXT NULL");
  await add_column(pool, "tbl_quiz_questions", "difficulty", "VARCHAR(30) NULL");
  await add_column(pool, "tbl_quiz_questions", "bloom_level", "VARCHAR(40) NULL");
  await add_column(pool, "tbl_course_quizzes", "questions_shown", "INT NULL");
  try {
    await pool.query(
      `UPDATE tbl_course_quizzes
       SET questions_shown = question_count
       WHERE questions_shown IS NULL AND question_count IS NOT NULL`
    );
  } catch {

    // ignore backfill failures
  }await add_column(pool, "tbl_course_quizzes", "moodle_xml", "LONGTEXT NULL");
  await add_column(pool, "tbl_course_quizzes", "xml_file", "VARCHAR(255) NULL");
  await add_column(pool, "tbl_course_content", "module_id", "BIGINT NULL");
  await add_column(pool, "tbl_course_content", "coding_set_id", "BIGINT NULL");
  await add_column(pool, "tbl_lesson_coding_sets", "programming_language_id", "BIGINT NULL");
  try {
    await pool.query("ALTER TABLE tbl_lesson_coding_sets MODIFY COLUMN language VARCHAR(100) NOT NULL");
    await pool.query("ALTER TABLE tbl_coding_exercises MODIFY COLUMN language VARCHAR(100) NOT NULL");
  } catch {

    // language column may already be wide enough
  }
  await add_column(pool, "tbl_quiz_attempts", "duration_seconds", "INT NULL");
  await add_column(pool, "tbl_course_daily_reports", "pdf_file_name", "VARCHAR(255) NULL");
  await add_column(pool, "tbl_course_daily_reports", "pdf_file_path", "TEXT NULL");

  await migrate_orphan_content(pool);

  await pool.query(
    `UPDATE tbl_lesson_contents
     SET file_name = NULL,
         file_path = NULL,
         file_size_bytes = NULL,
         content_url = NULL,
         duration_seconds = NULL,
         learning_json = NULL,
         telugu_file_name = NULL,
         telugu_file_path = NULL,
         telugu_file_size_bytes = NULL,
         telugu_learning_json = NULL
     WHERE content_type = 'Overview'`
  );

  for (const name of ["Video", "Material", "Notes", "Overview", "Announcement"]) {
    await pool.query(
      `INSERT INTO mst_content_types (content_type_name)
       SELECT ? FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM mst_content_types WHERE content_type_name = ? AND is_deleted = FALSE
       )`,
      [name, name]
    );
  }

  await add_fk(
    pool,
    `ALTER TABLE tbl_course_modules
     ADD CONSTRAINT fk_course_modules_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_lessons
     ADD CONSTRAINT fk_course_lessons_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_lessons
     ADD CONSTRAINT fk_course_lessons_module
     FOREIGN KEY (module_id) REFERENCES tbl_course_modules(module_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_quizzes
     ADD CONSTRAINT fk_course_quizzes_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_quizzes
     ADD CONSTRAINT fk_course_quizzes_module
     FOREIGN KEY (module_id) REFERENCES tbl_course_modules(module_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_quizzes
     ADD CONSTRAINT fk_course_quizzes_lesson
     FOREIGN KEY (lesson_id) REFERENCES tbl_course_lessons(lesson_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_contents
     ADD CONSTRAINT fk_lesson_contents_lesson
     FOREIGN KEY (lesson_id) REFERENCES tbl_course_lessons(lesson_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_content
     ADD CONSTRAINT fk_course_content_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_content
     ADD CONSTRAINT fk_course_content_lesson
     FOREIGN KEY (lesson_id) REFERENCES tbl_course_lessons(lesson_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_content
     ADD CONSTRAINT fk_course_content_quiz
     FOREIGN KEY (quiz_id) REFERENCES tbl_course_quizzes(quiz_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_content
     ADD CONSTRAINT fk_course_content_module
     FOREIGN KEY (module_id) REFERENCES tbl_course_modules(module_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_coding_sets
     ADD CONSTRAINT fk_coding_sets_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_coding_sets
     ADD CONSTRAINT fk_coding_sets_module
     FOREIGN KEY (module_id) REFERENCES tbl_course_modules(module_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_coding_sets
     ADD CONSTRAINT fk_coding_sets_lesson
     FOREIGN KEY (lesson_id) REFERENCES tbl_course_lessons(lesson_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_coding_exercises
     ADD CONSTRAINT fk_coding_exercises_set
     FOREIGN KEY (coding_set_id) REFERENCES tbl_lesson_coding_sets(coding_set_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_coding_test_cases
     ADD CONSTRAINT fk_coding_cases_exercise
     FOREIGN KEY (exercise_id) REFERENCES tbl_coding_exercises(exercise_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_content
     ADD CONSTRAINT fk_course_content_coding_set
     FOREIGN KEY (coding_set_id) REFERENCES tbl_lesson_coding_sets(coding_set_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_lesson_coding_sets
     ADD CONSTRAINT fk_coding_sets_programming_language
     FOREIGN KEY (programming_language_id) REFERENCES mst_programming_languages(programming_language_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_daily_reports
     ADD CONSTRAINT fk_daily_reports_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_quiz_questions
     ADD CONSTRAINT fk_quiz_questions_quiz
     FOREIGN KEY (quiz_id) REFERENCES tbl_course_quizzes(quiz_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_quiz_attempts
     ADD CONSTRAINT fk_quiz_attempts_quiz
     FOREIGN KEY (quiz_id) REFERENCES tbl_course_quizzes(quiz_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_quiz_attempts
     ADD CONSTRAINT fk_quiz_attempts_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_quiz_attempts
     ADD CONSTRAINT fk_quiz_attempts_student
     FOREIGN KEY (student_id) REFERENCES tbl_students(student_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_quiz_attempt_answers
     ADD CONSTRAINT fk_quiz_answers_attempt
     FOREIGN KEY (attempt_id) REFERENCES tbl_quiz_attempts(attempt_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_quiz_attempt_answers
     ADD CONSTRAINT fk_quiz_answers_question
     FOREIGN KEY (question_id) REFERENCES tbl_quiz_questions(question_id)`
  );
}

async function migrate_orphan_content(pool) {
  await pool.query(`
    INSERT INTO tbl_course_modules (course_id, module_title, sequence_no)
    SELECT c.course_id, 'Module 1', 1
    FROM tbl_courses c
    WHERE c.is_deleted = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM tbl_course_modules m
        WHERE m.course_id = c.course_id AND m.is_deleted = FALSE
      )
      AND (
        EXISTS (
          SELECT 1 FROM tbl_course_lessons l
          WHERE l.course_id = c.course_id AND l.is_deleted = FALSE
        )
        OR EXISTS (
          SELECT 1 FROM tbl_course_content cc
          WHERE cc.course_id = c.course_id AND cc.is_deleted = FALSE
        )
      )
  `);

  await pool.query(`
    UPDATE tbl_course_lessons l
    INNER JOIN (
      SELECT course_id, MIN(module_id) AS module_id
      FROM tbl_course_modules
      WHERE is_deleted = FALSE
      GROUP BY course_id
    ) m ON m.course_id = l.course_id
    SET l.module_id = m.module_id
    WHERE l.module_id IS NULL AND l.is_deleted = FALSE
  `);

  await pool.query(`
    UPDATE tbl_course_quizzes q
    INNER JOIN (
      SELECT course_id, MIN(module_id) AS module_id
      FROM tbl_course_modules
      WHERE is_deleted = FALSE
      GROUP BY course_id
    ) m ON m.course_id = q.course_id
    SET q.module_id = m.module_id
    WHERE q.module_id IS NULL AND q.is_deleted = FALSE
  `);

  await pool.query(`
    UPDATE tbl_course_content cc
    INNER JOIN (
      SELECT course_id, MIN(module_id) AS module_id
      FROM tbl_course_modules
      WHERE is_deleted = FALSE
      GROUP BY course_id
    ) m ON m.course_id = cc.course_id
    SET cc.module_id = m.module_id
    WHERE cc.module_id IS NULL AND cc.is_deleted = FALSE
  `);
  log.pass("ensure_content_schema", "course content tables ready");
}
