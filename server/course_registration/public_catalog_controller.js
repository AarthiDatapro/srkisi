import { send_error } from "../utils/send_error.js";
import {
  get_open_course,
  list_open_courses,
  list_public_courses,
  list_public_programs } from
"./public_catalog_service.js";

export async function public_programs_get(req, res) {
  try {
    return res.json(await list_public_programs(req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load programs", "course_registration", req);
  }
}

export async function public_courses_get(req, res) {
  try {
    return res.json(await list_public_courses(req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load courses", "course_registration", req);
  }
}

export async function open_courses_get(req, res) {
  try {
    return res.json(await list_open_courses());
  } catch (err) {
    return send_error(res, err, "Unable to load courses", "course_registration", req);
  }
}

export async function open_course_get(req, res) {
  try {
    return res.json(await get_open_course(req.params.courseId));
  } catch (err) {
    return send_error(res, err, "Unable to load this course", "course_registration", req);
  }
}
