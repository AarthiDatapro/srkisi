CREATE TABLE tbl_course_wishlist (
    wishlist_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    student_id VARCHAR(20) NOT NULL,
    course_id BIGINT NOT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_course_wishlist_student
        FOREIGN KEY (student_id)
        REFERENCES tbl_students(student_id),

    CONSTRAINT fk_course_wishlist_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT uq_course_wishlist
        UNIQUE (student_id, course_id)
);
