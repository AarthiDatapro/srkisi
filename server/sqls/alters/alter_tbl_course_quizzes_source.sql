ALTER TABLE tbl_course_quizzes
    ADD COLUMN question_count INT NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN difficulty VARCHAR(30) NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN bloom_level VARCHAR(40) NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN external_quiz_id VARCHAR(64) NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN source_text TEXT NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN source_type VARCHAR(30) NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN source_characters INT NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN source_words INT NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN moodle_xml LONGTEXT NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN xml_file VARCHAR(255) NULL;
