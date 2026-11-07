import { log } from "@datapromr/log";
import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "./db_setup.js";
import { ensure_employee_schema } from "../employee_manager/schema.js";
import { ACCESS, ADMIN_SCREEN_IDS, ADMIN_SCREENS } from "./admin_screens.js";

export { ACCESS, ADMIN_SCREEN_IDS, ADMIN_SCREENS, SCREEN } from "./admin_screens.js";

function fail(message, status = 403) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function access_rank(access) {
  if (access === ACCESS.edit) return 2;
  if (access === ACCESS.view) return 1;
  return 0;
}

function needed_rank(access) {
  return access === ACCESS.edit ? 2 : 1;
}

export function is_bootstrap_admin(user = {}) {
  const admin_email = String(process.env.ADMIN_EMAIL || "").
  trim().
  toLowerCase();
  const email = String(user.email || "").
  trim().
  toLowerCase();
  return Boolean(admin_email && email && email === admin_email);
}

export function full_access_screens() {
  return ADMIN_SCREENS.map((screen) => ({ id: screen.id, access: ACCESS.edit }));
}

export function normalize_screens(input) {
  const list = Array.isArray(input) ?
  input :
  input && typeof input === "object" ?
  Object.entries(input).map(([id, access]) => ({ id, access })) :
  [];

  const allowed = new Set(ADMIN_SCREEN_IDS);
  const seen = new Set();
  const screens = [];

  for (const item of list) {
    const id = String(item?.id || item?.screen_id || "").trim();
    const access = String(item?.access || "").trim().toLowerCase();
    if (!allowed.has(id) || seen.has(id)) continue;
    if (access !== ACCESS.view && access !== ACCESS.edit) continue;
    seen.add(id);
    screens.push({ id, access });
  }

  return screens;
}

export async function list_employee_screens(employee_id) {
  await ensure_employee_schema();
  const id = Number(employee_id);
  if (!Number.isInteger(id) || id <= 0) return [];
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT screen_id, access
     FROM tbl_employee_screen_permissions
     WHERE employee_id = ?
     ORDER BY screen_id ASC`,
    [id]
  );
  const screens = (rows || []).map((row) => ({
    id: row.screen_id,
    access: row.access === ACCESS.edit ? ACCESS.edit : ACCESS.view
  }));
  log.pass("list_employee_screens", `loaded ${screens.length} screens for ${id}`);
  return screens;
}

export async function replace_employee_screens(employee_id, input) {
  await ensure_employee_schema();
  const id = Number(employee_id);
  if (!Number.isInteger(id) || id <= 0) return [];
  const screens = normalize_screens(input);
  const pool = get_pool();
  await sqlQuery(pool, `DELETE FROM tbl_employee_screen_permissions WHERE employee_id = ?`, [id]);
  for (const screen of screens) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_employee_screen_permissions (employee_id, screen_id, access)
       VALUES (?, ?, ?)`,
      [id, screen.id, screen.access]
    );
  }
  log.pass("replace_employee_screens", `saved ${screens.length} screens for ${id}`);
  return screens;
}

export async function screens_for_user(user = {}) {
  if (is_bootstrap_admin(user)) return full_access_screens();
  return list_employee_screens(user.sub);
}

function screen_access_map(screens = []) {
  return Object.fromEntries(screens.map((screen) => [screen.id, screen.access]));
}

export function can_use_screen(screens, screen_id, access = ACCESS.view) {
  return access_rank(screen_access_map(screens)[screen_id]) >= needed_rank(access);
}

export async function pass_screen_access(req, { screen, access = ACCESS.view, any_of } = {}) {
  const user = req.user;
  if (!user || user.role !== "employee") {
    throw fail("Sign in as an employee to continue", 401);
  }

  const screens = await screens_for_user(user);
  req.screenAccess = screens;

  if (is_bootstrap_admin(user)) return screens;

  const ids = any_of?.length ? any_of : [screen];
  const allowed = ids.some((id) => can_use_screen(screens, id, access));
  if (!allowed) {
    throw fail(
      access === ACCESS.edit ?
      "You have view_only access to this screen" :
      "You do not have access to this screen"
    );
  }

  return screens;
}

function send_denied(res, err) {
  const status = err.status || 500;
  return res.status(status).json({
    error: status === 500 ? "Unable to check screen access" : err.message
  });
}

export function require_screen(screen, access = ACCESS.view) {
  return async function screen_access(req, res, next) {
    try {
      await pass_screen_access(req, { screen, access });
      next();
    } catch (err) {
      send_denied(res, err);
    }
  };
}

export function require_any_screen(screen_ids, access = ACCESS.view) {
  return async function any_screen_access(req, res, next) {
    try {
      await pass_screen_access(req, { any_of: screen_ids, access });
      next();
    } catch (err) {
      send_denied(res, err);
    }
  };
}

export const view_access = Object.freeze(
  Object.fromEntries(ADMIN_SCREENS.map((screen) => [screen.id, require_screen(screen.id, ACCESS.view)]))
);

export const edit_access = Object.freeze(
  Object.fromEntries(ADMIN_SCREENS.map((screen) => [screen.id, require_screen(screen.id, ACCESS.edit)]))
);

export const read_dropdown_catalog = require_any_screen(ADMIN_SCREEN_IDS, ACCESS.view);
