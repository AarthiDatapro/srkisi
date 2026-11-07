ALTER TABLE tbl_course_registrations
    ADD COLUMN course_student_id VARCHAR(40) NULL;

CREATE UNIQUE INDEX uq_course_student_code
    ON tbl_course_registrations (course_id, course_student_id);
