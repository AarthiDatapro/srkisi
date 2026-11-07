CREATE TABLE tbl_quiz_attempt_answers (
    answer_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quiz_answers_attempt
        FOREIGN KEY (attempt_id)
        REFERENCES tbl_quiz_attempts(attempt_id),

    CONSTRAINT fk_quiz_answers_question
        FOREIGN KEY (question_id)
        REFERENCES tbl_quiz_questions(question_id),

    CONSTRAINT uq_quiz_attempt_question
        UNIQUE (attempt_id, question_id)
);
