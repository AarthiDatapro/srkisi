import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, require_any_screen, view_access, SCREEN } from "../utils/screen_access.js";
import {
  programs_activate,
  programs_assign_courses,
  programs_courses,
  programs_create,
  programs_faculty,
  programs_set_faculty,
  programs_deactivate,
  programs_delete,
  programs_get,
  programs_list,
  programs_students,
  programs_thumbnail,
  programs_thumbnail_delete,
  programs_update } from
"./program_controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, done) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    done(null, allowed.includes(file.mimetype));
  }
});

const employee = requireRole("employee");

export function mount_programs(app) {
  log.info("program_routes", "mounting program routes");
  app.get("/api/programs", employee, require_any_screen([
    SCREEN.programs,
    SCREEN.courses,
    SCREEN.course_content,
    SCREEN.course_students,
    SCREEN.course_attendance,
    SCREEN.course_feedback,
    SCREEN.course_reports
  ]), programs_list);
  app.post("/api/programs", employee, edit_access[SCREEN.programs], programs_create);
  app.get("/api/programs/:id", employee, view_access[SCREEN.programs], programs_get);
  app.put("/api/programs/:id", employee, edit_access[SCREEN.programs], programs_update);
  app.post("/api/programs/:id/activate", employee, edit_access[SCREEN.programs], programs_activate);
  app.post("/api/programs/:id/deactivate", employee, edit_access[SCREEN.programs], programs_deactivate);
  app.delete("/api/programs/:id", employee, edit_access[SCREEN.programs], programs_delete);
  app.get("/api/programs/:id/courses", employee, view_access[SCREEN.programs], programs_courses);
  app.get("/api/programs/:id/students", employee, view_access[SCREEN.programs], programs_students);
  app.get("/api/programs/:id/faculty", employee, view_access[SCREEN.programs], programs_faculty);
  app.put("/api/programs/:id/faculty", employee, edit_access[SCREEN.programs], programs_set_faculty);
  app.put("/api/programs/:id/courses", employee, edit_access[SCREEN.programs], programs_assign_courses);
  app.post("/api/programs/:id/thumbnail", employee, edit_access[SCREEN.programs], upload.single("thumbnail"), programs_thumbnail);
  app.delete("/api/programs/:id/thumbnail", employee, edit_access[SCREEN.programs], programs_thumbnail_delete);
}
