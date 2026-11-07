import {
  validatePersonName,
  validateMobile,
  validatePassword,
  validateRequiredText,
  validateOptionalText } from
"@datapromr/validation";
import { validate_email } from "./email.js";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/student_authentication_constants_english.js";

function parse_birth_date(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function latest_allowed_birth_date() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - 10);
  return date;
}

export function registration_dob_error(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const date = parse_birth_date(text);
  if (!date) return ENGLISH.enter_a_valid_date_of_birth;
  if (date > latest_allowed_birth_date()) {
    return ENGLISH.date_of_birth_must_be_at_least_10;
  }
  return "";
}

export function registration_password_error(value) {
  const text = String(value ?? "");
  if (!text) return ENGLISH.password_is_required;
  if (text.length < 8) return ENGLISH.password_must_be_at_least_8_characters;
  if (!/[a-z]/.test(text)) return ENGLISH.password_must_include_a_lowercase_letter;
  if (!/[A-Z]/.test(text)) return ENGLISH.password_must_include_an_uppercase_letter;
  if (!/\d/.test(text)) return ENGLISH.password_must_include_a_number;
  if (!/[^A-Za-z0-9]/.test(text)) return ENGLISH.password_must_include_a_special_character;
  return "";
}

function pincode_error(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^\d{6}$/.test(text)) return ENGLISH.enter_a_6_digit_pincode;
  return "";
}

export function get_form_errors(values) {
  const password_error = registration_password_error(values.password);
  const confirm = String(values.confirm_password ?? "");

  let confirm_error = "";
  if (!confirm) {
    confirm_error = ENGLISH.confirm_password_is_required;
  } else if (!password_error && confirm !== values.password) {
    confirm_error = ENGLISH.passwords_do_not_match;
  }

  return {
    first_name: validatePersonName(values.first_name, ENGLISH.first_name),
    last_name: validatePersonName(values.last_name, ENGLISH.last_name),
    email: validate_email(values.email),
    mobile_number: validateMobile(values.mobile_number),
    date_of_birth: registration_dob_error(values.date_of_birth),
    college: validateRequiredText(values.college, ENGLISH.college, 200),
    higher_study: validateRequiredText(values.higher_study, ENGLISH.higher_study, 200),
    blood_group: validateOptionalText(values.blood_group, ENGLISH.blood_group, 20),
    address_line: validateOptionalText(values.address_line, ENGLISH.address, 300),
    pincode: pincode_error(values.pincode),
    state: validateOptionalText(values.state, ENGLISH.state, 100),
    district: validateOptionalText(values.district, ENGLISH.district, 100),
    password: password_error,
    confirm_password: confirm_error
  };
}

export function normalize_indian_mobile(raw) {
  let text = String(raw ?? "").trim().replace(/\s+/g, "");
  if (text.startsWith("+91")) {
    text = text.slice(3);
  } else if (text.startsWith("91") && text.replace(/\D/g, "").length === 12) {
    text = text.slice(2);
  }
  return text.replace(/\D/g, "");
}

export function validate_login_identifier(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return ENGLISH.please_enter_your_email_or_phone_number;
  }

  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    const at = email.indexOf("@");
    if (at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) {
      return ENGLISH.please_enter_a_valid_email_address;
    }
    const domain = email.slice(at + 1);
    if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
      return ENGLISH.please_enter_a_valid_email_address;
    }
    return "";
  }

  if (/[a-z]/i.test(raw)) {
    return ENGLISH.please_enter_a_valid_10_digit_indian_mobile;
  }

  const mobile = normalize_indian_mobile(raw);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return ENGLISH.please_enter_a_valid_10_digit_indian_mobile;
  }
  return "";
}

export function sanitize_login_identifier(value) {
  const text = String(value ?? "").replace(/\s/g, "");
  if (/[a-z@]/i.test(text)) return text.toLowerCase();
  if (text.startsWith("+")) {
    const digits = text.slice(1).replace(/\D/g, "");
    if (!"91".startsWith(digits.slice(0, 2))) return `+${digits.slice(0, 10)}`;
    return `+${digits.slice(0, 12)}`;
  }
  return text.replace(/\D/g, "").slice(0, 10);
}

export function normalize_login_identifier(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw.toLowerCase();
  return normalize_indian_mobile(raw);
}

function login_password_error(value) {
  if (!String(value ?? "")) {
    return ENGLISH.please_enter_your_password;
  }
  return "";
}

export function get_login_errors(values) {
  return {
    email: validate_login_identifier(values.email),
    password: login_password_error(values.password)
  };
}

function local_iso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function today_iso() {
  return local_iso(new Date());
}

export function latest_birth_date() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - 10);
  return local_iso(date);
}

export function has_errors(errors) {
  return Object.values(errors).some(Boolean);
}

export function sanitize_field(name, value) {
  if (name === "email") {
    return value.replace(/\s/g, "").toLowerCase();
  }

  if (name === "mobile_number") {
    return value.replace(/\D/g, "").slice(0, 10);
  }

  if (name === "first_name" || name === "last_name") {
    return value.replace(/[^A-Za-z ]/g, "").replace(/ {2,}/g, " ");
  }

  if (name === "pincode") {
    return value.replace(/\D/g, "").slice(0, 6);
  }

  return value;
}
