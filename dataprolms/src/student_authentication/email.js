import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/student_authentication_constants_english.js";
export function validate_email(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return ENGLISH.email_is_required;
  const at = text.indexOf("@");
  if (at <= 0 || at !== text.lastIndexOf("@") || at === text.length - 1) {
    return ENGLISH.enter_a_valid_email;
  }
  return "";
}
