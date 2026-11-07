CREATE TABLE tbl_courses (
    course_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_code VARCHAR(50) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    course_tagline VARCHAR(200) NULL,
    course_description TEXT NULL,

    course_type_id BIGINT NULL,
    duration_hours DECIMAL(6,2) NULL,
    level VARCHAR(50) NULL,
    fee_amount DECIMAL(10,2) NULL,
    discount_percent DECIMAL(5,2) NULL,
    created_by_display VARCHAR(150) NULL,
    real_world_project_count INT NULL,
    has_completion_certificate BOOLEAN NOT NULL DEFAULT FALSE,
    learn_points JSON NULL,
    audience_points JSON NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_open BOOLEAN NOT NULL DEFAULT FALSE,
    course_domain_id BIGINT NULL,
    course_level_id BIGINT NULL,
    course_tag_id BIGINT NULL,
    thumbnail_url VARCHAR(500) NULL,
    is_offline BOOLEAN NOT NULL DEFAULT FALSE,
    enroll_passkey VARCHAR(40) NULL,
    student_id_format VARCHAR(24) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_courses_course_type
        FOREIGN KEY (course_type_id)
        REFERENCES mst_course_types(course_type_id),

    CONSTRAINT fk_courses_course_domain
        FOREIGN KEY (course_domain_id)
        REFERENCES mst_course_domains(course_domain_id),

    CONSTRAINT fk_courses_course_level
        FOREIGN KEY (course_level_id)
        REFERENCES mst_course_levels(course_level_id),

    CONSTRAINT fk_courses_course_tag
        FOREIGN KEY (course_tag_id)
        REFERENCES mst_course_tags(course_tag_id)
);