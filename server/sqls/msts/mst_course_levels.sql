CREATE TABLE mst_course_levels (
    course_level_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    course_level_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL
);

INSERT IGNORE INTO mst_course_levels (course_level_name) VALUES
    ('Beginner'),
    ('Intermediate'),
    ('Advanced'),
    ('Expert');
