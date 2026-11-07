import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../constants/english/hackathon_manager_constants_english.js";
export function empty_hackathon() {
  return {
    hackathon_id: null,
    title: "",
    description: "",
    hackathon_type: "",
    audience: "program",
    cohort_id: "",
    program_ids: [],
    starts_at: "",
    ends_at: "",
    rules: "",
    certificate_id: "",
    required_submissions: 1,
    status: "draft",
    items: []
  };
}

export function empty_mcq() {
  return {
    item_id: null,
    title: "",
    marks: 1,
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    explanation: ""
  };
}

export function empty_coding() {
  return {
    item_id: null,
    title: "",
    marks: 10,
    prompt: "",
    programming_language_id: "",
    language: "",
    description: "",
    function_name: "",
    reference_code: "",
    test_cases: []
  };
}

export const PROJECT_DELIVERABLES = [
  { id: "source_code", get label() { return ENGLISH.source_code; }, get hint() { return ENGLISH.upload_project_code; } },
  { id: "project_report", get label() { return ENGLISH.project_report; }, get hint() { return ENGLISH.pdf_report; } },
  { id: "demo_video", get label() { return ENGLISH.demo_video; }, get hint() { return ENGLISH.label_3_5_minutes; } },
  { id: "presentation", get label() { return ENGLISH.presentation; }, get hint() { return ENGLISH.slides; } }
];

export function empty_deliverables() {
  return {
    source_code: true,
    project_report: true,
    demo_video: true,
    presentation: false
  };
}

export function empty_task() {
  return {
    item_id: null,
    title: "",
    marks: 10,
    description: "",
    overview: "",
    objectives: [""],
    features: [""],
    team_size: "",
    technology: "",
    project_duration: "",
    submission_type: "",
    deliverables: empty_deliverables()
  };
}

const TYPE_ORDER = ["mcq", "coding", "project"];

export function parse_types(value) {
  const found = new Set(String(value || "").split(",").map((part) => part.trim()));
  return TYPE_ORDER.filter((part) => found.has(part));
}

export function join_types(types) {
  const found = new Set(types);
  return TYPE_ORDER.filter((part) => found.has(part)).join(",");
}

export function empty_item(hackathon_type) {
  const item = hackathon_type === "coding" ? empty_coding() : hackathon_type === "project" ? empty_task() : empty_mcq();
  return { ...item, item_type: hackathon_type };
}

export function duration_label(starts_at, ends_at) {
  const start = clock_ms(starts_at);
  const end = clock_ms(ends_at);
  if (start == null || end == null) return ENGLISH.set_both_times;
  if (end <= start) return ENGLISH.end_must_be_later;
  const hours = Math.round((end - start) / 36e5);
  if (hours < 1) return ENGLISH.under_1_hour;
  if (hours === 1) return ENGLISH.label_1_hour;
  if (hours < 48) return ENGLISH.hours(hours);
  const days = Math.round(hours / 24);
  return days === 1 ? ENGLISH.label_1_day : ENGLISH.days(days);
}

function pad_part(value) {
  return String(value).padStart(2, "0");
}

export function today_stamp(now = new Date()) {
  return {
    date: `${now.getFullYear()}-${pad_part(now.getMonth() + 1)}-${pad_part(now.getDate())}`,
    time: `${pad_part(now.getHours())}:${pad_part(now.getMinutes())}`
  };
}

export function later_slot(date, time) {
  if (!date || !time) return { date: date || "", time: "" };
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + 1;
  if (total >= 24 * 60) {
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(year, month - 1, day);
    next.setDate(next.getDate() + 1);
    return {
      date: `${next.getFullYear()}-${pad_part(next.getMonth() + 1)}-${pad_part(next.getDate())}`,
      time: ""
    };
  }
  return {
    date,
    time: `${pad_part(Math.floor(total / 60))}:${pad_part(total % 60)}`
  };
}

function clock_ms(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  if (!match) return null;
  const parsed = new Date(`${match[1]}T${match[2]}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function schedule_problem(starts_at, ends_at, now = new Date()) {
  const start = clock_ms(starts_at);
  const end = clock_ms(ends_at);
  const floor = new Date(now);
  floor.setSeconds(0, 0);
  if (start != null && start < floor.getTime()) return ENGLISH.start_time_cannot_be_in_the_past;
  if (start != null && end != null && end <= start) return ENGLISH.end_time_must_be_after_the_start_time;
  return "";
}

export const DURATION_OPTIONS = [
  { id: "6", get label() { return ENGLISH.label_6_hours; }, hours: 6 },
  { id: "12", get label() { return ENGLISH.label_12_hours; }, hours: 12 },
  { id: "24", get label() { return ENGLISH.label_24_hours; }, hours: 24 },
  { id: "48", get label() { return ENGLISH.label_48_hours; }, hours: 48 },
  { id: "72", get label() { return ENGLISH.label_3_days; }, hours: 72 },
  { id: "168", get label() { return ENGLISH.label_7_days; }, hours: 168 }
];

export function duration_id(starts_at, ends_at) {
  const start = clock_ms(starts_at);
  const end = clock_ms(ends_at);
  if (start == null || end == null) return "";
  const hours = Math.round((end - start) / 36e5);
  return DURATION_OPTIONS.find((item) => item.hours === hours)?.id || "";
}

export function end_from_duration(starts_at, hours) {
  const start = clock_ms(starts_at);
  if (start == null || !hours) return "";
  const end = new Date(start + Number(hours) * 36e5);
  return `${end.getFullYear()}-${pad_part(end.getMonth() + 1)}-${pad_part(end.getDate())}T${pad_part(end.getHours())}:${pad_part(end.getMinutes())}`;
}

export function when_label(value) {
  if (!value) return ENGLISH.not_scheduled;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
