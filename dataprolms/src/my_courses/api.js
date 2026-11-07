import { api_request as request } from "../api_client.js";
import { MY_COURSES_ENGLISH as ENGLISH } from "../constants/english/my_courses_constants_english.js";

export function list_my_courses(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
  ).toString();
  return request(`/api/student/my_courses${query ? `?${query}` : ""}`);
}

export function access_my_course(course_id, registration_id) {
  const id = Number(registration_id);
  const query = Number.isInteger(id) && id > 0 ? ENGLISH.registration_id(id) : "";
  return request(`/api/student/my_courses/${course_id}/access${query}`, { method: "POST" });
}

export function get_my_course_outline(course_id, registration_id) {
  const id = Number(registration_id);
  const query = Number.isInteger(id) && id > 0 ? ENGLISH.registration_id(id) : "";
  return request(`/api/student/learn/${course_id}${query}`);
}

export function get_my_course_quiz(course_id, quiz_id, registration_id) {
  const id = Number(registration_id);
  const query = Number.isInteger(id) && id > 0 ? ENGLISH.registration_id(id) : "";
  return request(`/api/student/learn/${course_id}/quizzes/${quiz_id}${query}`);
}
