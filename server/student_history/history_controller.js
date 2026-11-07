import { send_error } from "../utils/send_error.js";
import { my_interview_detail, my_resume_detail, student_history } from "./history_service.js";

export async function history_get(req, res) {
  try {
    return res.json(await student_history(req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load your history", "student_history", req);
  }
}

export async function history_interview_get(req, res) {
  try {
    return res.json(await my_interview_detail(req.user, req.params.interviewId));
  } catch (err) {
    return send_error(res, err, "Unable to load this interview", "student_history", req);
  }
}

export async function history_resume_get(req, res) {
  try {
    return res.json(await my_resume_detail(req.user, req.params.analysisId));
  } catch (err) {
    return send_error(res, err, "Unable to load this analysis", "student_history", req);
  }
}
