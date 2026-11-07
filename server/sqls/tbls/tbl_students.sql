CREATE TABLE tbl_students (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL UNIQUE,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(768) NOT NULL UNIQUE,
    mobile_number VARCHAR(20) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    date_of_birth DATE NULL,
    college VARCHAR(200) NULL,
    higher_study VARCHAR(200) NULL,
    blood_group VARCHAR(20) NULL,
    address_line VARCHAR(300) NULL,
    pincode VARCHAR(12) NULL,
    state VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    profile_photo_url VARCHAR(500) NULL,
    headline VARCHAR(300) NULL,
    professional_summary TEXT NULL,
    degree VARCHAR(200) NULL,
    cgpa VARCHAR(20) NULL,
    learning_streak INT NOT NULL DEFAULT 0,
    last_streak_date DATE NULL,
    ollama_api_key VARCHAR(500) NULL,
    ollama_fast_enabled TINYINT(1) NOT NULL DEFAULT 0,

    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMP NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
