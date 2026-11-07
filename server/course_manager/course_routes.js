import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, require_any_screen, view_access, SCREEN } from "../utils/screen_access.js";
import {
  courses_activate,
  courses_analytics,
  courses_assign,
  courses_attendance_get,
  courses_attendance_save,
  courses_create,
  courses_deactivate,
  courses_delete,
  courses_enrollment_export,
  courses_generate_student_ids,
  courses_import_students,
  courses_get,
  courses_list,
  courses_program_passkey,
  courses_remove_student,
  courses_reset_student_password,
  courses_students,
  courses_thumbnail,
  courses_thumbnail_delete,
  courses_update,
  courses_update_student_id,
  courses_update_student_profile } from
"./course_controller.js";

const employee = requireRole("employee");

const sheet_upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, done) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    done(null, allowed.includes(file.mimetype));
  }
});

export function mount_courses(app) {
  log.info("courses_routes", "mounting course routes");
  app.get("/api/courses", employee, require_any_screen([
    SCREEN.courses,
    SCREEN.course_content,
    SCREEN.course_students,
    SCREEN.course_attendance,
    SCREEN.course_feedback,
    SCREEN.course_reports
  ]), courses_list);
  app.get("/api/courses/enrollment_export", employee, require_any_screen([
    SCREEN.courses,
    SCREEN.course_students
  ]), courses_enrollment_export);
  app.post("/api/courses", employee, edit_access[SCREEN.courses], courses_create);
  app.get("/api/courses/:id", employee, view_access[SCREEN.courses], courses_get);
  app.put("/api/courses/:id", employee, edit_access[SCREEN.courses], courses_update);
  app.post("/api/courses/:id/activate", employee, edit_access[SCREEN.courses], courses_activate);
  app.post("/api/courses/:id/deactivate", employee, edit_access[SCREEN.courses], courses_deactivate);
  app.post(
    "/api/courses/:id/thumbnail",
    employee,
    edit_access[SCREEN.courses],
    upload.single("thumbnail"),
    courses_thumbnail
  );
  app.delete("/api/courses/:id/thumbnail", employee, edit_access[SCREEN.courses], courses_thumbnail_delete);
  app.put("/api/courses/:id/programs", employee, edit_access[SCREEN.courses], courses_assign);
  app.put(
    "/api/courses/:id/program_passkey",
    employee,
    edit_access[SCREEN.courses],
    courses_program_passkey
  );
  app.get("/api/courses/:id/analytics", employee, require_any_screen([SCREEN.courses, SCREEN.course_reports]), courses_analytics);
  app.get("/api/courses/:id/students", employee, require_any_screen([SCREEN.course_students, SCREEN.quiz_analytics]), courses_students);
  app.post("/api/courses/:id/students/generate_ids", employee, edit_access[SCREEN.course_students], courses_generate_student_ids);
  app.post(
    "/api/courses/:id/students/import",
    employee,
    edit_access[SCREEN.course_students],
    sheet_upload.single("file"),
    courses_import_students
  );
  app.put("/api/courses/:id/students/:studentId/course_id", employee, edit_access[SCREEN.course_students], courses_update_student_id);
  app.put("/api/courses/:id/students/:studentId", employee, edit_access[SCREEN.course_students], courses_update_student_profile);
  app.post("/api/courses/:id/students/:studentId/reset_password", employee, edit_access[SCREEN.course_students], courses_reset_student_password);
  app.delete("/api/courses/:id/students/:studentId", employee, edit_access[SCREEN.course_students], courses_remove_student);
  app.get("/api/courses/:id/attendance", employee, view_access[SCREEN.course_attendance], courses_attendance_get);
  app.put("/api/courses/:id/attendance", employee, edit_access[SCREEN.course_attendance], courses_attendance_save);
  app.delete("/api/courses/:id", employee, edit_access[SCREEN.courses], courses_delete);
}
