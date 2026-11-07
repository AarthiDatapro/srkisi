import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";

const CREATE_CHAT_LOGS = `
CREATE TABLE IF NOT EXISTS tbl_ai_chat_logs (
    chat_log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    user_role VARCHAR(20) NOT NULL DEFAULT 'student',
    course_name VARCHAR(255) NULL,
    topic VARCHAR(255) NULL,
    question TEXT NOT NULL,
    answer_preview TEXT NULL,
    answer_chars INT NOT NULL DEFAULT 0,
    history_turns INT NOT NULL DEFAULT 0,
    fast_mode BOOLEAN NOT NULL DEFAULT FALSE,
    first_token_ms INT NULL,
    total_ms INT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ok',
    error_text VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_ai_chat_logs_created (created_at),
    KEY idx_ai_chat_logs_student (student_id, created_at)
)
`;

let ready = null;

export function ensure_ai_monitor_schema() {
  if (!ready) {
    ready = get_pool().query(CREATE_CHAT_LOGS).then(() => {
      log.pass("ensure_ai_monitor_schema", "chat log table ready");
    }).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
