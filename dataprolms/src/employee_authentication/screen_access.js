import {
  ACCESS,
  ADMIN_SCREEN_IDS,
  ADMIN_SCREENS,
  SCREEN } from
"@admin_screens";

export { ACCESS, ADMIN_SCREEN_IDS, ADMIN_SCREENS, SCREEN };

export function empty_screen_access() {
  return Object.fromEntries(ADMIN_SCREENS.map((screen) => [screen.id, ""]));
}

export function screens_to_form(screens = []) {
  const next = empty_screen_access();
  for (const item of screens) {
    if (!item?.id) continue;
    if (item.access === ACCESS.view || item.access === ACCESS.edit) next[item.id] = item.access;
  }
  return next;
}

export function can_use_screen(screens = [], screen_id, access = ACCESS.view) {
  const found = (Array.isArray(screens) ? screens : []).find((item) => item.id === screen_id);
  if (!found) return false;
  if (access === ACCESS.edit) return found.access === ACCESS.edit;
  return found.access === ACCESS.view || found.access === ACCESS.edit;
}

export function is_admin_screen(id) {
  return ADMIN_SCREEN_IDS.includes(id);
}

export function admin_screen_path(screen_id) {
  return `/admin_dashboard/${screen_id}`;
}
