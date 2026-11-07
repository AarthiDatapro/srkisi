CREATE TABLE tbl_program_courses (
    program_course_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    program_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    enroll_passkey VARCHAR(40) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_program_courses_program
        FOREIGN KEY (program_id)
        REFERENCES tbl_programs(program_id),

    CONSTRAINT fk_program_courses_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT uq_program_course
        UNIQUE (program_id, course_id)
);