CREATE TABLE tbl_jobs (
    job_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_title VARCHAR(150) NOT NULL,
    company_name VARCHAR(150) NULL,
    location VARCHAR(120) NULL,
    company_website VARCHAR(500) NULL,
    job_description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
);
