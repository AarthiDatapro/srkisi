import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "../utils/db_setup.js";
import { get_quiz_analytics } from "../course_content_manager/quiz_analytics_service.js";
import { ensure_content_schema } from "../course_content_manager/schema.js";
import { ensure_course_schema } from "../course_manager/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { visible_program_ids, assert_assigned_program } from "../utils/assignment_scope.js";

const AT_RISK = 75;
const DAY_MS = 86400000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function as_int(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function round(value, places = 1) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

function ymd(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function marks(count) {
  return Array.from({ length: count }, () => "?").join(",");
}

async function safe(query) {
  try {
    const [rows] = await query();
    return rows || [];
  } catch {
    return [];
  }
}

export async function analytics_scope(user = {}) {
  const pool = get_pool();
  const [cohorts, links, programs, courses, counts] = await Promise.all([
    safe(() => sqlQuery(pool, "SELECT cohort_id, cohort_name FROM tbl_cohorts WHERE is_deleted = FALSE ORDER BY cohort_name ASC")),
    safe(() => sqlQuery(pool, "SELECT cohort_id, program_id FROM tbl_cohort_programs WHERE is_deleted = FALSE")),
    safe(() => sqlQuery(pool, "SELECT program_id, program_name, program_code FROM tbl_programs WHERE is_deleted = FALSE ORDER BY program_name ASC")),
    safe(() => sqlQuery(
      pool,
      `SELECT pc.program_id, c.course_id, c.course_name, c.course_code
       FROM tbl_program_courses pc
       INNER JOIN tbl_courses c ON c.course_id = pc.course_id AND c.is_deleted = FALSE
       WHERE pc.is_deleted = FALSE
       ORDER BY pc.program_course_id ASC`
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT program_id, COUNT(DISTINCT student_id) AS students FROM tbl_course_registrations
       WHERE is_deleted = FALSE AND status = 'registered' AND program_id IS NOT NULL
       GROUP BY program_id`
    ))
  ]);
  const allowed = await visible_program_ids(user);
  const allow = allowed == null ? null : new Set(allowed);
  const program_rows = allow ? programs.filter((row) => allow.has(Number(row.program_id))) : programs;
  const course_rows = allow ? courses.filter((row) => allow.has(Number(row.program_id))) : courses;
  const link_rows = allow ? links.filter((row) => allow.has(Number(row.program_id))) : links;
  const student_count = new Map(counts.map((row) => [Number(row.program_id), Number(row.students) || 0]));
  const course_map = new Map();
  for (const row of course_rows) {
    const id = Number(row.program_id);
    if (!course_map.has(id)) course_map.set(id, []);
    course_map.get(id).push({ id: Number(row.course_id), name: row.course_name, code: row.course_code });
  }
  const program_list = program_rows.map((row) => ({
    id: Number(row.program_id),
    name: row.program_name,
    code: row.program_code,
    students: student_count.get(Number(row.program_id)) || 0,
    courses: course_map.get(Number(row.program_id)) || []
  }));
  const linked = new Set(link_rows.map((row) => Number(row.program_id)));
  const cohort_list = cohorts.map((row) => ({
    id: Number(row.cohort_id),
    name: row.cohort_name,
    program_ids: link_rows.filter((link) => Number(link.cohort_id) === Number(row.cohort_id)).map((link) => Number(link.program_id))
  })).filter((cohort) => cohort.program_ids.length);
  const loose = program_list.filter((program) => !linked.has(program.id)).map((program) => program.id);
  if (loose.length) cohort_list.push({ id: 0, name: "No cohort", program_ids: loose });
  const quiz = await quiz_viewer(user);
  if (quiz.mode === "all") quiz.courses = await list_quiz_courses(get_pool());
  return { cohorts: cohort_list, programs: program_list, quiz };
}

async function program_courses(pool, program_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.course_name, c.course_code
     FROM tbl_program_courses pc
     INNER JOIN tbl_courses c ON c.course_id = pc.course_id AND c.is_deleted = FALSE
     WHERE pc.program_id = ? AND pc.is_deleted = FALSE
     ORDER BY pc.program_course_id ASC`,
    [program_id]
  );
  return rows || [];
}

export async function analytics_access(user = {}) {
  return quiz_viewer(user);
}

async function quiz_viewer(user = {}) {
  const program_ids = await visible_program_ids(user);
  if (program_ids == null) return { mode: "all", program_ids: [], open_courses: [] };
  if (!program_ids.length) return { mode: "none", program_ids: [], open_courses: [] };
  return { mode: "program", program_ids, open_courses: [] };
}

async function list_quiz_courses(pool) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT course_id, course_name, course_code, is_open
     FROM tbl_courses
     WHERE is_deleted = FALSE
     ORDER BY course_name ASC`
  );
  return (rows || []).map((row) => ({
    id: Number(row.course_id),
    name: row.course_name,
    code: row.course_code || "",
    is_open: Boolean(row.is_open)
  }));
}

function assert_quiz_track(viewer, track) {
  if (viewer.mode === "none") throw fail("Quiz analytics is not available until you are assigned to a program", 403);
  if (viewer.mode === "program" && track !== "program") throw fail("Quiz analytics for your account stays on assigned programs", 403);
}

async function quiz_program_course(query, viewer) {
  const program_id = as_int(query.program_id);
  const course_id = as_int(query.course_id);
  if (!program_id || !course_id) throw fail("Choose a program and a course");
  if (viewer.mode === "program" && !viewer.program_ids.includes(program_id)) throw fail("This program is not assigned to you", 403);
  const pool = get_pool();
  const courses = await program_courses(pool, program_id);
  if (!courses.some((row) => Number(row.course_id) === course_id)) throw fail("This course is not part of the program", 404);
  const data = await get_quiz_analytics(course_id, { program_id });
  return { track: "program", course_id, program_id, quiz_analytics: data };
}

async function quiz_open_course(query) {
  const course_id = as_int(query.course_id);
  if (!course_id) throw fail("Choose an open course");
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    "SELECT course_id FROM tbl_courses WHERE course_id = ? AND is_deleted = FALSE AND is_open = TRUE LIMIT 1",
    [course_id]
  );
  if (!rows?.[0]) throw fail("This course is not open", 404);
  const data = await get_quiz_analytics(course_id, { enrollment: "open" });
  return { track: "open", course_id, quiz_analytics: data };
}

async function quiz_course(query) {
  const course_id = as_int(query.course_id);
  if (!course_id) throw fail("Choose a course");
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    "SELECT course_id FROM tbl_courses WHERE course_id = ? AND is_deleted = FALSE LIMIT 1",
    [course_id]
  );
  if (!rows?.[0]) throw fail("Course not found", 404);
  const data = await get_quiz_analytics(course_id, {});
  return { track: "course", course_id, quiz_analytics: data };
}

async function quiz_overall() {
  await ensure_course_schema();
  await ensure_registration_schema();
  await ensure_content_schema();
  const pool = get_pool();
  const [course_rows, stat_rows, quiz_rows, name_rows] = await Promise.all([
    sqlQuery(
      pool,
      `SELECT c.course_id, c.course_name, c.course_code, c.is_open
       FROM tbl_courses c
       WHERE c.is_deleted = FALSE
         AND (
           c.is_open = TRUE
           OR EXISTS (
             SELECT 1 FROM tbl_program_courses pc
             WHERE pc.course_id = c.course_id AND pc.is_deleted = FALSE
           )
           OR EXISTS (
             SELECT 1 FROM tbl_course_quizzes q
             WHERE q.course_id = c.course_id AND q.is_deleted = FALSE
           )
         )
       ORDER BY c.course_name ASC`
    ),
    sqlQuery(
      pool,
      `SELECT a.course_id,
              COUNT(*) AS attempts,
              ROUND(AVG(CASE WHEN reg.program_id IS NOT NULL THEN a.percent END), 1) AS program_average,
              ROUND(AVG(CASE WHEN reg.student_id IS NOT NULL AND reg.program_id IS NULL THEN a.percent END), 1) AS open_average,
              SUM(CASE WHEN reg.program_id IS NOT NULL THEN 1 ELSE 0 END) AS program_attempts,
              SUM(CASE WHEN reg.student_id IS NOT NULL AND reg.program_id IS NULL THEN 1 ELSE 0 END) AS open_attempts,
              COUNT(DISTINCT CASE WHEN reg.program_id IS NOT NULL THEN a.student_id END) AS program_students,
              COUNT(DISTINCT CASE WHEN reg.student_id IS NOT NULL AND reg.program_id IS NULL THEN a.student_id END) AS open_students
       FROM tbl_quiz_attempts a
       INNER JOIN tbl_course_quizzes q
         ON q.quiz_id = a.quiz_id AND q.course_id = a.course_id AND q.is_deleted = FALSE
       LEFT JOIN (
         SELECT course_id, student_id, MAX(program_id) AS program_id
         FROM tbl_course_registrations
         WHERE is_deleted = FALSE AND status = 'registered'
         GROUP BY course_id, student_id
       ) reg ON reg.course_id = a.course_id AND reg.student_id = a.student_id
       GROUP BY a.course_id`
    ),
    sqlQuery(
      pool,
      `SELECT course_id, COUNT(*) AS quizzes
       FROM tbl_course_quizzes
       WHERE is_deleted = FALSE
       GROUP BY course_id`
    ),
    sqlQuery(
      pool,
      `SELECT pc.course_id, p.program_name
       FROM tbl_program_courses pc
       INNER JOIN tbl_programs p ON p.program_id = pc.program_id AND p.is_deleted = FALSE
       WHERE pc.is_deleted = FALSE
       ORDER BY p.program_name ASC`
    )
  ]);
  const stats = new Map((stat_rows[0] || []).map((row) => [Number(row.course_id), row]));
  const quizzes = new Map((quiz_rows[0] || []).map((row) => [Number(row.course_id), Number(row.quizzes) || 0]));
  const names = new Map();
  for (const row of name_rows[0] || []) {
    const id = Number(row.course_id);
    if (!names.has(id)) names.set(id, []);
    names.get(id).push(row.program_name);
  }
  const courses = (course_rows[0] || []).map((row) => {
    const id = Number(row.course_id);
    const stat = stats.get(id) || {};
    const programs = names.get(id) || [];
    const is_open = Boolean(row.is_open);
    const kind = programs.length && is_open ? "both" : programs.length ? "program" : is_open ? "open" : "other";
    return {
      id,
      name: row.course_name,
      code: row.course_code || "",
      kind,
      programs,
      quizzes: quizzes.get(id) || 0,
      program_students: Number(stat.program_students) || 0,
      open_students: Number(stat.open_students) || 0,
      program_attempts: Number(stat.program_attempts) || 0,
      open_attempts: Number(stat.open_attempts) || 0,
      program_average: stat.program_average == null ? null : Number(stat.program_average),
      open_average: stat.open_average == null ? null : Number(stat.open_average)
    };
  }).filter((course) => course.kind !== "other" || course.quizzes > 0);
  const sum = (key) => courses.reduce((total, course) => total + (Number(course[key]) || 0), 0);
  return {
    track: "overall",
    summary: {
      program_courses: courses.filter((course) => course.kind === "program" || course.kind === "both").length,
      open_courses: courses.filter((course) => course.kind === "open" || course.kind === "both").length,
      program_attempts: sum("program_attempts"),
      open_attempts: sum("open_attempts"),
      program_students: sum("program_students"),
      open_students: sum("open_students")
    },
    courses
  };
}

export async function quiz_analytics(query = {}, user = {}) {
  const viewer = await quiz_viewer(user);
  const track = String(query.track || "program");
  assert_quiz_track(viewer, track);
  if (track === "overall") return quiz_overall();
  if (track === "open") return quiz_open_course(query);
  if (track === "course") return quiz_course(query);
  return quiz_program_course(query, viewer);
}

function read_range(query = {}) {
  const today = ymd(new Date());
  let to = /^\d{4}-\d{2}-\d{2}$/.test(String(query.to || "")) ? query.to : today;
  let from = /^\d{4}-\d{2}-\d{2}$/.test(String(query.from || "")) ? query.from : "";
  if (!from && query.days && query.days !== "all") {
    const days = Math.min(Math.max(Number(query.days) || 30, 1), 3650);
    from = ymd(new Date(new Date(`${to}T00:00:00`).getTime() - (days - 1) * DAY_MS));
  }
  if (from && from > to) [from, to] = [to, from];
  return { from, to };
}

export async function attendance_analytics(query = {}, user = {}) {
  const program_id = as_int(query.program_id);
  if (!program_id) throw fail("Choose a program");
  await assert_assigned_program(program_id, user);
  await ensure_course_schema();
  await ensure_registration_schema();
  const pool = get_pool();
  const courses = await program_courses(pool, program_id);
  const course_filter = as_int(query.course_id);
  const course_ids = courses.map((row) => Number(row.course_id)).filter((id) => !course_filter || id === course_filter);
  const range = read_range(query);
  const empty = {
    range,
    courses: courses.map((row) => ({ id: Number(row.course_id), name: row.course_name, code: row.course_code })),
    summary: null,
    trend: [],
    weekdays: [],
    course_stats: [],
    students: [],
    register: { dates: [], rows: [] }
  };
  if (!course_ids.length) return empty;

  const [registrations] = await sqlQuery(
    pool,
    `SELECT r.student_id, r.course_id, r.course_student_id, s.first_name, s.last_name, s.email, s.mobile_number
     FROM tbl_course_registrations r
     INNER JOIN tbl_students s ON s.student_id = r.student_id AND s.is_deleted = FALSE
     WHERE r.program_id = ? AND r.is_deleted = FALSE AND r.status = 'registered'
       AND r.course_id IN (${marks(course_ids.length)})`,
    [program_id, ...course_ids]
  );
  const student_ids = [...new Set(registrations.map((row) => String(row.student_id)))];
  if (!student_ids.length) return empty;

  const params = [...course_ids, ...student_ids];
  let where = `course_id IN (${marks(course_ids.length)}) AND student_id IN (${marks(student_ids.length)})`;
  if (range.from) {
    where += " AND attendance_date >= ?";
    params.push(range.from);
  }
  where += " AND attendance_date <= ?";
  params.push(range.to);
  const [records] = await sqlQuery(
    pool,
    `SELECT course_id, student_id, DATE_FORMAT(attendance_date, '%Y-%m-%d') AS day, status
     FROM tbl_course_attendance WHERE ${where}
     ORDER BY attendance_date ASC`,
    params
  );

  const enrolled = new Map();
  for (const row of registrations) {
    const id = String(row.student_id);
    const current = enrolled.get(id) || {
      student_id: id,
      name: [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || id,
      email: row.email || "",
      mobile: row.mobile_number || "",
      itda_id: "",
      courses: new Set()
    };
    if (!current.itda_id && row.course_student_id) current.itda_id = String(row.course_student_id);
    current.courses.add(Number(row.course_id));
    enrolled.set(id, current);
  }

  const by_day = new Map();
  const by_student = new Map();
  const by_course = new Map();
  const cell = new Map();
  const tally = () => ({ present: 0, late: 0, absent: 0, other: 0 });
  const bump = (bucket, status) => {
    if (status in bucket) bucket[status] += 1;
    else bucket.other += 1;
  };
  for (const row of records) {
    const status = String(row.status || "").toLowerCase();
    const day = row.day;
    if (!by_day.has(day)) by_day.set(day, tally());
    bump(by_day.get(day), status);
    const sid = String(row.student_id);
    if (!by_student.has(sid)) by_student.set(sid, { ...tally(), days: [] });
    bump(by_student.get(sid), status);
    by_student.get(sid).days.push({ day, status });
    const cid = Number(row.course_id);
    if (!by_course.has(cid)) by_course.set(cid, { ...tally(), dates: new Set() });
    bump(by_course.get(cid), status);
    by_course.get(cid).dates.add(day);
    const key = `${sid}|${day}`;
    const previous = cell.get(key);
    if (!previous || status === "absent" || (status === "late" && previous === "present")) cell.set(key, status);
  }

  const rate = (bucket) => {
    const marked = bucket.present + bucket.late + bucket.absent + bucket.other;
    return marked ? round(((bucket.present + bucket.late) / marked) * 100, 1) : null;
  };
  const dates = [...by_day.keys()].sort();
  const totals = [...by_day.values()].reduce((sum, bucket) => {
    for (const key of Object.keys(sum)) sum[key] += bucket[key];
    return sum;
  }, tally());

  const students = [...enrolled.values()].map((student) => {
    const stats = by_student.get(student.student_id) || { ...tally(), days: [] };
    const ordered = stats.days.sort((a, b) => a.day.localeCompare(b.day));
    let streak = 0;
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      if (ordered[index].status === "absent") break;
      streak += 1;
    }
    let best = 0;
    let run = 0;
    for (const item of ordered) {
      run = item.status === "absent" ? 0 : run + 1;
      best = Math.max(best, run);
    }
    const last_absent = [...ordered].reverse().find((item) => item.status === "absent")?.day || "";
    const marked = stats.present + stats.late + stats.absent + stats.other;
    const value = rate(stats);
    return {
      student_id: student.student_id,
      name: student.name,
      email: student.email,
      mobile: student.mobile,
      itda_id: student.itda_id,
      present: stats.present,
      late: stats.late,
      absent: stats.absent,
      marked,
      rate: value,
      streak,
      best_streak: best,
      last_absent,
      history: ordered.map((item) => ({ day: item.day, status: item.status })),
      status: value == null ? "unmarked" : value >= 90 ? "excellent" : value >= AT_RISK ? "good" : "at_risk"
    };
  }).sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101) || a.name.localeCompare(b.name));

  const latest = dates[dates.length - 1] || "";
  const latest_bucket = latest ? by_day.get(latest) : null;
  const marked_students = students.filter((row) => row.marked > 0);
  const weekday_map = WEEKDAYS.map((label) => ({ label, ...tally() }));
  for (const [day, bucket] of by_day) {
    const index = new Date(`${day}T00:00:00`).getDay();
    for (const key of ["present", "late", "absent", "other"]) weekday_map[index][key] += bucket[key];
  }
  const register_dates = dates.slice(-31);

  return {
    range,
    courses: courses.map((row) => ({ id: Number(row.course_id), name: row.course_name, code: row.course_code })),
    summary: {
      students: students.length,
      sessions: dates.length,
      rate: rate(totals),
      present: totals.present,
      late: totals.late,
      absent: totals.absent,
      avg_present: dates.length ? round((totals.present + totals.late) / dates.length, 1) : null,
      at_risk: marked_students.filter((row) => row.rate < AT_RISK).length,
      perfect: marked_students.filter((row) => row.absent === 0 && row.marked > 0).length,
      unmarked_students: students.filter((row) => !row.marked).length,
      latest_day: latest,
      latest: latest_bucket ? {
        present: latest_bucket.present,
        late: latest_bucket.late,
        absent: latest_bucket.absent,
        unmarked: Math.max(0, students.length - (latest_bucket.present + latest_bucket.late + latest_bucket.absent + latest_bucket.other)),
        rate: rate(latest_bucket)
      } : null,
      threshold: AT_RISK
    },
    trend: dates.map((day) => ({ day, ...by_day.get(day), rate: rate(by_day.get(day)) })),
    weekdays: weekday_map.filter((row) => row.present + row.late + row.absent + row.other > 0).map((row) => ({ label: row.label, count: rate(row) ?? 0, sessions: row.present + row.late + row.absent + row.other })),
    course_stats: course_ids.map((id) => {
      const course = courses.find((row) => Number(row.course_id) === id) || {};
      const bucket = by_course.get(id) || { ...tally(), dates: new Set() };
      return { id, name: course.course_name || "Course", code: course.course_code || "", sessions: bucket.dates.size, present: bucket.present + bucket.late, absent: bucket.absent, rate: rate(bucket) };
    }),
    students,
    register: {
      dates: register_dates,
      rows: students
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((row) => ({ student_id: row.student_id, name: row.name, rate: row.rate, cells: register_dates.map((day) => cell.get(`${row.student_id}|${day}`) || "") }))
    }
  };
}
