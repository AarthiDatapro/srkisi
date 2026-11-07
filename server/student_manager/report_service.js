import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "../utils/db_setup.js";
import { student_code } from "../utils/student_code.js";
import { assert_assigned_program, visible_program_ids } from "../utils/assignment_scope.js";
import { load_program as load_hackathon_program } from "../analytics_center/hackathon_analytics_service.js";

const WEIGHTS = { progress: 20, quiz: 25, coding: 15, attendance: 10, hackathon: 30 };
const HACKATHON_STATUS_SCORE = { Done: 100, Partial: 50, Pending: 0 };
const GRADES = [
  { min: 90, grade: "A+", band: "Outstanding" },
  { min: 80, grade: "A", band: "Distinction" },
  { min: 70, grade: "B+", band: "Merit" },
  { min: 60, grade: "B", band: "Good" },
  { min: 50, grade: "C", band: "Satisfactory" },
  { min: 40, grade: "D", band: "Needs improvement" },
  { min: 0, grade: "F", band: "At risk" }
];

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

function average(values) {
  const list = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
}

function grade_of(score) {
  if (score == null) return { grade: "—", band: "Not assessed" };
  return GRADES.find((row) => score >= row.min) || GRADES[GRADES.length - 1];
}

function weighted(parts) {
  let total = 0;
  let weight = 0;
  for (const [key, value] of Object.entries(parts)) {
    if (value == null) continue;
    total += value * WEIGHTS[key];
    weight += WEIGHTS[key];
  }
  return weight ? round(total / weight, 1) : null;
}

function marks(count) {
  return Array.from({ length: count }, () => "?").join(",");
}

