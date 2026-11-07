import { send_error } from "../utils/send_error.js";
import { complete_lesson, get_learn_course, get_learn_lesson, save_lesson_feedback } from "./learn_service.js";
import { get_student_quiz, submit_student_quiz } from "../course_content_manager/quiz_student_service.js";
import { run_coding_exercise, submit_coding_exercise } from "./coding_student_service.js";

function registration_of(req) {
  return req.query?.registration_id || req.body?.registration_id || null;
}

export async function learn_get(req, res) {
  try {
    return res.json(await get_learn_course(req.user, req.params.courseId, registration_of(req)));
  } catch (err) {
    return send_error(res, err, "Unable to load this course", "course_learning", req);
  }
}

export async function lesson_get(req, res) {
  try {
    return res.json(await get_learn_lesson(
      req.user,
      req.params.courseId,
      req.params.lessonId,
      registration_of(req)
    ));
  } catch (err) {
    return send_error(res, err, "Unable to load this lesson", "course_learning", req);
  }
}

export async function lesson_complete(req, res) {
  try {
    return res.json(await complete_lesson(
      req.user,
      req.params.courseId,
      req.params.lessonId,
      registration_of(req)
    ));
  } catch (err) {
    return send_error(res, err, "Unable to mark this lesson complete", "course_learning", req);
  }
}

export async function lesson_feedback_save(req, res) {
  try {
    return res.json(
      await save_lesson_feedback(
        req.user,
        req.params.courseId,
        req.params.lessonId,
        req.body || {},
        registration_of(req)
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to save feedback", "course_learning", req);
  }
}

export async function quiz_get(req, res) {
  try {
    return res.json(await get_student_quiz(
      req.user,
      req.params.courseId,
      req.params.quizId,
      { registration_id: registration_of(req) }
    ));
  } catch (err) {
    return send_error(res, err, "Unable to load this quiz", "course_learning", req);
  }
}

export async function coding_run(req, res) {
  try {
    return res.json(
      await run_coding_exercise(
        req.user,
        req.params.courseId,
        req.params.exerciseId,
        req.body || {},
        registration_of(req)
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to run this code", "course_learning", req);
  }
}

export async function coding_submit(req, res) {
  try {
    return res.json(
      await submit_coding_exercise(
        req.user,
        req.params.courseId,
        req.params.exerciseId,
        req.body || {},
        registration_of(req)
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to submit this code", "course_learning", req);
  }
}

export async function quiz_submit(req, res) {
  try {
    return res.json(
      await submit_student_quiz(
        req.user,
        req.params.courseId,
        req.params.quizId,
        req.body || {},
        registration_of(req)
      )
    );
  } catch (err) {
    return send_error(res, err, "Unable to submit this quiz", "course_learning", req);
  }
}
