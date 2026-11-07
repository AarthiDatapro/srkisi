CREATE TABLE tbl_course_quizzes (
    quiz_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_id BIGINT NOT NULL,
    module_id BIGINT NULL,
    lesson_id BIGINT NULL,

    quiz_title VARCHAR(200) NOT NULL,
    quiz_description TEXT NULL,

    duration_minutes INT NULL,
    total_marks DECIMAL(8,2) NULL,
    passing_marks DECIMAL(8,2) NULL,
    max_attempts INT NULL,
    question_count INT NULL,
    questions_shown INT NULL,

    difficulty VARCHAR(30) NULL,
    bloom_level VARCHAR(40) NULL,
    difficulty_mix JSON NULL,
    bloom_mix JSON NULL,

    external_quiz_id VARCHAR(64) NULL,
    source_text TEXT NULL,
    source_type VARCHAR(30) NULL,
    source_characters INT NULL,
    source_words INT NULL,
    moodle_xml LONGTEXT NULL,
    xml_file VARCHAR(255) NULL,

    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_course_quizzes_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_course_quizzes_module
        FOREIGN KEY (module_id)
        REFERENCES tbl_course_modules(module_id),

    CONSTRAINT fk_course_quizzes_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES tbl_course_lessons(lesson_id)
);
