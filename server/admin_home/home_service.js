import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_course_schema } from "../course_manager/schema.js";
import { ensure_content_schema } from "../course_content_manager/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { ensure_employee_schema } from "../employee_manager/schema.js";
import { ensure_program_dropdown_schema } from "../dropdown_manager/schema.js";
import { ensure_student_profile_schema } from "../student_authentication/student_auth_service.js";
import { is_bootstrap_admin } from "../utils/screen_access.js";
import { ymd } from "../utils/dates.js";

function num(value) {
  return Number(value) || 0;
}

function round1(value) {
  return Math.round(num(value) * 10) / 10;
}

function month_stamp(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function month_start(offset = 0) {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() + offset);
  return date;
}

function trend(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round((current - previous) / previous * 100);
}

function last_months(count = 6) {
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = month_start(-i);
    months.push({
      key: month_stamp(date),
      label: date.toLocaleDateString("en-US", { month: "short" })
    });
  }
  return months;
}

function course_scope(alias, can_view_all, employee_id) {
  if (can_view_all) return { sql: "1=1", params: [] };
  if (!Number.isInteger(employee_id) || employee_id <= 0) return { sql: "1=0", params: [] };
  return {
    sql: `${alias} IN (
      SELECT pc.course_id
      FROM tbl_program_courses pc
      INNER JOIN tbl_program_employees pe
        ON pe.program_id = pc.program_id
       AND pe.employee_id = ?
       AND pe.is_deleted = FALSE
       AND pe.is_active = TRUE
      WHERE pc.is_deleted = FALSE
    )`,
    params: [employee_id]
  };
}

function empty_home(is_admin) {
  return {
    is_admin: is_admin,
    kpis: {
      students: 0,
      students_trend: 0,
      courses: 0,
      courses_trend: 0,
      programs: 0,
      programs_trend: 0,
      instructors: 0,
      instructors_trend: 0,
      enrollments: 0,
      enrollments_trend: 0
    },
    enrollment_series: last_months().map((item) => ({ ...item, value: 0 })),
    completion: { overall: 0, completed: 0, in_progress: 0, not_started: 0 },
    students_by_program: [],
    recent_enrollments: [],
    activities: [],
    system: {
      active_courses: 0,
      present_today: 0,
      average_score: 0,
      active_staff: 0
    }
  };
}

