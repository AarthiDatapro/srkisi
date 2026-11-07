import { validatePassword } from "@datapromr/validation";
import { validate_email } from "./email.js";

export function get_login_errors(values) {
  return {
    email: validate_email(values.email),
    password: validatePassword(values.password)
  };
}

export function has_errors(errors) {
  return Object.values(errors).some(Boolean);
}

export function sanitize_field(name, value) {
  if (name === "email") {
    return value.toLowerCase();
  }

  return value;
}
