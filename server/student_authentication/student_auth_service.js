import {
  hashPassword,
  sqlQuery,
  verifyPassword } from
"@datapromr/auth/server";
import { log } from "@datapromr/log";
import {
  validateMobile,
  validateOptionalText,
  validatePassword,
  validatePersonName,
  validateRequiredText } from
"@datapromr/validation";
import { validate_email } from "./email.js";
import { parse_login_identifier } from "./login_identifier.js";
import { get_pool } from "../utils/db_setup.js";
import { save_student_photo } from "./student_image.js";
import { create_stamp_code } from "../utils/codes.js";

const CREATE_STUDENTS_TABLE = `
CREATE TABLE IF NOT EXISTS tbl_students (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(768) NULL UNIQUE,
    mobile_number VARCHAR(20) NULL UNIQUE,
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
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted_at TIMESTAMP NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const PROFILE_COLUMNS = [
["gender", "VARCHAR(20) NULL"],
["college", "VARCHAR(200) NULL"],
["higher_study", "VARCHAR(200) NULL"],
["blood_group", "VARCHAR(20) NULL"],
["address_line", "VARCHAR(300) NULL"],
["pincode", "VARCHAR(12) NULL"],
["state", "VARCHAR(100) NULL"],
["district", "VARCHAR(100) NULL"],
["profile_photo_url", "VARCHAR(500) NULL"],
["headline", "VARCHAR(300) NULL"],
["professional_summary", "TEXT NULL"],
["degree", "VARCHAR(200) NULL"],
["cgpa", "VARCHAR(20) NULL"],
["learning_streak", "INT NOT NULL DEFAULT 0"],
["last_streak_date", "DATE NULL"],
["ollama_api_key", "VARCHAR(500) NULL"],
["ollama_fast_enabled", "TINYINT(1) NOT NULL DEFAULT 0"]];

const CREATE_STUDENT_LINKS_TABLE = `
CREATE TABLE IF NOT EXISTS tbl_student_links (
    link_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    link_title VARCHAR(100) NOT NULL,
    link_url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_links_student (student_id)
)
`;

const CREATE_STUDENT_SKILLS_TABLE = `
CREATE TABLE IF NOT EXISTS tbl_student_skills (
    skill_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    skill_category VARCHAR(100) NOT NULL,
    skill_items TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_skills_student (student_id)
)
`;

const CREATE_STUDENT_EXPERIENCES_TABLE = `
CREATE TABLE IF NOT EXISTS tbl_student_experiences (
    experience_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    company VARCHAR(200) NOT NULL,
    role_title VARCHAR(200) NOT NULL,
    start_label VARCHAR(50) NULL,
    end_label VARCHAR(50) NULL,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_experiences_student (student_id)
)
`;

const CREATE_STUDENT_PROJECTS_TABLE = `
CREATE TABLE IF NOT EXISTS tbl_student_projects (
    project_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    role_title VARCHAR(200) NULL,
    live_url VARCHAR(500) NULL,
    tech_stack VARCHAR(500) NULL,
    description TEXT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_projects_student (student_id)
)
`;

const CREATE_STUDENT_ACHIEVEMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS tbl_student_achievements (
    achievement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    achievement_text VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_achievements_student (student_id)
)
`;


export function create_student_id(date = new Date()) {
  return create_stamp_code("STU", date);
}

function pincode_error(value) {
  const text = String(value || "").trim();
  if (!text) return "Pincode is required";
  if (!/^\d{6}$/.test(text)) return "Enter a 6_digit pincode";
  return "";
}

