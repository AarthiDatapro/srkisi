import { api_request as request } from "../api_client.js";

export function list_cohorts() {
  return request("/api/cohorts");
}

export function get_cohort(id) {
  return request(`/api/cohorts/${id}`);
}

export function create_cohort(body) {
  return request("/api/cohorts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_cohort(id, body) {
  return request(`/api/cohorts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function delete_cohort(id) {
  return request(`/api/cohorts/${id}`, { method: "DELETE" });
}

export function upload_cohort_thumbnail(id, file) {
  const body = new FormData();
  body.append("thumbnail", file);
  return request(`/api/cohorts/${id}/thumbnail`, { method: "POST", body });
}

export function delete_cohort_thumbnail(id) {
  return request(`/api/cohorts/${id}/thumbnail`, { method: "DELETE" });
}

export function upload_cohort_profile(id, file) {
  const body = new FormData();
  body.append("profile", file);
  return request(`/api/cohorts/${id}/profile`, { method: "POST", body });
}

export function delete_cohort_profile(id) {
  return request(`/api/cohorts/${id}/profile`, { method: "DELETE" });
}

export function assign_cohort_program(id, body) {
  return request(`/api/cohorts/${id}/programs/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function delete_cohort_program(id, program_id) {
  return request(`/api/cohorts/${id}/programs/${program_id}`, { method: "DELETE" });
}
