export function validate_email(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "Email is required";
  const at = text.indexOf("@");
  if (at <= 0 || at !== text.lastIndexOf("@") || at === text.length - 1) {
    return "Enter a valid email";
  }
  return "";
}