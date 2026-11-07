import { send_error } from "../utils/send_error.js";
import {
  create_program,
  delete_program,
  get_program,
  list_program_courses,
  list_program_faculty,
  set_program_faculty,
  list_program_students,
  list_programs,
  assign_program_courses,
  set_program_active,
  update_program,
  upload_program_thumbnail,
  delete_program_thumbnail } from
"./program_service.js";

export async function programs_list(req, res) {
  try {
    return res.json(await list_programs(req.query || {}, req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load programs", "programs", req);
  }
}

export async function programs_get(req, res) {
  try {
    return res.json(await get_program(Number(req.params.id), req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load program", "programs", req);
  }
}

export async function programs_create(req, res) {
  try {
    const program = await create_program(req.body || {});
    return res.status(201).json(program);
  } catch (err) {
    return send_error(res, err, "Unable to create program", "programs", req);
  }
}

export async function programs_update(req, res) {
  try {
    return res.json(await update_program(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to update program", "programs", req);
  }
}

export async function programs_activate(req, res) {
  try {
    return res.json(await set_program_active(Number(req.params.id), true));
  } catch (err) {
    return send_error(res, err, "Unable to activate program", "programs", req);
  }
}

export async function programs_deactivate(req, res) {
  try {
    return res.json(await set_program_active(Number(req.params.id), false));
  } catch (err) {
    return send_error(res, err, "Unable to deactivate program", "programs", req);
  }
}

export async function programs_delete(req, res) {
  try {
    return res.json(await delete_program(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete program", "programs", req);
  }
}

export async function programs_courses(req, res) {
  try {
    return res.json(await list_program_courses(Number(req.params.id), req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load courses", "programs", req);
  }
}

export async function programs_assign_courses(req, res) {
  try {
    return res.json(await assign_program_courses(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to assign courses", "programs", req);
  }
}

export async function programs_students(req, res) {
  try {
    return res.json(await list_program_students(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to load students", "programs", req);
  }
}

export async function programs_faculty(req, res) {
  try {
    return res.json(await list_program_faculty(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to load faculty", "programs", req);
  }
}

export async function programs_set_faculty(req, res) {
  try {
    return res.json(await set_program_faculty(Number(req.params.id), req.body?.employee_ids));
  } catch (err) {
    return send_error(res, err, "Unable to assign faculty", "programs", req);
  }
}

export async function programs_thumbnail(req, res) {
  try {
    return res.json(await upload_program_thumbnail(Number(req.params.id), req.file));
  } catch (err) {
    return send_error(res, err, "Unable to upload image", "programs", req);
  }
}

export async function programs_thumbnail_delete(req, res) {
  try {
    return res.json(await delete_program_thumbnail(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete image", "programs", req);
  }
}
