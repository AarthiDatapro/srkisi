ALTER TABLE tbl_students
    ADD COLUMN ollama_api_key VARCHAR(500) NULL,
    ADD COLUMN ollama_fast_enabled TINYINT(1) NOT NULL DEFAULT 0;
