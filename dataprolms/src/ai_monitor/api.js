import { api_request as request } from "../api_client.js";
import { AI_MONITOR_ENGLISH as ENGLISH } from "../constants/english/ai_monitor_constants_english.js";

function with_query(path, filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value != null) params.set(key, String(value));
  }
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function list_monitor_options() {
  return request("/api/ai_monitor/options", { error_message: ENGLISH.unable_to_load_filters });
}

export function get_mock_interview_report(filters) {
  return request(with_query("/api/ai_monitor/mock_interviews", filters), { error_message: ENGLISH.unable_to_load_mock_interview_activity });
}

export function get_mock_interview(id) {
  return request(`/api/ai_monitor/mock_interviews/${id}`, { error_message: ENGLISH.unable_to_load_this_interview });
}

export function get_mock_interview_certificate() {
  return request("/api/ai_monitor/mock_interviews/certificate", {
    error_message: ENGLISH.unable_to_load_certificate_templates
  });
}

export function save_mock_interview_certificate(certificate_id) {
  return request("/api/ai_monitor/mock_interviews/certificate", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ certificate_id }),
    error_message: ENGLISH.unable_to_assign_this_certificate
  });
}

export function get_resume_report(filters) {
  return request(with_query("/api/ai_monitor/resumes", filters), { error_message: ENGLISH.unable_to_load_resume_analyser_activity });
}

export function get_resume(id) {
  return request(`/api/ai_monitor/resumes/${id}`, { error_message: ENGLISH.unable_to_load_this_analysis });
}

export function get_chat_report(filters) {
  return request(with_query("/api/ai_monitor/chats", filters), { error_message: ENGLISH.unable_to_load_chatbot_usage });
}

export function get_chat(id) {
  return request(`/api/ai_monitor/chats/${id}`, { error_message: ENGLISH.unable_to_load_this_chat });
}
