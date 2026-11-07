import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { run_once } from "../utils/run_once.js";

const CREATE_TYPES = `
CREATE TABLE IF NOT EXISTS mst_program_types (
    program_type_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    program_type_name VARCHAR(100) NOT NULL UNIQUE,
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

const CREATE_PROGRAMS = `
CREATE TABLE IF NOT EXISTS tbl_programs (
    program_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    program_code VARCHAR(50) NOT NULL UNIQUE,
    program_name VARCHAR(150) NOT NULL,
    program_type_id BIGINT NOT NULL,
    duration_months INT NULL,
    description TEXT NULL,
    thumbnail_url VARCHAR(500) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_programs_program_type
        FOREIGN KEY (program_type_id) REFERENCES mst_program_types(program_type_id)
)
`;

async function column_names(pool, table) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME AS name
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return new Set((rows || []).map((row) => row.name));
}

export function ensure_program_dropdown_schema() {
  return run_once("program_dropdown_schema", ensure_program_dropdown_schema_now);
}

async function ensure_program_dropdown_schema_now() {
  log.info("ensure_program_dropdown_schema", "ensuring program dropdown tables");
  const pool = get_pool();
  await pool.query(CREATE_TYPES);
  await pool.query(`
    INSERT IGNORE INTO mst_program_types (program_type_name) VALUES
      ('Certificate'), ('Diploma'), ('Degree'), ('Workshop'), ('Bootcamp')
  `);

  const names = await column_names(pool, "tbl_programs");
  if (!names.size) {
    await pool.query(CREATE_PROGRAMS);
    log.pass("ensure_program_dropdown_schema", "program tables created");
    return;
  }

  if (names.has("program_type") && !names.has("program_type_id")) {
    await pool.query(`
      INSERT IGNORE INTO mst_program_types (program_type_name)
      SELECT DISTINCT program_type
      FROM tbl_programs
      WHERE program_type IS NOT NULL AND program_type <> ''
    `);
    await pool.query(`ALTER TABLE tbl_programs ADD COLUMN program_type_id BIGINT NULL`);
    await pool.query(`
      UPDATE tbl_programs p
      INNER JOIN mst_program_types t ON t.program_type_name = p.program_type
      SET p.program_type_id = t.program_type_id
    `);
    await pool.query(`
      UPDATE tbl_programs
      SET program_type_id = (
        SELECT program_type_id FROM mst_program_types
        WHERE program_type_name = 'Certificate'
        LIMIT 1
      )
      WHERE program_type_id IS NULL
    `);
    await pool.query(`ALTER TABLE tbl_programs MODIFY program_type_id BIGINT NOT NULL`);
    await pool.query(`ALTER TABLE tbl_programs DROP COLUMN program_type`);
    try {
      await pool.query(`
        ALTER TABLE tbl_programs
        ADD CONSTRAINT fk_programs_program_type
        FOREIGN KEY (program_type_id) REFERENCES mst_program_types(program_type_id)
      `);
    } catch {

      // constraint may already exist
    }
  }

  const current = await column_names(pool, "tbl_programs");
  if (current.size && !current.has("start_date")) {
    await pool.query(`ALTER TABLE tbl_programs ADD COLUMN start_date DATE NULL`);
  }
  if (current.size && !current.has("end_date")) {
    await pool.query(`ALTER TABLE tbl_programs ADD COLUMN end_date DATE NULL`);
  }
  log.pass("ensure_program_dropdown_schema", "program dropdown tables ready");
}
