import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { employee_login, employee_session } from "./employee_auth_controller.js";

const employee = requireRole("employee");

export function mount_employee_auth(app) {
  log.info("employee_auth_routes", "mounting employee auth routes");
  app.post("/api/auth/employee/login", employee_login);
  app.get("/api/auth/employee/me", employee, employee_session);
}
