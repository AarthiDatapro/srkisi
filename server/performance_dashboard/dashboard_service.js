import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_course_schema } from "../course_manager/schema.js";
import { ensure_content_schema } from "../course_content_manager/schema.js";
import { ensure_learn_schema } from "../course_learning/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { ensure_cohort_schema } from "../cohorts/schema.js";
import { list_programs } from "../programs_control/program_service.js";
import { list_program_courses } from "../course_manager/course_programs_service.js";
import { is_bootstrap_admin } from "../utils/screen_access.js";
import { ymd } from "../utils/dates.js";

function today_stamp() {
  return ymd(new Date());
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function in_list(ids) {
  return ids.map(() => "?").join(", ");
}

function parse_sessions(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function list_employee_course_ids(employee_id) {
  if (!Number.isInteger(employee_id) || employee_id <= 0) return [];
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT DISTINCT pc.course_id
     FROM tbl_program_courses pc
     INNER JOIN tbl_program_employees pe
       ON pe.program_id = pc.program_id
      AND pe.employee_id = ?
      AND pe.is_deleted = FALSE
      AND pe.is_active = TRUE
     WHERE pc.is_deleted = FALSE`,
    [employee_id]
  );
  return (rows || []).map((row) => Number(row.course_id)).filter((id) => id > 0);
}

async function list_employee_program_ids(employee_id) {
  if (!Number.isInteger(employee_id) || employee_id <= 0) return [];
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT DISTINCT pe.program_id
     FROM tbl_program_employees pe
     WHERE pe.employee_id = ?
       AND pe.is_deleted = FALSE
       AND pe.is_active = TRUE`,
    [employee_id]
  );
  return (rows || []).map((row) => Number(row.program_id)).filter((id) => id > 0);
}

export async function get_performance_dashboard(query = {}, user = {}) {
  await ensure_course_schema();
  await ensure_registration_schema();
  await ensure_content_schema();
  await ensure_learn_schema();

  const can_view_all = is_bootstrap_admin(user);
  const employee_id = Number(user.sub);
  const assigned_course_ids = can_view_all ? null : await list_employee_course_ids(employee_id);

  let programs = (await list_programs({ page: 1, pageSize: 200, sort: "name", dir: "asc" }, user)).items || [];
  if (!can_view_all) {
    const allowed_programs = new Set(await list_employee_program_ids(employee_id));
    programs = programs.filter((item) => allowed_programs.has(Number(item.program_id)));
  }

  await ensure_cohort_schema();
  const pool_scope = get_pool();
  const [cohort_rows] = await sqlQuery(
    pool_scope,
    `SELECT cohort_id, cohort_name
     FROM tbl_cohorts
     WHERE is_deleted = FALSE
     ORDER BY cohort_name ASC`
  );
  const [link_rows] = await sqlQuery(
    pool_scope,
    `SELECT cohort_id, program_id
     FROM tbl_cohort_programs
     WHERE is_deleted = FALSE`
  );
  const links = link_rows || [];
  const cohorts = (cohort_rows || []).
  map((row) => ({
    cohort_id: Number(row.cohort_id),
    cohort_name: row.cohort_name
  })).
  filter((cohort) => links.some((link) =>
  Number(link.cohort_id) === cohort.cohort_id &&
  programs.some((item) => Number(item.program_id) === Number(link.program_id))
  ));

  const requested_cohort = Number(query.cohort_id);
  const cohort =
  (Number.isInteger(requested_cohort) && requested_cohort > 0 ?
  cohorts.find((item) => item.cohort_id === requested_cohort) :
  null) || cohorts[0] || null;

  if (cohort) {
    const allowed = new Set(
      links.
      filter((link) => Number(link.cohort_id) === cohort.cohort_id).
      map((link) => Number(link.program_id))
    );
    programs = programs.filter((item) => allowed.has(Number(item.program_id)));
  } else {
    programs = [];
  }

  const requested_program = Number(query.program_id);
  const program =
  (Number.isInteger(requested_program) && requested_program > 0 ?
  programs.find((item) => item.program_id === requested_program) :
  null) || programs[0] || null;

  if (!program) {
    return {
      ...blank_dashboard(),
      cohorts,
      cohort,
      programs,
      can_view_all_courses: can_view_all
    };
  }

  const assigned = await list_program_courses(program.program_id);
  let all_courses = assigned.courses || assigned.items || [];
  if (!can_view_all) {
    const allowed_courses = new Set(assigned_course_ids || []);
    all_courses = all_courses.filter((item) => allowed_courses.has(Number(item.course_id)));
  }
  const requested_course = Number(query.course_id);
  let selected_course =
  Number.isInteger(requested_course) && requested_course > 0 ?
  all_courses.find((item) => Number(item.course_id) === requested_course) :
  null;
  if (!can_view_all && !selected_course) {
    selected_course = all_courses[0] || null;
  }
  const scoped = selected_course ? [selected_course] : all_courses;
  const course_ids = scoped.map((item) => item.course_id);

  if (!course_ids.length) {
    return {
      ...blank_dashboard(),
      cohorts,
      cohort,
      programs,
      courses: all_courses.map(map_course_option),
      program,
      course_id: selected_course?.course_id || null,
      can_view_all_courses: can_view_all
    };
  }

  const program_id = Number(program.program_id);

  const pool = get_pool();
  const id_sql = in_list(course_ids);

  const [student_rows] = await sqlQuery(
    pool,
    `SELECT s.student_id, s.first_name, s.last_name, s.email, s.profile_photo_url,
            c.course_id, c.course_name,
            r.progress_percent, r.learning_status
     FROM tbl_course_registrations r
     INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
     INNER JOIN tbl_courses c ON c.course_id = r.course_id AND c.is_deleted = FALSE
     WHERE r.is_deleted = FALSE AND r.status = 'registered'
       AND r.program_id = ?
       AND r.course_id IN (${id_sql})
     ORDER BY s.first_name ASC, s.last_name ASC`,
    [program_id, ...course_ids]
  );

  const students_map = new Map();
  for (const row of student_rows || []) {
    if (!students_map.has(row.student_id)) {
      students_map.set(row.student_id, {
        student_id: row.student_id,
        full_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
        email: row.email || "",
        photo: row.profile_photo_url || "",
        courses: {},
        status: "Active"
      });
    }
    students_map.get(row.student_id).courses[row.course_id] = {
      course_id: row.course_id,
      course_name: row.course_name,
      progress: Number(row.progress_percent) || 0
    };
  }
  const students = [...students_map.values()];
  const enrolled = students.length;

  const [today_rows] = await sqlQuery(
    pool,
    `SELECT a.status, COUNT(*) AS total
     FROM tbl_course_attendance a
     INNER JOIN tbl_course_registrations r
       ON r.course_id = a.course_id
      AND r.student_id = a.student_id
      AND r.program_id = ?
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
     WHERE a.attendance_date = CURDATE() AND a.course_id IN (${id_sql})
     GROUP BY a.status`,
    [program_id, ...course_ids]
  );
  const today_by_status = Object.fromEntries(
    (today_rows || []).map((row) => [String(row.status || ""), Number(row.total || 0)])
  );
  const marked_today = Object.values(today_by_status).reduce((sum, value) => sum + value, 0);
  const present_today = Number(today_by_status.present || 0) + Number(today_by_status.late || 0);
  const absent_today = marked_today ? Number(today_by_status.absent || 0) : Math.max(0, enrolled - present_today);

  const progresses = students.flatMap((item) => Object.values(item.courses).map((course) => course.progress));
  const overall_progress = progresses.length ?
  Math.round(progresses.reduce((sum, value) => sum + value, 0) / progresses.length) :
  0;

  const [feedback_rows] = await sqlQuery(
    pool,
    `SELECT f.rating, COUNT(*) AS total
     FROM tbl_lesson_feedback f
     INNER JOIN tbl_course_registrations r
       ON r.course_id = f.course_id
      AND r.student_id = f.student_id
      AND r.program_id = ?
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
     WHERE f.course_id IN (${id_sql})
     GROUP BY f.rating`,
    [program_id, ...course_ids]
  );
  const stars = [0, 0, 0, 0, 0];
  let feedback_total = 0;
  let feedback_sum = 0;
  for (const row of feedback_rows || []) {
    const rating = Number(row.rating) || 0;
    const total = Number(row.total) || 0;
    if (rating >= 1 && rating <= 5) {
      stars[rating - 1] = total;
      feedback_total += total;
      feedback_sum += rating * total;
    }
  }

  const [attend_rows] = await sqlQuery(
    pool,
    `SELECT r.student_id,
            COUNT(*) AS class_days,
            SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS in_class
     FROM tbl_course_registrations r
     INNER JOIN (
       SELECT DISTINCT course_id, attendance_date
       FROM tbl_course_attendance
       WHERE course_id IN (${id_sql})
     ) d ON d.course_id = r.course_id
     LEFT JOIN tbl_course_attendance a
       ON a.course_id = r.course_id
      AND a.student_id = r.student_id
      AND a.attendance_date = d.attendance_date
     WHERE r.is_deleted = FALSE AND r.status = 'registered'
       AND r.program_id = ?
       AND r.course_id IN (${id_sql})
     GROUP BY r.student_id`,
    [...course_ids, program_id, ...course_ids]
  );
  const attend_by_student = Object.fromEntries(
    (attend_rows || []).map((row) => [
    row.student_id,
    row.class_days ? Math.round(Number(row.in_class || 0) / Number(row.class_days) * 100) : 0]
    )
  );

  const [exam_rows] = await sqlQuery(
    pool,
    `SELECT r.student_id,
            COUNT(DISTINCT q.quiz_id) AS quiz_count,
            COALESCE(SUM(best.best_percent), 0) AS earned
     FROM tbl_course_registrations r
     LEFT JOIN tbl_course_quizzes q
       ON q.course_id = r.course_id AND q.is_deleted = FALSE
     LEFT JOIN (
       SELECT a.student_id, a.quiz_id, MAX(a.percent) AS best_percent
       FROM tbl_quiz_attempts a
       INNER JOIN tbl_course_quizzes q2 ON q2.quiz_id = a.quiz_id AND q2.is_deleted = FALSE
       WHERE q2.course_id IN (${id_sql})
       GROUP BY a.student_id, a.quiz_id
     ) best ON best.student_id = r.student_id AND best.quiz_id = q.quiz_id
     WHERE r.is_deleted = FALSE AND r.status = 'registered'
       AND r.program_id = ?
       AND r.course_id IN (${id_sql})
     GROUP BY r.student_id`,
    [...course_ids, program_id, ...course_ids]
  );
  const exam_by_student = Object.fromEntries(
    (exam_rows || []).map((row) => {
      const quizzes = Number(row.quiz_count) || 0;
      return [row.student_id, quizzes ? round1(Number(row.earned || 0) / quizzes) : 0];
    })
  );

  const student_items = students.map((item) => ({
    ...item,
    attendance: attend_by_student[item.student_id] ?? 0,
    exam_avg: exam_by_student[item.student_id] ?? 0
  }));
  const average_score = student_items.length ?
  round1(student_items.reduce((sum, item) => sum + (Number(item.exam_avg) || 0), 0) / student_items.length) :
  0;

  const [course_prog_rows] = await sqlQuery(
    pool,
    `SELECT r.course_id, AVG(r.progress_percent) AS average_progress, COUNT(*) AS enrolled
     FROM tbl_course_registrations r
     WHERE r.is_deleted = FALSE AND r.status = 'registered'
       AND r.program_id = ?
       AND r.course_id IN (${id_sql})
     GROUP BY r.course_id`,
    [program_id, ...course_ids]
  );
  const progress_by_course = Object.fromEntries(
    (course_prog_rows || []).map((row) => [
    row.course_id,
    { progress: round1(row.average_progress), enrolled: Number(row.enrolled || 0) }]
    )
  );

  const [course_score_rows] = await sqlQuery(
    pool,
    `SELECT q.course_id, AVG(a.percent) AS average_percent
     FROM tbl_quiz_attempts a
     INNER JOIN tbl_course_quizzes q ON q.quiz_id = a.quiz_id AND q.is_deleted = FALSE
     INNER JOIN tbl_course_registrations r
       ON r.course_id = q.course_id
      AND r.student_id = a.student_id
      AND r.program_id = ?
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
     WHERE q.course_id IN (${id_sql})
     GROUP BY q.course_id`,
    [program_id, ...course_ids]
  );
  const score_by_course = Object.fromEntries(
    (course_score_rows || []).map((row) => [row.course_id, round1(row.average_percent)])
  );

  const [course_attend_rows] = await sqlQuery(
    pool,
    `SELECT a.course_id,
            COUNT(*) AS marked,
            SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS in_class
     FROM tbl_course_attendance a
     INNER JOIN tbl_course_registrations r
       ON r.course_id = a.course_id
      AND r.student_id = a.student_id
      AND r.program_id = ?
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
     WHERE a.course_id IN (${id_sql})
     GROUP BY a.course_id`,
    [program_id, ...course_ids]
  );
  const attend_by_course = Object.fromEntries(
    (course_attend_rows || []).map((row) => [
    row.course_id,
    row.marked ? Math.round(Number(row.in_class || 0) / Number(row.marked) * 100) : 0]
    )
  );

  const course_overview = scoped.map((course) => {
    const stats = progress_by_course[course.course_id] || {};
    return {
      course_id: course.course_id,
      course_name: course.course_name,
      course_type: course.course_type || course.level || "Course",
      duration_hours: course.duration_hours,
      progress: stats.progress || 0,
      enrolled: stats.enrolled || 0,
      avg_score: score_by_course[course.course_id] || 0,
      attendance: attend_by_course[course.course_id] || 0
    };
  });

  const [week_rows] = await sqlQuery(
    pool,
    `SELECT a.attendance_date,
            SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent,
            COUNT(*) AS marked
     FROM tbl_course_attendance a
     INNER JOIN tbl_course_registrations r
       ON r.course_id = a.course_id
      AND r.student_id = a.student_id
      AND r.program_id = ?
      AND r.is_deleted = FALSE
      AND r.status = 'registered'
     WHERE a.course_id IN (${id_sql})
       AND a.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY a.attendance_date
     ORDER BY a.attendance_date ASC`,
    [program_id, ...course_ids]
  );
  const week_map = Object.fromEntries(
    (week_rows || []).map((row) => [
    ymd(row.attendance_date),
    {
      present: Number(row.present || 0),
      absent: Number(row.absent || 0),
      marked: Number(row.marked || 0)
    }]
    )
  );
  const series = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const stamp = ymd(date);
    const row = week_map[stamp];
    const percent = row?.marked ? Math.round(row.present / Math.max(enrolled, row.marked) * 100) : 0;
    series.push({ date: stamp, value: percent, present: row?.present || 0, absent: row?.absent || 0 });
  }

  const [report_rows] = await sqlQuery(
    pool,
    `SELECT report_id, report_date, day_no, module_course, sessions_json, present_today, attendance_percent
     FROM tbl_course_daily_reports
     WHERE is_deleted = FALSE AND course_id IN (${id_sql})
     ORDER BY report_date DESC
     LIMIT 8`,
    course_ids
  );
  const days = (report_rows || []).map((row) => {
    const sessions = parse_sessions(row.sessions_json);
    const topic = sessions.find((item) => item.topic)?.topic || row.module_course || "Training day";
    return {
      report_id: row.report_id,
      date: ymd(row.report_date),
      day_no: row.day_no,
      topic,
      status: "Completed"
    };
  });

  const today_report = (report_rows || []).find((row) => ymd(row.report_date) === today_stamp());
  const schedule = parse_sessions(today_report?.sessions_json).
  filter((item) => item.time || item.session || item.topic).
  slice(0, 8).
  map((item) => ({
    time: item.time || "",
    title: item.topic || item.session || "Session"
  }));

  const [quiz_rows] = await sqlQuery(
    pool,
    `SELECT q.quiz_id, q.quiz_title, q.created_at, c.course_name, AVG(a.percent) AS average_percent
     FROM tbl_course_quizzes q
     INNER JOIN tbl_courses c ON c.course_id = q.course_id
     LEFT JOIN tbl_quiz_attempts a
       ON a.quiz_id = q.quiz_id
      AND EXISTS (
        SELECT 1
        FROM tbl_course_registrations r
        WHERE r.student_id = a.student_id
          AND r.course_id = q.course_id
          AND r.program_id = ?
          AND r.is_deleted = FALSE
          AND r.status = 'registered'
      )
     WHERE q.is_deleted = FALSE AND q.course_id IN (${id_sql})
     GROUP BY q.quiz_id, q.quiz_title, q.created_at, c.course_name
     ORDER BY q.created_at DESC
     LIMIT 6`,
    [program_id, ...course_ids]
  );

  const [notice_rows] = await sqlQuery(
    pool,
    `SELECT lc.content_id, lc.content_title, lc.created_at, c.course_name
     FROM tbl_lesson_contents lc
     INNER JOIN tbl_course_lessons l ON l.lesson_id = lc.lesson_id AND l.is_deleted = FALSE
     INNER JOIN tbl_courses c ON c.course_id = l.course_id
     WHERE lc.is_deleted = FALSE AND lc.is_active = TRUE
       AND LOWER(lc.content_type) = 'announcement'
       AND l.course_id IN (${id_sql})
     ORDER BY lc.created_at DESC
     LIMIT 3`,
    course_ids
  );

  const last7 = series.slice(-7);
  const week_present = last7.reduce((sum, item) => sum + item.present, 0);
  const week_marked = last7.reduce((sum, item) => sum + item.present + item.absent, 0);

  log.pass("getPerformanceDashboard", `program ${program.program_id} ${enrolled} students`);
  return {
    cohorts,
    cohort,
    programs,
    courses: all_courses.map(map_course_option),
    program,
    course_id: selected_course?.course_id || null,
    can_view_all_courses: can_view_all,
    kpis: {
      students: enrolled,
      present_today: present_today,
      present_percent: enrolled ? round1(present_today / enrolled * 100) : 0,
      absent_today: absent_today,
      absent_percent: enrolled ? round1(absent_today / enrolled * 100) : 0,
      courses: scoped.length,
      progress: overall_progress,
      average_score: average_score
    },
    course_overview: course_overview,
    progress_series: series,
    days,
    students: student_items,
    exams: {
      average: average_score,
      items: (quiz_rows || []).map((row) => ({
        quiz_id: row.quiz_id,
        title: row.quiz_title,
        course_name: row.course_name,
        average: round1(row.average_percent),
        date: ymd(row.created_at)
      }))
    },
    feedback: {
      average: feedback_total ? round1(feedback_sum / feedback_total) : 0,
      total: feedback_total,
      stars
    },
    attendance_week: last7,
    attendance_summary: {
      classes: last7.filter((item) => item.present || item.absent).length,
      average: week_marked ? Math.round(week_present / week_marked * 100) : 0,
      present_today: present_today,
      absent_today: absent_today
    },
    schedule,
    notices: (notice_rows || []).map((row) => ({
      id: row.content_id,
      title: row.content_title,
      course_name: row.course_name,
      date: ymd(row.created_at)
    }))
  };
}

function map_course_option(course) {
  return {
    course_id: course.course_id,
    course_name: course.course_name,
    course_type: course.course_type || ""
  };
}

function blank_dashboard() {
  return {
    cohorts: [],
    cohort: null,
    programs: [],
    courses: [],
    program: null,
    course_id: null,
    can_view_all_courses: true,
    kpis: empty_kpis(),
    course_overview: [],
    progress_series: [],
    days: [],
    students: [],
    exams: { average: 0, items: [] },
    feedback: { average: 0, total: 0, stars: [0, 0, 0, 0, 0] },
    attendance_week: [],
    schedule: [],
    notices: []
  };
}

function empty_kpis() {
  return {
    students: 0,
    present_today: 0,
    present_percent: 0,
    absent_today: 0,
    absent_percent: 0,
    courses: 0,
    progress: 0,
    average_score: 0
  };
}
