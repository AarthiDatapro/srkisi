CREATE TABLE mst_designations (
    designation_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    designation_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,

    department_id BIGINT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    updated_by BIGINT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_designation_department
        FOREIGN KEY (department_id)
        REFERENCES mst_departments(department_id)
);