import { send_error } from "../utils/send_error.js";
import {
  assign_cohort_program,
  create_cohort,
  create_cohort_program,
  delete_cohort,
  delete_cohort_program,
  delete_cohort_profile,
  delete_cohort_thumbnail,
  get_cohort,
  list_cohorts,
  update_cohort,
  update_cohort_program,
  upload_cohort_profile,
  upload_cohort_thumbnail } from
"./cohort_service.js";

export async function cohorts_list(_req, res) {
  try {
    return res.json(await list_cohorts());
  } catch (err) {
    return send_error(res, err, "Unable to load cohorts", "cohorts");
  }
}

export async function cohorts_get(req, res) {
  try {
    return res.json(await get_cohort(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to load cohort", "cohorts", req);
  }
}

export async function cohorts_create(req, res) {
  try {
    return res.status(201).json(await create_cohort(req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to create cohort", "cohorts", req);
  }
}

export async function cohorts_update(req, res) {
  try {
    return res.json(await update_cohort(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to update cohort", "cohorts", req);
  }
}

export async function cohorts_delete(req, res) {
  try {
    return res.json(await delete_cohort(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete cohort", "cohorts", req);
  }
}

export async function cohorts_thumbnail(req, res) {
  try {
    return res.json(await upload_cohort_thumbnail(Number(req.params.id), req.file));
  } catch (err) {
    return send_error(res, err, "Unable to upload image", "cohorts", req);
  }
}

export async function cohorts_profile(req, res) {
  try {
    return res.json(await upload_cohort_profile(Number(req.params.id), req.file));
  } catch (err) {
    return send_error(res, err, "Unable to upload profile image", "cohorts", req);
  }
}

export async function cohorts_profile_delete(req, res) {
  try {
    return res.json(await delete_cohort_profile(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete profile image", "cohorts", req);
  }
}

export async function cohorts_thumbnail_delete(req, res) {
  try {
    return res.json(await delete_cohort_thumbnail(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete image", "cohorts", req);
  }
}

export async function cohorts_program_create(req, res) {
  try {
    return res.status(201).json(await create_cohort_program(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to create program", "cohorts", req);
  }
}

export async function cohorts_program_assign(req, res) {
  try {
    return res.json(await assign_cohort_program(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to assign program", "cohorts", req);
  }
}

export async function cohorts_program_update(req, res) {
  try {
    return res.json(await update_cohort_program(
      Number(req.params.id),
      Number(req.params.programId),
      req.body || {}
    ));
  } catch (err) {
    return send_error(res, err, "Unable to update program", "cohorts", req);
  }
}

export async function cohorts_program_delete(req, res) {
  try {
    return res.json(await delete_cohort_program(Number(req.params.id), Number(req.params.programId)));
  } catch (err) {
    return send_error(res, err, "Unable to delete program", "cohorts", req);
  }
}
