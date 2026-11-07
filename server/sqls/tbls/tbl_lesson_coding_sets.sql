CREATE TABLE tbl_lesson_coding_sets (
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
    updated_at DATETIME NULL,

    CONSTRAINT fk_coding_sets_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_coding_sets_module
        FOREIGN KEY (module_id)
        REFERENCES tbl_course_modules(module_id),

    CONSTRAINT fk_coding_sets_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES tbl_course_lessons(lesson_id)
);
