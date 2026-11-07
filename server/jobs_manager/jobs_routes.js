import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, view_access, SCREEN } from "../utils/screen_access.js";
import {
  fresher_quiz_generate,
  fresher_quiz_get,
  fresher_quiz_save,
  jobs_create,
  jobs_delete,
  jobs_import_search,
  jobs_list,
  jobs_update
} from "./jobs_controller.js";

const employee = requireRole("employee");

export function mount_jobs(app) {
  log.info("jobs_manager", "mounting job routes");
  app.get("/api/jobs", employee, view_access[SCREEN.jobs], jobs_list);
  app.post("/api/jobs", employee, edit_access[SCREEN.jobs], jobs_create);
  app.post("/api/jobs/import_search", employee, edit_access[SCREEN.jobs], jobs_import_search);
  app.post("/api/jobs/fresher_quiz/generate", employee, edit_access[SCREEN.jobs], fresher_quiz_generate);
  app.put("/api/jobs/fresher_quiz", employee, edit_access[SCREEN.jobs], fresher_quiz_save);
  app.get("/api/jobs/:jobId/fresher_quiz", employee, view_access[SCREEN.jobs], fresher_quiz_get);
  app.put("/api/jobs/:jobId", employee, edit_access[SCREEN.jobs], jobs_update);
  app.delete("/api/jobs/:jobId", employee, edit_access[SCREEN.jobs], jobs_delete);
}
