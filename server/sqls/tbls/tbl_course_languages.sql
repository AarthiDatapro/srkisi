CREATE TABLE tbl_course_languages (
    course_language_link_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_id BIGINT NOT NULL,
    course_language_id BIGINT NOT NULL,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_course_language UNIQUE (course_id, course_language_id),

    CONSTRAINT fk_course_languages_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id),

    CONSTRAINT fk_course_languages_language
        FOREIGN KEY (course_language_id)
        REFERENCES mst_course_languages(course_language_id)
);
