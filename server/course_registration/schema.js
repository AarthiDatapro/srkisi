import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_course_schema } from "../course_manager/schema.js";
import { add_column, add_fk } from "../utils/schema_ddl.js";

const CREATE_REGISTRATIONS = `
CREATE TABLE IF NOT EXISTS tbl_course_registrations (
    registration_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    course_id BIGINT NOT NULL,
    program_id BIGINT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'registered',
    learning_status VARCHAR(30) NOT NULL DEFAULT 'not_started',
    progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    last_accessed_at DATETIME NULL,
    course_student_id VARCHAR(40) NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
)
`;

const CREATE_WISHLIST = `
CREATE TABLE IF NOT EXISTS tbl_course_wishlist (
    wishlist_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    course_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_course_wishlist UNIQUE (student_id, course_id)
)
`;

export async function ensure_registration_schema() {
  log.info("ensure_registration_schema", "ensuring registration tables");
  await ensure_course_schema();
  const pool = get_pool();

  await pool.query(CREATE_REGISTRATIONS);
  await pool.query(CREATE_WISHLIST);

  await add_column(pool, "tbl_course_registrations", "learning_status", "VARCHAR(30) NOT NULL DEFAULT 'not_started'");
  await add_column(pool, "tbl_course_registrations", "progress_percent", "DECIMAL(5,2) NOT NULL DEFAULT 0");
  await add_column(pool, "tbl_course_registrations", "last_accessed_at", "DATETIME NULL");
  await add_column(pool, "tbl_course_registrations", "course_student_id", "VARCHAR(40) NULL");

  try {
    await pool.query(`
      CREATE UNIQUE INDEX uq_course_student_code
      ON tbl_course_registrations (course_id, course_student_id)
    `);
  } catch {

    // index may already exist
  }
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_registrations
     ADD CONSTRAINT fk_course_registrations_student
     FOREIGN KEY (student_id) REFERENCES tbl_students(student_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_registrations
     ADD CONSTRAINT fk_course_registrations_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_registrations
     ADD CONSTRAINT fk_course_registrations_program
     FOREIGN KEY (program_id) REFERENCES tbl_programs(program_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_wishlist
     ADD CONSTRAINT fk_course_wishlist_student
     FOREIGN KEY (student_id) REFERENCES tbl_students(student_id)`
  );
  await add_fk(
    pool,
    `ALTER TABLE tbl_course_wishlist
     ADD CONSTRAINT fk_course_wishlist_course
     FOREIGN KEY (course_id) REFERENCES tbl_courses(course_id)`
  );
  log.pass("ensure_registration_schema", "registration tables ready");
}
