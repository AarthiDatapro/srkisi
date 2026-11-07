ALTER TABLE tbl_feedback_questions
    ADD CONSTRAINT fk_feedback_questions_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id);
