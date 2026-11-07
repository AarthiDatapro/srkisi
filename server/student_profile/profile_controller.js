import { send_error } from "../utils/send_error.js";
import {
  get_student_profile,
  has_student_ollama_api_key,
  update_student_ollama_api_key,
  update_student_ollama_fast_enabled,
  update_student_photo,
  delete_student_photo,
  update_student_profile } from
"./profile_service.js";

export async function profile_get(req, res) {
  try {
    return res.json(await get_student_profile(req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load your profile", "student_profile", req);
  }
}

export async function profile_update(req, res) {
  try {
    return res.json(await update_student_profile(req.user, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to update your profile", "student_profile", req);
  }
}

export async function profile_photo_update(req, res) {
  try {
    return res.json(await update_student_photo(req.user, req.file));
  } catch (err) {
    return send_error(res, err, "Unable to update your photo", "student_profile", req);
  }
}

export async function profile_photo_delete(req, res) {
  try {
    return res.json(await delete_student_photo(req.user));
  } catch (err) {
    return send_error(res, err, "Unable to delete your photo", "student_profile", req);
  }
}

export async function profile_ollama_key_status(req, res) {
  try {
    return res.json(await has_student_ollama_api_key(req.user));
  } catch (err) {
    return send_error(res, err, "Unable to check your API key", "student_profile", req);
  }
}

export async function profile_ollama_key_update(req, res) {
  try {
    return res.json(await update_student_ollama_api_key(req.user, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to save your API key", "student_profile", req);
  }
}

export async function profile_ollama_fast_update(req, res) {
  try {
    return res.json(await update_student_ollama_fast_enabled(req.user, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to update Fast Mentoring", "student_profile", req);
  }
}
