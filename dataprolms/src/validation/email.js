import { VALIDATION_ENGLISH as ENGLISH } from "../constants/english/validation_constants_english.js";
const EMAIL = /^[a-z0-9]+(?:\.[a-z0-9]+)*@[a-z0-9]+(?:\.[a-z0-9]+)+$/;

export function validate_email(value) {
  const text = String(value ?? "").trim().toLowerCase();

  if (!text) {
    return ENGLISH.email_is_required;
  }

  if ((text.match(/@/g) || []).length !== 1) {
    return ENGLISH.enter_a_valid_email;
  }

  if (text.includes("..")) {
    return ENGLISH.email_cannot_have_two_dots_in_a_row;
  }

  if (!EMAIL.test(text)) {
    return ENGLISH.enter_a_valid_email_using_letters_numbers_and;
  }

  return "";
}
