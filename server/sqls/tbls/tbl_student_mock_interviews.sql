CREATE TABLE tbl_student_mock_interviews (
    mock_interview_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    job_id BIGINT NULL,
    role_source VARCHAR(20) NOT NULL,
    file_name VARCHAR(255) NULL,
    analysis_json JSON NOT NULL,
    session_id VARCHAR(64) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
    question_number INT NULL,
    total_questions INT NULL,
    session_json JSON NULL,
    answers_json JSON NULL,
    performance_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    KEY idx_mock_interview_student (student_id, mock_interview_id)
);