function iso_day(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function safe(query) {
  try {
    const [rows] = await query();
    return rows || [];
  } catch {
    return [];
  }
}

export const GRADING = { weights: WEIGHTS, grades: GRADES };

export async function list_report_programs(user = {}) {
  const pool = get_pool();
  const allowed = await visible_program_ids(user);
  const rows = await safe(() => sqlQuery(
    pool,
    `SELECT p.program_id, p.program_name, p.program_code,
            (SELECT COUNT(DISTINCT r.student_id) FROM tbl_course_registrations r
              WHERE r.program_id = p.program_id AND r.is_deleted = FALSE AND r.status = 'registered') AS students
     FROM tbl_programs p
     WHERE p.is_deleted = FALSE
     ORDER BY p.program_name ASC`
  ));
  const allow = allowed == null ? null : new Set(allowed);
  return {
    programs: rows.map((row) => ({
      id: Number(row.program_id),
      name: row.program_name,
      code: row.program_code,
      students: Number(row.students) || 0
    })).filter((program) => !allow || allow.has(program.id))
  };
}

async function load_program(pool, program_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT program_id, program_code, program_name, duration_months, start_date, end_date, thumbnail_url
     FROM tbl_programs WHERE program_id = ? AND is_deleted = FALSE LIMIT 1`,
    [program_id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Program not found", 404);
  const cohorts = await safe(() => sqlQuery(
    pool,
    `SELECT c.cohort_name FROM tbl_cohort_programs cp
     INNER JOIN tbl_cohorts c ON c.cohort_id = cp.cohort_id AND c.is_deleted = FALSE
     WHERE cp.program_id = ? AND cp.is_deleted = FALSE
     ORDER BY cp.cohort_program_id ASC`,
    [program_id]
  ));
  return {
    program_id: Number(row.program_id),
    program_code: row.program_code || "",
    program_name: row.program_name || "",
    duration_months: row.duration_months == null ? null : Number(row.duration_months),
    start_date: iso_day(row.start_date),
    end_date: iso_day(row.end_date),
    thumbnail_url: row.thumbnail_url || "",
    cohorts: cohorts.map((item) => item.cohort_name).filter(Boolean)
  };
}

async function build_program_cards(program_id) {
  const pool = get_pool();
  const program = await load_program(pool, program_id);

  const courses = await safe(() => sqlQuery(
    pool,
    `SELECT c.course_id, c.course_code, c.course_name, c.duration_hours, c.level
     FROM tbl_program_courses pc
     INNER JOIN tbl_courses c ON c.course_id = pc.course_id AND c.is_deleted = FALSE
     WHERE pc.program_id = ? AND pc.is_deleted = FALSE
     ORDER BY pc.program_course_id ASC`,
    [program_id]
  ));
  const registration_rows = await safe(() => sqlQuery(
    pool,
    `SELECT r.registration_id, r.student_id, r.course_id, r.program_id, r.learning_status, r.progress_percent,
            r.course_student_id, r.last_accessed_at, r.created_at
     FROM tbl_course_registrations r
     WHERE r.is_deleted = FALSE AND r.status = 'registered'
       AND (
         r.program_id = ?
         OR (r.program_id IS NULL AND r.course_id IN (
           SELECT pc.course_id FROM tbl_program_courses pc WHERE pc.program_id = ? AND pc.is_deleted = FALSE
         ))
       )
     ORDER BY (r.program_id IS NULL) ASC, r.registration_id ASC`,
    [program_id, program_id]
  ));
  const seen_course = new Set();
  const registrations = registration_rows.filter((row) => {
    const key = `${row.student_id}|${row.course_id}`;
    if (seen_course.has(key)) return false;
    seen_course.add(key);
    return true;
  });
  const course_ids = [...new Set([...courses.map((row) => Number(row.course_id)), ...registrations.map((row) => Number(row.course_id))])];
  const student_ids = [...new Set(registrations.map((row) => String(row.student_id)))];
  if (!course_ids.length || !student_ids.length) return { program, cards: [] };

  const course_marks = marks(course_ids.length);
  const student_marks = marks(student_ids.length);
  const registration_ids = registrations.map((row) => Number(row.registration_id));

  const [
    course_rows,
    lesson_totals,
    lessons_taught,
    lesson_done,
    quizzes,
    attempts,
    exercises,
    submissions,
    attendance,
    students
  ] = await Promise.all([
    course_ids.length > courses.length ?
      safe(() => sqlQuery(pool, `SELECT course_id, course_code, course_name, duration_hours, level FROM tbl_courses WHERE course_id IN (${course_marks})`, course_ids)) :
      Promise.resolve(courses),
    safe(() => sqlQuery(
      pool,
      `SELECT course_id, COUNT(*) AS total FROM tbl_course_lessons
       WHERE course_id IN (${course_marks}) AND is_deleted = FALSE AND is_active = TRUE
       GROUP BY course_id`,
      course_ids
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT course_id, COUNT(DISTINCT lesson_id) AS taught FROM tbl_lesson_done
       WHERE program_id = ? AND course_id IN (${course_marks})
       GROUP BY course_id`,
      [program_id, ...course_ids]
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT registration_id, COUNT(DISTINCT lesson_id) AS done FROM tbl_lesson_progress
       WHERE is_completed = TRUE AND registration_id IN (${marks(registration_ids.length)})
       GROUP BY registration_id`,
      registration_ids
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT quiz_id, course_id, quiz_title FROM tbl_course_quizzes
       WHERE course_id IN (${course_marks}) AND is_deleted = FALSE AND is_published = TRUE`,
      course_ids
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT student_id, course_id, quiz_id, MAX(percent) AS best, COUNT(*) AS tries
       FROM tbl_quiz_attempts
       WHERE course_id IN (${course_marks}) AND student_id IN (${student_marks})
       GROUP BY student_id, course_id, quiz_id`,
      [...course_ids, ...student_ids]
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT s.course_id, COUNT(e.exercise_id) AS total
       FROM tbl_coding_exercises e
       INNER JOIN tbl_lesson_coding_sets s ON s.coding_set_id = e.coding_set_id
       WHERE s.course_id IN (${course_marks}) AND e.is_deleted = FALSE AND s.is_deleted = FALSE AND s.is_published = TRUE
       GROUP BY s.course_id`,
      course_ids
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT student_id, course_id, exercise_id, MAX(score) AS best
       FROM tbl_coding_submissions
       WHERE course_id IN (${course_marks}) AND student_id IN (${student_marks})
       GROUP BY student_id, course_id, exercise_id`,
      [...course_ids, ...student_ids]
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT student_id, course_id, status, COUNT(*) AS n
       FROM tbl_course_attendance
       WHERE course_id IN (${course_marks}) AND student_id IN (${student_marks})
       GROUP BY student_id, course_id, status`,
      [...course_ids, ...student_ids]
    )),
    safe(() => sqlQuery(
      pool,
      `SELECT student_id, first_name, last_name, email, mobile_number, gender, college
       FROM tbl_students WHERE student_id IN (${student_marks})`,
      student_ids
    ))
  ]);

  const career = await load_career(pool, program_id, student_ids);
  const { by_student: hackathons_by_student, total: hackathon_total } = await load_hackathons(pool, program_id);

  const course_map = new Map(course_rows.map((row) => [Number(row.course_id), row]));
  const lesson_total = new Map(lesson_totals.map((row) => [Number(row.course_id), Number(row.total) || 0]));
  const lesson_taught = new Map(lessons_taught.map((row) => [Number(row.course_id), Number(row.taught) || 0]));
  const done_by_reg = new Map(lesson_done.map((row) => [Number(row.registration_id), Number(row.done) || 0]));
  const quiz_by_course = new Map();
  const quiz_title = new Map();
  for (const quiz of quizzes) {
    const course_id = Number(quiz.course_id);
    if (!quiz_by_course.has(course_id)) quiz_by_course.set(course_id, []);
    quiz_by_course.get(course_id).push(Number(quiz.quiz_id));
    quiz_title.set(Number(quiz.quiz_id), quiz.quiz_title || "Quiz");
  }
  const key = (student_id, course_id) => `${student_id}|${course_id}`;
  const attempts_by = new Map();
  for (const row of attempts) {
    const k = key(row.student_id, row.course_id);
    if (!attempts_by.has(k)) attempts_by.set(k, []);
    attempts_by.get(k).push({ quiz_id: Number(row.quiz_id), best: Number(row.best) || 0, tries: Number(row.tries) || 0 });
  }
  const exercise_total = new Map(exercises.map((row) => [Number(row.course_id), Number(row.total) || 0]));
  const submissions_by = new Map();
  for (const row of submissions) {
    const k = key(row.student_id, row.course_id);
    if (!submissions_by.has(k)) submissions_by.set(k, []);
    submissions_by.get(k).push(Number(row.best) || 0);
  }
  const attendance_by = new Map();
  for (const row of attendance) {
    const k = key(row.student_id, row.course_id);
    const current = attendance_by.get(k) || { present: 0, late: 0, absent: 0, other: 0 };
    const status = String(row.status || "").toLowerCase();
    if (status in current) current[status] += Number(row.n) || 0;
    else current.other += Number(row.n) || 0;
    attendance_by.set(k, current);
  }
  const student_map = new Map(students.map((row) => [String(row.student_id), row]));

  const regs_by_student = new Map();
  for (const row of registrations) {
    const id = String(row.student_id);
    if (!regs_by_student.has(id)) regs_by_student.set(id, []);
    regs_by_student.get(id).push(row);
  }

  const cards = [];
  for (const [student_id, regs] of regs_by_student) {
    const profile = student_map.get(student_id) || {};
    const course_cards = [];
    const quiz_scores = [];
    for (const reg of regs) {
      const course_id = Number(reg.course_id);
      const course = course_map.get(course_id) || {};
      const k = key(student_id, course_id);
      const course_lessons = lesson_total.get(course_id) || 0;
      const taught = lesson_taught.get(course_id) || 0;
      const total_lessons = taught || course_lessons;
      const done = Math.min(done_by_reg.get(Number(reg.registration_id)) || 0, total_lessons || Infinity);
      const progress = total_lessons ? round((done / total_lessons) * 100, 1) : round(Number(reg.progress_percent) || 0, 1);

      const published = quiz_by_course.get(course_id) || [];
      const tried = (attempts_by.get(k) || []).filter((row) => !published.length || published.includes(row.quiz_id));
      const quiz_total = published.length || tried.length;
      const quiz_avg = tried.length ? round(average(tried.map((row) => row.best)), 1) : null;
      const quiz_score = quiz_total ? round(tried.reduce((sum, row) => sum + row.best, 0) / quiz_total, 1) : null;
      for (const row of tried) quiz_scores.push({ title: quiz_title.get(row.quiz_id) || "Quiz", course: course.course_name || "", best: round(row.best, 1), tries: row.tries });

      const ex_total = exercise_total.get(course_id) || 0;
      const solved = submissions_by.get(k) || [];
      const coding_score = ex_total ? round(solved.reduce((sum, value) => sum + value, 0) / ex_total, 1) : null;

      const att = attendance_by.get(k);
      const att_marked = att ? att.present + att.late + att.absent + att.other : 0;
      const attendance_rate = att_marked ? round(((att.present + att.late) / att_marked) * 100, 1) : null;

      const parts = {
        progress: total_lessons ? progress : null,
        quiz: quiz_score,
        coding: coding_score,
        attendance: attendance_rate
      };
      const score = weighted(parts);
      course_cards.push({
        course_id,
        course_code: course.course_code || "",
        course_name: course.course_name || "Course",
        level: course.level || "",
        duration_hours: course.duration_hours == null ? null : Number(course.duration_hours),
        learning_status: reg.learning_status || "",
        lessons_done: done,
        lessons_total: total_lessons,
        lessons_in_course: course_lessons,
        lessons_basis: taught ? "taught" : "course",
        progress,
        quizzes_attempted: tried.length,
        quizzes_total: quiz_total,
        quiz_avg,
        quiz_score,
        coding_solved: solved.length,
        coding_total: ex_total,
        coding_score,
        attendance_present: att ? att.present + att.late : 0,
        attendance_marked: att_marked,
        attendance_rate,
        score,
        ...grade_of(score)
      });
    }

    const sum = (field) => course_cards.reduce((total, row) => total + (Number(row[field]) || 0), 0);
    const lessons_total = sum("lessons_total");
    const quizzes_total = sum("quizzes_total");
    const coding_total = sum("coding_total");
    const attendance_marked = sum("attendance_marked");
    const quiz_points = course_cards.reduce((total, row) => total + (row.quiz_score != null ? row.quiz_score * row.quizzes_total : 0), 0);
    const coding_points = course_cards.reduce((total, row) => total + (row.coding_score != null ? row.coding_score * row.coding_total : 0), 0);
    const my_hackathons = hackathons_by_student.get(student_id) || [];
    const hackathon_points = my_hackathons.reduce((total, row) =>
      total + (row.score != null ? Number(row.score) : HACKATHON_STATUS_SCORE[row.status] ?? 0), 0);
    const metrics = {
      progress: lessons_total ? round((sum("lessons_done") / lessons_total) * 100, 1) : null,
      quiz: quizzes_total ? round(quiz_points / quizzes_total, 1) : null,
      coding: coding_total ? round(coding_points / coding_total, 1) : null,
      attendance: attendance_marked ? round((sum("attendance_present") / attendance_marked) * 100, 1) : null,
      hackathon: hackathon_total ? round(hackathon_points / hackathon_total, 1) : null
    };
    const overall = weighted(metrics);
    const sorted_quizzes = [...quiz_scores].sort((a, b) => b.best - a.best);
    const reg_code = regs.map((row) => row.course_student_id).find(Boolean) || "";
    const first_seen = regs.map((row) => iso_day(row.created_at)).filter(Boolean).sort()[0] || "";
    const last_active = regs.map((row) => (row.last_accessed_at ? new Date(row.last_accessed_at).toISOString() : "")).filter(Boolean).sort().pop() || "";

    cards.push({
      student: {
        student_id,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || student_id,
        email: profile.email || "",
        mobile: profile.mobile_number || "",
        gender: profile.gender || "",
        college: profile.college || "",
        itda_id: reg_code,
        enrolled_on: first_seen,
        last_active
      },
      overall,
      ...grade_of(overall),
      metrics,
      counts: {
        lessons_done: sum("lessons_done"),
        lessons_total,
        quizzes_attempted: sum("quizzes_attempted"),
        quizzes_total,
        quiz_avg: round(average(quiz_scores.map((row) => row.best)), 1),
        coding_solved: sum("coding_solved"),
        coding_total,
        attendance_present: sum("attendance_present"),
        attendance_marked,
        hackathons_done: my_hackathons.filter((row) => row.status === "Done").length,
        hackathons_joined: my_hackathons.filter((row) => row.status !== "Pending").length,
        hackathons_total: hackathon_total
      },
      courses: course_cards,
      best_quizzes: sorted_quizzes.slice(0, 3),
      weak_quizzes: sorted_quizzes.length > 3 ? sorted_quizzes.slice(-3).reverse() : [],
      career: career.get(student_id) || { hackathons_total: career.hackathons_total, hackathons_joined: 0, submissions: 0, teams: [], mock_sessions: 0, mock_best: null, resume_score: null, resume_attempts: 0 },
      hackathons: hackathons_by_student.get(student_id) || []
    });
  }

  const ranked = cards.filter((card) => card.overall != null).sort((a, b) => b.overall - a.overall);
  ranked.forEach((card, index) => {
    card.rank = index > 0 && ranked[index - 1].overall === card.overall ? ranked[index - 1].rank : index + 1;
  });
  const class_average = round(average(ranked.map((card) => card.overall)), 1);
  for (const card of cards) {
    card.rank = card.rank || null;
    card.rank_of = ranked.length;
    card.class_average = class_average;
    card.percentile = card.rank && ranked.length > 1 ? round(((ranked.length - card.rank) / (ranked.length - 1)) * 100, 0) : null;
    card.remarks = remarks_for(card);
  }
  cards.sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.student.name.localeCompare(b.student.name));
  return { program, cards };
}

