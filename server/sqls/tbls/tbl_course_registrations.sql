CREATE TABLE tbl_course_registrations (
    registration_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    student_id VARCHAR(20) NOT NULL,
    course_id BIGINT NOT NULL,
    program_id BIGINT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'registered',
    learning_status VARCHAR(30) NOT NULL DEFAULT 'not_started',
    progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    last_accessed_at DATETIME NULL,
    course_student_id VARCHAR(40) NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,

    CONSTRAINT fk_course_registrations_student
        FOREIGN KEY (student_id)
        REFERENCES tbl_students(student_id),

    CONSTRAINT fk_course_registrations_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_course_registrations_program
        FOREIGN KEY (program_id)
        REFERENCES tbl_programs(program_id),

    CONSTRAINT uq_course_student_code
        UNIQUE (course_id, course_student_id)
);
