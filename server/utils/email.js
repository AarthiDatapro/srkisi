const EMAIL = /^[a-z0-9]+(?:\.[a-z0-9]+)*@[a-z0-9]+(?:\.[a-z0-9]+)+$/;

export function validate_email(value) {
  const text = String(value ?? "").trim().toLowerCase();

  if (!text) {
    return "Email is required";
  }

  if ((text.match(/@/g) || []).length !== 1) {
    return "Enter a valid email";
  }

  if (text.includes("..")) {
    return "Email cannot have two dots in a row";
  }

  if (!EMAIL.test(text)) {
    return "Enter a valid email using letters, numbers, and single dots";
  }

  return "";
}
