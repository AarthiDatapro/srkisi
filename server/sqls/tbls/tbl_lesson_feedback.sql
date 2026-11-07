CREATE TABLE tbl_lesson_feedback (
    feedback_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    student_id VARCHAR(20) NOT NULL,
    lesson_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    quiz_id BIGINT NULL,

    rating TINYINT NOT NULL,
    remarks TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,

    CONSTRAINT fk_lesson_feedback_student
        FOREIGN KEY (student_id)
        REFERENCES tbl_students(student_id),

    CONSTRAINT fk_lesson_feedback_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES tbl_course_lessons(lesson_id),

    CONSTRAINT fk_lesson_feedback_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_lesson_feedback_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES tbl_course_quizzes(quiz_id),

    CONSTRAINT chk_lesson_feedback_rating
        CHECK (rating BETWEEN 1 AND 5)
);
