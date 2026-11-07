CREATE TABLE tbl_program_employees (
    program_employee_id BIGINT PRIMARY KEY AUTO_INCREMENT,

    program_id BIGINT NOT NULL,
    employee_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'instructor',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_by BIGINT NULL,
    updated_at DATETIME NULL,

    CONSTRAINT fk_program_employees_program
        FOREIGN KEY (program_id)
        REFERENCES tbl_programs(program_id),

    CONSTRAINT fk_program_employees_employee
        FOREIGN KEY (employee_id)
        REFERENCES tbl_employees(employee_id),

    CONSTRAINT uq_program_employee
        UNIQUE (program_id, employee_id)
);
