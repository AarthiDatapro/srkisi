import { send_error } from "../utils/send_error.js";
import { list_lesson_done, set_lesson_done } from "./lesson_done_service.js";

export async function lesson_done_list(req, res) {
  try {
    return res.json(await list_lesson_done(req.params.courseId, req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load lesson progress", "lessonDone", req);
  }
}

export async function lesson_done_set(req, res) {
  try {
    return res.json(await set_lesson_done(
      req.user,
      req.params.courseId,
      req.params.lessonId,
      req.body || {}
    ));
  } catch (err) {
    return send_error(res, err, "Unable to mark the lesson", "lessonDone", req);
  }
}
