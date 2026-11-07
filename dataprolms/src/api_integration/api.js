import { api_request } from "../api_client.js";
import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";

export function check_attempt_workbook(file) {
  const body = new FormData();
  body.append("file", file);
  return api_request("/api/api_integration/quiz_attempts/check", {
    method: "POST",
    body,
    error_message: ENGLISH.unable_to_check_the_workbook
  });
}

export function import_attempt_workbook(check_id) {
  return api_request("/api/api_integration/quiz_attempts/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_id }),
    error_message: ENGLISH.unable_to_import_quiz_attempts
  });
}

export async function download_attempt_template() {
  const response = await api_request("/api/api_integration/quiz_attempts/template", {
    parse: "response",
    error_message: ENGLISH.unable_to_download_the_quiz_attempt_template
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "quiz_attempts_sample.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export function check_quiz_workbook(file) {
  const body = new FormData();
  body.append("file", file);
  return api_request("/api/api_integration/quizzes/check", {
    method: "POST",
    body,
    error_message: ENGLISH.unable_to_check_the_workbook
  });
}

export function import_quiz_workbook(check_id) {
  return api_request("/api/api_integration/quizzes/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_id }),
    error_message: ENGLISH.unable_to_import_quizzes
  });
}

export async function download_quiz_template() {
  const response = await api_request("/api/api_integration/quizzes/template", {
    parse: "response",
    error_message: ENGLISH.unable_to_download_the_quiz_template
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "quizzes_sample.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export function check_registration_workbook(file, institution_name) {
  const body = new FormData();
  body.append("file", file);
  body.append("institution_name", institution_name);
  return api_request("/api/api_integration/registrations/check", {
    method: "POST",
    body,
    error_message: ENGLISH.unable_to_check_the_workbook
  });
}

export function import_registration_workbook(check_id) {
  return api_request("/api/api_integration/registrations/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_id }),
    error_message: ENGLISH.unable_to_import_registrations
  });
}

export async function download_registration_template() {
  const response = await api_request("/api/api_integration/registrations/template", {
    parse: "response",
    error_message: ENGLISH.unable_to_download_the_registration_template
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "registrations_sample.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export function check_course_workbook(file) {
  const body = new FormData();
  body.append("file", file);
  return api_request("/api/api_integration/courses/check", {
    method: "POST",
    body,
    error_message: ENGLISH.unable_to_check_the_workbook
  });
}

export function import_course_workbook(check_id) {
  return api_request("/api/api_integration/courses/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_id }),
    error_message: ENGLISH.unable_to_import_courses
  });
}

export function check_attendance_workbook(file) {
  const body = new FormData();
  body.append("file", file);
  return api_request("/api/api_integration/attendance/check", {
    method: "POST",
    body,
    error_message: ENGLISH.unable_to_check_the_workbook
  });
}

export function import_attendance_workbook(check_id) {
  return api_request("/api/api_integration/attendance/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_id }),
    error_message: ENGLISH.unable_to_import_attendance
  });
}

export function check_student_workbook(file) {
  const body = new FormData();
  body.append("file", file);
  return api_request("/api/api_integration/students/check", {
    method: "POST",
    body,
    error_message: ENGLISH.unable_to_check_the_workbook
  });
}

export function import_student_workbook(check_id) {
  return api_request("/api/api_integration/students/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_id }),
    error_message: ENGLISH.unable_to_import_students
  });
}

export async function download_course_template() {
  const response = await api_request("/api/api_integration/courses/template", {
    parse: "response",
    error_message: ENGLISH.unable_to_download_the_course_template
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "courses_sample.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export async function download_attendance_template() {
  const response = await api_request("/api/api_integration/attendance/template", {
    parse: "response",
    error_message: ENGLISH.unable_to_download_the_attendance_template
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "attendance_sample.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export async function download_student_template() {
  const response = await api_request("/api/api_integration/students/template", {
    parse: "response",
    error_message: ENGLISH.unable_to_download_the_template
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "students_import_template.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}
