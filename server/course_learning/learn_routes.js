import { log } from "@datapromr/log";
import { requireRole } from "@datapromr/auth/server";
import {
  coding_run,
  coding_submit,
  learn_get,
  lesson_complete,
  lesson_feedback_save,
  lesson_get,
  quiz_get,
  quiz_submit
} from "./learn_controller.js";

const student = requireRole("student");

export function mount_course_learning(app) {
  log.info("course_learning_routes", "mounting course learning routes");
  app.get("/api/student/learn/:courseId", student, learn_get);
  app.get("/api/student/learn/:courseId/lessons/:lessonId", student, lesson_get);
  app.post(
    "/api/student/learn/:courseId/lessons/:lessonId/complete",
    student,
    lesson_complete
  );
  app.post(
    "/api/student/learn/:courseId/lessons/:lessonId/feedback",
    student,
    lesson_feedback_save
  );
  app.get("/api/student/learn/:courseId/quizzes/:quizId", student, quiz_get);
  app.post("/api/student/learn/:courseId/quizzes/:quizId/submit", student, quiz_submit);
  app.post("/api/student/learn/:courseId/exercises/:exerciseId/run", student, coding_run);
  app.post("/api/student/learn/:courseId/exercises/:exerciseId/submit", student, coding_submit);
}
