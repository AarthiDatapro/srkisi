CREATE TABLE tbl_student_links (
    link_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    student_id VARCHAR(20) NOT NULL,
    link_title VARCHAR(100) NOT NULL,
    link_url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_student_links_student (student_id)
);
