CREATE TABLE IF NOT EXISTS tbl_feedback_questions (
  question_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NULL COMMENT 'NULL = global default for all courses',
  question_text VARCHAR(255) NOT NULL,
  options_json JSON NOT NULL,
  sequence_no INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_feedback_questions_course (course_id, is_active, sequence_no),
  CONSTRAINT fk_feedback_questions_course
    FOREIGN KEY (course_id)
    REFERENCES tbl_courses(course_id)
);
