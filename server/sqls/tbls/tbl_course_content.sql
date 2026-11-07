CREATE TABLE tbl_course_content (
    content_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_id BIGINT NOT NULL,
    module_id BIGINT NULL,

    content_type VARCHAR(50) NOT NULL,

    lesson_id BIGINT NULL,
    quiz_id BIGINT NULL,

    sequence_no INT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_course_content_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_course_content_module
        FOREIGN KEY (module_id)
        REFERENCES tbl_course_modules(module_id),

    CONSTRAINT fk_course_content_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES tbl_course_lessons(lesson_id),

    CONSTRAINT fk_course_content_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES tbl_course_quizzes(quiz_id)
);
