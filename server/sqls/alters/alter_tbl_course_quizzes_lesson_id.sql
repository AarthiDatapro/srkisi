ALTER TABLE tbl_course_quizzes
    ADD COLUMN lesson_id BIGINT NULL;

ALTER TABLE tbl_course_quizzes
    ADD CONSTRAINT fk_course_quizzes_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES tbl_course_lessons(lesson_id);
