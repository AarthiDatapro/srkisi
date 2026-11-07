import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { admin_home_get } from "./home_controller.js";

const employee = requireRole("employee");

export function mount_admin_home(app) {
  log.info("admin_home_routes", "mounting admin home routes");
  app.get("/api/admin_home", employee, admin_home_get);
}