async function load_hackathons(pool, program_id) {
  const by_student = new Map();
  let loaded;
  try {
    loaded = await load_hackathon_program(pool, program_id);
  } catch {
    return { by_student, total: 0 };
  }
  for (const hackathon of loaded.hackathons) {
    const projects_by = new Map();
    for (const project of hackathon.projects) {
      if (!projects_by.has(project.student_id)) projects_by.set(project.student_id, []);
      projects_by.get(project.student_id).push({
        title: project.title,
        submitted_at: project.submitted_at,
        demo_url: project.demo_url,
        github_url: project.github_url,
        documentation_url: project.documentation_url,
        file_name: project.file_name
      });
    }
    for (const row of hackathon.participants) {
      if (!by_student.has(row.student_id)) by_student.set(row.student_id, []);
      by_student.get(row.student_id).push({
        hackathon_id: hackathon.hackathon_id,
        title: hackathon.title,
        team: row.team,
        status: row.status,
        score: row.score,
        projects: projects_by.get(row.student_id) || []
      });
    }
  }
  return { by_student, total: loaded.hackathons.length };
}

async function load_career(pool, program_id, student_ids) {
  const result = new Map();
  const ensure = (id) => {
    if (!result.has(id)) result.set(id, { hackathons_total: 0, hackathons_joined: 0, submissions: 0, teams: [], mock_sessions: 0, mock_best: null, resume_score: null, resume_attempts: 0 });
    return result.get(id);
  };
  const student_marks = marks(student_ids.length);

  const hackathons = await safe(() => sqlQuery(
    pool,
    `SELECT h.hackathon_id, h.title FROM tbl_hackathons h
     INNER JOIN tbl_hackathon_programs hp ON hp.hackathon_id = h.hackathon_id AND hp.is_deleted = FALSE
     WHERE hp.program_id = ? AND h.is_deleted = FALSE AND h.status = 'published'`,
    [program_id]
  ));
  result.hackathons_total = hackathons.length;
  if (hackathons.length) {
    const ids = hackathons.map((row) => Number(row.hackathon_id));
    const responses = await safe(() => sqlQuery(
      pool,
      `SELECT student_id, hackathon_id, COUNT(*) AS n FROM tbl_hackathon_responses
       WHERE is_deleted = FALSE AND hackathon_id IN (${marks(ids.length)})
         AND student_id COLLATE utf8mb4_unicode_ci IN (${student_marks})
       GROUP BY student_id, hackathon_id`,
      [...ids, ...student_ids]
    ));
    const teams = await safe(() => sqlQuery(
      pool,
      `SELECT bs.student_id, b.hackathon_id, b.batch_name FROM tbl_hackathon_batch_students bs
       INNER JOIN tbl_hackathon_batches b ON b.batch_id = bs.batch_id AND b.is_deleted = FALSE
       WHERE bs.is_deleted = FALSE AND b.hackathon_id IN (${marks(ids.length)})
         AND bs.student_id COLLATE utf8mb4_unicode_ci IN (${student_marks})`,
      [...ids, ...student_ids]
    ));
    const titles = new Map(hackathons.map((row) => [Number(row.hackathon_id), row.title]));
    const joined = new Map();
    for (const row of responses) {
      const entry = ensure(String(row.student_id));
      entry.submissions += Number(row.n) || 0;
      if (!joined.has(row.student_id)) joined.set(row.student_id, new Set());
      joined.get(row.student_id).add(Number(row.hackathon_id));
    }
    for (const row of teams) {
      const entry = ensure(String(row.student_id));
      entry.teams.push(`${row.batch_name} · ${titles.get(Number(row.hackathon_id)) || "Hackathon"}`);
      if (!joined.has(row.student_id)) joined.set(row.student_id, new Set());
      joined.get(row.student_id).add(Number(row.hackathon_id));
    }
    for (const [id, set] of joined) ensure(String(id)).hackathons_joined = set.size;
  }

  const mocks = await safe(() => sqlQuery(
    pool,
    `SELECT student_id, COUNT(*) AS n,
            MAX(CASE WHEN JSON_LENGTH(answers_json) > 0 THEN CAST(JSON_EXTRACT(performance_json, '$.overall_score') AS DECIMAL(6,2)) END) AS best
     FROM tbl_student_mock_interviews
     WHERE student_id IN (${student_marks})
     GROUP BY student_id`,
    student_ids
  ));
  for (const row of mocks) {
    const entry = ensure(String(row.student_id));
    entry.mock_sessions = Number(row.n) || 0;
    entry.mock_best = row.best == null ? null : round(Number(row.best), 2);
  }

  const resumes = await safe(() => sqlQuery(
    pool,
    `SELECT student_id, overall_score FROM tbl_student_resume_analysis
     WHERE student_id IN (${student_marks})
     ORDER BY analysis_id DESC`,
    student_ids
  ));
  for (const row of resumes) {
    const entry = ensure(String(row.student_id));
    entry.resume_attempts += 1;
    if (entry.resume_score == null && row.overall_score != null) entry.resume_score = round(Number(row.overall_score), 0);
  }
  for (const id of student_ids) ensure(id).hackathons_total = result.hackathons_total;
  return result;
}

