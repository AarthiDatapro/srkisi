import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import { history_get, history_interview_get, history_resume_get } from "./history_controller.js";

const student = requireRole("student");

export function mount_student_history(app) {
  log.info("student_history", "mounting student history routes");
  app.get("/api/student/history", student, history_get);
  app.get("/api/student/history/mock_interviews/:interviewId", student, history_interview_get);
  app.get("/api/student/history/resumes/:analysisId", student, history_resume_get);
}
