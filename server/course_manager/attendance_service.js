import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { validateOptionalText } from "@datapromr/validation";
import { get_pool } from "../utils/db_setup.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { ensure_student_profile_schema } from "../student_authentication/student_auth_service.js";
import { get_course, parse_program_id } from "./course_service.js";
import { ensure_course_schema } from "./schema.js";

const STATUSES = new Set(["present", "absent", "late"]);

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function today_stamp() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function ymd(value) {
  const text = String(value || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return text;
}

function map_row(row) {
  return {
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
    email: row.email || "",
    profile_photo_url: row.profile_photo_url || "",
    attendance_id: row.attendance_id || null,
    status: row.status || "",
    remarks: row.remarks || "",
    marked_by: row.marked_by || null,
    updated_at: row.updated_at || row.created_at || null
  };
}

function summarize(items) {
  const counts = { present: 0, absent: 0, late: 0, unmarked: 0 };
  for (const item of items) {
    if (item.status === "present") counts.present += 1;else
    if (item.status === "absent") counts.absent += 1;else
    if (item.status === "late") counts.late += 1;else
    counts.unmarked += 1;
  }
  return counts;
}

export async function get_course_attendance(id, query = {}) {
  const course = await get_course(id);
  await ensure_course_schema();
  await ensure_registration_schema();
  await ensure_student_profile_schema();

  const date = ymd(query.date) || today_stamp();
  const program_id = parse_program_id(query.program_id);
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT s.student_id, s.first_name, s.last_name, s.email, s.profile_photo_url,
            a.attendance_id, a.status, a.remarks, a.marked_by, a.created_at, a.updated_at
     FROM tbl_course_registrations r
     INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
     LEFT JOIN tbl_course_attendance a
       ON a.course_id = r.course_id
      AND a.student_id = r.student_id
      AND a.attendance_date = ?
     WHERE r.course_id = ? AND r.is_deleted = FALSE AND r.status = 'registered'
       ${program_id ? "AND r.program_id = ?" : ""}
     ORDER BY s.first_name ASC, s.last_name ASC, s.student_id ASC`,
    program_id ? [date, id, program_id] : [date, id]
  );

  const items = (rows || []).map(map_row);
  log.pass("getCourseAttendance", `course ${id} ${date} ${items.length} students`);
  return {
    course_id: course.course_id,
    attendance_date: date,
    items,
    ...summarize(items)
  };
}

export async function save_course_attendance(id, body = {}, employee_id = null) {
  const course = await get_course(id);
  await ensure_course_schema();
  await ensure_registration_schema();

  const date = ymd(body.attendance_date || body.date);
  if (!date) throw fail("Select a valid attendance date");
  if (date > today_stamp()) throw fail("You cannot mark attendance for a future date");

  const incoming = Array.isArray(body.marks) ? body.marks : [];
  if (!incoming.length) throw fail("Mark at least one student");

  const marks = incoming.map((row) => {
    const student_id = String(row?.student_id || "").trim();
    const status = String(row?.status || "").trim().toLowerCase();
    const remarks = validateOptionalText(row?.remarks, "Remarks", 500);
    if (!student_id) throw fail("A student is missing from the attendance list");
    if (!STATUSES.has(status)) throw fail("Choose Present, Absent, or Late for each marked student");
    if (remarks) throw fail(remarks);
    return {
      student_id: student_id,
      status,
      remarks: String(row?.remarks || "").trim().slice(0, 500)
    };
  });

  const program_id = parse_program_id(body.program_id);
  const pool = get_pool();
  const [enrolled] = await sqlQuery(
    pool,
    `SELECT student_id
     FROM tbl_course_registrations
     WHERE course_id = ? AND is_deleted = FALSE AND status = 'registered'
       ${program_id ? "AND program_id = ?" : ""}`,
    program_id ? [id, program_id] : [id]
  );
  const allowed = new Set((enrolled || []).map((row) => row.student_id));
  for (const mark of marks) {
    if (!allowed.has(mark.student_id)) {
      throw fail(`${mark.student_id} is not enrolled in this course`);
    }
  }

  const placeholders = marks.map(() => "(?, ?, ?, ?, ?, ?, NOW(), NOW())").join(", ");
  const params = marks.flatMap((mark) => [
  id,
  mark.student_id,
  date,
  mark.status,
  mark.remarks || null,
  employee_id]
  );

  await sqlQuery(
    pool,
    `INSERT INTO tbl_course_attendance
       (course_id, student_id, attendance_date, status, remarks, marked_by, created_at, updated_at)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       remarks = VALUES(remarks),
       marked_by = VALUES(marked_by),
       updated_at = NOW()`,
    params
  );

  log.pass("saveCourseAttendance", `course ${id} ${date} saved ${marks.length} marks`);
  return get_course_attendance(course.course_id, { date, program_id: body.program_id });
}
