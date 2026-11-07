import { api_request as request } from "../api_client.js";
import { STUDENT_RESUME_ANALYSER_ENGLISH as ENGLISH } from "../constants/english/student_resume_analyser_constants_english.js";

export function get_resume_analysis() {
  return request("/api/student/resume_analysis", {
    error_message: ENGLISH.unable_to_load_resume_analysis
  });
}

export function analyze_resume(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/api/student/resume_analysis", {
    method: "POST",
    body: form,
    error_message: ENGLISH.unable_to_analyze_this_resume
  });
}

export function save_resume_profile(analysis_id, file) {
  const form = new FormData();
  form.append("file", file);
  return request(`/api/student/resume_analysis/${analysis_id}/save_profile`, {
    method: "POST",
    body: form,
    error_message: ENGLISH.unable_to_save_this_resume_to_your_profile
  });
}
