import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, view_access, SCREEN } from "../utils/screen_access.js";
import { send_error } from "../utils/send_error.js";
import {
  hackathon_batches_list,
  hackathon_batches_save,
  hackathon_students_search,
  hackathons_create,
  hackathons_delete,
  hackathons_generate_coding,
  hackathons_generate_mcq,
  hackathons_get,
  hackathons_list,
  hackathons_options,
  hackathons_update,
  student_hackathons_answer,
  student_hackathons_certificate,
  student_hackathons_file,
  student_hackathons_get,
  student_hackathons_list,
  student_hackathons_project,
  student_hackathons_run,
  student_hackathons_submit_code
} from "./hackathon_controller.js";

const employee = requireRole("employee");
const student = requireRole("student");
const project_zip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }
});

function accept_project_zip(req, res, next) {
  project_zip.single("file")(req, res, (err) => {
    if (!err) return next();
    const error = new Error(err.code === "LIMIT_FILE_SIZE" ? "Zip must be under 1 MB" : "Only a .zip file is allowed");
    error.status = 400;
    return send_error(res, error, "Unable to submit this project", "hackathon_manager", req);
  });
}

export function mount_hackathons(app) {
  log.info("hackathon_manager", "mounting hackathon routes");
  app.get("/api/student/hackathons", student, student_hackathons_list);
  app.get("/api/student/hackathons/:hackathonId/certificate", student, student_hackathons_certificate);
  app.get("/api/student/hackathons/:hackathonId", student, student_hackathons_get);
  app.put("/api/student/hackathons/:hackathonId/items/:itemId", student, student_hackathons_answer);
  app.post("/api/student/hackathons/:hackathonId/items/:itemId/run", student, student_hackathons_run);
  app.post("/api/student/hackathons/:hackathonId/items/:itemId/submit_code", student, student_hackathons_submit_code);
  app.post("/api/student/hackathons/:hackathonId/items/:itemId/project", student, accept_project_zip, student_hackathons_project);
  app.get("/api/student/hackathons/:hackathonId/items/:itemId/file", student, student_hackathons_file);
  app.get("/api/hackathon_manager/options", employee, view_access[SCREEN.hackathons], hackathons_options);
  app.get("/api/hackathon_manager", employee, view_access[SCREEN.hackathons], hackathons_list);
  app.get("/api/hackathon_manager/:hackathonId/batches", employee, view_access[SCREEN.hackathons], hackathon_batches_list);
  app.get("/api/hackathon_manager/:hackathonId/students", employee, view_access[SCREEN.hackathons], hackathon_students_search);
  app.post("/api/hackathon_manager/:hackathonId/batches", employee, edit_access[SCREEN.hackathons], hackathon_batches_save);
  app.put("/api/hackathon_manager/:hackathonId/batches/:batchId", employee, edit_access[SCREEN.hackathons], hackathon_batches_save);
  app.get("/api/hackathon_manager/:hackathonId", employee, view_access[SCREEN.hackathons], hackathons_get);
  app.post("/api/hackathon_manager", employee, edit_access[SCREEN.hackathons], hackathons_create);
  app.put("/api/hackathon_manager/:hackathonId", employee, edit_access[SCREEN.hackathons], hackathons_update);
  app.delete("/api/hackathon_manager/:hackathonId", employee, edit_access[SCREEN.hackathons], hackathons_delete);
  app.post("/api/hackathon_manager/generate_mcq", employee, edit_access[SCREEN.hackathons], hackathons_generate_mcq);
  app.post("/api/hackathon_manager/generate_coding", employee, edit_access[SCREEN.hackathons], hackathons_generate_coding);
}
