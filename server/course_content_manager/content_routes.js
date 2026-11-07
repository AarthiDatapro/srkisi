import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, require_any_screen, view_access, SCREEN } from "../utils/screen_access.js";
import {
  lesson_done_list,
  lesson_done_set } from
"./lesson_done_controller.js";
import {
  content_get,
  daily_reports_create,
  daily_reports_delete,
  daily_reports_get,
  daily_reports_list,
  daily_reports_pdf,
  daily_reports_photos,
  daily_reports_update,
  daily_reports_upload,
  feedback_questions_get,
  feedback_questions_reset,
  feedback_questions_save,
  items_create,
  items_delete,
  items_update,
  lesson_feedback_list,
  lessons_create,
  lessons_delete,
  lessons_update,
  modules_create,
  modules_delete,
  modules_update,
  coding_create,
  coding_delete,
  quizzes_create,
  quizzes_delete,
  quizzes_get,
  quizzes_sheet,
  quizzes_update,
  content_reorder } from
"./content_controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 }
});

const employee = requireRole("employee");

export function mount_course_content(app) {
  log.info("course_content_routes", "mounting course content routes");
  app.get("/api/courses/:courseId/content", employee, view_access[SCREEN.course_content], content_get);
  app.get("/api/courses/:courseId/lesson_done", employee, view_access[SCREEN.course_content], lesson_done_list);
  app.put(
    "/api/courses/:courseId/lessons/:lessonId/done",
    employee,
    edit_access[SCREEN.course_content],
    lesson_done_set
  );
  app.put("/api/courses/:courseId/content/reorder", employee, edit_access[SCREEN.course_content], content_reorder);
  app.post("/api/courses/:courseId/modules", employee, edit_access[SCREEN.course_content], modules_create);
  app.put("/api/courses/:courseId/modules/:moduleId", employee, edit_access[SCREEN.course_content], modules_update);
  app.delete("/api/courses/:courseId/modules/:moduleId", employee, edit_access[SCREEN.course_content], modules_delete);
  app.post("/api/courses/:courseId/lessons", employee, edit_access[SCREEN.course_content], lessons_create);
  app.post("/api/courses/:courseId/quizzes", employee, edit_access[SCREEN.course_content], quizzes_create);
  app.post("/api/courses/:courseId/coding", employee, edit_access[SCREEN.course_content], coding_create);
  app.delete("/api/courses/:courseId/coding/:codingSetId", employee, edit_access[SCREEN.course_content], coding_delete);
  app.get("/api/courses/:courseId/quizzes/:quizId/analytics", employee, require_any_screen([SCREEN.course_content, SCREEN.quiz_analytics]), quizzes_sheet);
  app.get("/api/courses/:courseId/quizzes/:quizId", employee, view_access[SCREEN.course_content], quizzes_get);
  app.put("/api/courses/:courseId/quizzes/:quizId", employee, edit_access[SCREEN.course_content], quizzes_update);
  app.delete("/api/courses/:courseId/quizzes/:quizId", employee, edit_access[SCREEN.course_content], quizzes_delete);
  app.put("/api/courses/:courseId/lessons/:lessonId", employee, edit_access[SCREEN.course_content], lessons_update);
  app.delete("/api/courses/:courseId/lessons/:lessonId", employee, edit_access[SCREEN.course_content], lessons_delete);
  app.post(
    "/api/courses/:courseId/lessons/:lessonId/items",
    employee,
    edit_access[SCREEN.course_content],
    upload.single("file"),
    items_create
  );
  app.put(
    "/api/courses/:courseId/lessons/:lessonId/items/:itemId",
    employee,
    edit_access[SCREEN.course_content],
    items_update
  );
  app.delete(
    "/api/courses/:courseId/lessons/:lessonId/items/:itemId",
    employee,
    edit_access[SCREEN.course_content],
    items_delete
  );
  app.get(
    "/api/courses/:courseId/lessons/:lessonId/feedback",
    employee,
    require_any_screen([SCREEN.course_content, SCREEN.course_feedback]),
    lesson_feedback_list
  );
  app.get(
    "/api/courses/:courseId/feedback_questions",
    employee,
    view_access[SCREEN.course_feedback],
    feedback_questions_get
  );
  app.put(
    "/api/courses/:courseId/feedback_questions",
    employee,
    edit_access[SCREEN.course_feedback],
    feedback_questions_save
  );
  app.post(
    "/api/courses/:courseId/feedback_questions/reset",
    employee,
    edit_access[SCREEN.course_feedback],
    feedback_questions_reset
  );
  app.get("/api/courses/:courseId/daily_reports", employee, view_access[SCREEN.course_reports], daily_reports_list);
  app.post("/api/courses/:courseId/daily_reports", employee, edit_access[SCREEN.course_reports], daily_reports_create);
  app.post(
    "/api/courses/:courseId/daily_reports/upload",
    employee,
    edit_access[SCREEN.course_reports],
    upload.single("file"),
    daily_reports_upload
  );
  app.get("/api/courses/:courseId/daily_reports/:reportId", employee, view_access[SCREEN.course_reports], daily_reports_get);
  app.put("/api/courses/:courseId/daily_reports/:reportId", employee, edit_access[SCREEN.course_reports], daily_reports_update);
  app.delete("/api/courses/:courseId/daily_reports/:reportId", employee, edit_access[SCREEN.course_reports], daily_reports_delete);
  app.get("/api/courses/:courseId/daily_reports/:reportId/pdf", employee, view_access[SCREEN.course_reports], daily_reports_pdf);
  app.post(
    "/api/courses/:courseId/daily_reports/:reportId/photos",
    employee,
    edit_access[SCREEN.course_reports],
    upload.array("photos", 8),
    daily_reports_photos
  );
}
