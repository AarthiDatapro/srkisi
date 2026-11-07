import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import {
  mock_interview_answer,
  mock_interview_certificate,
  mock_interview_current,
  mock_interview_delete,
  mock_interview_finish,
  mock_interview_get,
  mock_interview_list,
  mock_interview_photo_save,
  mock_interview_photo_status,
  mock_interview_reattempt,
  mock_interview_resume,
  mock_interview_retry,
  mock_interview_start,
  open_jobs_list,
  student_fresher_attempt_delete,
  student_fresher_quiz_get,
  student_fresher_quiz_save,
  student_fresher_quiz_start,
  student_fresher_quiz_submit
} from "./interview_controller.js";

const student = requireRole("student");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const audio_upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

export function mount_student_mock_interview(app) {
  log.info("student_mock_interview", "mounting mock interview routes");
  app.get("/api/student/jobs", student, open_jobs_list);
  app.get("/api/student/jobs/:jobId/fresher_quiz", student, student_fresher_quiz_get);
  app.post("/api/student/jobs/:jobId/fresher_quiz/start", student, student_fresher_quiz_start);
  app.put("/api/student/jobs/:jobId/fresher_quiz/progress", student, student_fresher_quiz_save);
  app.post("/api/student/jobs/:jobId/fresher_quiz/submit", student, student_fresher_quiz_submit);
  app.delete("/api/student/fresher_attempts/:attemptId", student, student_fresher_attempt_delete);
  app.get("/api/student/mock_interview/current", student, mock_interview_current);
  app.get("/api/student/mock_interviews", student, mock_interview_list);
  app.get("/api/student/mock_interview/profile_photo", student, mock_interview_photo_status);
  app.post("/api/student/mock_interview/profile_photo", student, upload.single("photo"), mock_interview_photo_save);
  app.post("/api/student/mock_interview", student, upload.single("file"), mock_interview_start);
  app.get("/api/student/mock_interview/:mockInterviewId", student, mock_interview_get);
  app.get("/api/student/mock_interview/:mockInterviewId/certificate", student, mock_interview_certificate);
  app.delete("/api/student/mock_interview/:mockInterviewId", student, mock_interview_delete);
  app.post("/api/student/mock_interview/:mockInterviewId/resume", student, mock_interview_resume);
  app.post("/api/student/mock_interview/:mockInterviewId/retry", student, mock_interview_retry);
  app.post("/api/student/mock_interview/:mockInterviewId/reattempt", student, audio_upload.single("audio"), mock_interview_reattempt);
  app.post("/api/student/mock_interview/:mockInterviewId/answer", student, audio_upload.single("audio"), mock_interview_answer);
  app.post("/api/student/mock_interview/:mockInterviewId/finish", student, mock_interview_finish);
}
