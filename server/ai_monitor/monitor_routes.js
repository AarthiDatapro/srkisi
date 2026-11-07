import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { ACCESS, SCREEN, edit_access, require_any_screen, view_access } from "../utils/screen_access.js";
import {
  chats_detail,
  chats_report,
  mock_interviews_certificate,
  mock_interviews_certificate_save,
  mock_interviews_detail,
  mock_interviews_report,
  monitor_options,
  resumes_detail,
  resumes_report
} from "./monitor_controller.js";

const employee = requireRole("employee");
const any_monitor = require_any_screen(
  [SCREEN.mock_interviews, SCREEN.resume_analyser, SCREEN.chatbot_usage],
  ACCESS.view
);

export function mount_ai_monitor(app) {
  log.info("ai_monitor", "mounting AI monitor routes");
  app.get("/api/ai_monitor/options", employee, any_monitor, monitor_options);
  app.get("/api/ai_monitor/mock_interviews", employee, view_access[SCREEN.mock_interviews], mock_interviews_report);
  app.get("/api/ai_monitor/mock_interviews/certificate", employee, view_access[SCREEN.mock_interviews], mock_interviews_certificate);
  app.put("/api/ai_monitor/mock_interviews/certificate", employee, edit_access[SCREEN.mock_interviews], mock_interviews_certificate_save);
  app.get("/api/ai_monitor/mock_interviews/:id", employee, view_access[SCREEN.mock_interviews], mock_interviews_detail);
  app.get("/api/ai_monitor/resumes", employee, view_access[SCREEN.resume_analyser], resumes_report);
  app.get("/api/ai_monitor/resumes/:id", employee, view_access[SCREEN.resume_analyser], resumes_detail);
  app.get("/api/ai_monitor/chats", employee, view_access[SCREEN.chatbot_usage], chats_report);
  app.get("/api/ai_monitor/chats/:id", employee, view_access[SCREEN.chatbot_usage], chats_detail);
}
