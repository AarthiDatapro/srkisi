import { log } from "@datapromr/log";
import multer from "multer";
import { requireRole } from "@datapromr/auth/server";
import { edit_access, view_access, SCREEN } from "../utils/screen_access.js";
import { send_error } from "../utils/send_error.js";
import {
  attendance_import_check,
  attendance_import_run,
  attendance_template,
  attempt_import_check,
  attempt_import_run,
  attempt_template,
  course_import_check,
  course_import_run,
  course_template,
  quiz_import_check,
  quiz_import_run,
  quiz_template,
  registration_import_check,
  registration_import_run,
  registration_template,
  student_import_check,
  student_import_run,
  student_template } from
"./student_import_controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const employee = requireRole("employee");

function read_workbook(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      err.status = 413;
      err.message = "The workbook is larger than 20 MB.";
    } else {
      err.status = 400;
      err.message = "Unable to read the workbook.";
    }
    return send_error(res, err, "Unable to read the workbook", "api_integration", req);
  });
}

export function mount_api_integration(app) {
  log.info("api_integration", "mounting student import routes");
  app.get(
    "/api/api_integration/quiz_attempts/template",
    employee,
    view_access[SCREEN.api_integration],
    attempt_template
  );
  app.get(
    "/api/api_integration/quizzes/template",
    employee,
    view_access[SCREEN.api_integration],
    quiz_template
  );
  app.get(
    "/api/api_integration/registrations/template",
    employee,
    view_access[SCREEN.api_integration],
    registration_template
  );
  app.get(
    "/api/api_integration/courses/template",
    employee,
    view_access[SCREEN.api_integration],
    course_template
  );
  app.get(
    "/api/api_integration/attendance/template",
    employee,
    view_access[SCREEN.api_integration],
    attendance_template
  );
  app.get(
    "/api/api_integration/students/template",
    employee,
    view_access[SCREEN.api_integration],
    student_template
  );
  app.post(
    "/api/api_integration/quiz_attempts/check",
    employee,
    edit_access[SCREEN.api_integration],
    read_workbook,
    attempt_import_check
  );
  app.post(
    "/api/api_integration/quiz_attempts/import",
    employee,
    edit_access[SCREEN.api_integration],
    attempt_import_run
  );
  app.post(
    "/api/api_integration/quizzes/check",
    employee,
    edit_access[SCREEN.api_integration],
    read_workbook,
    quiz_import_check
  );
  app.post(
    "/api/api_integration/quizzes/import",
    employee,
    edit_access[SCREEN.api_integration],
    quiz_import_run
  );
  app.post(
    "/api/api_integration/registrations/check",
    employee,
    edit_access[SCREEN.api_integration],
    read_workbook,
    registration_import_check
  );
  app.post(
    "/api/api_integration/registrations/import",
    employee,
    edit_access[SCREEN.api_integration],
    registration_import_run
  );
  app.post(
    "/api/api_integration/courses/check",
    employee,
    edit_access[SCREEN.api_integration],
    read_workbook,
    course_import_check
  );
  app.post(
    "/api/api_integration/courses/import",
    employee,
    edit_access[SCREEN.api_integration],
    course_import_run
  );
  app.post(
    "/api/api_integration/attendance/check",
    employee,
    edit_access[SCREEN.api_integration],
    read_workbook,
    attendance_import_check
  );
  app.post(
    "/api/api_integration/attendance/import",
    employee,
    edit_access[SCREEN.api_integration],
    attendance_import_run
  );
  app.post(
    "/api/api_integration/students/check",
    employee,
    edit_access[SCREEN.api_integration],
    read_workbook,
    student_import_check
  );
  app.post(
    "/api/api_integration/students/import",
    employee,
    edit_access[SCREEN.api_integration],
    student_import_run
  );
}
