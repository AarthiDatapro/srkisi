ALTER TABLE tbl_course_content
    ADD COLUMN coding_set_id BIGINT NULL,
    ADD CONSTRAINT fk_course_content_coding_set
        FOREIGN KEY (coding_set_id)
        REFERENCES tbl_lesson_coding_sets(coding_set_id);
