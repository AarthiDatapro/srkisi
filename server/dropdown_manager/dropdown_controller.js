import { send_error } from "../utils/send_error.js";
import {
  catalog_dropdowns,
  create_dropdown_option,
  delete_dropdown_option,
  list_dropdown_options,
  set_dropdown_option_active,
  update_dropdown_option } from
"./dropdown_service.js";

export async function dropdown_catalog(req, res) {
  try {
    return res.json(catalog_dropdowns());
  } catch (err) {
    return send_error(res, err, "Unable to load dropdowns", "dropdowns", req);
  }
}

export async function dropdown_list(req, res) {
  try {
    return res.json(await list_dropdown_options(req.params.key, req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load options", "dropdowns", req);
  }
}

export async function dropdown_create(req, res) {
  try {
    return res.status(201).json(await create_dropdown_option(req.params.key, req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to create option", "dropdowns", req);
  }
}

export async function dropdown_update(req, res) {
  try {
    return res.json(
      await update_dropdown_option(req.params.key, Number(req.params.id), req.body || {})
    );
  } catch (err) {
    return send_error(res, err, "Unable to update option", "dropdowns", req);
  }
}

export async function dropdown_activate(req, res) {
  try {
    return res.json(await set_dropdown_option_active(req.params.key, Number(req.params.id), true));
  } catch (err) {
    return send_error(res, err, "Unable to activate option", "dropdowns", req);
  }
}

export async function dropdown_deactivate(req, res) {
  try {
    return res.json(await set_dropdown_option_active(req.params.key, Number(req.params.id), false));
  } catch (err) {
    return send_error(res, err, "Unable to deactivate option", "dropdowns", req);
  }
}

export async function dropdown_delete(req, res) {
  try {
    return res.json(await delete_dropdown_option(req.params.key, Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete option", "dropdowns", req);
  }
}
