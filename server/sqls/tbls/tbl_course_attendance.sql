CREATE TABLE tbl_course_attendance (
    attendance_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_id BIGINT NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    attendance_date DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'present',
    remarks VARCHAR(500) NULL,
    marked_by BIGINT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,

    CONSTRAINT fk_course_attendance_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_course_attendance_student
        FOREIGN KEY (student_id)
        REFERENCES tbl_students(student_id),

    CONSTRAINT uq_course_attendance_day
        UNIQUE (course_id, student_id, attendance_date),

    INDEX idx_course_attendance_day (course_id, attendance_date)
);
