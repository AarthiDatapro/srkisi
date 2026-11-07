CREATE TABLE tbl_employee_screen_permissions (
    permission_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_id BIGINT NOT NULL,
    screen_id VARCHAR(50) NOT NULL,
    access ENUM('view', 'edit') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_employee_screen (employee_id, screen_id),
    CONSTRAINT fk_screen_perm_employee
        FOREIGN KEY (employee_id) REFERENCES tbl_employees(employee_id)
);
