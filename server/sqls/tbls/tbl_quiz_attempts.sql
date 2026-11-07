CREATE TABLE tbl_quiz_attempts (
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
    updated_at DATETIME NULL,

    CONSTRAINT fk_quiz_attempts_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES tbl_course_quizzes(quiz_id),

    CONSTRAINT fk_quiz_attempts_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_quiz_attempts_student
        FOREIGN KEY (student_id)
        REFERENCES tbl_students(student_id)
);
