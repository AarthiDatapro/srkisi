import {
  validateOptionalText,
  validatePositiveInteger,
  validateRequiredText } from
"@datapromr/validation";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../constants/english/programs_control_constants_english.js";
export { face_tone, initials_from_name } from "../design_system/people.js";

export function get_program_errors(values) {
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

export function format_duration(months) {
  const value = Number(months);
  if (!value) return "—";
  if (value % 12 === 0) {
    const years = value / 12;
    return `${years} ${years === 1 ? ENGLISH.year : ENGLISH.years}`;
  }
  return `${value} ${value === 1 ? "month" : "months"}`;
}

export function short_code(code = "") {
  const text = String(code);
  const tail = text.split("-").pop();
  return tail && tail.length <= 8 ? tail : text.slice(0, 8);
}

export function preview_program_code() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return ENGLISH.prg(now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate()));
}

export function format_program_day(value) {
  const raw = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "—";
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function format_short_date(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
