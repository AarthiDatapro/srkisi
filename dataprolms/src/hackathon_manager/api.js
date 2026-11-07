import { api_request as request } from "../api_client.js";
import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../constants/english/hackathon_manager_constants_english.js";

export function list_hackathon_options() {
  return request("/api/hackathon_manager/options", { error_message: ENGLISH.unable_to_load_cohorts_and_programs });
}

export function list_student_hackathons() {
  return request("/api/student/hackathons", { error_message: ENGLISH.unable_to_load_hackathons });
}

export function get_student_hackathon(hackathon_id) {
  return request(`/api/student/hackathons/${hackathon_id}`, { error_message: ENGLISH.unable_to_open_this_hackathon });
}

export function save_student_project(hackathon_id, item_id, form) {
  return request(`/api/student/hackathons/${hackathon_id}/items/${item_id}/project`, {
    method: "POST",
    body: form,
    error_message: ENGLISH.unable_to_submit_this_project
  });
}

export function run_student_hackathon_code(hackathon_id, item_id, student_code) {
  return request(`/api/student/hackathons/${hackathon_id}/items/${item_id}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_code }),
    error_message: ENGLISH.unable_to_run_this_code
  });
}

export function submit_student_hackathon_code(hackathon_id, item_id, student_code) {
  return request(`/api/student/hackathons/${hackathon_id}/items/${item_id}/submit_code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_code }),
    error_message: ENGLISH.unable_to_submit_this_code
  });
}

export function save_student_hackathon_answer(hackathon_id, item_id, answer) {
  return request(`/api/student/hackathons/${hackathon_id}/items/${item_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
    error_message: ENGLISH.unable_to_save_this_answer
  });
}

export function list_hackathons() {
  return request("/api/hackathon_manager", { error_message: ENGLISH.unable_to_load_hackathons });
}

export function get_hackathon(hackathon_id) {
  return request(`/api/hackathon_manager/${hackathon_id}`, { error_message: ENGLISH.unable_to_load_this_hackathon });
}

export function create_hackathon(body) {
  return request("/api/hackathon_manager", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_create_this_hackathon
  });
}

export function update_hackathon(hackathon_id, body) {
  return request(`/api/hackathon_manager/${hackathon_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_update_this_hackathon
  });
}

export function delete_hackathon(hackathon_id) {
  return request(`/api/hackathon_manager/${hackathon_id}`, {
    method: "DELETE",
    error_message: ENGLISH.unable_to_delete_this_hackathon
  });
}

export function generate_hackathon_mcq(body) {
  return request("/api/hackathon_manager/generate_mcq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_generate_questions
  });
}

export function list_hackathon_batches(hackathon_id) {
  return request(`/api/hackathon_manager/${hackathon_id}/batches`, { error_message: ENGLISH.unable_to_load_batches });
}

export function search_hackathon_students(hackathon_id, query) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.batch_id) params.set("batch_id", String(query.batch_id));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/api/hackathon_manager/${hackathon_id}/students${suffix}`, { error_message: ENGLISH.unable_to_search_students });
}

export function save_hackathon_batch(hackathon_id, batch_id, body) {
  const path = batch_id ?
    `/api/hackathon_manager/${hackathon_id}/batches/${batch_id}` :
    `/api/hackathon_manager/${hackathon_id}/batches`;
  return request(path, {
    method: batch_id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_save_this_batch
  });
}

export function download_student_hackathon_certificate(hackathon_id) {
  return request(`/api/student/hackathons/${hackathon_id}/certificate`, {
    parse: "response",
    error_message: ENGLISH.unable_to_download_this_certificate
  });
}

export function generate_hackathon_coding(body) {
  return request("/api/hackathon_manager/generate_coding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_generate_the_coding_question
  });
}
