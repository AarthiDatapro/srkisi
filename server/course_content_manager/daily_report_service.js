import path from "node:path";
import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { validateOptionalText, validateRequiredText } from "@datapromr/validation";
import { get_course } from "../course_manager/course_service.js";
import { get_pool } from "../utils/db_setup.js";
import { STORAGE_BUCKETS, forget_stored_file, upload_to_bucket } from "../utils/storage_buckets.js";
import { build_daily_report_pdf } from "./daily_report_pdf.js";
import { ensure_content_schema } from "./schema.js";
import { ymd } from "../utils/dates.js";

const PHOTO_TYPES = new Set(["image/jpeg", "image/png"]);
const PHOTO_EXT = new Set([".jpg", ".jpeg", ".png"]);

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function as_int(value, fallback = null) {
  if (value === 0 || value === "0") return 0;
  if (value === "" || value == null) return fallback;
  const number = Number(value);
  return Number.isInteger(number) ? number : fallback;
}

function as_bool(value) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "Yes";
}

function parse_json(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  if (typeof value === "object") return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function clean_sessions(value) {
  const rows = Array.isArray(value) ? value : parse_json(value, []);
  return rows.
  map((row) => ({
    time: String(row?.time || "").trim().slice(0, 40),
    session: String(row?.session || "").trim().slice(0, 80),
    topic: String(row?.topic || "").trim().slice(0, 400),
    remarks: String(row?.remarks || "").trim().slice(0, 400)
  })).
  filter((row) => row.time || row.session || row.topic || row.remarks).
  slice(0, 24);
}

function clean_photos(value) {
  const rows = Array.isArray(value) ? value : parse_json(value, []);
  return rows.
  map((row) => ({
    file_name: String(row?.file_name || "").trim().slice(0, 255),
    file_path: String(row?.file_path || "").trim().slice(0, 500),
    caption: String(row?.caption || "").trim().slice(0, 200)
  })).
  filter((row) =>
  row.file_path.startsWith("http://") || row.file_path.startsWith("https://")
  ).
  slice(0, 12);
}

function first_error(errors) {
  return Object.values(errors).find(Boolean) || "";
}

function validate_report(body = {}) {
  const date = String(body.report_date || "").trim();
  const date_error = /^\d{4}-\d{2}-\d{2}$/.test(date) ? "" : "Report date is required";
  return {
    report_date: date_error,
    trainer_name: validateRequiredText(body.trainer_name, "Trainer name", 150),
    teaching_assistant: validateOptionalText(body.teaching_assistant, "Teaching assistant", 150),
    module_course: validateOptionalText(body.module_course, "Module / course", 200),
    session_timings: validateOptionalText(body.session_timings, "Session timings", 100),
    program_title: validateOptionalText(body.program_title, "Program title", 200),
    venue: validateOptionalText(body.venue, "Venue", 300),
    association_line: validateOptionalText(body.association_line, "Association", 300),
    course_track: validateOptionalText(body.course_track, "Course track", 200),
    lab_work: validateOptionalText(body.lab_work, "Lab work", 4000),
    lab_comments: validateOptionalText(body.lab_comments, "Lab comments", 2000),
    other_activities: validateOptionalText(body.other_activities, "Other activities", 2000),
    daily_reason: validateOptionalText(body.daily_reason, "Daily assignment reason", 2000),
    weekly_reason: validateOptionalText(body.weekly_reason, "Weekly assignment reason", 2000),
    submitted_by: validateOptionalText(body.submitted_by, "Submitted by", 150),
    reviewed_by: validateOptionalText(body.reviewed_by, "Reviewed by", 150)
  };
}

function normalize(body = {}, existing_photos = []) {
  const enrolled = Math.max(0, as_int(body.enrolled, 0) || 0);
  const present = Math.max(0, as_int(body.present_today, 0) || 0);
  const absent = body.absent_today === "" || body.absent_today == null ?
  Math.max(0, enrolled - present) :
  Math.max(0, as_int(body.absent_today, 0) || 0);
  const percent = enrolled ? Math.round(present / enrolled * 10000) / 100 : 0;
  return {
    report_date: String(body.report_date || "").trim(),
    day_no: as_int(body.day_no),
    week_no: as_int(body.week_no),
    trainer_name: String(body.trainer_name || "").trim(),
    teaching_assistant: String(body.teaching_assistant || "").trim(),
    module_course: String(body.module_course || "").trim(),
    session_timings: String(body.session_timings || "").trim(),
    program_title: String(body.program_title || "").trim(),
    venue: String(body.venue || "").trim(),
    association_line: String(body.association_line || "").trim(),
    course_track: String(body.course_track || "").trim(),
    enrolled,
    present_today: present,
    absent_today: absent,
    attendance_percent: Number.isFinite(Number(body.attendance_percent)) ?
    Number(body.attendance_percent) :
    percent,
    morning_count: Math.max(0, as_int(body.morning_count, present) || 0),
    afternoon_count: Math.max(0, as_int(body.afternoon_count, present) || 0),
    daily_assignment: as_bool(body.daily_assignment),
    daily_attempts: as_int(body.daily_attempts),
    daily_reason: String(body.daily_reason || "").trim(),
    weekly_assignment: as_bool(body.weekly_assignment),
    weekly_attempts: as_int(body.weekly_attempts),
    weekly_reason: String(body.weekly_reason || "").trim(),
    lab_work: String(body.lab_work || "").trim(),
    lab_comments: String(body.lab_comments || "").trim(),
    other_activities: String(body.other_activities || "").trim(),
    submitted_by: String(body.submitted_by || "").trim(),
    submitted_date: String(body.submitted_date || "").trim() || null,
    reviewed_by: String(body.reviewed_by || "").trim(),
    reviewed_date: String(body.reviewed_date || "").trim() || null,
    sessions: clean_sessions(body.sessions),
    photos: body.photos ? clean_photos(body.photos) : existing_photos
  };
}

function map_report(row) {
  return {
    report_id: Number(row.report_id),
    course_id: Number(row.course_id),
    report_date: ymd(row.report_date),
    day_no: as_int(row.day_no),
    week_no: as_int(row.week_no),
    trainer_name: row.trainer_name || "",
    teaching_assistant: row.teaching_assistant || "",
    module_course: row.module_course || "",
    session_timings: row.session_timings || "",
    program_title: row.program_title || "",
    venue: row.venue || "",
    association_line: row.association_line || "",
    course_track: row.course_track || "",
    enrolled: as_int(row.enrolled, 0) || 0,
    present_today: as_int(row.present_today, 0) || 0,
    absent_today: as_int(row.absent_today, 0) || 0,
    attendance_percent: Number(row.attendance_percent || 0),
    morning_count: as_int(row.morning_count, 0) || 0,
    afternoon_count: as_int(row.afternoon_count, 0) || 0,
    daily_assignment: as_bool(row.daily_assignment),
    daily_attempts: as_int(row.daily_attempts),
    daily_reason: row.daily_reason || "",
    weekly_assignment: as_bool(row.weekly_assignment),
    weekly_attempts: as_int(row.weekly_attempts),
    weekly_reason: row.weekly_reason || "",
    lab_work: row.lab_work || "",
    lab_comments: row.lab_comments || "",
    other_activities: row.other_activities || "",
    submitted_by: row.submitted_by || "",
    submitted_date: ymd(row.submitted_date),
    reviewed_by: row.reviewed_by || "",
    reviewed_date: ymd(row.reviewed_date),
    sessions: parse_json(row.sessions_json, []),
    photos: parse_json(row.photos_json, []),
    pdf_file_name: row.pdf_file_name || "",
    pdf_file_path: row.pdf_file_path || "",
    created_at: row.created_at || null,
    updated_at: row.updated_at || null
  };
}

const SELECT = `
  SELECT report_id, course_id, report_date, day_no, week_no, trainer_name, teaching_assistant,
         module_course, session_timings, program_title, venue, association_line, course_track,
         enrolled, present_today, absent_today, attendance_percent, morning_count, afternoon_count,
         daily_assignment, daily_attempts, daily_reason, weekly_assignment, weekly_attempts, weekly_reason,
         lab_work, lab_comments, other_activities, submitted_by, submitted_date, reviewed_by, reviewed_date,
         sessions_json, photos_json, pdf_file_name, pdf_file_path, created_at, updated_at
    FROM tbl_course_daily_reports
`;

async function load_report(pool, course_id, report_id) {
  const [rows] = await sqlQuery(
    pool,
    `${SELECT} WHERE course_id = ? AND report_id = ? AND is_deleted = FALSE`,
    [course_id, report_id]
  );
  if (!rows?.[0]) throw fail("Daily report not found", 404);
  return map_report(rows[0]);
}

export async function list_daily_reports(course_id) {
  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `${SELECT} WHERE course_id = ? AND is_deleted = FALSE
     ORDER BY report_date DESC, report_id DESC`,
    [course_id]
  );
  return { items: (rows || []).map(map_report) };
}

