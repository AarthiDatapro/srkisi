import { log } from "@datapromr/log";
import { send_error } from "../utils/send_error.js";
import {
  recordFailedLogin,
  recordSuccessfulLogin,
  setAuthCookies,
  signAccessToken,
  signRefreshToken } from
"@datapromr/auth/server";
import { login_rate_limit_key } from "./login_identifier.js";
import { login_student, register_student } from "./student_auth_service.js";

export async function student_register(req, res) {
  try {
    const student = await register_student(req.body || {}, req.file);
    log.pass("studentRegister", `registered ${student.student_id}`, req);
    return res.status(201).json(student);
  } catch (err) {
    return send_error(res, err, "Unable to register student", "studentRegister", req);
  }
}

export async function student_login(req, res) {
  const login_key = login_rate_limit_key(req.body?.email);

  try {
    const student = await login_student(req.body || {});
    recordSuccessfulLogin(login_key);

    const payload = {
      sub: student.student_id,
      email: student.email,
      role: "student"
    };

    setAuthCookies(res, {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload)
    });

    log.pass("studentLogin", `logged in ${student.student_id}`, req);
    return res.status(200).json(student);
  } catch (err) {
    const status = Number(err.status) || 500;
    if (login_key && status === 401) recordFailedLogin(login_key);
    return send_error(res, err, "Unable to sign in", "studentLogin", req);
  }
}
