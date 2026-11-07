CREATE TABLE tbl_course_modules (
    module_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_id BIGINT NOT NULL,

    module_title VARCHAR(200) NOT NULL,
    module_description TEXT NULL,

    sequence_no INT NOT NULL DEFAULT 1,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_course_modules_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id)
);
