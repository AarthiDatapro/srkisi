import { log } from "@datapromr/log";
import { send_error } from "../utils/send_error.js";
import {
  recordFailedLogin,
  recordSuccessfulLogin,
  setAuthCookies,
  signAccessToken,
  signRefreshToken } from
"@datapromr/auth/server";
import { login_employee, employee_session as load_employee_session } from "./employee_auth_service.js";

export async function employee_login(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();

  try {
    const employee = await login_employee(req.body || {});
    recordSuccessfulLogin(email);

    const payload = {
      sub: employee.employee_id ? String(employee.employee_id) : employee.email,
      email: employee.email,
      role: "employee"
    };

    setAuthCookies(res, {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload)
    });

    log.pass("employeeLogin", `logged in ${employee.email}`, req);
    return res.status(200).json(employee);
  } catch (err) {
    const status = Number(err.status) || 500;
    if (email && status === 401) recordFailedLogin(email);
    return send_error(res, err, "Unable to sign in", "employeeLogin", req);
  }
}

export async function employee_session(req, res) {
  try {
    const session = await load_employee_session(req.user || {});
    return res.status(200).json(session);
  } catch (err) {
    return send_error(res, err, "Unable to load session", "employeeSession", req);
  }
}
