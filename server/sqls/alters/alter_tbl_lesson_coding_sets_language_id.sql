ALTER TABLE tbl_lesson_coding_sets
    ADD COLUMN programming_language_id BIGINT NULL,
    ADD CONSTRAINT fk_coding_sets_programming_language
        FOREIGN KEY (programming_language_id)
        REFERENCES mst_programming_languages(programming_language_id);
