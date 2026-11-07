import { api_request as request } from "../api_client.js";
import { STUDENT_MANAGER_ENGLISH as ENGLISH } from "../constants/english/student_manager_constants_english.js";

function with_query(path, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== "" && value != null) query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function list_report_programs() {
  return request("/api/student_manager/programs", { error_message: ENGLISH.unable_to_load_programs });
}

export function list_program_students(params) {
  return request(with_query("/api/student_manager/students", params), { error_message: ENGLISH.unable_to_load_students });
}

export function get_report_cards(params) {
  return request(with_query("/api/student_manager/report_cards", params), { error_message: ENGLISH.unable_to_build_report_cards });
}

export function get_report_card(student_id, program_id) {
  return request(with_query(`/api/student_manager/report_cards/${encodeURIComponent(student_id)}`, { program_id }), { error_message: ENGLISH.unable_to_build_the_report_card });
}

export function list_my_report_programs() {
  return request("/api/student/report_cards/programs", { error_message: ENGLISH.unable_to_load_your_programs });
}

export function get_my_report_card(program_id) {
  return request(with_query("/api/student/report_card", { program_id }), { error_message: ENGLISH.unable_to_build_your_report_card });
}
