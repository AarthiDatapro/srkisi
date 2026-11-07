CREATE TABLE tbl_coding_test_cases (
    test_case_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    exercise_id BIGINT NOT NULL,
    test_case_no INT NOT NULL,

    inputs_json JSON NOT NULL,
    expected_output JSON NULL,
    error_text TEXT NULL,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_coding_cases_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES tbl_coding_exercises(exercise_id)
);
