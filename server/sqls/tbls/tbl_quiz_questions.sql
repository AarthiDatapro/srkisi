CREATE TABLE tbl_quiz_questions (
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
    updated_at DATETIME NULL,

    CONSTRAINT fk_quiz_questions_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES tbl_course_quizzes(quiz_id)
);