function remarks_for(card) {
  const labels = { progress: "lesson completion", quiz: "quiz performance", coding: "coding practice", attendance: "attendance", hackathon: "hackathon performance" };
  const strengths = [];
  const focus = [];
  for (const [field, value] of Object.entries(card.metrics)) {
    if (value == null) continue;
    if (value >= 75) strengths.push(`Strong ${labels[field]} (${value}%).`);
    else if (value < 50) focus.push(`Improve ${labels[field]} — currently ${value}%.`);
  }
  const { counts, career } = card;
  if (counts.quizzes_total && counts.quizzes_attempted < counts.quizzes_total) {
    focus.push(`Attempt the remaining ${counts.quizzes_total - counts.quizzes_attempted} of ${counts.quizzes_total} quizzes.`);
  }
  if (career.hackathons_joined) strengths.push(`Took part in ${career.hackathons_joined} hackathon${career.hackathons_joined === 1 ? "" : "s"}.`);
  if (career.mock_best != null && career.mock_best >= 6) strengths.push(`Career readiness ${career.mock_best}/10 on the best mock interview.`);
  if (!career.mock_sessions) focus.push("Practise at least one AI mock interview.");
  if (career.resume_score != null && career.resume_score < 60) focus.push(`Raise the resume score from ${career.resume_score}/100 with the Resume Analyser.`);
  if (card.rank && card.rank <= 3 && card.rank_of > 3) strengths.unshift(`Ranked #${card.rank} of ${card.rank_of} in the program.`);
  const summary = card.overall == null ?
    "Not enough activity yet to grade this program." :
    card.overall >= 80 ?
      "An excellent record across the program. Keep up the consistency." :
      card.overall >= 60 ?
        "A solid performance with clear room to push into distinction." :
        card.overall >= 40 ?
          "Progress is underway, but more regular practice is needed." :
          "Needs focused support to catch up with the program.";
  return { summary, strengths: strengths.slice(0, 5), focus: focus.slice(0, 5) };
}

