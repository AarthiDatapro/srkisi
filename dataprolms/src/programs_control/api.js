import { api_request as request } from "../api_client.js";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../constants/english/programs_control_constants_english.js";

export function list_programs(params) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/programs?${query}`);
}

export function get_program(id) {
  return request(`/api/programs/${id}`);
}

export function create_program(body) {
  return request("/api/programs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_program(id, body) {
  return request(`/api/programs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_save_program_please_try_again
  });
}

export function activate_program(id) {
  return request(`/api/programs/${id}/activate`, { method: "POST" });
}

export function deactivate_program(id) {
  return request(`/api/programs/${id}/deactivate`, { method: "POST" });
}

export function delete_program(id) {
  return request(`/api/programs/${id}`, { method: "DELETE" });
}

export function get_program_courses(id) {
  return request(`/api/programs/${id}/courses`);
}

export function get_program_students(id) {
  return request(`/api/programs/${id}/students`);
}

export function get_program_faculty(id) {
  return request(`/api/programs/${id}/faculty`);
}

export function assign_program_faculty(id, employee_ids) {
  return request(`/api/programs/${id}/faculty`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee_ids: employee_ids })
  });
}

export function assign_program_courses(id, course_ids, extras = {}) {
  return request(`/api/programs/${id}/courses`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      course_ids: course_ids,
      course_passkeys: extras.course_passkeys || undefined,
      overwrite_passkeys: extras.overwrite_passkeys || undefined
    })
  });
}

export async function upload_program_thumbnail(id, file) {
  const body = new FormData();
  body.append("thumbnail", file);
  return request(`/api/programs/${id}/thumbnail`, {
    method: "POST",
    body,
    error_message: ENGLISH.thumbnail_upload_failed_please_try_again
  });
}

export function delete_program_thumbnail(id) {
  return request(`/api/programs/${id}/thumbnail`, {
    method: "DELETE",
    error_message: ENGLISH.thumbnail_could_not_be_removed_please_try_again
  });
}
