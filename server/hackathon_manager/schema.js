import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";

const CREATE_HACKATHONS = `
CREATE TABLE IF NOT EXISTS tbl_hackathons (
    hackathon_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    hackathon_type VARCHAR(40) NOT NULL,
    audience VARCHAR(20) NOT NULL,
    cohort_id BIGINT NULL,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    rules TEXT NULL,
    certificate_id BIGINT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_PROGRAMS = `
CREATE TABLE IF NOT EXISTS tbl_hackathon_programs (
    hackathon_program_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    hackathon_id BIGINT NOT NULL,
    program_id BIGINT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_BATCHES = `
CREATE TABLE IF NOT EXISTS tbl_hackathon_batches (
    batch_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    hackathon_id BIGINT NOT NULL,
    batch_name VARCHAR(120) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_BATCH_STUDENTS = `
CREATE TABLE IF NOT EXISTS tbl_hackathon_batch_students (
    batch_student_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    batch_id BIGINT NOT NULL,
    student_id VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_RESPONSES = `
CREATE TABLE IF NOT EXISTS tbl_hackathon_responses (
    response_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    hackathon_id BIGINT NOT NULL,
    student_id VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    item_id BIGINT NOT NULL,
    answer_text MEDIUMTEXT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_ITEMS = `
CREATE TABLE IF NOT EXISTS tbl_hackathon_items (
    item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    hackathon_id BIGINT NOT NULL,
    sort_no INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    marks INT NOT NULL DEFAULT 1,
    body_json JSON NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

let ready = null;

export function ensure_hackathon_schema() {
  if (!ready) {
    ready = build().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function build() {
  const pool = get_pool();
  await pool.query(CREATE_HACKATHONS);
  await pool.query(CREATE_PROGRAMS);
  await pool.query(CREATE_ITEMS);
  await pool.query(CREATE_BATCHES);
  await pool.query(CREATE_BATCH_STUDENTS);
  await pool.query(CREATE_RESPONSES);
  await pool.query("ALTER TABLE tbl_hackathon_batch_students MODIFY student_id VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
  await pool.query("ALTER TABLE tbl_hackathons MODIFY hackathon_type VARCHAR(40) NOT NULL");
  try {
    await pool.query("ALTER TABLE tbl_hackathons ADD COLUMN required_submissions INT NULL AFTER rules");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  try {
    await pool.query("ALTER TABLE tbl_hackathons ADD COLUMN certificate_id BIGINT NULL AFTER required_submissions");
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
  log.pass("ensure_hackathon_schema", "hackathon tables ready");
}
