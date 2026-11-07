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
import { EMPTY_EMPLOYEE } from "./constants.js";
import { screens_to_form } from "../employee_authentication/screen_access.js";
import { EMPLOYEE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/employee_manager_constants_english.js";

export function get_employee_errors(values, { password_required = false } = {}) {
  const alternate = String(values.alternate_phone || "").trim();
  const dob = String(values.date_of_birth || "").trim();
  const password = String(values.password || "");
  const confirm = String(values.confirm_password || "");
  const needs_password = password_required || Boolean(password);
  return {
    first_name: validatePersonName(values.first_name, ENGLISH.first_name),
    middle_name: String(values.middle_name || "").trim() ?
    validatePersonName(values.middle_name, ENGLISH.middle_name) :
    "",
    last_name: validatePersonName(values.last_name, ENGLISH.last_name),
    gender_id: validatePositiveInteger(values.gender_id, ENGLISH.gender, false),
    date_of_birth: dob ? validateDateOfBirth(values.date_of_birth) : "",
    email: validate_email(values.email),
    mobile_number: validateMobile(values.mobile_number),
    alternate_phone: alternate ? validateMobile(values.alternate_phone) : "",
    employee_type_id: validatePositiveInteger(values.employee_type_id, ENGLISH.employee_type, true),
    department_id: validatePositiveInteger(values.department_id, ENGLISH.department, true),
    designation_id: validatePositiveInteger(values.designation_id, ENGLISH.designation, true),
    employment_type_id: validatePositiveInteger(values.employment_type_id, ENGLISH.employment_type, false),
    joining_date: validateRequiredDate(values.joining_date, ENGLISH.joining_date),
    location_id: validatePositiveInteger(values.location_id, ENGLISH.location, false),
    reporting_manager_id: validatePositiveInteger(values.reporting_manager_id, ENGLISH.reporting_manager, false),
    address_line_1: validateOptionalText(values.address_line_1, ENGLISH.address_line_1, 255),
    address_line_2: validateOptionalText(values.address_line_2, ENGLISH.address_line_2, 255),
    city: validateOptionalText(values.city, ENGLISH.city, 100),
    state: validateOptionalText(values.state, ENGLISH.state, 100),
    country: validateOptionalText(values.country, ENGLISH.country, 100),
    postal_code: validateOptionalText(values.postal_code, ENGLISH.postal_code, 20),
    password: needs_password ? validatePassword(password) : "",
    confirm_password: needs_password ?
    confirm ?
    confirm === password ?
    "" :
    ENGLISH.passwords_do_not_match :
    ENGLISH.confirm_password_is_required :
    ""
  };
}

export function has_errors(errors) {
  return Object.values(errors).some(Boolean);
}

export function today_iso() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function form_from_employee(row = {}) {
  return {
    ...EMPTY_EMPLOYEE,
    first_name: row.first_name || "",
    middle_name: row.middle_name || "",
    last_name: row.last_name || "",
    gender_id: row.gender_id ? String(row.gender_id) : "",
    date_of_birth: row.date_of_birth || "",
    email: row.email || "",
    mobile_number: row.mobile_number || "",
    alternate_phone: row.alternate_phone || "",
    employee_type_id: row.employee_type_id ? String(row.employee_type_id) : "",
    department_id: row.department_id ? String(row.department_id) : "",
    designation_id: row.designation_id ? String(row.designation_id) : "",
    employment_type_id: row.employment_type_id ? String(row.employment_type_id) : "",
    joining_date: row.joining_date || "",
    location_id: row.location_id ? String(row.location_id) : "",
    reporting_manager_id: row.reporting_manager_id ? String(row.reporting_manager_id) : "",
    address_line_1: row.address_line_1 || "",
    address_line_2: row.address_line_2 || "",
    city: row.city || "",
    state: row.state || "",
    country: row.country || "",
    postal_code: row.postal_code || "",
    is_active: row.is_active !== false,
    password: "",
    confirm_password: "",
    screens: screens_to_form(row.screens)
  };
}

export function preview_employee_code() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return ENGLISH.emp(now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate()));
}
