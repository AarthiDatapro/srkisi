import { validate_email } from "./email.js";

export function normalize_indian_mobile(raw) {
  let text = String(raw ?? "").trim().replace(/\s+/g, "");
  if (text.startsWith("+91")) {
    text = text.slice(3);
  } else if (text.startsWith("91") && text.replace(/\D/g, "").length === 12) {
    text = text.slice(2);
  }
  return text.replace(/\D/g, "");
}

export function parse_login_identifier(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return { error: "Please enter your email or phone number." };
  }

  if (text.includes("@")) {
    const email = text.toLowerCase();
    if (validate_email(email)) {
      return { error: "Please enter a valid email address." };
    }
    return { type: "email", normalized: email };
  }

  if (/[a-z]/i.test(text)) {
    return { error: "Please enter a valid 10-digit Indian mobile number." };
  }

  const mobile = normalize_indian_mobile(text);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return { error: "Please enter a valid 10-digit Indian mobile number." };
  }

  return { type: "phone", normalized: mobile };
}

export function login_rate_limit_key(raw) {
  const parsed = parse_login_identifier(raw);
  if (parsed.error) return String(raw ?? "").trim().toLowerCase();
  return parsed.normalized;
}
