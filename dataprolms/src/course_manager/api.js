import { api_request as request } from "../api_client.js";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_manager_constants_english.js";

export function list_courses(params) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/courses?${query}`);
}

export function get_course(id) {
  return request(`/api/courses/${id}`);
}

export function create_course(body) {
  return request("/api/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_course(id, body) {
  return request(`/api/courses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function upload_course_thumbnail(id, file) {
  const body = new FormData();
  body.append("thumbnail", file);
  return request(`/api/courses/${id}/thumbnail`, {
    method: "POST",
    body
  });
}

export function delete_course_thumbnail(id) {
  return request(`/api/courses/${id}/thumbnail`, { method: "DELETE" });
}

export function activate_course(id) {
  return request(`/api/courses/${id}/activate`, { method: "POST" });
}

export function deactivate_course(id) {
  return request(`/api/courses/${id}/deactivate`, { method: "POST" });
}

export function delete_course(id) {
  return request(`/api/courses/${id}`, { method: "DELETE" });
}

export function assign_course_programs(id, program_ids, extras = {}) {
  return request(`/api/courses/${id}/programs`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      program_ids: program_ids,
      program_passkeys: extras.program_passkeys || undefined,
      overwrite_passkeys: extras.overwrite_passkeys || undefined
    })
  });
}

export function set_course_program_passkey(id, body) {
  return request(`/api/courses/${id}/program_passkey`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}


export function get_course_analytics(id, program_id) {
  const query = program_id ? ENGLISH.program_id(encodeURIComponent(program_id)) : "";
  return request(`/api/courses/${id}/analytics${query}`);
}

export function export_course_enrollments(course_id) {
  const params = new URLSearchParams();
  if (course_id) params.set("course_id", course_id);
  const query = params.toString();
  return request(`/api/courses/enrollment_export${query ? `?${query}` : ""}`);
}

export function list_course_students(id, program_id) {
  const query = program_id ? ENGLISH.program_id(encodeURIComponent(program_id)) : "";
  return request(`/api/courses/${id}/students${query}`);
}

export function remove_course_student(id, student_id, program_id) {
  const query = program_id ? ENGLISH.program_id(encodeURIComponent(program_id)) : "";
  return request(`/api/courses/${id}/students/${encodeURIComponent(student_id)}${query}`, {
    method: "DELETE"
  });
}

export function get_course_attendance(id, date, program_id) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (program_id) params.set("program_id", program_id);
  const query = params.toString();
  return request(`/api/courses/${id}/attendance${query ? `?${query}` : ""}`);
}

export function save_course_attendance(id, body) {
  return request(`/api/courses/${id}/attendance`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function import_course_students(id, program_id, file) {
  const body = new FormData();
  body.append("file", file);
  body.append("program_id", String(program_id || ""));
  return request(`/api/courses/${id}/students/import`, {
    method: "POST",
    body
  });
}

export function generate_course_student_ids(id, program_id) {
  return request(`/api/courses/${id}/students/generate_ids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ program_id })
  });
}

export function update_course_student(id, student_id, body) {
  return request(`/api/courses/${id}/students/${encodeURIComponent(student_id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function reset_course_student_password(id, student_id, program_id) {
  return request(`/api/courses/${id}/students/${encodeURIComponent(student_id)}/reset_password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ program_id })
  });
}

export function update_course_student_id(id, student_id, course_student_id, program_id) {
  return request(`/api/courses/${id}/students/${encodeURIComponent(student_id)}/course_id`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course_student_id, program_id })
  });
}
