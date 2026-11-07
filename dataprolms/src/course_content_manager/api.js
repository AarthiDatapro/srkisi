import { api_request as request } from "../api_client.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_content_manager_constants_english.js";

export function get_course_content(course_id) {
  return request(`/api/courses/${course_id}/content`);
}

export function create_module(course_id, body) {
  return request(`/api/courses/${course_id}/modules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_module(course_id, module_id, body) {
  return request(`/api/courses/${course_id}/modules/${module_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function delete_module(course_id, module_id) {
  return request(`/api/courses/${course_id}/modules/${module_id}`, { method: "DELETE" });
}

export function create_lesson(course_id, body) {
  return request(`/api/courses/${course_id}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_lesson(course_id, lesson_id, body) {
  return request(`/api/courses/${course_id}/lessons/${lesson_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function delete_lesson(course_id, lesson_id) {
  return request(`/api/courses/${course_id}/lessons/${lesson_id}`, { method: "DELETE" });
}

export function create_coding_set(course_id, body) {
  return request(`/api/courses/${course_id}/coding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function delete_coding_set(course_id, coding_set_id) {
  return request(`/api/courses/${course_id}/coding/${coding_set_id}`, { method: "DELETE" });
}

export function create_quiz(course_id, body) {
  return request(`/api/courses/${course_id}/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function get_quiz(course_id, quiz_id) {
  return request(`/api/courses/${course_id}/quizzes/${quiz_id}`);
}

export function get_quiz_analytics(course_id, quiz_id, program_id, enrollment) {
  const params = new URLSearchParams();
  if (program_id) params.set("program_id", String(program_id));
  if (enrollment) params.set("enrollment", enrollment);
  const query = params.toString();
  return request(`/api/courses/${course_id}/quizzes/${quiz_id}/analytics${query ? `?${query}` : ""}`);
}

export function update_quiz(course_id, quiz_id, body) {
  return request(`/api/courses/${course_id}/quizzes/${quiz_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function delete_quiz(course_id, quiz_id) {
  return request(`/api/courses/${course_id}/quizzes/${quiz_id}`, { method: "DELETE" });
}

export async function create_lesson_item(course_id, lesson_id, values, file) {
  const payload = new FormData();
  payload.append("content_type", values.content_type);
  payload.append("content_title", values.content_title);
  payload.append("content_description", values.content_description || "");
  payload.append("content_url", values.content_url || "");
  if (values.duration_seconds) payload.append("duration_seconds", values.duration_seconds);
  if (values.notes_language) payload.append("notes_language", values.notes_language);
  if (file) payload.append("file", file);

  return request(`/api/courses/${course_id}/lessons/${lesson_id}/items`, {
    method: "POST",
    body: payload
  });
}

export function update_lesson_item(course_id, lesson_id, item_id, values) {
  return request(`/api/courses/${course_id}/lessons/${lesson_id}/items/${item_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_title: values.content_title,
      content_description: values.content_description || ""
    })
  });
}

export function delete_lesson_item(course_id, lesson_id, item_id) {
  return request(`/api/courses/${course_id}/lessons/${lesson_id}/items/${item_id}`, {
    method: "DELETE"
  });
}

export function reorder_course_content(course_id, body) {
  return request(`/api/courses/${course_id}/content/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function list_lesson_feedback(course_id, lesson_id, program_id) {
  const query = program_id ? ENGLISH.program_id(encodeURIComponent(program_id)) : "";
  return request(`/api/courses/${course_id}/lessons/${lesson_id}/feedback${query}`);
}

export function list_daily_reports(course_id) {
  return request(`/api/courses/${course_id}/daily_reports`);
}

export function get_daily_report(course_id, report_id) {
  return request(`/api/courses/${course_id}/daily_reports/${report_id}`);
}

export function create_daily_report(course_id, body) {
  return request(`/api/courses/${course_id}/daily_reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_daily_report(course_id, report_id, body) {
  return request(`/api/courses/${course_id}/daily_reports/${report_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function upload_daily_report_pdf(course_id, file, report_date) {
  const payload = new FormData();
  payload.append("file", file);
  if (report_date) payload.append("report_date", report_date);
  return request(`/api/courses/${course_id}/daily_reports/upload`, {
    method: "POST",
    body: payload
  });
}

export function delete_daily_report(course_id, report_id) {
  return request(`/api/courses/${course_id}/daily_reports/${report_id}`, { method: "DELETE" });
}

export async function add_daily_report_photos(course_id, report_id, files) {
  const payload = new FormData();
  for (const file of files) payload.append("photos", file);
  return request(`/api/courses/${course_id}/daily_reports/${report_id}/photos`, {
    method: "POST",
    body: payload
  });
}

export async function download_daily_report_pdf(course_id, report_id) {
  const response = await request(`/api/courses/${course_id}/daily_reports/${report_id}/pdf`, {
    get error_message() { return ENGLISH.unable_to_download_pdf; },
    parse: "response"
  });
  const blob = await response.blob();
  const match = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = match?.[1] || "daily_report.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function get_feedback_questions(course_id) {
  return request(`/api/courses/${course_id}/feedback_questions`);
}

export function save_feedback_questions(course_id, body) {
  return request(`/api/courses/${course_id}/feedback_questions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function reset_feedback_questions(course_id) {
  return request(`/api/courses/${course_id}/feedback_questions/reset`, { method: "POST" });
}

export function list_lesson_done(course_id, scope) {
  const query = new URLSearchParams({
    cohort_id: String(scope.cohort_id),
    program_id: String(scope.program_id)
  });
  return request(`/api/courses/${course_id}/lesson_done?${query}`);
}

export function set_lesson_done(course_id, lesson_id, body) {
  return request(`/api/courses/${course_id}/lessons/${lesson_id}/done`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
