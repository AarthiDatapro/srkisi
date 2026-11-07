import { send_error } from "../utils/send_error.js";
import { generate_fresher_quiz, get_fresher_quiz, save_fresher_quiz } from "./fresher_quiz_service.js";
import { create_job, delete_job, import_searched_jobs, list_jobs, update_job } from "./jobs_service.js";

export async function jobs_list(req, res) {
  try {
    return res.json({ items: await list_jobs() });
  } catch (err) {
    return send_error(res, err, "Unable to load jobs", "jobs_manager", req);
  }
}

export async function jobs_create(req, res) {
  try {
    return res.status(201).json({ item: await create_job(req.body || {}) });
  } catch (err) {
    return send_error(res, err, "Unable to create this job", "jobs_manager", req);
  }
}

export async function jobs_update(req, res) {
  try {
    return res.json({ item: await update_job(req.params.jobId, req.body || {}) });
  } catch (err) {
    return send_error(res, err, "Unable to update this job", "jobs_manager", req);
  }
}

export async function jobs_import_search(req, res) {
  try {
    return res.status(201).json(await import_searched_jobs(req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to search and post jobs", "jobs_manager", req);
  }
}

export async function fresher_quiz_generate(req, res) {
  try {
    return res.json(await generate_fresher_quiz(req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to generate the fresher quiz", "jobs_manager", req);
  }
}

export async function fresher_quiz_save(req, res) {
  try {
    return res.json(await save_fresher_quiz(req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to save the fresher quiz", "jobs_manager", req);
  }
}

export async function fresher_quiz_get(req, res) {
  try {
    return res.json(await get_fresher_quiz(req.params.jobId));
  } catch (err) {
    return send_error(res, err, "Unable to load the fresher quiz", "jobs_manager", req);
  }
}

export async function jobs_delete(req, res) {
  try {
    return res.json(await delete_job(req.params.jobId));
  } catch (err) {
    return send_error(res, err, "Unable to delete this job", "jobs_manager", req);
  }
}
