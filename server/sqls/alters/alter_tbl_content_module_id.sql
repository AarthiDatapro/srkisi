ALTER TABLE tbl_course_lessons
    ADD COLUMN module_id BIGINT NULL;

ALTER TABLE tbl_course_lessons
    ADD CONSTRAINT fk_course_lessons_module
        FOREIGN KEY (module_id)
        REFERENCES tbl_course_modules(module_id);

ALTER TABLE tbl_course_content
    ADD COLUMN module_id BIGINT NULL;

ALTER TABLE tbl_course_content
    ADD CONSTRAINT fk_course_content_module
        FOREIGN KEY (module_id)
        REFERENCES tbl_course_modules(module_id);

ALTER TABLE tbl_course_quizzes
    ADD COLUMN module_id BIGINT NULL;

ALTER TABLE tbl_course_quizzes
    ADD CONSTRAINT fk_course_quizzes_module
        FOREIGN KEY (module_id)
        REFERENCES tbl_course_modules(module_id);
