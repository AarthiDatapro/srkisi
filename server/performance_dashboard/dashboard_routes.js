import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { view_access, SCREEN } from "../utils/screen_access.js";
import { performance_dashboard_get } from "./dashboard_controller.js";

const employee = requireRole("employee");

export function mount_performance_dashboard(app) {
  log.info("performance_dashboard_routes", "mounting performance dashboard routes");
  app.get(
    "/api/performance_dashboard",
    employee,
    view_access[SCREEN.performance],
    performance_dashboard_get
  );
}
