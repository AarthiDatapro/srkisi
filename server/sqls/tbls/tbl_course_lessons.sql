CREATE TABLE tbl_course_lessons (
    lesson_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_id BIGINT NOT NULL,
    module_id BIGINT NULL,

    lesson_title VARCHAR(200) NOT NULL,
    lesson_description TEXT NULL,

    sequence_no INT NOT NULL DEFAULT 1,
    duration_minutes INT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_course_lessons_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_course_lessons_module
        FOREIGN KEY (module_id)
        REFERENCES tbl_course_modules(module_id)
);
