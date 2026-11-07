CREATE TABLE tbl_certificates (
    certificate_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    certificate_name VARCHAR(150) NOT NULL,
    original_filename VARCHAR(255) NULL,
    filename VARCHAR(255) NULL,
    storage_path VARCHAR(500) NULL,
    image_url VARCHAR(1000) NULL,
    image_width INT NOT NULL DEFAULT 0,
    image_height INT NOT NULL DEFAULT 0,
    fields_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
);