function parse_birth_date(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function registration_dob_error(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const date = parse_birth_date(text);
  if (!date) return "Enter a valid date of birth";
  const latest = new Date();
  latest.setHours(0, 0, 0, 0);
  latest.setFullYear(latest.getFullYear() - 10);
  if (date > latest) return "Date of birth must be at least 10 years before today";
  return "";
}

function registration_password_error(value) {
  const text = String(value ?? "");
  if (!text) return "Password is required";
  if (text.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(text)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(text)) return "Password must include an uppercase letter";
  if (!/\d/.test(text)) return "Password must include a number";
  if (!/[^A-Za-z0-9]/.test(text)) return "Password must include a special character";
  return "";
}

export function validate_student_registration(body = {}) {
  return {
    first_name: validatePersonName(body.first_name, "First name"),
    last_name: validatePersonName(body.last_name, "Last name"),
    email: validate_email(body.email),
    mobile_number: validateMobile(body.mobile_number),
    date_of_birth: registration_dob_error(body.date_of_birth),
    college: validateRequiredText(body.college, "College", 200),
    higher_study: validateRequiredText(body.higher_study, "Higher study", 200),
    blood_group: validateOptionalText(body.blood_group, "Blood group", 20),
    address_line: validateOptionalText(body.address_line, "Address", 300),
    pincode: String(body.pincode || "").trim() ? pincode_error(body.pincode) : "",
    state: validateOptionalText(body.state, "State", 100),
    district: validateOptionalText(body.district, "District", 100),
    password: registration_password_error(body.password)
  };
}

async function add_column(pool, table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

async function drop_access_code(pool) {
  for (const sql of [
  "DROP INDEX uq_students_access_code ON tbl_students",
  "DROP INDEX access_code ON tbl_students",
  "ALTER TABLE tbl_students DROP COLUMN access_code"])
  {
    try {
      await pool.query(sql);
    } catch {

      // index or column may already be gone
    }}
}

async function add_student_links_fk(pool) {
  try {
    await pool.query(`
      ALTER TABLE tbl_student_links
      ADD CONSTRAINT fk_student_links_student
      FOREIGN KEY (student_id) REFERENCES tbl_students(student_id)
    `);
  } catch {

    // constraint may already exist or charset mismatch — table still usable
  }
}

let profile_schema_task = null;

export function ensure_student_profile_schema() {
  if (!profile_schema_task) {
    profile_schema_task = build_student_profile_schema().catch((err) => {
      profile_schema_task = null;
      throw err;
    });
  }
  return profile_schema_task;
}

async function build_student_profile_schema() {
  log.info("ensure_student_profile_schema", "ensuring student tables");
  const pool = get_pool();
  await pool.query(CREATE_STUDENTS_TABLE);
  await pool.query("ALTER TABLE tbl_students MODIFY email VARCHAR(768) NULL");
  await pool.query("ALTER TABLE tbl_students MODIFY mobile_number VARCHAR(20) NULL");
  for (const [column, definition] of PROFILE_COLUMNS) {
    await add_column(pool, "tbl_students", column, definition);
  }
  await drop_access_code(pool);
  await pool.query(CREATE_STUDENT_LINKS_TABLE);
  await pool.query(CREATE_STUDENT_SKILLS_TABLE);
  await pool.query(CREATE_STUDENT_EXPERIENCES_TABLE);
  await pool.query(CREATE_STUDENT_PROJECTS_TABLE);
  await pool.query(CREATE_STUDENT_ACHIEVEMENTS_TABLE);
  await add_student_links_fk(pool);
  log.pass("ensure_student_profile_schema", "student tables ready");
}

export async function register_student(body, file) {
  const errors = validate_student_registration(body);
  const first_error = Object.values(errors).find(Boolean);
  if (first_error) {
    const error = new Error(first_error);
    error.status = 400;
    throw error;
  }

  await ensure_student_profile_schema();
  const pool = get_pool();

  const first_name = String(body.first_name).trim();
  const last_name = String(body.last_name).trim();
  const email = String(body.email).trim().toLowerCase();
  const mobile = String(body.mobile_number).trim();
  const date_of_birth = String(body.date_of_birth || "").trim() || null;
  const college = String(body.college).trim();
  const higher_study = String(body.higher_study).trim();
  const blood_group = String(body.blood_group || "").trim();
  const address_line = String(body.address_line || "").trim();
  const pincode = String(body.pincode || "").trim();
  const state = String(body.state || "").trim();
  const district = String(body.district || "").trim();
  const password_hash = await hashPassword(body.password);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const student_id = create_student_id(new Date(Date.now() + attempt * 1000));

    try {
      await sqlQuery(
        pool,
        `INSERT INTO tbl_students (
          student_id, first_name, last_name, email, mobile_number,
          password_hash, date_of_birth, college, higher_study, blood_group,
          address_line, pincode, state, district,
          terms_accepted, terms_accepted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
        student_id,
        first_name,
        last_name,
        email,
        mobile,
        password_hash,
        date_of_birth,
        college,
        higher_study,
        blood_group || null,
        address_line || null,
        pincode || null,
        state || null,
        district || null,
        true,
        new Date()]

      );

      let profile_photo_url = "";
      if (file?.buffer) {
        profile_photo_url = await save_student_photo(student_id, file);
        if (profile_photo_url) {
          await sqlQuery(
            pool,
            `UPDATE tbl_students SET profile_photo_url = ? WHERE student_id = ?`,
            [profile_photo_url, student_id]
          );
        }
      }

      log.pass("registerStudent", `created ${student_id}`);
      return {
        student_id: student_id,
        first_name: first_name,
        last_name: last_name,
        email,
        profile_photo_url: profile_photo_url
      };
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        const message = String(err.message || "");
        if (message.includes("email")) {
          const error = new Error("This email is already registered");
          error.status = 409;
          throw error;
        }
        if (message.includes("mobile_number")) {
          const error = new Error("This mobile number is already registered");
          error.status = 409;
          throw error;
        }
        if (message.includes("student_id") && attempt < 7) {
          continue;
        }
      }

      log.fail("registerStudent", err.message);
      throw err;
    }
  }

  const error = new Error("Unable to generate a unique student ID");
  error.status = 500;
  throw error;
}

function invalid_login() {
  const error = new Error("Invalid login credentials. Please try again.");
  error.status = 401;
  return error;
}

export async function login_student(body = {}) {
  const identifier = parse_login_identifier(body.email);
  const password_error = validatePassword(body.password);
  if (identifier.error) {
    const error = new Error(identifier.error);
    error.status = 400;
    throw error;
  }
  if (password_error) {
    const message = password_error === "Password is required" ?
      "Please enter your password." :
      password_error;
    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  const pool = get_pool();
  const lookup =
    identifier.type === "email" ?
      {
        sql: `SELECT student_id, first_name, last_name, email, password_hash, is_active, is_deleted
              FROM tbl_students
              WHERE email = ?
              LIMIT 1`,
        value: identifier.normalized
      } :
      {
        sql: `SELECT student_id, first_name, last_name, email, password_hash, is_active, is_deleted
              FROM tbl_students
              WHERE mobile_number = ?
              LIMIT 1`,
        value: identifier.normalized
      };

  const [rows] = await sqlQuery(pool, lookup.sql, [lookup.value]);

  const student = rows?.[0];
  if (!student || student.is_deleted || !student.is_active) {
    throw invalid_login();
  }

  const matches = await verifyPassword(body.password, student.password_hash);
  if (!matches) {
    throw invalid_login();
  }

  log.pass("loginStudent", `signed in ${student.student_id}`);
  return {
    student_id: student.student_id,
    first_name: student.first_name,
    last_name: student.last_name,
    email: student.email
  };
}

export async function find_active_student_by_email(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;

  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT student_id, first_name, last_name, email, is_active, is_deleted
     FROM tbl_students
     WHERE email = ?
     LIMIT 1`,
    [normalized]
  );

  const student = rows?.[0];
  if (!student || student.is_deleted || !student.is_active) return null;
  return student;
}

export async function update_student_password(student_id, password_hash) {
  const pool = get_pool();
  await sqlQuery(
    pool,
    `UPDATE tbl_students
     SET password_hash = ?
     WHERE student_id = ? AND is_deleted = FALSE AND is_active = TRUE`,
    [password_hash, student_id]
  );
  log.pass("updateStudentPassword", `updated ${student_id}`);
}
