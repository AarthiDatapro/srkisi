import { DESIGN_SYSTEM_ENGLISH as ENGLISH } from "../constants/english/design_system_constants_english.js";
export function initials(first, last) {
  const a = String(first || "").trim();
  const b = String(last || "").trim();
  const letters = `${a[0] || ""}${b[0] || a[1] || ""}`.toUpperCase();
  return letters || "ST";
}

export function initials_from_name(name, fallback = "?") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((part) => part[0]).join("") || fallback).toUpperCase();
}

export function display_name(student) {
  return [student?.first_name, student?.last_name].
  filter(Boolean).
  map((word) => word.charAt(0).toUpperCase() + word.slice(1)).
  join(" ").
  trim() || ENGLISH.student;
}

const FACE_TONES = ["#8b3a3a", "#EB7828", "#0f766e", "#6d28d9", "#9a3412", "#1e3a5f", "#0e4d6c", "#7c2d12"];

export function face_tone(name = "") {
  const text = String(name);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + ((hash << 5) - hash);
  }
  return FACE_TONES[Math.abs(hash) % FACE_TONES.length];
}
