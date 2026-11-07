import { send_error } from "../utils/send_error.js";
import {
  analyze_student_resume,
  get_latest_resume_analysis,
  save_resume_to_profile
} from "./analyser_service.js";

export async function resume_analysis_get(req, res) {
  try {
    return res.json(await get_latest_resume_analysis(req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load resume analysis", "student_resume_analyser", req);
  }
}

export async function resume_analysis_create(req, res) {
  try {
    return res.json(await analyze_student_resume(req.user, req.file));
  } catch (err) {
    return send_error(res, err, "Unable to analyze this resume", "student_resume_analyser", req);
  }
}

export async function resume_analysis_save(req, res) {
  try {
    const analysis_id = Number(req.params.analysis_id);
    if (!Number.isInteger(analysis_id) || analysis_id <= 0) {
      return res.status(400).json({ error: "Resume analysis was not found" });
    }
    return res.json(await save_resume_to_profile(req.user, analysis_id, req.file));
  } catch (err) {
    return send_error(res, err, "Unable to save this resume to your profile", "student_resume_analyser", req);
  }
}
