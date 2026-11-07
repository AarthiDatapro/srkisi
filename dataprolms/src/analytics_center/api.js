import { api_request as request } from "../api_client.js";
import { ANALYTICS_CENTER_ENGLISH as ENGLISH } from "../constants/english/analytics_center_constants_english.js";

function with_query(path, filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value != null) params.set(key, String(value));
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function get_analytics_scope() {
  return request("/api/analytics_center/scope", { error_message: ENGLISH.unable_to_load_cohorts_and_programs });
}

export function get_program_quiz_analytics(filters) {
  return request(with_query("/api/analytics_center/quiz", filters), { error_message: ENGLISH.unable_to_load_quiz_analytics });
}

export function get_hackathon_analytics(filters) {
  return request(with_query("/api/analytics_center/hackathons", filters), { error_message: ENGLISH.unable_to_load_hackathon_analytics });
}

export function get_hackathon_detail(hackathon_id, filters) {
  return request(with_query(`/api/analytics_center/hackathons/${hackathon_id}`, filters), { error_message: ENGLISH.unable_to_load_this_hackathon });
}

export function export_hackathon_analytics(filters) {
  return request(with_query("/api/analytics_center/hackathons/export", filters), { error_message: ENGLISH.unable_to_export_hackathon_analytics });
}

export function get_attendance_analytics(filters) {
  return request(with_query("/api/analytics_center/attendance", filters), { error_message: ENGLISH.unable_to_load_attendance_analytics });
}
