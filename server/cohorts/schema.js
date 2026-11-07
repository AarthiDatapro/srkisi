import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_program_dropdown_schema } from "../dropdown_manager/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";

const CREATE_COHORTS = `
CREATE TABLE IF NOT EXISTS tbl_cohorts (
    cohort_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cohort_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    thumbnail_url VARCHAR(500) NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
)
`;

const CREATE_LINKS = `
CREATE TABLE IF NOT EXISTS tbl_cohort_programs (
    cohort_program_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cohort_id BIGINT NOT NULL,
    program_id BIGINT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cohort_programs_cohort
        FOREIGN KEY (cohort_id) REFERENCES tbl_cohorts(cohort_id),
    CONSTRAINT fk_cohort_programs_program
        FOREIGN KEY (program_id) REFERENCES tbl_programs(program_id)
)
`;

let ready = null;

export function ensure_cohort_schema() {
  if (!ready) {
    ready = build().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function column_names(pool, table) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return new Set((rows || []).map((row) => row.name));
}

async function drop_column(pool, table, column) {
  const names = await column_names(pool, table);
  if (!names.has(column)) return;
  await pool.query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
}

async function build() {
  await ensure_program_dropdown_schema();
  await ensure_registration_schema();
  const pool = get_pool();
  await pool.query(CREATE_COHORTS);
  await pool.query(CREATE_LINKS);

  const link_columns = await column_names(pool, "tbl_cohort_programs");
  const copied = [];
  if (link_columns.has("start_date")) {
    copied.push("p.start_date = COALESCE(p.start_date, cp.start_date)");
  }
  if (link_columns.has("end_date")) {
    copied.push("p.end_date = COALESCE(p.end_date, cp.end_date)");
  }
  if (copied.length) {
    await pool.query(`
      UPDATE tbl_programs p
      INNER JOIN tbl_cohort_programs cp
        ON cp.program_id = p.program_id AND cp.is_deleted = FALSE
      SET ${copied.join(", ")}
    `);
  }

  const cohort_columns = await column_names(pool, "tbl_cohorts");
  if (!cohort_columns.has("profile_url")) {
    await pool.query("ALTER TABLE tbl_cohorts ADD COLUMN profile_url VARCHAR(500) NULL");
  }

  for (const column of ["status", "start_date", "end_date"]) {
    await drop_column(pool, "tbl_cohorts", column);
    await drop_column(pool, "tbl_cohort_programs", column);
  }
  log.pass("ensure_cohort_schema", "cohort tables ready");
}
