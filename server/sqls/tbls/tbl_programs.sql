CREATE TABLE tbl_programs (
    program_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    program_code VARCHAR(50) NOT NULL UNIQUE,
    program_name VARCHAR(150) NOT NULL,

    program_type_id BIGINT NOT NULL,
    FOREIGN KEY (program_type_id) REFERENCES mst_program_types(program_type_id),

    duration_months INT NULL,

    description TEXT NULL,
    thumbnail_url VARCHAR(500) NULL,
    start_date DATE NULL,
    end_date DATE NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    updated_by BIGINT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

