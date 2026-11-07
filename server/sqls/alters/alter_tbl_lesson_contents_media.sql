ALTER TABLE tbl_lesson_contents
    ADD COLUMN duration_seconds INT NULL;

ALTER TABLE tbl_lesson_contents
    ADD COLUMN file_size_bytes BIGINT NULL;

ALTER TABLE tbl_lesson_contents
    ADD COLUMN learning_json LONGTEXT NULL;
