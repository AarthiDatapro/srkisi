ALTER TABLE tbl_course_registrations
    ADD COLUMN learning_status VARCHAR(30) NOT NULL DEFAULT 'not_started';

ALTER TABLE tbl_course_registrations
    ADD COLUMN progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0;

ALTER TABLE tbl_course_registrations
    ADD COLUMN last_accessed_at DATETIME NULL;