export async function get_admin_home(user = {}) {
  await ensure_program_dropdown_schema();
  await ensure_course_schema();
  await ensure_registration_schema();
  await ensure_content_schema();
  await ensure_employee_schema();
  await ensure_student_profile_schema();

  const is_admin = is_bootstrap_admin(user);
  const employee_id = Number(user.sub);
  const can_view_all = is_admin;
  if (!can_view_all && (!Number.isInteger(employee_id) || employee_id <= 0)) {
    return empty_home(false);
  }

  const pool = get_pool();
  const courses = course_scope("c.course_id", can_view_all, employee_id);
  const regs = course_scope("r.course_id", can_view_all, employee_id);
  const this_start = month_start(0);
  const last_start = month_start(-1);
  const this_key = month_stamp(this_start);
  const last_key = month_stamp(last_start);
  const months = last_months();

  const [student_now] = await sqlQuery(
    pool,
    can_view_all ?
    `SELECT COUNT(*) AS total FROM tbl_students WHERE is_deleted = FALSE` :
    `SELECT COUNT(DISTINCT r.student_id) AS total
         FROM tbl_course_registrations r
         WHERE r.is_deleted = FALSE AND r.status = 'registered' AND ${regs.sql}`,
    can_view_all ? [] : regs.params
  );

  const [student_months] = await sqlQuery(
    pool,
    can_view_all ?
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COUNT(*) AS total
         FROM tbl_students
         WHERE is_deleted = FALSE AND created_at >= ?
         GROUP BY month_key` :
    `SELECT DATE_FORMAT(r.created_at, '%Y-%m') AS month_key, COUNT(DISTINCT r.student_id) AS total
         FROM tbl_course_registrations r
         WHERE r.is_deleted = FALSE AND r.status = 'registered' AND r.created_at >= ? AND ${regs.sql}
         GROUP BY month_key`,
    can_view_all ? [last_start] : [last_start, ...regs.params]
  );

  const [course_now] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_courses c WHERE c.is_deleted = FALSE AND ${courses.sql}`,
    courses.params
  );
  const [course_months] = await sqlQuery(
    pool,
    `SELECT DATE_FORMAT(c.created_at, '%Y-%m') AS month_key, COUNT(*) AS total
     FROM tbl_courses c
     WHERE c.is_deleted = FALSE AND c.created_at >= ? AND ${courses.sql}
     GROUP BY month_key`,
    [last_start, ...courses.params]
  );

  const [program_now] = await sqlQuery(
    pool,
    can_view_all ?
    `SELECT COUNT(*) AS total FROM tbl_programs WHERE is_deleted = FALSE` :
    `SELECT COUNT(DISTINCT pc.program_id) AS total
         FROM tbl_program_courses pc
         INNER JOIN tbl_courses c ON c.course_id = pc.course_id AND c.is_deleted = FALSE
         WHERE pc.is_deleted = FALSE AND ${courses.sql}`,
    can_view_all ? [] : courses.params
  );
  const [program_months] = await sqlQuery(
    pool,
    can_view_all ?
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COUNT(*) AS total
         FROM tbl_programs
         WHERE is_deleted = FALSE AND created_at >= ?
         GROUP BY month_key` :
    `SELECT DATE_FORMAT(pc.created_at, '%Y-%m') AS month_key, COUNT(DISTINCT pc.program_id) AS total
         FROM tbl_program_courses pc
         INNER JOIN tbl_courses c ON c.course_id = pc.course_id AND c.is_deleted = FALSE
         WHERE pc.is_deleted = FALSE AND pc.created_at >= ? AND ${courses.sql}
         GROUP BY month_key`,
    can_view_all ? [last_start] : [last_start, ...courses.params]
  );

  const [instructor_now] = await sqlQuery(
    pool,
    can_view_all ?
    `SELECT COUNT(*) AS total FROM tbl_employees WHERE is_deleted = FALSE` :
    `SELECT COUNT(DISTINCT pe.employee_id) AS total
         FROM tbl_program_employees pe
         INNER JOIN tbl_program_courses pc ON pc.program_id = pe.program_id AND pc.is_deleted = FALSE
         INNER JOIN tbl_courses c ON c.course_id = pc.course_id AND c.is_deleted = FALSE
         WHERE pe.is_deleted = FALSE AND pe.is_active = TRUE AND ${courses.sql}`,
    can_view_all ? [] : courses.params
  );
  const [instructor_months] = await sqlQuery(
    pool,
    can_view_all ?
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month_key, COUNT(*) AS total
         FROM tbl_employees
         WHERE is_deleted = FALSE AND created_at >= ?
         GROUP BY month_key` :
    `SELECT DATE_FORMAT(pe.created_at, '%Y-%m') AS month_key, COUNT(DISTINCT pe.employee_id) AS total
         FROM tbl_program_employees pe
         INNER JOIN tbl_program_courses pc ON pc.program_id = pe.program_id AND pc.is_deleted = FALSE
         INNER JOIN tbl_courses c ON c.course_id = pc.course_id AND c.is_deleted = FALSE
         WHERE pe.is_deleted = FALSE AND pe.is_active = TRUE AND pe.created_at >= ? AND ${courses.sql}
         GROUP BY month_key`,
    can_view_all ? [last_start] : [last_start, ...courses.params]
  );

  const [enroll_now] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total
     FROM tbl_course_registrations r
     WHERE r.is_deleted = FALSE AND r.status = 'registered' AND ${regs.sql}`,
    regs.params
  );
  const [enroll_months] = await sqlQuery(
    pool,
    `SELECT DATE_FORMAT(r.created_at, '%Y-%m') AS month_key, COUNT(*) AS total
     FROM tbl_course_registrations r
     WHERE r.is_deleted = FALSE AND r.status = 'registered' AND r.created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       AND ${regs.sql}
     GROUP BY month_key`,
    regs.params
  );

  const month_map = (rows) => Object.fromEntries((rows || []).map((row) => [row.month_key, num(row.total)]));
  const student_map = month_map(student_months);
  const course_map = month_map(course_months);
  const program_map = month_map(program_months);
  const instructor_map = month_map(instructor_months);
  const enroll_map = month_map(enroll_months);

  const [progress_rows] = await sqlQuery(
    pool,
    `SELECT
        SUM(CASE WHEN r.progress_percent >= 100 OR r.learning_status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN r.progress_percent > 0 AND r.progress_percent < 100 AND r.learning_status <> 'completed' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN r.progress_percent <= 0 OR r.learning_status = 'not_started' THEN 1 ELSE 0 END) AS not_started,
        COUNT(*) AS total
     FROM tbl_course_registrations r
     WHERE r.is_deleted = FALSE AND r.status = 'registered' AND ${regs.sql}`,
    regs.params
  );
  const progress = progress_rows?.[0] || {};
  const progress_total = num(progress.total);
  const completed = num(progress.completed);
  const in_progress = num(progress.in_progress);
  const not_started = Math.max(0, progress_total - completed - in_progress);

  const [program_bars] = await sqlQuery(
    pool,
    `SELECT p.program_id, p.program_name, COUNT(DISTINCT r.student_id) AS students
     FROM tbl_course_registrations r
     INNER JOIN tbl_programs p ON p.program_id = r.program_id AND p.is_deleted = FALSE
     WHERE r.is_deleted = FALSE AND r.status = 'registered' AND r.program_id IS NOT NULL AND ${regs.sql}
     GROUP BY p.program_id, p.program_name
     ORDER BY students DESC
     LIMIT 6`,
    regs.params
  );

  const [recent_rows] = await sqlQuery(
    pool,
    `SELECT s.student_id, s.first_name, s.last_name, s.profile_photo_url,
            c.course_name, r.created_at, r.status
     FROM tbl_course_registrations r
     INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
     INNER JOIN tbl_courses c ON c.course_id = r.course_id AND c.is_deleted = FALSE
     WHERE r.is_deleted = FALSE AND ${regs.sql}
     ORDER BY r.created_at DESC
     LIMIT 6`,
    regs.params
  );

  const [new_students] = await sqlQuery(
    pool,
    can_view_all ?
    `SELECT student_id, first_name, last_name, created_at
         FROM tbl_students
         WHERE is_deleted = FALSE
         ORDER BY created_at DESC
         LIMIT 4` :
    `SELECT s.student_id, s.first_name, s.last_name, r.created_at
         FROM tbl_course_registrations r
         INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
         WHERE r.is_deleted = FALSE AND ${regs.sql}
         ORDER BY r.created_at DESC
         LIMIT 4`,
    can_view_all ? [] : regs.params
  );

  const [quiz_acts] = await sqlQuery(
    pool,
    `SELECT a.attempt_id, s.first_name, s.last_name, c.course_name, a.submitted_at
     FROM tbl_quiz_attempts a
     INNER JOIN tbl_students s ON s.student_id = a.student_id AND s.is_deleted = FALSE
     INNER JOIN tbl_courses c ON c.course_id = a.course_id AND c.is_deleted = FALSE
     WHERE ${course_scope("a.course_id", can_view_all, employee_id).sql}
     ORDER BY a.submitted_at DESC
     LIMIT 4`,
    course_scope("a.course_id", can_view_all, employee_id).params
  );

  const [course_acts] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.course_name, c.created_at
     FROM tbl_courses c
     WHERE c.is_deleted = FALSE AND ${courses.sql}
     ORDER BY c.created_at DESC
     LIMIT 3`,
    courses.params
  );

  const [active_courses] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total FROM tbl_courses c
     WHERE c.is_deleted = FALSE AND c.is_active = TRUE AND ${courses.sql}`,
    courses.params
  );
  const [present_today] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total
     FROM tbl_course_attendance a
     WHERE a.attendance_date = CURDATE() AND a.status IN ('present', 'late')
       AND ${course_scope("a.course_id", can_view_all, employee_id).sql}`,
    course_scope("a.course_id", can_view_all, employee_id).params
  );
  const [score_rows] = await sqlQuery(
    pool,
    `SELECT AVG(a.percent) AS average_percent
     FROM tbl_quiz_attempts a
     WHERE ${course_scope("a.course_id", can_view_all, employee_id).sql}`,
    course_scope("a.course_id", can_view_all, employee_id).params
  );
  const [staff_rows] = await sqlQuery(
    pool,
    can_view_all ?
    `SELECT COUNT(*) AS total FROM tbl_employees WHERE is_deleted = FALSE AND is_active = TRUE` :
    `SELECT COUNT(DISTINCT pe.employee_id) AS total
         FROM tbl_program_employees pe
         INNER JOIN tbl_employees e ON e.employee_id = pe.employee_id AND e.is_deleted = FALSE AND e.is_active = TRUE
         INNER JOIN tbl_program_courses pc ON pc.program_id = pe.program_id AND pc.is_deleted = FALSE
         INNER JOIN tbl_courses c ON c.course_id = pc.course_id AND c.is_deleted = FALSE
         WHERE pe.is_deleted = FALSE AND pe.is_active = TRUE AND ${courses.sql}`,
    can_view_all ? [] : courses.params
  );

  const activities = [
  ...(new_students || []).map((row) => ({
    id: `student-${row.student_id}-${ymd(row.created_at)}`,
    title: "New student registration",
    detail: `${[row.first_name, row.last_name].filter(Boolean).join(" ")} registered as a student`,
    at: row.created_at,
    tone: "blue"
  })),
  ...(recent_rows || []).slice(0, 3).map((row) => ({
    id: `enroll-${row.student_id}-${row.course_name}-${ymd(row.created_at)}`,
    title: "New enrollment",
    detail: `${[row.first_name, row.last_name].filter(Boolean).join(" ")} enrolled in ${row.course_name}`,
    at: row.created_at,
    tone: "green"
  })),
  ...(quiz_acts || []).map((row) => ({
    id: `quiz-${row.attempt_id}`,
    title: "Quiz submitted",
    detail: `${[row.first_name, row.last_name].filter(Boolean).join(" ")} submitted a quiz in ${row.course_name}`,
    at: row.submitted_at,
    tone: "purple"
  })),
  ...(course_acts || []).map((row) => ({
    id: `course-${row.course_id}`,
    title: "Course published",
    detail: `${row.course_name} is available on the platform`,
    at: row.created_at,
    tone: "orange"
  }))].

  filter((item) => item.at).
  sort((left, right) => new Date(right.at) - new Date(left.at)).
  slice(0, 6);

  const payload = {
    is_admin: is_admin,
    kpis: {
      students: num(student_now?.[0]?.total),
      students_trend: trend(student_map[this_key] || 0, student_map[last_key] || 0),
      courses: num(course_now?.[0]?.total),
      courses_trend: trend(course_map[this_key] || 0, course_map[last_key] || 0),
      programs: num(program_now?.[0]?.total),
      programs_trend: trend(program_map[this_key] || 0, program_map[last_key] || 0),
      instructors: num(instructor_now?.[0]?.total),
      instructors_trend: trend(instructor_map[this_key] || 0, instructor_map[last_key] || 0),
      enrollments: num(enroll_now?.[0]?.total),
      enrollments_trend: trend(enroll_map[this_key] || 0, enroll_map[last_key] || 0)
    },
    enrollment_series: months.map((item) => ({ ...item, value: enroll_map[item.key] || 0 })),
    completion: {
      overall: progress_total ? Math.round(completed / progress_total * 100) : 0,
      completed: progress_total ? Math.round(completed / progress_total * 100) : 0,
      in_progress: progress_total ? Math.round(in_progress / progress_total * 100) : 0,
      not_started: progress_total ? Math.round(not_started / progress_total * 100) : 0
    },
    students_by_program: (program_bars || []).map((row) => ({
      program_id: row.program_id,
      name: row.program_name,
      students: num(row.students)
    })),
    recent_enrollments: (recent_rows || []).map((row) => ({
      student_id: row.student_id,
      name: [row.first_name, row.last_name].filter(Boolean).join(" "),
      photo: row.profile_photo_url || "",
      course_name: row.course_name,
      date: ymd(row.created_at),
      status: row.status === "registered" ? "Enrolled" : row.status
    })),
    activities,
    system: {
      active_courses: num(active_courses?.[0]?.total),
      present_today: num(present_today?.[0]?.total),
      average_score: round1(score_rows?.[0]?.average_percent),
      active_staff: num(staff_rows?.[0]?.total)
    }
  };

  log.pass("getAdminHome", `${can_view_all ? "admin" : "staff"} ${payload.kpis.students} students`);
  return payload;
}