function matches_search(card, q) {
  const needle = String(q || "").trim().toLowerCase();
  if (!needle) return true;
  if (card.student.email.toLowerCase().includes(needle)) return true;
  let digits = needle.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  return digits.length > 0 && digits.length === needle.replace(/[\s+()-]/g, "").length &&
    String(card.student.mobile || "").replace(/\D/g, "").includes(digits);
}

export async function program_students(query = {}, user = {}) {
  const program_id = as_int(query.program_id);
  if (!program_id) throw fail("Choose a program");
  await assert_assigned_program(program_id, user);
  const { program, cards } = await build_program_cards(program_id);
  const shown = cards.filter((card) => matches_search(card, query.q));
  const graded = cards.filter((card) => card.overall != null);
  const grade_counts = GRADES.map((row) => ({ grade: row.grade, band: row.band, count: graded.filter((card) => card.grade === row.grade).length }));
  return {
    program,
    summary: {
      students: cards.length,
      graded: graded.length,
      class_average: round(average(graded.map((card) => card.overall)), 1),
      distinction: graded.filter((card) => card.overall >= 80).length,
      at_risk: graded.filter((card) => card.overall < 40).length,
      avg_progress: round(average(cards.map((card) => card.metrics.progress)), 1),
      avg_quiz: round(average(cards.map((card) => card.metrics.quiz)), 1),
      avg_attendance: round(average(cards.map((card) => card.metrics.attendance)), 1),
      avg_hackathon: round(average(cards.map((card) => card.metrics.hackathon)), 1)
    },
    grade_counts,
    rows: shown.map((card) => ({
      student: card.student,
      overall: card.overall,
      grade: card.grade,
      band: card.band,
      rank: card.rank,
      rank_of: card.rank_of,
      metrics: card.metrics,
      counts: card.counts,
      career: card.career
    }))
  };
}

