import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { run_once } from "../utils/run_once.js";
import { ensure_program_dropdown_schema } from "../dropdown_manager/schema.js";

function master_table(table, id_column, name_column) {
  return `
CREATE TABLE IF NOT EXISTS ${table} (
    ${id_column} BIGINT PRIMARY KEY AUTO_INCREMENT,
    ${name_column} VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;
}

const CREATE_COURSE_TYPES = master_table("mst_course_types", "course_type_id", "course_type_name");
const CREATE_COURSE_DOMAINS = master_table("mst_course_domains", "course_domain_id", "course_domain_name");
const CREATE_COURSE_LEVELS = master_table("mst_course_levels", "course_level_id", "course_level_name");
const CREATE_COURSE_LANGUAGES = master_table("mst_course_languages", "course_language_id", "course_language_name");
const CREATE_PROGRAMMING_LANGUAGES = master_table(
  "mst_programming_languages",
  "programming_language_id",
  "programming_language_name"
);
const CREATE_COURSE_TAGS = master_table("mst_course_tags", "course_tag_id", "course_tag_name");

const CREATE_COURSE_LANGUAGE_LINKS = `
CREATE TABLE IF NOT EXISTS tbl_course_languages (
    course_language_link_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    course_language_id BIGINT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_course_language UNIQUE (course_id, course_language_id)
)
`;

const CREATE_COURSES = `
CREATE TABLE IF NOT EXISTS tbl_courses (
    course_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_code VARCHAR(50) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    course_description TEXT NULL,
    course_type_id BIGINT NULL,
    duration_hours DECIMAL(6,2) NULL,
    level VARCHAR(50) NULL,
    fee_amount DECIMAL(10,2) NULL,
    thumbnail_url VARCHAR(500) NULL,
    is_offline BOOLEAN NOT NULL DEFAULT FALSE,
    enroll_passkey VARCHAR(40) NULL,
    student_id_format VARCHAR(24) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL
)
`;

const CREATE_PROGRAM_COURSES = `
CREATE TABLE IF NOT EXISTS tbl_program_courses (
    program_course_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    program_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    enroll_passkey VARCHAR(40) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL,
    CONSTRAINT uq_program_course UNIQUE (program_id, course_id)
)
`;

const CREATE_PROGRAM_EMPLOYEES = `
CREATE TABLE IF NOT EXISTS tbl_program_employees (
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
    CONSTRAINT uq_program_employee UNIQUE (program_id, employee_id)
)
`;

const CREATE_COURSE_EMPLOYEES = `
CREATE TABLE IF NOT EXISTS tbl_course_employees (
    course_employee_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    employee_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'instructor',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT NULL,
    updated_at DATETIME NULL,
    CONSTRAINT uq_course_employee UNIQUE (course_id, employee_id)
)
`;

const CREATE_COURSE_ATTENDANCE = `
CREATE TABLE IF NOT EXISTS tbl_course_attendance (
    attendance_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'present',
    remarks VARCHAR(500) NULL,
    marked_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    CONSTRAINT uq_course_attendance_day UNIQUE (course_id, student_id, attendance_date)
)
`;

export function ensure_course_schema() {
  return run_once("course_schema", ensure_course_schema_now);
}

async function ensure_course_schema_now() {
  log.info("ensure_course_schema", "ensuring course tables");
  await ensure_program_dropdown_schema();
  const pool = get_pool();

  await pool.query(CREATE_COURSE_TYPES);
  await pool.query(CREATE_COURSE_DOMAINS);
  await pool.query(CREATE_COURSE_LEVELS);
  await pool.query(CREATE_COURSE_LANGUAGES);
  await pool.query(CREATE_PROGRAMMING_LANGUAGES);
  await pool.query(CREATE_COURSE_TAGS);
  await pool.query(CREATE_COURSES);
  await pool.query(CREATE_COURSE_LANGUAGE_LINKS);
  await pool.query(CREATE_PROGRAM_COURSES);
  await pool.query(CREATE_COURSE_EMPLOYEES);
  await pool.query(CREATE_PROGRAM_EMPLOYEES);
  await pool.query(CREATE_COURSE_ATTENDANCE);
  await pool.query(`
    INSERT IGNORE INTO tbl_program_employees (program_id, employee_id, role)
    SELECT pc.program_id, ce.employee_id, MIN(ce.role)
    FROM tbl_course_employees ce
    INNER JOIN tbl_program_courses pc
      ON pc.course_id = ce.course_id AND pc.is_deleted = FALSE
    WHERE ce.is_deleted = FALSE AND ce.is_active = TRUE
    GROUP BY pc.program_id, ce.employee_id
  `);

  try {
    await pool.query("ALTER TABLE tbl_courses ADD COLUMN fee_amount DECIMAL(10,2) NULL");
  } catch {

    // column may already exist
  }
  const course_columns = [
  ["is_offline", "BOOLEAN NOT NULL DEFAULT FALSE"],
  ["enroll_passkey", "VARCHAR(40) NULL"],
  ["student_id_format", "VARCHAR(24) NULL"],
  ["thumbnail_url", "VARCHAR(500) NULL"],
  ["discount_percent", "DECIMAL(5,2) NULL"],
  ["course_tagline", "VARCHAR(200) NULL"],
  ["created_by_display", "VARCHAR(150) NULL"],
  ["real_world_project_count", "INT NULL"],
  ["has_completion_certificate", "BOOLEAN NOT NULL DEFAULT FALSE"],
  ["learn_points", "JSON NULL"],
  ["audience_points", "JSON NULL"],
  ["is_paid", "BOOLEAN NOT NULL DEFAULT FALSE"],
  ["is_open", "BOOLEAN NOT NULL DEFAULT FALSE"],
  ["course_domain_id", "BIGINT NULL"],
  ["course_level_id", "BIGINT NULL"],
  ["course_tag_id", "BIGINT NULL"]];

  for (const [column, definition] of course_columns) {
    try {
      await pool.query(`ALTER TABLE tbl_courses ADD COLUMN ${column} ${definition}`);
    } catch {

      // column may already exist
    }}

  try {
    await pool.query(
      "ALTER TABLE tbl_program_courses ADD COLUMN enroll_passkey VARCHAR(40) NULL"
    );
  } catch {

    // column may already exist
  }

  try {
    await pool.query(`
      UPDATE tbl_program_courses pc
      INNER JOIN tbl_courses c ON c.course_id = pc.course_id
      SET pc.enroll_passkey = c.enroll_passkey
      WHERE pc.enroll_passkey IS NULL
        AND c.is_offline = TRUE
        AND c.enroll_passkey IS NOT NULL
        AND TRIM(c.enroll_passkey) <> ''
    `);
  } catch {

    // migration best-effort
  }

  await pool.query(`
    INSERT IGNORE INTO mst_course_types (course_type_name) VALUES
      ('Core'), ('Elective'), ('Lab'), ('Workshop'), ('Certification')
  `);
  await pool.query(`
    INSERT IGNORE INTO mst_course_levels (course_level_name) VALUES
      ('Beginner'), ('Intermediate'), ('Advanced'), ('Expert')
  `);
  await pool.query(`
    INSERT IGNORE INTO mst_course_tags (course_tag_name) VALUES
      ('Trending'), ('Most Popular'), ('New Launches'), ('Highest Rated')
  `);
  try {
    await pool.query("ALTER TABLE mst_course_domains ADD COLUMN code_letters VARCHAR(5) NULL");
  } catch {

    // column may already exist
  }
  try {
    await pool.query("ALTER TABLE mst_course_domains ADD COLUMN number_next INT NULL");
  } catch {

    // column may already exist
  }
  try {
    await pool.query(
      "ALTER TABLE mst_course_domains ADD UNIQUE KEY uq_course_domain_letters (code_letters)"
    );
  } catch {

    // index may already exist
  }
  try {
    await pool.query("ALTER TABLE mst_course_tags ADD COLUMN tag_color VARCHAR(7) NULL");
  } catch {

    // column may already exist
  }
  await pool.query(`
    UPDATE mst_course_tags
    SET tag_color = CASE course_tag_name
      WHEN 'Trending' THEN '#ea580c'
      WHEN 'Most Popular' THEN '#7c3aed'
      WHEN 'New Launches' THEN '#0f766e'
      WHEN 'Highest Rated' THEN '#2563eb'
      ELSE '#1a2f7a'
    END
    WHERE tag_color IS NULL OR tag_color = ''
  `);
  try {
    await pool.query(`
      UPDATE tbl_courses c
      INNER JOIN mst_course_levels l ON l.course_level_name = c.level
      SET c.course_level_id = l.course_level_id
      WHERE c.course_level_id IS NULL
        AND c.level IS NOT NULL
        AND c.level <> ''
    `);
  } catch {

    // level column may not be ready yet
  }

  const course_keys = [
    ["fk_courses_course_type", "course_type_id", "mst_course_types", "course_type_id"],
    ["fk_courses_course_domain", "course_domain_id", "mst_course_domains", "course_domain_id"],
    ["fk_courses_course_level", "course_level_id", "mst_course_levels", "course_level_id"],
    ["fk_courses_course_tag", "course_tag_id", "mst_course_tags", "course_tag_id"]
  ];
  for (const [name, column, table, ref] of course_keys) {
    try {
      await pool.query(`
        ALTER TABLE tbl_courses
        ADD CONSTRAINT ${name}
        FOREIGN KEY (${column}) REFERENCES ${table}(${ref})
      `);
    } catch {

      // constraint may already exist
    }
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_course_languages
      ADD CONSTRAINT fk_course_languages_course
      FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_course_languages
      ADD CONSTRAINT fk_course_languages_language
      FOREIGN KEY (course_language_id) REFERENCES mst_course_languages(course_language_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_program_courses
      ADD CONSTRAINT fk_program_courses_program
      FOREIGN KEY (program_id) REFERENCES tbl_programs(program_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_program_courses
      ADD CONSTRAINT fk_program_courses_course
      FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_program_courses
      ADD CONSTRAINT uq_program_course UNIQUE (program_id, course_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_course_employees
      ADD CONSTRAINT fk_course_employees_course
      FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_course_employees
      ADD CONSTRAINT fk_course_employees_employee
      FOREIGN KEY (employee_id) REFERENCES tbl_employees(employee_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_program_employees
      ADD CONSTRAINT fk_program_employees_program
      FOREIGN KEY (program_id) REFERENCES tbl_programs(program_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_program_employees
      ADD CONSTRAINT fk_program_employees_employee
      FOREIGN KEY (employee_id) REFERENCES tbl_employees(employee_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_course_attendance
      ADD CONSTRAINT fk_course_attendance_course
      FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      ALTER TABLE tbl_course_attendance
      ADD CONSTRAINT fk_course_attendance_student
      FOREIGN KEY (student_id) REFERENCES tbl_students(student_id)
    `);
  } catch {

    // constraint may already exist
  }
  try {
    await pool.query(`
      CREATE INDEX idx_course_attendance_day
      ON tbl_course_attendance (course_id, attendance_date)
    `);
  } catch {

    // index may already exist
  }
  log.pass("ensure_course_schema", "course tables ready");
}
