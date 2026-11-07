import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { student_code } from "../utils/student_code.js";
import { ensure_ai_monitor_schema } from "./schema.js";

function clip(value, max) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

export function start_chat_log(req, body = {}) {
  const started = Date.now();
  let first_token_ms = null;
  let answer = "";
  let done = false;

  function mark_token(token) {
    if (first_token_ms == null) first_token_ms = Date.now() - started;
    if (answer.length < 4000) answer += String(token || "");
  }

  async function finish(status = "ok", error_text = "") {
    if (done) return;
    done = true;
    try {
      await ensure_ai_monitor_schema();
      const user = req.user || {};
      const role = String(user.role || "student").slice(0, 20);
      const student_id = role === "student" ? clip(student_code(user), 20) : null;
      await get_pool().query(
        `INSERT INTO tbl_ai_chat_logs
           (student_id, user_role, course_name, topic, question, answer_preview, answer_chars,
            history_turns, fast_mode, first_token_ms, total_ms, status, error_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student_id,
          role,
          clip(body.course_name, 255),
          clip(body.topic, 255),
          clip(body.question, 4000) || "",
          clip(answer, 1500),
          answer.length,
          Array.isArray(body.conversation_history) ? body.conversation_history.length : 0,
          Boolean(body.use_fast_responses),
          first_token_ms,
          Date.now() - started,
          status,
          clip(error_text, 500)
        ]
      );
    } catch (err) {
      log.fail("chat_log", err.message);
    }
  }

  return { mark_token, finish };
}