export async function get_daily_report(course_id, report_id) {
  await get_course(course_id);
  await ensure_content_schema();
  return load_report(get_pool(), course_id, report_id);
}

const INSERT_SQL = `
  INSERT INTO tbl_course_daily_reports (
    course_id, report_date, day_no, week_no, trainer_name, teaching_assistant, module_course,
    session_timings, program_title, venue, association_line, course_track, enrolled, present_today,
    absent_today, attendance_percent, morning_count, afternoon_count, daily_assignment, daily_attempts,
    daily_reason, weekly_assignment, weekly_attempts, weekly_reason, lab_work, lab_comments,
    other_activities, submitted_by, submitted_date, reviewed_by, reviewed_date, sessions_json,
    photos_json, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function write_params(course_id, data, actor_id, photos) {
  return [
  course_id,
  data.report_date,
  data.day_no,
  data.week_no,
  data.trainer_name,
  data.teaching_assistant,
  data.module_course,
  data.session_timings,
  data.program_title,
  data.venue,
  data.association_line,
  data.course_track,
  data.enrolled,
  data.present_today,
  data.absent_today,
  data.attendance_percent,
  data.morning_count,
  data.afternoon_count,
  data.daily_assignment,
  data.daily_attempts,
  data.daily_reason,
  data.weekly_assignment,
  data.weekly_attempts,
  data.weekly_reason,
  data.lab_work,
  data.lab_comments,
  data.other_activities,
  data.submitted_by,
  data.submitted_date,
  data.reviewed_by,
  data.reviewed_date,
  JSON.stringify(data.sessions),
  JSON.stringify(photos),
  actor_id];

}

export async function create_daily_report(course_id, body, actor_id) {
  await get_course(course_id);
  await ensure_content_schema();
  const errors = validate_report(body);
  const message = first_error(errors);
  if (message) throw fail(message);
  const data = normalize(body, []);
  const pool = get_pool();
  const [result] = await sqlQuery(pool, INSERT_SQL, write_params(course_id, data, actor_id || null, data.photos));
  log.pass("createDailyReport", `course ${course_id} report ${result.insertId}`);
  return load_report(pool, course_id, result.insertId);
}

export async function update_daily_report(course_id, report_id, body, actor_id) {
  await get_course(course_id);
  await ensure_content_schema();
  const errors = validate_report(body);
  const message = first_error(errors);
  if (message) throw fail(message);
  const pool = get_pool();
  const existing = await load_report(pool, course_id, report_id);
  const data = normalize(body, existing.photos);
  await sqlQuery(
    pool,
    `UPDATE tbl_course_daily_reports SET
       report_date = ?, day_no = ?, week_no = ?, trainer_name = ?, teaching_assistant = ?,
       module_course = ?, session_timings = ?, program_title = ?, venue = ?, association_line = ?,
       course_track = ?, enrolled = ?, present_today = ?, absent_today = ?, attendance_percent = ?,
       morning_count = ?, afternoon_count = ?, daily_assignment = ?, daily_attempts = ?,
       daily_reason = ?, weekly_assignment = ?, weekly_attempts = ?, weekly_reason = ?,
       lab_work = ?, lab_comments = ?, other_activities = ?, submitted_by = ?, submitted_date = ?,
       reviewed_by = ?, reviewed_date = ?, sessions_json = ?, photos_json = ?, updated_by = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND report_id = ? AND is_deleted = FALSE`,
    [
    data.report_date,
    data.day_no,
    data.week_no,
    data.trainer_name,
    data.teaching_assistant,
    data.module_course,
    data.session_timings,
    data.program_title,
    data.venue,
    data.association_line,
    data.course_track,
    data.enrolled,
    data.present_today,
    data.absent_today,
    data.attendance_percent,
    data.morning_count,
    data.afternoon_count,
    data.daily_assignment,
    data.daily_attempts,
    data.daily_reason,
    data.weekly_assignment,
    data.weekly_attempts,
    data.weekly_reason,
    data.lab_work,
    data.lab_comments,
    data.other_activities,
    data.submitted_by,
    data.submitted_date,
    data.reviewed_by,
    data.reviewed_date,
    JSON.stringify(data.sessions),
    JSON.stringify(data.photos),
    actor_id || null,
    course_id,
    report_id]

  );
  log.pass("updateDailyReport", `course ${course_id} report ${report_id}`);
  return load_report(pool, course_id, report_id);
}

function report_day(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 10);
}

export async function upload_daily_report_pdf(course_id, file, report_date, actor_id) {
  await get_course(course_id);
  await ensure_content_schema();
  if (!file?.buffer?.length) throw fail("Choose a PDF");
  const original = path.basename(file.originalname || "daily_report.pdf");
  const ext = path.extname(original).toLowerCase();
  if (file.mimetype !== "application/pdf" && ext !== ".pdf") throw fail("Upload a PDF");
  const safe = original.replace(/[^\w.\- ]+/g, "").slice(0, 80) || "daily_report.pdf";
  const stored_name = safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
  const file_path = await upload_to_bucket(
    STORAGE_BUCKETS.DAILY_REPORTS,
    `${course_id}/${Date.now()}-${stored_name.replace(/\s+/g, "-")}`,
    file.buffer,
    "application/pdf"
  );
  const pool = get_pool();
  try {
    const [result] = await sqlQuery(
      pool,
      `INSERT INTO tbl_course_daily_reports
         (course_id, report_date, pdf_file_name, pdf_file_path, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [course_id, report_day(report_date), original, file_path, actor_id || null]
    );
    log.pass("uploadDailyReportPdf", `course ${course_id} report ${result.insertId}`);
    return load_report(pool, course_id, result.insertId);
  } catch (err) {
    await forget_stored_file(file_path);
    throw err;
  }
}

