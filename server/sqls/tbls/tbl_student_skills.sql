CREATE TABLE tbl_student_skills (
    skill_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    student_id VARCHAR(20) NOT NULL,
    skill_category VARCHAR(100) NOT NULL,
    skill_items TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_student_skills_student (student_id)
);
