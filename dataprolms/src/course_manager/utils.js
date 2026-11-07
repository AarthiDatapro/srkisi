import {
  validateOptionalText,
  validatePositiveInteger,
  validateRequiredText } from
"@datapromr/validation";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_manager_constants_english.js";

function validate_project_count(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!/^\d+$/.test(text)) return ENGLISH.project_count_must_be_a_whole_number;
  if (Number(text) > 999) return ENGLISH.project_count_must_be_999_or_less;
  return "";
}

function validate_amount(value, required) {
  const text = String(value ?? "").trim();
  if (!text) return required ? ENGLISH.enter_the_course_amount : "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return ENGLISH.amount_must_be_a_number_with_up_to;
  if (Number(text) <= 0) return ENGLISH.amount_must_be_greater_than_0;
  if (Number(text) > 9999999.99) return ENGLISH.amount_is_too_large;
  return "";
}

function validate_discount(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return ENGLISH.discount_must_be_a_percent_with_up_to;
  const percent = Number(text);
  if (percent < 0 || percent > 100) return ENGLISH.discount_must_be_between_0_and_100;
  return "";
}

function validate_point_list(points, label) {
  const list = Array.isArray(points) ? points : [];
  if (list.length > 20) return ENGLISH.can_have_at_most_20_points(label);
  if (list.some((item) => String(item || "").trim().length > 300)) {
    return `Each point must be 300 characters or less`;
  }
  return "";
}

export function validate_duration_hours(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return ENGLISH.duration_must_be_a_number_with_up_to;
  }
  const hours = Number(text);
  if (hours <= 0) return ENGLISH.duration_must_be_greater_than_0;
  if (hours > 9999.99) return ENGLISH.duration_must_be_9999_99_hours_or_less;
  return "";
}

export function get_course_errors(values) {
  const offline = Boolean(values.is_offline);
  const paid = Boolean(values.is_paid);
  const id_format = String(values.student_id_format || "").trim().replace(/\s+/g, "");
  const program_passkeys = values.program_passkeys || {};
  const passkey_errors = {};
  if (offline) {
    for (const [program_id, passkey] of Object.entries(program_passkeys)) {
      const text = String(passkey || "").trim();
      if (!text) passkey_errors[program_id] = ENGLISH.enter_a_program_passkey;
      else if (text.length < 4) passkey_errors[program_id] = ENGLISH.passkey_must_be_at_least_4_characters;
    }
  }
  return {
    course_name: validateRequiredText(values.course_name, ENGLISH.course_name, 150),
    course_tagline: validateRequiredText(values.course_tagline, ENGLISH.tagline, 200),
    course_type_id: validatePositiveInteger(values.course_type_id, ENGLISH.course_type, true),
    duration_hours: validate_duration_hours(values.duration_hours),
    course_description: validateOptionalText(values.course_description, ENGLISH.description, 2000),
    created_by_display: validateOptionalText(values.created_by_display, ENGLISH.created_by, 150),
    real_world_project_count: validate_project_count(values.real_world_project_count),
    learn_points: validate_point_list(values.learn_points, ENGLISH.what_you_ll_learn),
    audience_points: validate_point_list(values.audience_points, ENGLISH.who_this_course_is_for),
    course_domain_id: validatePositiveInteger(values.course_domain_id, ENGLISH.domain, true),
    course_level_id: validatePositiveInteger(values.course_level_id, ENGLISH.level, true),
    course_tag_id: validatePositiveInteger(values.course_tag_id, ENGLISH.tag, true),
    language_ids: (values.language_ids || []).length ? "" : ENGLISH.select_at_least_one_language,
    fee_amount: validate_amount(values.fee_amount, paid),
    discount_percent: paid ? validate_discount(values.discount_percent) : "",
    enroll_passkey: "",
    program_passkeys: passkey_errors,
    student_id_format: offline ?
    !id_format ?
    ENGLISH.enter_an_id_format :
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id_format) ?
    ENGLISH.use_letters_numbers_dot_hyphen_or_underscore :
    "" :
    ""
  };
}

export function has_errors(errors) {
  if (errors.program_passkeys && typeof errors.program_passkeys === "object") {
    if (Object.values(errors.program_passkeys).some(Boolean)) return true;
  }
  return Object.entries(errors).some(([key, value]) => key !== "program_passkeys" && Boolean(value));
}

export function form_from_course(row = {}) {
  const program_passkeys = {};
  for (const program of row.programs || []) {
    if (program.enroll_passkey) {
      program_passkeys[String(program.program_id)] = program.enroll_passkey;
    }
  }
  const learn = Array.isArray(row.learn_points) && row.learn_points.length ? row.learn_points : [""];
  const audience = Array.isArray(row.audience_points) && row.audience_points.length ? row.audience_points : [""];
  return {
    course_name: row.course_name || "",
    course_tagline: row.course_tagline || "",
    course_type_id: row.course_type_id ? String(row.course_type_id) : "",
    duration_hours: row.duration_hours ?? "",
    course_description: row.course_description || "",
    created_by_display: row.created_by_display || "",
    real_world_project_count: row.real_world_project_count ?? "",
    has_completion_certificate: Boolean(row.has_completion_certificate),
    learn_points: learn,
    audience_points: audience,
    is_paid: Boolean(row.is_paid),
    fee_amount: row.fee_amount ?? "",
    discount_percent: row.discount_percent ?? "",
    course_code: row.course_code || "",
    saved_domain_id: row.course_domain_id ? String(row.course_domain_id) : "",
    course_domain_id: row.course_domain_id ? String(row.course_domain_id) : "",
    course_level_id: row.course_level_id ? String(row.course_level_id) : "",
    language_ids: (row.language_ids || []).map((id) => String(id)),
    course_tag_id: row.course_tag_id ? String(row.course_tag_id) : "",
    is_open: Boolean(row.is_open),
    is_offline: Boolean(row.is_offline),
    enroll_passkey: row.enroll_passkey || "",
    program_passkeys,
    student_id_format: row.student_id_format || "",
    is_active: row.is_active !== false
  };
}

export function type_tone(name = "") {
  const key = String(name).toLowerCase();
  if (key.includes("core")) return "core";
  if (key.includes("elect")) return "elective";
  if (key.includes("lab")) return "lab";
  return "plain";
}

export function format_hours(value) {
  if (value === 0 || value) return ENGLISH.hours_2(value);
  return "—";
}

export function format_fee(value) {
  if (value == null || value === "") return ENGLISH.free;
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function preview_course_code(values = {}, domains = []) {
  const domain = domains.find((item) => String(item.id) === String(values.course_domain_id || ""));
  const letters = String(domain?.code_letters || "").trim().toUpperCase();
  const series = domain?.number_next;
  const ready = /^[A-Z]{1,5}$/.test(letters) && series !== "" && series != null && /^\d{1,5}$/.test(String(series));
  const same = values.saved_domain_id && String(values.saved_domain_id) === String(values.course_domain_id || "");
  const current = String(values.course_code || "");
  const matches = ready && new RegExp(`^DP-${letters}-\\d{1,5}$`).test(current);
  if (same && (matches || (current && !ready))) return current;
  if (!values.course_domain_id) return ENGLISH.pick_a_domain;
  if (!ready) return ENGLISH.set_a_code_format_on_this_domain;
  return `DP-${letters}-${Number(series)}`;
}