export async function delete_daily_report(course_id, report_id) {
  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  const report = await load_report(pool, course_id, report_id);
  if (report.pdf_file_path) await forget_stored_file(report.pdf_file_path);
  await sqlQuery(
    pool,
    `UPDATE tbl_course_daily_reports
     SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND report_id = ?`,
    [course_id, report_id]
  );
  return { ok: true };
}

export async function add_daily_report_photos(course_id, report_id, files = []) {
  await get_course(course_id);
  await ensure_content_schema();
  const pool = get_pool();
  const report = await load_report(pool, course_id, report_id);
  if (!files.length) throw fail("Add at least one photo");
  const added = [];
  for (const file of files) {
    if (!PHOTO_TYPES.has(file.mimetype)) throw fail("Use a JPG or PNG photo");
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe_ext = PHOTO_EXT.has(ext) ? ext : ".jpg";
    const filename = `${report_id}-${Date.now()}-${added.length}${safe_ext}`;
    const file_path = await upload_to_bucket(
      STORAGE_BUCKETS.DAILY_REPORTS,
      filename,
      file.buffer,
      file.mimetype
    );
    added.push({
      file_name: file.originalname || filename,
      file_path,
      caption: ""
    });
  }
  const photos = [...report.photos, ...added].slice(0, 12);
  await sqlQuery(
    pool,
    `UPDATE tbl_course_daily_reports
     SET photos_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND report_id = ? AND is_deleted = FALSE`,
    [JSON.stringify(photos), course_id, report_id]
  );
  return load_report(pool, course_id, report_id);
}

export async function get_daily_report_pdf(course_id, report_id) {
  const report = await get_daily_report(course_id, report_id);
  const bytes = await build_daily_report_pdf(report);
  const stamp = report.report_date || "report";
  return {
    filename: `daily_report-${stamp}.pdf`,
    bytes
  };
}
