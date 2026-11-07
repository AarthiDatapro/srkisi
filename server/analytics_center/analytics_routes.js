import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { ACCESS, SCREEN, require_any_screen, view_access } from "../utils/screen_access.js";
import {
  analytics_scope_get,
  attendance_analytics_get,
  hackathon_analytics_get,
  hackathon_detail_get,
  hackathon_export_get,
  quiz_analytics_get
} from "./analytics_controller.js";

const employee = requireRole("employee");
const any_analytics = require_any_screen([SCREEN.quiz_analytics, SCREEN.attendance_analytics, SCREEN.hackathon_analytics], ACCESS.view);
const hackathon_view = view_access[SCREEN.hackathon_analytics];

export function mount_analytics_center(app) {
  log.info("analytics_center", "mounting analytics routes");
  app.get("/api/analytics_center/scope", employee, any_analytics, analytics_scope_get);
  app.get("/api/analytics_center/quiz", employee, view_access[SCREEN.quiz_analytics], quiz_analytics_get);
  app.get("/api/analytics_center/attendance", employee, view_access[SCREEN.attendance_analytics], attendance_analytics_get);
  app.get("/api/analytics_center/hackathons", employee, hackathon_view, hackathon_analytics_get);
  app.get("/api/analytics_center/hackathons/export", employee, hackathon_view, hackathon_export_get);
  app.get("/api/analytics_center/hackathons/:hackathonId", employee, hackathon_view, hackathon_detail_get);
}
