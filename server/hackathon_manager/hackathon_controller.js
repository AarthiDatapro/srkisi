import { send_error } from "../utils/send_error.js";
import {
  delete_hackathon,
  generate_coding_item,
  generate_mcq_items,
  get_hackathon,
  list_batches,
  list_hackathons,
  list_hackathon_options,
  save_batch,
  save_hackathon,
  search_batch_students,
  download_student_certificate,
  get_student_hackathon,
  list_student_hackathons,
  read_student_project_file,
  run_student_coding,
  save_student_answer,
  save_student_project,
  submit_student_coding
} from "./hackathon_service.js";

export async function hackathons_options(req, res) {
  try {
    return res.json(await list_hackathon_options());
  } catch (err) {
    return send_error(res, err, "Unable to load hackathon options", "hackathon_manager", req);
  }
}

export async function hackathons_list(req, res) {
  try {
    return res.json({ items: await list_hackathons() });
  } catch (err) {
    return send_error(res, err, "Unable to load hackathons", "hackathon_manager", req);
  }
}

export async function hackathons_get(req, res) {
  try {
    return res.json({ item: await get_hackathon(req.params.hackathonId) });
  } catch (err) {
    return send_error(res, err, "Unable to load this hackathon", "hackathon_manager", req);
  }
}

export async function hackathons_create(req, res) {
  try {
    return res.status(201).json({ item: await save_hackathon(null, req.body || {}) });
  } catch (err) {
    return send_error(res, err, "Unable to create this hackathon", "hackathon_manager", req);
  }
}

export async function hackathons_update(req, res) {
  try {
    return res.json({ item: await save_hackathon(req.params.hackathonId, req.body || {}) });
  } catch (err) {
    return send_error(res, err, "Unable to update this hackathon", "hackathon_manager", req);
  }
}

export async function hackathons_delete(req, res) {
  try {
    return res.json(await delete_hackathon(req.params.hackathonId));
  } catch (err) {
    return send_error(res, err, "Unable to delete this hackathon", "hackathon_manager", req);
  }
}

export async function hackathons_generate_mcq(req, res) {
  try {
    return res.json(await generate_mcq_items(req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to generate questions", "hackathon_manager", req);
  }
}

export async function hackathon_batches_list(req, res) {
  try {
    return res.json(await list_batches(req.params.hackathonId));
  } catch (err) {
    return send_error(res, err, "Unable to load batches", "hackathon_manager", req);
  }
}

export async function hackathon_students_search(req, res) {
  try {
    return res.json(await search_batch_students(req.params.hackathonId, req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to search students", "hackathon_manager", req);
  }
}

export async function hackathon_batches_save(req, res) {
  try {
    const item = await save_batch(req.params.hackathonId, req.params.batchId, req.body || {});
    return res.status(req.params.batchId ? 200 : 201).json({ item });
  } catch (err) {
    return send_error(res, err, "Unable to save this batch", "hackathon_manager", req);
  }
}

export async function student_hackathons_list(req, res) {
  try {
    return res.json({ items: await list_student_hackathons(req.user) });
  } catch (err) {
    return send_error(res, err, "Unable to load hackathons", "hackathon_manager", req);
  }
}

export async function student_hackathons_certificate(req, res) {
  try {
    const file = await download_student_certificate(req.user, req.params.hackathonId);
    res.setHeader("Content-Type", file.content_type);
    res.setHeader("Content-Disposition", `attachment; filename="${file.file_name}"`);
    return res.send(file.buffer);
  } catch (err) {
    return send_error(res, err, "Unable to download this certificate", "hackathon_manager", req);
  }
}

export async function student_hackathons_get(req, res) {
  try {
    return res.json(await get_student_hackathon(req.user, req.params.hackathonId));
  } catch (err) {
    return send_error(res, err, "Unable to open this hackathon", "hackathon_manager", req);
  }
}

export async function student_hackathons_project(req, res) {
  try {
    return res.json({
      answer: await save_student_project(req.user, req.params.hackathonId, req.params.itemId, req.body || {}, req.file)
    });
  } catch (err) {
    return send_error(res, err, "Unable to submit this project", "hackathon_manager", req);
  }
}

export async function student_hackathons_file(req, res) {
  try {
    const file = await read_student_project_file(req.user, req.params.hackathonId, req.params.itemId);
    return res.download(file.absolute, file.file_name);
  } catch (err) {
    return send_error(res, err, "Unable to download this zip", "hackathon_manager", req);
  }
}

export async function student_hackathons_answer(req, res) {
  try {
    return res.json({ answer: await save_student_answer(req.user, req.params.hackathonId, req.params.itemId, req.body || {}) });
  } catch (err) {
    return send_error(res, err, "Unable to save this answer", "hackathon_manager", req);
  }
}

export async function student_hackathons_run(req, res) {
  try {
    return res.json(await run_student_coding(req.user, req.params.hackathonId, req.params.itemId, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to run this code", "hackathon_manager", req);
  }
}

export async function student_hackathons_submit_code(req, res) {
  try {
    return res.json(await submit_student_coding(req.user, req.params.hackathonId, req.params.itemId, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to submit this code", "hackathon_manager", req);
  }
}

export async function hackathons_generate_coding(req, res) {
  try {
    return res.json({ item: await generate_coding_item(req.body || {}) });
  } catch (err) {
    return send_error(res, err, "Unable to generate the coding question", "hackathon_manager", req);
  }
}
