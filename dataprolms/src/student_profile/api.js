import { api_request as request } from "../api_client.js";

export function get_student_profile() {
  return request("/api/student/profile");
}

export function update_student_profile(body) {
  return request("/api/student/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_student_photo(file) {
  const form = new FormData();
  form.append("photo", file);
  return request("/api/student/profile/photo", {
    method: "POST",
    body: form
  });
}

export function delete_student_photo() {
  return request("/api/student/profile/photo", { method: "DELETE" });
}

export function get_ollama_api_key_status() {
  return request("/api/student/profile/ollama_api_key");
}

export function update_ollama_api_key(ollama_api_key) {
  return request("/api/student/profile/ollama_api_key", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ollama_api_key })
  });
}

export function update_ollama_fast_enabled(ollama_fast_enabled) {
  return request("/api/student/profile/ollama_fast", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ollama_fast_enabled: Boolean(ollama_fast_enabled) })
  });
}
