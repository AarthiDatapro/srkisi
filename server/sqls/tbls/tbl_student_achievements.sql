CREATE TABLE tbl_student_achievements (
    achievement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    student_id VARCHAR(20) NOT NULL,
    achievement_text VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_student_achievements_student (student_id)
);
