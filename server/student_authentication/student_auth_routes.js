import { log } from "@datapromr/log";
import multer from "multer";
import { SECURITY, hashPassword } from "@datapromr/auth/server";
import {
  createForgotPasswordRouter,
  registerPublicPaths } from
"@datapromr/forget-password/server";
import { student_login, student_register } from "./student_auth_controller.js";
import { mount_google_auth } from "./google/google_auth_routes.js";
import {
  find_active_student_by_email,
  update_student_password } from
"./student_auth_service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const FORGOT_PASSWORD_BASE = "/api/auth/student/forgot_password";

export function mount_student_auth(app) {
  log.info("student_auth_routes", "mounting student auth routes");
  registerPublicPaths(SECURITY, FORGOT_PASSWORD_BASE);

  app.post("/api/auth/student/register", upload.single("photo"), student_register);
  app.post("/api/auth/student/login", student_login);
  mount_google_auth(app);
  app.use(
    FORGOT_PASSWORD_BASE,
    createForgotPasswordRouter({
      appName: "SRKISI",
      revealUnknownEmail: true,
      async findAccount(email) {
        const student = await find_active_student_by_email(email);
        if (!student) return null;
        return {
          id: student.student_id,
          email: student.email,
          name: student.first_name
        };
      },
      async updatePassword(account, password) {
        await update_student_password(account.id, await hashPassword(password));
      }
    })
  );
}
