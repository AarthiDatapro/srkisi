import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";

const CREATE_CERTIFICATES = `
CREATE TABLE IF NOT EXISTS tbl_certificates (
    certificate_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    certificate_name VARCHAR(150) NOT NULL,
    original_filename VARCHAR(255) NULL,
    filename VARCHAR(255) NULL,
    storage_path VARCHAR(500) NULL,
    image_url VARCHAR(1000) NULL,
    image_width INT NOT NULL DEFAULT 0,
    image_height INT NOT NULL DEFAULT 0,
    fields_json JSON NULL,
    assigned_for VARCHAR(40) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL
)
`;

const COPY_TEMPLATES = `
INSERT INTO tbl_certificates (
  certificate_name, original_filename, filename, storage_path, image_url,
  image_width, image_height, fields_json, created_at, updated_at
)
SELECT
  template_name, original_filename, filename, storage_path, image_url,
  image_width, image_height, fields_json, created_at, updated_at
FROM tbl_certificate_templates AS source
WHERE NOT EXISTS (
  SELECT 1 FROM tbl_certificates AS saved
  WHERE saved.image_url <=> source.image_url
    AND saved.certificate_name = source.template_name
)
`;

let ready = null;

export function ensure_certificate_schema() {
  if (!ready) {
    ready = build().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function table_exists(pool, table_name) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [table_name]
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

async function build() {
  const pool = get_pool();
  await pool.query(CREATE_CERTIFICATES);
  await pool.query(
    "ALTER TABLE tbl_certificates ADD COLUMN assigned_for VARCHAR(40) NULL"
  ).catch((err) => {
    if (!/duplicate column/i.test(String(err?.message || err?.sqlMessage || ""))) throw err;
  });
  if (await table_exists(pool, "tbl_certificate_templates")) {
    await pool.query(COPY_TEMPLATES);
  }
  await pool.query("DROP TABLE IF EXISTS tbl_certificate_issuances");
  await pool.query("DROP TABLE IF EXISTS tbl_certificate_sequences");
  await pool.query("DROP TABLE IF EXISTS tbl_certificate_templates");
  await pool.query("DROP TABLE IF EXISTS tbl_certificate_type_fields");
  await pool.query("DROP TABLE IF EXISTS tbl_certificate_eligibility_rules");
  await pool.query("DROP TABLE IF EXISTS tbl_certificate_types");
  log.pass("ensure_certificate_schema", "tbl_certificates ready");
}
