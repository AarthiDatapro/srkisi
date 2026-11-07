import { send_error } from "../utils/send_error.js";
import {
  create_employee,
  delete_employee,
  get_employee,
  list_employees,
  set_employee_active,
  update_employee,
  upload_employee_photo,
  delete_employee_photo } from
"./employee_service.js";

export async function employees_list(req, res) {
  try {
    return res.json(await list_employees(req.query || {}));
  } catch (err) {
    return send_error(res, err, "Unable to load employees", "employees", req);
  }
}

export async function employees_get(req, res) {
  try {
    return res.json(await get_employee(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to load employee", "employees", req);
  }
}

export async function employees_create(req, res) {
  try {
    const employee = await create_employee(req.body || {});
    return res.status(201).json(employee);
  } catch (err) {
    return send_error(res, err, "Unable to create employee", "employees", req);
  }
}

export async function employees_update(req, res) {
  try {
    return res.json(await update_employee(Number(req.params.id), req.body || {}));
  } catch (err) {
    return send_error(res, err, "Unable to update employee", "employees", req);
  }
}

export async function employees_activate(req, res) {
  try {
    return res.json(await set_employee_active(Number(req.params.id), true));
  } catch (err) {
    return send_error(res, err, "Unable to activate employee", "employees", req);
  }
}

export async function employees_deactivate(req, res) {
  try {
    return res.json(await set_employee_active(Number(req.params.id), false));
  } catch (err) {
    return send_error(res, err, "Unable to deactivate employee", "employees", req);
  }
}

export async function employees_delete(req, res) {
  try {
    return res.json(await delete_employee(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete employee", "employees", req);
  }
}

export async function employees_photo(req, res) {
  try {
    return res.json(await upload_employee_photo(Number(req.params.id), req.file));
  } catch (err) {
    return send_error(res, err, "Unable to upload photo", "employees", req);
  }
}

export async function employees_photo_delete(req, res) {
  try {
    return res.json(await delete_employee_photo(Number(req.params.id)));
  } catch (err) {
    return send_error(res, err, "Unable to delete photo", "employees", req);
  }
}
