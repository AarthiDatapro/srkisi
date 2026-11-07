import { api_request as request } from "../api_client.js";
import { JOBS_MANAGER_ENGLISH as ENGLISH } from "../constants/english/jobs_manager_constants_english.js";

export function list_jobs() {
  return request("/api/jobs", { error_message: ENGLISH.unable_to_load_jobs });
}

export function list_open_jobs() {
  return request("/api/student/jobs", { error_message: ENGLISH.unable_to_load_jobs });
}

export function import_searched_jobs(body) {
  return request("/api/jobs/import_search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_search_and_post_jobs
  });
}

export function create_job(body) {
  return request("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_create_this_job
  });
}

export function update_job(job_id, body) {
  return request(`/api/jobs/${job_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_update_this_job
  });
}

export function generate_fresher_quiz(body) {
  return request("/api/jobs/fresher_quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_generate_fresher_quiz
  });
}

export function save_fresher_quiz(body) {
  return request("/api/jobs/fresher_quiz", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_save_fresher_quiz
  });
}

export function get_fresher_quiz(job_id) {
  return request(`/api/jobs/${job_id}/fresher_quiz`, {
    error_message: ENGLISH.unable_to_load_fresher_quiz
  });
}

export function delete_job(job_id) {
  return request(`/api/jobs/${job_id}`, {
    method: "DELETE",
    error_message: ENGLISH.unable_to_delete_this_job
  });
}
