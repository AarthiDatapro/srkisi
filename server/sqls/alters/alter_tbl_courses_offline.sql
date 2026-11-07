ALTER TABLE tbl_courses
    ADD COLUMN is_offline BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN enroll_passkey VARCHAR(40) NULL,
    ADD COLUMN student_id_format VARCHAR(24) NULL;
