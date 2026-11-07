CREATE TABLE tbl_employees (
    employee_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    employee_code VARCHAR(50) NOT NULL UNIQUE,

    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NOT NULL,

    gender_id BIGINT NULL,
    date_of_birth DATE NULL,

    employee_type_id BIGINT NULL,
    department_id BIGINT NULL,
    designation_id BIGINT NULL,
    employment_type_id BIGINT NULL,

    joining_date DATE NOT NULL,

    email VARCHAR(768) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    mobile_number VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20) NULL,

    address_line_1 VARCHAR(255) NULL,
    address_line_2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,

    reporting_manager_id BIGINT NULL,
    location_id BIGINT NULL,

    profile_photo_url VARCHAR(500) NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    updated_by BIGINT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);