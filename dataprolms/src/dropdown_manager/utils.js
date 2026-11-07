import { validateOptionalText, validateRequiredText } from "@datapromr/validation";
import { DROPDOWN_MANAGER_ENGLISH as ENGLISH } from "../constants/english/dropdown_manager_constants_english.js";

function color_error(value) {
  const text = String(value || "").trim();
  if (!text) return ENGLISH.select_a_color;
  if (!/^#[0-9a-fA-F]{6}$/.test(text)) return ENGLISH.use_a_color_like_1a2f7a;
  return "";
}

function format_error(values) {
  const letters = String(values.code_letters || "").trim().toUpperCase();
  const series = String(values.number_next ?? "").trim();
  if (!/^[A-Z]{1,5}$/.test(letters)) return { get code_letters() { return ENGLISH.letter_code_must_be_1_to_5_letters; }, number_next: "" };
  if (!/^\d{1,5}$/.test(series)) return { code_letters: "", number_next: ENGLISH.number_series_must_be_1_to_5_digits };
  return { code_letters: "", number_next: "" };
}

export function domain_code_preview(letters, series) {
  const token = String(letters || "").trim().toUpperCase();
  const number = String(series ?? "").trim();
  if (!/^[A-Z]{1,5}$/.test(token) || !/^\d{1,5}$/.test(number)) return "DP-AIML-20011";
  return `DP-${token}-${Number(number)}`;
}

export function get_option_errors(values, { color = false, code_format = false } = {}) {
  const format = code_format ? format_error(values) : { code_letters: "", number_next: "" };
  return {
    name: validateRequiredText(values.name, ENGLISH.name, 100),
    description: validateOptionalText(values.description, ENGLISH.description, 500),
    color: color ? color_error(values.color) : "",
    code_letters: format.code_letters,
    number_next: format.number_next
  };
}

export function has_errors(errors) {
  return Object.values(errors).some(Boolean);
}