export async function program_report_cards(query = {}, user = {}) {
  const program_id = as_int(query.program_id);
  if (!program_id) throw fail("Choose a program");
  await assert_assigned_program(program_id, user);
  const { program, cards } = await build_program_cards(program_id);
  const ids = String(query.student_ids || "").split(",").map((id) => id.trim()).filter(Boolean);
  const chosen = ids.length ? cards.filter((card) => ids.includes(card.student.student_id)) : cards.filter((card) => matches_search(card, query.q));
  return { program, generated_at: new Date().toISOString(), grading: GRADING, cards: chosen };
}

export async function student_report_card(student_id, query = {}, user = {}) {
  const program_id = as_int(query.program_id);
  if (!program_id) throw fail("Choose a program");
  await assert_assigned_program(program_id, user);
  const { program, cards } = await build_program_cards(program_id);
  const card = cards.find((item) => item.student.student_id === String(student_id));
  if (!card) throw fail("This student is not registered in the program", 404);
  return { program, generated_at: new Date().toISOString(), grading: GRADING, cards: [card] };
}

export async function my_report_programs(user) {
  const pool = get_pool();
  const code = student_code(user);
  const rows = await safe(() => sqlQuery(
    pool,
    `SELECT DISTINCT p.program_id, p.program_name, p.program_code
     FROM tbl_course_registrations r
     INNER JOIN tbl_programs p ON p.program_id = r.program_id AND p.is_deleted = FALSE
     WHERE r.student_id = ? AND r.is_deleted = FALSE AND r.status = 'registered'
     UNION
     SELECT DISTINCT p.program_id, p.program_name, p.program_code
     FROM tbl_course_registrations r
     INNER JOIN tbl_program_courses pc ON pc.course_id = r.course_id AND pc.is_deleted = FALSE
     INNER JOIN tbl_programs p ON p.program_id = pc.program_id AND p.is_deleted = FALSE
     WHERE r.student_id = ? AND r.program_id IS NULL AND r.is_deleted = FALSE AND r.status = 'registered'
     ORDER BY program_name ASC`,
    [code, code]
  ));
  return { programs: rows.map((row) => ({ id: Number(row.program_id), name: row.program_name, code: row.program_code })) };
}

export async function my_report_card(user, query = {}) {
  const code = student_code(user);
  const { programs } = await my_report_programs(user);
  const program_id = as_int(query.program_id) || programs[0]?.id;
  if (!program_id || !programs.some((row) => row.id === program_id)) throw fail("You are not registered in this program", 404);
  return student_report_card(code, { program_id });
}
