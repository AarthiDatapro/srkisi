CREATE TABLE tbl_course_daily_reports (
    report_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_id BIGINT NOT NULL,
    report_date DATE NOT NULL,

    day_no INT NULL,
    week_no INT NULL,

    trainer_name VARCHAR(150) NULL,
    teaching_assistant VARCHAR(150) NULL,
    module_course VARCHAR(200) NULL,
    session_timings VARCHAR(100) NULL,

    program_title VARCHAR(200) NULL,
    venue VARCHAR(300) NULL,
    association_line VARCHAR(300) NULL,
    course_track VARCHAR(200) NULL,

    enrolled INT NOT NULL DEFAULT 0,
    present_today INT NOT NULL DEFAULT 0,
    absent_today INT NOT NULL DEFAULT 0,
    attendance_percent DECIMAL(6,2) NOT NULL DEFAULT 0,
    morning_count INT NOT NULL DEFAULT 0,
    afternoon_count INT NOT NULL DEFAULT 0,

    daily_assignment BOOLEAN NOT NULL DEFAULT FALSE,
    daily_attempts INT NULL,
    daily_reason TEXT NULL,
    weekly_assignment BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_attempts INT NULL,
    weekly_reason TEXT NULL,

    lab_work TEXT NULL,
    lab_comments TEXT NULL,
    other_activities TEXT NULL,

    submitted_by VARCHAR(150) NULL,
    submitted_date DATE NULL,
    reviewed_by VARCHAR(150) NULL,
    reviewed_date DATE NULL,

    sessions_json JSON NULL,
    photos_json JSON NULL,
    pdf_file_name VARCHAR(255) NULL,
    pdf_file_path TEXT NULL,

    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_daily_reports_course
        FOREIGN KEY (course_id)
        REFERENCES tbl_courses(course_id)
);
