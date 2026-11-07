CREATE TABLE IF NOT EXISTS tbl_hackathons (
    hackathon_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    hackathon_type VARCHAR(20) NOT NULL,
    audience VARCHAR(20) NOT NULL,
    cohort_id BIGINT NULL,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    rules TEXT NULL,
    certificate_id BIGINT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
