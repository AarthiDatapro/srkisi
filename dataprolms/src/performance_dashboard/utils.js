import { initials_from_name } from "../design_system/people.js";
import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../constants/english/performance_dashboard_constants_english.js";
export { pretty_date } from "../design_system/format.js";

export function initials(name = "") {
  return initials_from_name(name, "S");
}


export function short_date(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function week_day(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { weekday: "narrow" });
}

export function course_label(item) {
  const names = Object.values(item.courses || {}).
  map((course) => course.course_name).
  filter(Boolean);
  if (!names.length) return ENGLISH.enrolled;
  if (names.length === 1) return names[0];
  return ENGLISH.more(names[0], names.length - 1);
}
