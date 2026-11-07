import multer from "multer";
import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, view_access, SCREEN } from "../utils/screen_access.js";
import {
  employees_activate,
  employees_create,
  employees_deactivate,
  employees_delete,
  employees_get,
  employees_list,
  employees_photo,
  employees_photo_delete,
  employees_update } from
"./employee_controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, done) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    done(null, allowed.includes(file.mimetype));
  }
});

const employee = requireRole("employee");

export function mount_employees(app) {
  log.info("employee_routes", "mounting employee routes");
  app.get("/api/employees", employee, view_access[SCREEN.employees], employees_list);
  app.post("/api/employees", employee, edit_access[SCREEN.employees], employees_create);
  app.get("/api/employees/:id", employee, view_access[SCREEN.employees], employees_get);
  app.put("/api/employees/:id", employee, edit_access[SCREEN.employees], employees_update);
  app.post("/api/employees/:id/activate", employee, edit_access[SCREEN.employees], employees_activate);
  app.post("/api/employees/:id/deactivate", employee, edit_access[SCREEN.employees], employees_deactivate);
  app.delete("/api/employees/:id", employee, edit_access[SCREEN.employees], employees_delete);
  app.post("/api/employees/:id/photo", employee, edit_access[SCREEN.employees], upload.single("photo"), employees_photo);
  app.delete("/api/employees/:id/photo", employee, edit_access[SCREEN.employees], employees_photo_delete);
}
