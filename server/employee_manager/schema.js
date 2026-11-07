import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { run_once } from "../utils/run_once.js";

const CREATE_DEPARTMENTS = `
CREATE TABLE IF NOT EXISTS mst_departments (
    department_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_EMPLOYEE_TYPES = `
CREATE TABLE IF NOT EXISTS mst_employee_types (
    employee_type_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employee_type_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_DESIGNATIONS = `
CREATE TABLE IF NOT EXISTS mst_designations (
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
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_GENDERS = `
CREATE TABLE IF NOT EXISTS mst_genders (
    gender_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    gender_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_EMPLOYMENT_TYPES = `
CREATE TABLE IF NOT EXISTS mst_employment_types (
    employment_type_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    employment_type_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_LOCATIONS = `
CREATE TABLE IF NOT EXISTS mst_locations (
    location_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    location_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_EMPLOYEES = `
CREATE TABLE IF NOT EXISTS tbl_employees (
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
)
`;

export function ensure_employee_schema() {
  return run_once("employee_schema", ensure_employee_schema_now);
}

async function ensure_employee_schema_now() {
  log.info("ensure_employee_schema", "ensuring employee tables");
  const pool = get_pool();
  await pool.query(CREATE_DEPARTMENTS);
  await pool.query(CREATE_EMPLOYEE_TYPES);
  await pool.query(CREATE_DESIGNATIONS);
  await pool.query(CREATE_GENDERS);
  await pool.query(CREATE_EMPLOYMENT_TYPES);
  await pool.query(CREATE_LOCATIONS);
  await pool.query(CREATE_EMPLOYEES);
  try {
    await pool.query(`ALTER TABLE tbl_employees MODIFY email VARCHAR(768) NOT NULL`);
  } catch {

    // column is already wide enough, or another request is altering the table
  }

  await pool.query(`
    INSERT IGNORE INTO mst_departments (department_name) VALUES
      ('Academic'), ('Administration'), ('Operations')
  `);
  await pool.query(`
    INSERT IGNORE INTO mst_employee_types (employee_type_name) VALUES
      ('Full_time'), ('Part_time'), ('Contract')
  `);
  await pool.query(`
    INSERT IGNORE INTO mst_designations (designation_name) VALUES
      ('Instructor'), ('Coordinator'), ('Manager')
  `);
  await pool.query(`
    INSERT IGNORE INTO mst_genders (gender_name) VALUES
      ('Female'), ('Male'), ('Other')
  `);
  await pool.query(`
    INSERT IGNORE INTO mst_employment_types (employment_type_name) VALUES
      ('Permanent'), ('Probation'), ('Intern'), ('Consultant')
  `);
  await pool.query(`
    INSERT IGNORE INTO mst_locations (location_name) VALUES
      ('Head office'), ('Campus'), ('Remote')
  `);

  try {
    await pool.query(`
      ALTER TABLE mst_designations
      ADD CONSTRAINT fk_designation_department
      FOREIGN KEY (department_id) REFERENCES mst_departments(department_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_employees
      ADD CONSTRAINT fk_employees_employee_type
      FOREIGN KEY (employee_type_id) REFERENCES mst_employee_types(employee_type_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_employees
      ADD CONSTRAINT fk_employees_department
      FOREIGN KEY (department_id) REFERENCES mst_departments(department_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_employees
      ADD CONSTRAINT fk_employees_designation
      FOREIGN KEY (designation_id) REFERENCES mst_designations(designation_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_employees
      ADD CONSTRAINT fk_employees_gender
      FOREIGN KEY (gender_id) REFERENCES mst_genders(gender_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_employees
      ADD CONSTRAINT fk_employees_employment_type
      FOREIGN KEY (employment_type_id) REFERENCES mst_employment_types(employment_type_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_employees
      ADD CONSTRAINT fk_employees_location
      FOREIGN KEY (location_id) REFERENCES mst_locations(location_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_employees
      ADD CONSTRAINT fk_employees_reporting_manager
      FOREIGN KEY (reporting_manager_id) REFERENCES tbl_employees(employee_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_employees
      ADD COLUMN password_hash VARCHAR(255) NULL
    `);
  } catch {

    // column may already exist
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tbl_employee_screen_permissions (
      permission_id BIGINT PRIMARY KEY AUTO_INCREMENT,
      employee_id BIGINT NOT NULL,
      screen_id VARCHAR(50) NOT NULL,
      access ENUM('view', 'edit') NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_employee_screen (employee_id, screen_id)
    )
  `);

  try {
    await pool.query(`
      ALTER TABLE tbl_employee_screen_permissions
      ADD CONSTRAINT fk_screen_perm_employee
      FOREIGN KEY (employee_id) REFERENCES tbl_employees(employee_id)
    `);
  } catch {

    // constraint may already exist
  }
  const [granted] = await pool.query(
    `SELECT 1 AS ok FROM tbl_employee_screen_permissions WHERE screen_id = 'course_content' LIMIT 1`
  );
  if (!granted?.[0]) {
    const section_ids = ["course_content", "course_students", "course_attendance", "course_feedback", "course_reports"];
    for (const screen_id of section_ids) {
      await pool.query(
        `INSERT IGNORE INTO tbl_employee_screen_permissions (employee_id, screen_id, access)
         SELECT employee_id, ?, access
         FROM tbl_employee_screen_permissions
         WHERE screen_id = 'courses'`,
        [screen_id]
      );
    }
    log.pass("ensure_employee_schema", "copied Courses access onto the course section screens");
  }
  log.pass("ensure_employee_schema", "employee tables ready");
}
