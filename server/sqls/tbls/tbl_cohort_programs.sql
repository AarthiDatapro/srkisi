CREATE TABLE tbl_cohort_programs (
    cohort_program_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cohort_id BIGINT NOT NULL,
    program_id BIGINT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cohort_programs_cohort
        FOREIGN KEY (cohort_id) REFERENCES tbl_cohorts(cohort_id),
    CONSTRAINT fk_cohort_programs_program
        FOREIGN KEY (program_id) REFERENCES tbl_programs(program_id)
);
