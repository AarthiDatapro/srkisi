import {
  validateOptionalText,
  validatePositiveInteger,
  validateRequiredText } from
"@datapromr/validation";
import { COHORTS_ENGLISH as ENGLISH } from "../constants/english/cohorts_constants_english.js";

export function format_day(value) {
  const raw = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

export function format_range(start, end) {
  const left = format_day(start);
  const right = format_day(end);
  if (left && right) return `${left} – ${right}`;
  return left || right || ENGLISH.dates_not_set;
}

export function cohort_form(cohort) {
  return {
    cohort_name: cohort?.cohort_name || "",
    description: cohort?.description || ""
  };
}

function required(value, label) {
  return String(value || "").trim() ? "" : ENGLISH.is_required(label);
}

export function cohort_errors(values) {
  return {
    cohort_name: required(values.cohort_name, ENGLISH.cohort_name)
  };
}

export function preview_program_code(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return ENGLISH.prg(year, month, day);
}

export function get_program_record_errors(values) {
  const start_date = date_error(values.start_date, ENGLISH.start_date);
  const end_date = date_error(values.end_date, ENGLISH.end_date);
  return {
    program_name: validateRequiredText(values.program_name, ENGLISH.program_name, 150),
    program_type_id: validatePositiveInteger(values.program_type_id, ENGLISH.program_type, true),
    duration_months: validatePositiveInteger(values.duration_months, ENGLISH.duration, false),
    description: validateOptionalText(values.description, ENGLISH.description, 2000),
    start_date,
    end_date: end_date || (
      !start_date && values.end_date < values.start_date ?
        ENGLISH.end_date_must_be_on_or_after_the :
        ""
    )
  };
}

function date_error(value, label) {
  const raw = String(value || "").trim();
  if (!raw) return ENGLISH.is_required(label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ENGLISH.must_be_a_date(label);
  return "";
}

export function has_errors(errors) {
  return Object.values(errors).some(Boolean);
}

export function matches_query(text, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return String(text || "").toLowerCase().includes(needle);
}
