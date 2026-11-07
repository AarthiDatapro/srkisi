CREATE TABLE tbl_student_projects (
    project_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    student_id VARCHAR(20) NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    role_title VARCHAR(200) NULL,
    live_url VARCHAR(500) NULL,
    tech_stack VARCHAR(500) NULL,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_student_projects_student (student_id)
);
