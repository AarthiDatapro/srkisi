import { hashPassword, sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import {
  validateDateOfBirth,
  validateMobile,
  validateOptionalText,
  validatePassword,
  validatePersonName,
  validatePositiveInteger,
  validateRequiredDate } from
"@datapromr/validation";
import { validate_email } from "./email.js";
import { get_pool } from "../utils/db_setup.js";
import { list_employee_screens, replace_employee_screens } from "../utils/screen_access.js";
import { ensure_employee_schema } from "./schema.js";
import { save_employee_photo } from "./employee_image.js";
import { delete_stored_file, forget_stored_file } from "../utils/storage_buckets.js";
import { create_stamp_code } from "../utils/codes.js";

const SORTS = {
  name: "e.first_name",
  code: "e.employee_code",
  department: "d.department_name",
  designation: "des.designation_name",
  date: "e.created_at",
  status: "e.is_active"
};

const EMPLOYEE_SELECT = `
  e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
  e.gender_id, g.gender_name AS gender, e.date_of_birth,
  e.employee_type_id, et.employee_type_name AS employee_type,
  e.department_id, d.department_name AS department,
  e.designation_id, des.designation_name AS designation,
  e.employment_type_id, emp.employment_type_name AS employment_type,
  e.joining_date, e.email, e.mobile_number, e.alternate_phone,
  e.address_line_1, e.address_line_2, e.city, e.state, e.country, e.postal_code,
  e.reporting_manager_id,
  TRIM(CONCAT_WS(' ', rm.first_name, rm.last_name)) AS reporting_manager,
  e.location_id, loc.location_name AS location,
  e.profile_photo_url, e.is_active, e.created_at, e.updated_at
`;

const EMPLOYEE_FROM = `
  FROM tbl_employees e
  LEFT JOIN mst_genders g ON g.gender_id = e.gender_id
  LEFT JOIN mst_employee_types et ON et.employee_type_id = e.employee_type_id
  LEFT JOIN mst_departments d ON d.department_id = e.department_id
  LEFT JOIN mst_designations des ON des.designation_id = e.designation_id
  LEFT JOIN mst_employment_types emp ON emp.employment_type_id = e.employment_type_id
  LEFT JOIN mst_locations loc ON loc.location_id = e.location_id
  LEFT JOIN tbl_employees rm ON rm.employee_id = e.reporting_manager_id
`;

export function create_employee_code(date = new Date()) {
  return create_stamp_code("EMP", date);
}

export function full_name(row) {
  return [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" ");
}

function iso_date(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function validate_employee(body = {}, { password_required = false } = {}) {
  const alternate = String(body.alternate_phone || "").trim();
  const dob = String(body.date_of_birth || "").trim();
  const password = String(body.password || "");
  const confirm = String(body.confirm_password || "");
  const needs_password = password_required || Boolean(password);
  return {
    first_name: validatePersonName(body.first_name, "First name"),
    middle_name: String(body.middle_name || "").trim() ?
    validatePersonName(body.middle_name, "Middle name") :
    "",
    last_name: validatePersonName(body.last_name, "Last name"),
    gender_id: validatePositiveInteger(body.gender_id, "Gender", false),
    date_of_birth: dob ? validateDateOfBirth(body.date_of_birth) : "",
    email: validate_email(body.email),
    mobile_number: validateMobile(body.mobile_number),
    alternate_phone: alternate ? validateMobile(body.alternate_phone) : "",
    employee_type_id: validatePositiveInteger(body.employee_type_id, "Employee type", true),
    department_id: validatePositiveInteger(body.department_id, "Department", true),
    designation_id: validatePositiveInteger(body.designation_id, "Designation", true),
    employment_type_id: validatePositiveInteger(body.employment_type_id, "Employment type", false),
    joining_date: validateRequiredDate(body.joining_date, "Joining date"),
    location_id: validatePositiveInteger(body.location_id, "Location", false),
    reporting_manager_id: validatePositiveInteger(body.reporting_manager_id, "Reporting manager", false),
    address_line_1: validateOptionalText(body.address_line_1, "Address line 1", 255),
    address_line_2: validateOptionalText(body.address_line_2, "Address line 2", 255),
    city: validateOptionalText(body.city, "City", 100),
    state: validateOptionalText(body.state, "State", 100),
    country: validateOptionalText(body.country, "Country", 100),
    postal_code: validateOptionalText(body.postal_code, "Postal code", 20),
    password: needs_password ? validatePassword(password) : "",
    confirm_password: needs_password ?
    confirm ?
    confirm === password ?
    "" :
    "Passwords do not match" :
    "Confirm password is required" :
    ""
  };
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function first_validation_error(body, options) {
  const errors = validate_employee(body, options);
  return Object.values(errors).find(Boolean) || "";
}

function map_row(row) {
  return {
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    first_name: row.first_name,
    middle_name: row.middle_name || "",
    last_name: row.last_name,
    full_name: full_name(row),
    gender_id: row.gender_id || "",
    gender: row.gender || "",
    date_of_birth: iso_date(row.date_of_birth),
    employee_type_id: row.employee_type_id,
    employee_type: row.employee_type,
    department_id: row.department_id,
    department: row.department,
    designation_id: row.designation_id,
    designation: row.designation,
    employment_type_id: row.employment_type_id || "",
    employment_type: row.employment_type || "",
    joining_date: iso_date(row.joining_date),
    email: row.email,
    mobile_number: row.mobile_number,
    alternate_phone: row.alternate_phone || "",
    address_line_1: row.address_line_1 || "",
    address_line_2: row.address_line_2 || "",
    city: row.city || "",
    state: row.state || "",
    country: row.country || "",
    postal_code: row.postal_code || "",
    reporting_manager_id: row.reporting_manager_id || "",
    reporting_manager: row.reporting_manager || "",
    location_id: row.location_id || "",
    location: row.location || "",
    profile_photo_url: row.profile_photo_url,
    is_active: Boolean(row.is_active),
    screens: [],
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function require_master(pool, table, id_column, id, label) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${id_column} FROM ${table}
     WHERE ${id_column} = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  if (!rows?.[0]) throw fail(`Select a valid ${label}`);
}

export async function list_employees(query = {}) {
  await ensure_employee_schema();
  const search = String(query.search || "").trim();
  const department_id = String(query.department || "").trim();
  const type_id = String(query.type || "").trim();
  const status = String(query.status || "").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const page_size = Math.min(500, Math.max(5, Number(query.pageSize) || 10));
  const sort = SORTS[query.sort] || "e.created_at";
  const direction = String(query.dir).toLowerCase() === "asc" ? "ASC" : "DESC";
  const like = `%${search}%`;
  const pool = get_pool();

  const where = ["e.is_deleted = FALSE"];
  const params = [];

  if (search) {
    where.push(`(
      e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?
      OR e.email LIKE ? OR e.mobile_number LIKE ?
    )`);
    params.push(like, like, like, like, like);
  }

  if (department_id) {
    where.push("e.department_id = ?");
    params.push(Number(department_id));
  }

  if (type_id) {
    where.push("e.employee_type_id = ?");
    params.push(Number(type_id));
  }

  if (status === "active") where.push("e.is_active = TRUE");
  if (status === "inactive") where.push("e.is_active = FALSE");

  const where_sql = where.join(" AND ");
  const offset = (page - 1) * page_size;

  const [count_rows] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_employees e WHERE ${where_sql}`,
    params
  );
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${EMPLOYEE_SELECT}
     ${EMPLOYEE_FROM}
     WHERE ${where_sql}
     ORDER BY ${sort} ${direction}
     LIMIT ${page_size} OFFSET ${offset}`,
    params
  );

  return {
    items: (rows || []).map(map_row),
    total: Number(count_rows?.[0]?.total || 0),
    page,
    page_size
  };
}

export async function get_employee(id) {
  await ensure_employee_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${EMPLOYEE_SELECT}
     ${EMPLOYEE_FROM}
     WHERE e.employee_id = ? AND e.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Employee not found", 404);
  const employee = map_row(row);
  employee.screens = await list_employee_screens(employee.employee_id);
  return employee;
}

async function optional_master(pool, table, id_column, id, label) {
  if (!id) return null;
  await require_master(pool, table, id_column, id, label);
  return id;
}

function optional_id(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function optional_text(value) {
  const text = String(value || "").trim();
  return text || null;
}

function is_active_value(value) {
  return value === false || value === "false" || value === 0 || value === "0" ? false : true;
}

async function write_masters(pool, body, employee_id = null) {
  const type_id = Number(body.employee_type_id);
  const department_id = Number(body.department_id);
  const designation_id = Number(body.designation_id);
  await require_master(pool, "mst_employee_types", "employee_type_id", type_id, "employee type");
  await require_master(pool, "mst_departments", "department_id", department_id, "department");
  await require_master(pool, "mst_designations", "designation_id", designation_id, "designation");

  const gender_id = await optional_master(
    pool,
    "mst_genders",
    "gender_id",
    optional_id(body.gender_id),
    "gender"
  );
  const employment_type_id = await optional_master(
    pool,
    "mst_employment_types",
    "employment_type_id",
    optional_id(body.employment_type_id),
    "employment type"
  );
  const location_id = await optional_master(
    pool,
    "mst_locations",
    "location_id",
    optional_id(body.location_id),
    "location"
  );

  const manager_id = optional_id(body.reporting_manager_id);
  if (manager_id) {
    if (employee_id && manager_id === Number(employee_id)) {
      throw fail("An employee cannot report to themselves");
    }
    await get_employee(manager_id);
  }

  return {
    type_id,
    department_id,
    designation_id,
    gender_id,
    employment_type_id,
    location_id,
    manager_id
  };
}

function payload(body, ids) {
  return {
    first_name: String(body.first_name).trim(),
    middle_name: optional_text(body.middle_name),
    last_name: String(body.last_name).trim(),
    gender_id: ids.gender_id,
    date_of_birth: optional_text(body.date_of_birth),
    employee_type_id: ids.type_id,
    department_id: ids.department_id,
    designation_id: ids.designation_id,
    employment_type_id: ids.employment_type_id,
    joining_date: String(body.joining_date).trim(),
    email: String(body.email).trim().toLowerCase(),
    mobile_number: String(body.mobile_number).trim(),
    alternate_phone: optional_text(body.alternate_phone),
    address_line_1: optional_text(body.address_line_1),
    address_line_2: optional_text(body.address_line_2),
    city: optional_text(body.city),
    state: optional_text(body.state),
    country: optional_text(body.country),
    postal_code: optional_text(body.postal_code),
    reporting_manager_id: ids.manager_id,
    location_id: ids.location_id,
    is_active: is_active_value(body.is_active)
  };
}

export async function create_employee(body = {}) {
  const first_error = first_validation_error(body, { passwordRequired: true });
  if (first_error) throw fail(first_error);

  await ensure_employee_schema();
  const pool = get_pool();
  const ids = await write_masters(pool, body);
  const data = payload(body, ids);
  const password_hash = await hashPassword(body.password);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = create_employee_code(new Date(Date.now() + attempt * 1000));
    try {
      const [result] = await sqlQuery(
        pool,
        `INSERT INTO tbl_employees (
          employee_code, first_name, middle_name, last_name,
          gender_id, date_of_birth,
          employee_type_id, department_id, designation_id, employment_type_id,
          joining_date, email, password_hash, mobile_number, alternate_phone,
          address_line_1, address_line_2, city, state, country, postal_code,
          reporting_manager_id, location_id, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
        code,
        data.first_name,
        data.middle_name,
        data.last_name,
        data.gender_id,
        data.date_of_birth,
        data.employee_type_id,
        data.department_id,
        data.designation_id,
        data.employment_type_id,
        data.joining_date,
        data.email,
        password_hash,
        data.mobile_number,
        data.alternate_phone,
        data.address_line_1,
        data.address_line_2,
        data.city,
        data.state,
        data.country,
        data.postal_code,
        data.reporting_manager_id,
        data.location_id,
        data.is_active]

      );
      log.pass("createEmployee", `created ${code}`);
      await replace_employee_screens(result.insertId, body.screens);
      return get_employee(result.insertId);
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        if (String(err.message).includes("email")) throw fail("This email is already in use");
        if (String(err.message).includes("employee_code") && attempt < 4) continue;
      }
      log.fail("createEmployee", err.message);
      throw err;
    }
  }

  throw fail("Unable to generate a unique employee code", 500);
}

export async function update_employee(id, body = {}) {
  const first_error = first_validation_error(body);
  if (first_error) throw fail(first_error);
  await get_employee(id);

  const pool = get_pool();
  const ids = await write_masters(pool, body, id);
  const data = payload(body, ids);
  const password_hash = String(body.password || "").trim() ?
  await hashPassword(body.password) :
  null;

  try {
    await sqlQuery(
      pool,
      `UPDATE tbl_employees
       SET first_name = ?, middle_name = ?, last_name = ?,
           gender_id = ?, date_of_birth = ?,
           employee_type_id = ?, department_id = ?, designation_id = ?, employment_type_id = ?,
           joining_date = ?, email = ?, mobile_number = ?, alternate_phone = ?,
           address_line_1 = ?, address_line_2 = ?, city = ?, state = ?, country = ?, postal_code = ?,
           reporting_manager_id = ?, location_id = ?, is_active = ?
           ${password_hash ? ", password_hash = ?" : ""}
       WHERE employee_id = ? AND is_deleted = FALSE`,
      [
      data.first_name,
      data.middle_name,
      data.last_name,
      data.gender_id,
      data.date_of_birth,
      data.employee_type_id,
      data.department_id,
      data.designation_id,
      data.employment_type_id,
      data.joining_date,
      data.email,
      data.mobile_number,
      data.alternate_phone,
      data.address_line_1,
      data.address_line_2,
      data.city,
      data.state,
      data.country,
      data.postal_code,
      data.reporting_manager_id,
      data.location_id,
      data.is_active,
      ...(password_hash ? [password_hash] : []),
      id]

    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") throw fail("This email is already in use");
    throw err;
  }

  log.pass("updateEmployee", `updated ${id}`);
  if (body.screens !== undefined) {
    await replace_employee_screens(id, body.screens);
  }
  return get_employee(id);
}

export async function set_employee_active(id, is_active) {
  await get_employee(id);
  const pool = get_pool();
  await sqlQuery(
    pool,
    `UPDATE tbl_employees SET is_active = ? WHERE employee_id = ? AND is_deleted = FALSE`,
    [is_active, id]
  );
  log.pass("setEmployeeActive", `${id} ${is_active ? "active" : "inactive"}`);
  return get_employee(id);
}

export async function delete_employee(id) {
  await get_employee(id);
  const pool = get_pool();
  await sqlQuery(
    pool,
    `UPDATE tbl_employees SET is_deleted = TRUE, is_active = FALSE WHERE employee_id = ?`,
    [id]
  );
  log.pass("deleteEmployee", `soft_deleted ${id}`);
  return { ok: true };
}

export async function upload_employee_photo(id, file) {
  const employee = await get_employee(id);
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT profile_photo_url FROM tbl_employees WHERE employee_id = ? AND is_deleted = FALSE`,
    [id]
  );
  const previous = rows?.[0]?.profile_photo_url || "";
  const photo_url = await save_employee_photo(employee.employee_id, file);
  await sqlQuery(
    pool,
    `UPDATE tbl_employees SET profile_photo_url = ? WHERE employee_id = ? AND is_deleted = FALSE`,
    [photo_url, id]
  );
  if (previous && previous !== photo_url) await forget_stored_file(previous);
  log.pass("uploadEmployeePhoto", photo_url);
  return get_employee(id);
}

export async function delete_employee_photo(id) {
  await get_employee(id);
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT profile_photo_url FROM tbl_employees WHERE employee_id = ? AND is_deleted = FALSE`,
    [id]
  );
  const previous = rows?.[0]?.profile_photo_url || "";
  if (previous) await delete_stored_file(previous);
  await sqlQuery(
    pool,
    `UPDATE tbl_employees SET profile_photo_url = NULL WHERE employee_id = ? AND is_deleted = FALSE`,
    [id]
  );
  log.pass("deleteEmployeePhoto", `removed photo for ${id}`);
  return get_employee(id);
}
