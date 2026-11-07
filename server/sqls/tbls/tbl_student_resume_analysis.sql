CREATE TABLE tbl_student_resume_analysis (
    analysis_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    analysis_json JSON NOT NULL,
    overall_score DECIMAL(5,1) NULL,
    resume_url VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (analysis_id),
    KEY idx_resume_analysis_student (student_id, analysis_id)
);
