import { STUDENT_HOME_ENGLISH as ENGLISH } from "../constants/english/student_home_constants_english.js";
export { display_name } from "../design_system/people.js";
export function first_name(student) {
  const name = String(student?.first_name || "").trim();
  if (!name) return "there";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function relative_access(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return ENGLISH.today_2;
  if (days === 1) return ENGLISH.label_1_day_ago;
  if (days < 14) return ENGLISH.days_ago(days);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function matches_query(text, query) {
  if (!query) return true;
  return String(text || "").toLowerCase().includes(query);
}
