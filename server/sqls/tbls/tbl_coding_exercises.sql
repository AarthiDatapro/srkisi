CREATE TABLE tbl_coding_exercises (
    exercise_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    coding_set_id BIGINT NOT NULL,
    exercise_number INT NOT NULL,

    description TEXT NOT NULL,
    language VARCHAR(100) NOT NULL,
    function_name VARCHAR(80) NOT NULL,
    reference_code LONGTEXT NOT NULL,

    validation_status VARCHAR(20) NULL,
    validation_errors JSON NULL,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,

    CONSTRAINT fk_coding_exercises_set
        FOREIGN KEY (coding_set_id)
        REFERENCES tbl_lesson_coding_sets(coding_set_id)
);
