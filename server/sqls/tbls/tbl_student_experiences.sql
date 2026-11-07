CREATE TABLE tbl_student_experiences (
    experience_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    student_id VARCHAR(20) NOT NULL,
    company VARCHAR(200) NOT NULL,
    role_title VARCHAR(200) NOT NULL,
    start_label VARCHAR(50) NULL,
    end_label VARCHAR(50) NULL,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_student_experiences_student (student_id)
);
