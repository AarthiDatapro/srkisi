CREATE TABLE tbl_lesson_contents (
    content_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    lesson_id BIGINT NOT NULL,

    content_type VARCHAR(50) NOT NULL,
    content_title VARCHAR(200) NOT NULL,
    content_description TEXT NULL,

    file_name VARCHAR(255) NULL,
    file_path TEXT NULL,
    file_size_bytes BIGINT NULL,

    content_url TEXT NULL,
    duration_seconds INT NULL,
    learning_json LONGTEXT NULL,

    sequence_no INT NOT NULL DEFAULT 1,

    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_lesson_contents_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES tbl_course_lessons(lesson_id)
);
