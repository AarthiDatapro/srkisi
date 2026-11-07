import { initials_from_name } from "../../design_system/people.js";

export function initials(name = "") {
  return initials_from_name(name, "U");
}

export function format_count(value) {
  return Number(value || 0).toLocaleString("en-IN");
}
