ALTER TABLE tbl_quiz_questions
    ADD COLUMN explanation TEXT NULL;

ALTER TABLE tbl_quiz_questions
    ADD COLUMN difficulty VARCHAR(30) NULL;

ALTER TABLE tbl_quiz_questions
    ADD COLUMN bloom_level VARCHAR(40) NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN difficulty_mix JSON NULL;

ALTER TABLE tbl_course_quizzes
    ADD COLUMN bloom_mix JSON NULL;
