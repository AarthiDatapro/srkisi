import { api_request as request } from "../api_client.js";
import { STUDENT_HISTORY_ENGLISH as ENGLISH } from "../constants/english/student_history_constants_english.js";

export function get_my_history() {
  return request("/api/student/history", { error_message: ENGLISH.unable_to_load_your_history });
}

export function get_my_interview(id) {
  return request(`/api/student/history/mock_interviews/${id}`, { error_message: ENGLISH.unable_to_load_this_interview });
}

export function get_my_resume(id) {
  return request(`/api/student/history/resumes/${id}`, { error_message: ENGLISH.unable_to_load_this_analysis });
}
