import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { run_once } from "../utils/run_once.js";

const CREATE_SHARE_LINKS = `
CREATE TABLE IF NOT EXISTS tbl_hackathon_share_links (
    share_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token CHAR(48) NOT NULL UNIQUE,
    cohort_id BIGINT NULL,
    program_id BIGINT NOT NULL,
    created_by BIGINT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`;

export function ensure_showcase_schema() {
  return run_once("showcase_schema", async () => {
    log.info("ensure_showcase_schema", "ensuring showcase tables");
    await get_pool().query(CREATE_SHARE_LINKS);
  });
}
