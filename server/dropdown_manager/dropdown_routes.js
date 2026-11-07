import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, read_dropdown_catalog, SCREEN } from "../utils/screen_access.js";
import {
  dropdown_activate,
  dropdown_catalog,
  dropdown_create,
  dropdown_deactivate,
  dropdown_delete,
  dropdown_list,
  dropdown_update } from
"./dropdown_controller.js";

const employee = requireRole("employee");

export function mount_dropdowns(app) {
  log.info("dropdown_routes", "mounting dropdown routes");
  app.get("/api/dropdowns", employee, read_dropdown_catalog, dropdown_catalog);
  app.get("/api/dropdowns/:key", employee, read_dropdown_catalog, dropdown_list);
  app.post("/api/dropdowns/:key", employee, edit_access[SCREEN.dropdowns], dropdown_create);
  app.put("/api/dropdowns/:key/:id", employee, edit_access[SCREEN.dropdowns], dropdown_update);
  app.post("/api/dropdowns/:key/:id/activate", employee, edit_access[SCREEN.dropdowns], dropdown_activate);
  app.post("/api/dropdowns/:key/:id/deactivate", employee, edit_access[SCREEN.dropdowns], dropdown_deactivate);
  app.delete("/api/dropdowns/:key/:id", employee, edit_access[SCREEN.dropdowns], dropdown_delete);
}
