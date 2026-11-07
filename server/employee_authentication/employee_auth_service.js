import { createHash, timingSafeEqual } from "node:crypto";
import { log } from "@datapromr/log";
import { sqlQuery, verifyPassword } from "@datapromr/auth/server";
import { validatePassword } from "@datapromr/validation";
import { validate_email } from "./email.js";
import { get_pool } from "../utils/db_setup.js";
import { ensure_employee_schema } from "../employee_manager/schema.js";
import { list_employee_screens, full_access_screens } from "../utils/screen_access.js";

const MISMATCH = "credentials mismatch";

function digest(value) {
  return createHash("sha256").update(String(value)).digest();
}

function same_secret(left, right) {
  return timingSafeEqual(digest(left), digest(right));
}

function mismatch() {
  const error = new Error(MISMATCH);
  error.status = 401;
  return error;
}

function is_env_admin(email, password) {
  const admin_email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const admin_password = String(process.env.ADMIN_PASSWORD || "");
  if (!admin_email || !admin_password) return false;
  return same_secret(email, admin_email) && same_secret(password, admin_password);
}

export async function login_employee(body = {}) {
  const email_error = validate_email(body.email);
  const password_error = validatePassword(body.password);
  const first_error = email_error || password_error;
  if (first_error) {
    const error = new Error(first_error);
    error.status = 400;
    throw error;
  }

  const email = String(body.email).trim().toLowerCase();
  const password = String(body.password);

  if (is_env_admin(email, password)) {
    log.pass("loginEmployee", `signed in admin ${email}`);
    return {
      email,
      role: "employee",
      is_admin: true,
      screens: full_access_screens()
    };
  }

  await ensure_employee_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT employee_id, first_name, last_name, email, password_hash, is_active, is_deleted
     FROM tbl_employees
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  const employee = rows?.[0];
  if (!employee || employee.is_deleted || !employee.is_active || !employee.password_hash) {
    throw mismatch();
  }

  const matches = await verifyPassword(password, employee.password_hash);
  if (!matches) {
    throw mismatch();
  }

  log.pass("loginEmployee", `signed in employee ${employee.employee_id}`);
  return {
    employee_id: employee.employee_id,
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    role: "employee",
    is_admin: false,
    screens: await list_employee_screens(employee.employee_id)
  };
}

export async function employee_session(user = {}) {
  if (is_env_admin_user(user)) {
    return {
      email: user.email,
      role: "employee",
      is_admin: true,
      screens: full_access_screens()
    };
  }

  const employee_id = Number(user.sub);
  if (!Number.isInteger(employee_id) || employee_id <= 0) {
    const error = new Error("Sign in as an employee to continue");
    error.status = 401;
    throw error;
  }

  await ensure_employee_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT employee_id, first_name, last_name, email, profile_photo_url, is_active, is_deleted
     FROM tbl_employees
     WHERE employee_id = ?
     LIMIT 1`,
    [employee_id]
  );
  const employee = rows?.[0];
  if (!employee || employee.is_deleted || !employee.is_active) {
    const error = new Error("Sign in as an employee to continue");
    error.status = 401;
    throw error;
  }

  return {
    employee_id: employee.employee_id,
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    profile_photo_url: employee.profile_photo_url || "",
    role: "employee",
    is_admin: false,
    screens: await list_employee_screens(employee.employee_id)
  };
}

function is_env_admin_user(user = {}) {
  const admin_email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const email = String(user.email || "").trim().toLowerCase();
  return Boolean(admin_email && email && email === admin_email);
}
