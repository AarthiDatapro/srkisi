import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import {
  resume_analysis_create,
  resume_analysis_get,
  resume_analysis_save
} from "./analyser_controller.js";

const student = requireRole("student");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export function mount_student_resume_analyser(app) {
  log.info("student_resume_analyser", "mounting resume analyser routes");
  app.get("/api/student/resume_analysis", student, resume_analysis_get);
  app.post("/api/student/resume_analysis", student, upload.single("file"), resume_analysis_create);
  app.post(
    "/api/student/resume_analysis/:analysis_id/save_profile",
    student,
    upload.single("file"),
    resume_analysis_save
  );
}
