import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, view_access, SCREEN } from "../utils/screen_access.js";
import {
  cohorts_create,
  cohorts_delete,
  cohorts_get,
  cohorts_list,
  cohorts_program_assign,
  cohorts_program_create,
  cohorts_program_delete,
  cohorts_program_update,
  cohorts_profile,
  cohorts_profile_delete,
  cohorts_thumbnail,
  cohorts_thumbnail_delete,
  cohorts_update } from
"./cohort_controller.js";

const employee = requireRole("employee");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, done) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    done(null, allowed.includes(file.mimetype));
  }
});

export function mount_cohorts(app) {
  log.info("cohort_routes", "mounting cohort routes");
  app.get("/api/cohorts", employee, view_access[SCREEN.cohorts], cohorts_list);
  app.post("/api/cohorts", employee, edit_access[SCREEN.cohorts], cohorts_create);
  app.get("/api/cohorts/:id", employee, view_access[SCREEN.cohorts], cohorts_get);
  app.put("/api/cohorts/:id", employee, edit_access[SCREEN.cohorts], cohorts_update);
  app.delete("/api/cohorts/:id", employee, edit_access[SCREEN.cohorts], cohorts_delete);
  app.post(
    "/api/cohorts/:id/thumbnail",
    employee,
    edit_access[SCREEN.cohorts],
    upload.single("thumbnail"),
    cohorts_thumbnail
  );
  app.delete("/api/cohorts/:id/thumbnail", employee, edit_access[SCREEN.cohorts], cohorts_thumbnail_delete);
  app.post(
    "/api/cohorts/:id/profile",
    employee,
    edit_access[SCREEN.cohorts],
    upload.single("profile"),
    cohorts_profile
  );
  app.delete("/api/cohorts/:id/profile", employee, edit_access[SCREEN.cohorts], cohorts_profile_delete);
  app.post("/api/cohorts/:id/programs", employee, edit_access[SCREEN.cohorts], cohorts_program_create);
  app.post("/api/cohorts/:id/programs/assign", employee, edit_access[SCREEN.cohorts], cohorts_program_assign);
  app.put("/api/cohorts/:id/programs/:programId", employee, edit_access[SCREEN.cohorts], cohorts_program_update);
  app.delete("/api/cohorts/:id/programs/:programId", employee, edit_access[SCREEN.cohorts], cohorts_program_delete);
}
