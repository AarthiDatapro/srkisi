CREATE TABLE tbl_lesson_progress (
    progress_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    student_id VARCHAR(20) NOT NULL,
    lesson_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,

    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,

    CONSTRAINT fk_lesson_progress_student
        FOREIGN KEY (student_id)
        REFERENCES tbl_students(student_id),

    CONSTRAINT fk_lesson_progress_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES tbl_course_lessons(lesson_id),

    CONSTRAINT fk_lesson_progress_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT uq_lesson_progress
        UNIQUE (student_id, lesson_id)
);
