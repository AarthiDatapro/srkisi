// Browser calls for Google sign-in.
// start asks the server for the Google address. finish sends back the code Google returned.

import { api_request } from "../../api_client.js";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../../constants/english/student_authentication_constants_english.js";

export function start_google(intent) {
  const mode = intent === "signup" ? "signup" : "login";
  return api_request(`/api/auth/student/google/start?intent=${mode}`, {
    error_message: ENGLISH.unable_to_start_google_sign_in
  });
}

export function finish_google(body) {
  return api_request("/api/auth/student/google/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_sign_in_with_google
  });
}

const ERROR_KEY = "google_auth_error";
const INTENT_KEY = "google_auth_intent";

export function remember_google_intent(intent) {
  sessionStorage.setItem(INTENT_KEY, intent === "signup" ? "signup" : "login");
}

export function google_return_path() {
  const signup = sessionStorage.getItem(INTENT_KEY) === "signup";
  sessionStorage.removeItem(INTENT_KEY);
  return signup ? "/register" : "/login";
}

export function save_google_error(message) {
  sessionStorage.setItem(ERROR_KEY, message);
}

export function take_google_error() {
  const message = sessionStorage.getItem(ERROR_KEY) || "";
  if (message) sessionStorage.removeItem(ERROR_KEY);
  return message;
}

export function is_google_callback() {
  return window.location.pathname.replace(/\/+$/, "") === "/auth/google/callback";
}
