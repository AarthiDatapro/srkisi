import { send_error } from "../utils/send_error.js";
import {
  get_catalog,
  get_catalog_course,
  list_catalog_courses,
  list_my_courses,
  access_my_course,
  register_course,
  set_wishlist } from
"./catalog_service.js";

export async function catalog_get(req, res) {
  try {
    return res.json(await get_catalog(req.user, req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load programs", "course_registration", req);
  }
}

export async function catalog_courses_get(req, res) {
  try {
    return res.json(await list_catalog_courses(req.user, req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load courses", "course_registration", req);
  }
}

export async function catalog_course_get(req, res) {
  try {
    return res.json(await get_catalog_course(req.user, req.params.courseId, req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load course details", "course_registration", req);
  }
}

export async function registrations_create(req, res) {
  try {
    return res.status(201).json(await register_course(req.user, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to register for this course", "course_registration", req);
  }
}

export async function wishlist_create(req, res) {
  try {
    return res.status(201).json(await set_wishlist(req.user, req.body || {}, true));
  } catch (err) {
    return send_error(res, err, "Unable to save this course", "course_registration", req);
  }
}

export async function wishlist_delete(req, res) {
  try {
    return res.json(await set_wishlist(req.user, { course_id: req.params.courseId }, false));
  } catch (err) {
    return send_error(res, err, "Unable to remove this course from wishlist", "course_registration", req);
  }
}

export async function my_courses_get(req, res) {
  try {
    return res.json(await list_my_courses(req.user, req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load your courses", "course_registration", req);
  }
}

export async function my_courses_access(req, res) {
  try {
    return res.json(await access_my_course(
      req.user,
      req.params.courseId,
      req.query?.registration_id || req.body?.registration_id
    ));
  } catch (err) {
    return send_error(res, err, "Unable to open this course", "course_registration", req);
  }
}
