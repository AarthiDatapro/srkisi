CREATE TABLE mst_course_domains (
    course_domain_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_domain_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL
);
