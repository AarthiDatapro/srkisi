import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_student_profile_schema } from "../student_authentication/student_auth_service.js";
import { get_course_content } from "../course_content_manager/content_service.js";
import { ensure_cohort_schema } from "../cohorts/schema.js";
import { ensure_lesson_done_schema } from "../course_content_manager/lesson_done_schema.js";
import { ensure_learn_schema } from "../course_learning/schema.js";
import { ensure_registration_schema } from "./schema.js";
import { student_code } from "../utils/student_code.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function map_program(row) {
  return {
    program_id: row.program_id,
    program_code: row.program_code,
    program_name: row.program_name,
    program_type: row.program_type || "",
    description: row.description || "",
    thumbnail_url: row.thumbnail_url || "",
    is_active: Boolean(row.is_active),
    course_count: Number(row.course_count) || 0,
    cohort_id: row.cohort_id == null ? null : Number(row.cohort_id),
    cohort_name: row.cohort_name || "",
    cohort_thumbnail: row.cohort_thumbnail || "",
    cohort_description: row.cohort_description || "",
    start_date: day_text(row.start_date),
    end_date: day_text(row.end_date)
  };
}

function map_course(row) {
  const fee = row.fee_amount == null ? null : Number(row.fee_amount);
  return {
    course_id: row.course_id,
    course_code: row.course_code,
    course_name: row.course_name,
    course_description: row.course_description || "",
    course_type: row.course_type || "",
    duration_hours: row.duration_hours == null ? null : Number(row.duration_hours),
    level: row.level || "",
    fee_amount: fee,
    thumbnail_url: row.thumbnail_url || "",
    is_free: fee == null || fee === 0,
    is_offline: Boolean(row.is_offline),
    is_registered: Number(row.is_registered) > 0,
    is_wishlisted: Number(row.is_wishlisted) > 0
  };
}

async function get_student(pool, code) {
  await ensure_student_profile_schema();
  const [rows] = await sqlQuery(
    pool,
    `SELECT student_id, first_name, last_name, email,
            learning_streak, last_streak_date
     FROM tbl_students
     WHERE student_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  const student = rows?.[0];
  if (!student) throw fail("Student account was not found", 401);
  return student;
}

async function touch_learning_streak(pool, student_id) {
  await ensure_student_profile_schema();
  await sqlQuery(
    pool,
    `UPDATE tbl_students
     SET learning_streak = CASE
           WHEN last_streak_date = CURDATE() THEN learning_streak
           WHEN last_streak_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN learning_streak + 1
           ELSE 1
         END,
         last_streak_date = CURDATE(),
         updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND is_deleted = FALSE`,
    [student_id]
  );
  const [rows] = await sqlQuery(
    pool,
    `SELECT learning_streak, last_streak_date
     FROM tbl_students
     WHERE student_id = ?
     LIMIT 1`,
    [student_id]
  );
  return {
    learning_streak: Number(rows?.[0]?.learning_streak) || 0,
    last_streak_date: rows?.[0]?.last_streak_date || null
  };
}

async function list_student_quizzes(pool, student_id) {
  try {
    const [attempt_rows] = await sqlQuery(
      pool,
      `       SELECT a.attempt_id, a.quiz_id, a.registration_id, a.score, a.total_questions, a.percent, a.submitted_at,
              COALESCE(q.quiz_title, CONCAT(c.course_name, ' Quiz')) AS title,
              c.course_id, c.course_name
       FROM tbl_quiz_attempts a
       INNER JOIN (
         SELECT quiz_id, registration_id, MAX(attempt_id) AS attempt_id
         FROM tbl_quiz_attempts
         WHERE student_id = ? AND registration_id IS NOT NULL
         GROUP BY quiz_id, registration_id
       ) latest ON latest.attempt_id = a.attempt_id
       INNER JOIN tbl_course_quizzes q ON q.quiz_id = a.quiz_id AND q.is_deleted = FALSE
       INNER JOIN tbl_courses c ON c.course_id = a.course_id AND c.is_deleted = FALSE
       WHERE a.student_id = ?
         AND EXISTS (
           SELECT 1
           FROM tbl_course_registrations r
           WHERE r.course_id = a.course_id
             AND r.student_id = a.student_id
             AND r.status = 'registered'
             AND r.is_deleted = FALSE
         )
       ORDER BY a.submitted_at DESC, a.attempt_id DESC`,
      [student_id, student_id]
    );

    const completed_quizzes = (attempt_rows || []).map((row) => ({
      id: `attempt_${row.attempt_id}`,
      quiz_id: row.quiz_id,
      registration_id: row.registration_id == null ? null : Number(row.registration_id),
      title: row.title || "Assessment Quiz",
      course_id: row.course_id == null ? null : Number(row.course_id),
      course_name: row.course_name || "Course",
      score: row.score != null ? `${row.score}/${row.total_questions || 10}` : null,
      percent: row.percent == null ? null : Number(row.percent),
      status: "completed"
    }));

    const [quiz_rows] = await sqlQuery(
      pool,
      `       SELECT q.quiz_id,
              r.registration_id,
              MIN(q.quiz_title) AS quiz_title,
              MIN(c.course_id) AS course_id,
              MIN(c.course_name) AS course_name,
              MIN(COALESCE(m.sequence_no, 9999)) AS module_seq,
              MIN(COALESCE(l.sequence_no, 9999)) AS lesson_seq,
              MIN(q.created_at) AS created_at
       FROM tbl_course_quizzes q
       INNER JOIN tbl_courses c ON c.course_id = q.course_id AND c.is_deleted = FALSE
       INNER JOIN tbl_course_registrations r
         ON r.course_id = c.course_id
        AND r.student_id = ?
        AND r.status = 'registered'
        AND r.is_deleted = FALSE
       LEFT JOIN tbl_course_modules m ON m.module_id = q.module_id AND m.is_deleted = FALSE
       LEFT JOIN tbl_course_lessons l ON l.lesson_id = q.lesson_id AND l.is_deleted = FALSE
       WHERE q.is_deleted = FALSE
         AND q.is_published = TRUE
         AND q.is_active = TRUE
         AND NOT EXISTS (
           SELECT 1
           FROM tbl_quiz_attempts a
           WHERE a.quiz_id = q.quiz_id
             AND a.student_id = ?
             AND a.registration_id = r.registration_id
         )
       GROUP BY q.quiz_id, r.registration_id
       ORDER BY course_name, module_seq, lesson_seq, created_at, q.quiz_id`,
      [student_id, student_id]
    );

    const pending_quizzes = (quiz_rows || []).map((row) => ({
      id: `quiz_${row.registration_id}_${row.quiz_id}`,
      quiz_id: row.quiz_id,
      registration_id: row.registration_id == null ? null : Number(row.registration_id),
      title: row.quiz_title || `${row.course_name} Quiz`,
      course_id: row.course_id == null ? null : Number(row.course_id),
      course_name: row.course_name,
      score: null,
      status: "pending"
    }));

    return [...pending_quizzes, ...completed_quizzes];
  } catch (err) {
    log.warn("listStudentQuizzes", err.message);
    return [];
  }
}

export async function get_catalog(user, query = {}) {
  await ensure_registration_schema();
  await ensure_cohort_schema();
  await ensure_student_profile_schema();
  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const search = String(query.search || "").trim();
  const status = String(query.status || "").trim().toLowerCase();
  const like = `%${search}%`;

  const where = ["p.is_deleted = FALSE"];
  const params = [];

  if (status === "active") where.push("p.is_active = TRUE");else
  if (status === "inactive") where.push("p.is_active = FALSE");else
  where.push("p.is_active = TRUE");

  if (search) {
    where.push("(p.program_name LIKE ? OR p.program_code LIKE ? OR p.description LIKE ? OR h.cohort_name LIKE ?)");
    params.push(like, like, like, like);
  }

  const [rows] = await sqlQuery(
    pool,
    `SELECT p.program_id, p.program_code, p.program_name, p.description,
            h.profile_url AS thumbnail_url, p.is_active, p.start_date, p.end_date,
            t.program_type_name AS program_type,
            h.cohort_id, h.cohort_name, h.description AS cohort_description,
            h.thumbnail_url AS cohort_thumbnail,
            (
              SELECT COUNT(*)
              FROM tbl_program_courses pc
              INNER JOIN tbl_courses c ON c.course_id = pc.course_id
              WHERE pc.program_id = p.program_id
                AND pc.is_deleted = FALSE
                AND pc.is_active = TRUE
                AND c.is_deleted = FALSE
                AND c.is_active = TRUE
            ) AS course_count
     FROM tbl_programs p
     LEFT JOIN mst_program_types t ON t.program_type_id = p.program_type_id
     LEFT JOIN tbl_cohort_programs cp
       ON cp.program_id = p.program_id AND cp.is_deleted = FALSE
      AND cp.cohort_program_id = (
        SELECT MIN(cp2.cohort_program_id)
        FROM tbl_cohort_programs cp2
        WHERE cp2.program_id = p.program_id AND cp2.is_deleted = FALSE
      )
     LEFT JOIN tbl_cohorts h ON h.cohort_id = cp.cohort_id AND h.is_deleted = FALSE
     WHERE ${where.join(" AND ")}
     ORDER BY h.cohort_name ASC, p.program_name ASC`,
    params
  );

  log.pass("getCatalog", `${student.student_id} loaded ${(rows || []).length} programs`);
  return {
    student,
    programs: (rows || []).map(map_program)
  };
}

export async function list_catalog_courses(user, query = {}) {
  await ensure_registration_schema();
  await ensure_cohort_schema();
  await ensure_student_profile_schema();
  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const program_id = Number(query.program_id);
  if (!Number.isInteger(program_id) || program_id < 1) {
    throw fail("Choose a program to see its courses");
  }

  const search = String(query.search || "").trim();
  const level = String(query.level || "").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const page_size = Math.min(24, Math.max(1, Number(query.pageSize) || 6));
  const like = `%${search}%`;

  const [programs] = await sqlQuery(
    pool,
    `SELECT p.program_id, p.program_code, p.program_name, p.description,
            (
              SELECT h.profile_url
              FROM tbl_cohort_programs cp
              INNER JOIN tbl_cohorts h ON h.cohort_id = cp.cohort_id AND h.is_deleted = FALSE
              WHERE cp.program_id = p.program_id AND cp.is_deleted = FALSE
              ORDER BY cp.cohort_program_id ASC
              LIMIT 1
            ) AS thumbnail_url,
            p.is_active, t.program_type_name AS program_type,
            (
              SELECT COUNT(*)
              FROM tbl_program_courses pc
              INNER JOIN tbl_courses c ON c.course_id = pc.course_id
              WHERE pc.program_id = p.program_id
                AND pc.is_deleted = FALSE
                AND pc.is_active = TRUE
                AND c.is_deleted = FALSE
                AND c.is_active = TRUE
            ) AS course_count
     FROM tbl_programs p
     LEFT JOIN mst_program_types t ON t.program_type_id = p.program_type_id
     WHERE p.program_id = ? AND p.is_deleted = FALSE
     LIMIT 1`,
    [program_id]
  );
  const program = programs?.[0];
  if (!program) throw fail("Program was not found", 404);

  const where = [
  "pc.program_id = ?",
  "pc.is_deleted = FALSE",
  "pc.is_active = TRUE",
  "c.is_deleted = FALSE",
  "c.is_active = TRUE"];

  const params = [program_id];

  if (search) {
    where.push("(c.course_name LIKE ? OR c.course_code LIKE ? OR c.course_description LIKE ?)");
    params.push(like, like, like);
  }
  if (level) {
    where.push("c.level = ?");
    params.push(level);
  }

  const from_sql = `
    FROM tbl_program_courses pc
    INNER JOIN tbl_courses c ON c.course_id = pc.course_id
    LEFT JOIN mst_course_types t ON t.course_type_id = c.course_type_id
    WHERE ${where.join(" AND ")}
  `;

  const [count_rows] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total ${from_sql}`,
    params
  );
  const total = Number(count_rows?.[0]?.total) || 0;
  const offset = (page - 1) * page_size;

  const [rows] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.course_code, c.course_name, c.course_description,
            t.course_type_name AS course_type, c.duration_hours, c.level, c.fee_amount,
            c.thumbnail_url, c.is_offline,
            EXISTS (
              SELECT 1 FROM tbl_course_registrations r
              WHERE r.student_id = ? AND r.course_id = c.course_id
                AND r.program_id = pc.program_id
                AND r.is_deleted = FALSE AND r.status = 'registered'
            ) AS is_registered,
            EXISTS (
              SELECT 1 FROM tbl_course_wishlist w
              WHERE w.student_id = ? AND w.course_id = c.course_id
            ) AS is_wishlisted
     ${from_sql}
     ORDER BY c.course_name ASC
     LIMIT ${page_size} OFFSET ${offset}`,
    [student.student_id, student.student_id, ...params]
  );

  log.pass(
    "listCatalogCourses",
    `${student.student_id} program ${program_id} page ${page}`
  );
  return {
    program: map_program(program),
    items: (rows || []).map(map_course),
    total,
    page,
    page_size
  };
}

export async function register_course(user, body = {}) {
  await ensure_registration_schema();
  await ensure_student_profile_schema();
  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const course_id = Number(body.course_id);
  let program_id = body.program_id == null ? null : Number(body.program_id);

  if (!Number.isInteger(course_id) || course_id < 1) {
    throw fail("Select a course to register");
  }
  if (program_id != null && (!Number.isInteger(program_id) || program_id < 1)) {
    throw fail("Select a valid program");
  }

  const [courses] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.fee_amount, c.is_offline, c.enroll_passkey, c.is_open
     FROM tbl_courses c
     WHERE c.course_id = ? AND c.is_deleted = FALSE AND c.is_active = TRUE
     LIMIT 1`,
    [course_id]
  );
  if (!courses?.[0]) throw fail("This course is not available");
  if (courses[0].is_open) program_id = null;
  else if (program_id == null) throw fail("Choose a program to register for this course");

  let program_passkey = "";
  if (program_id) {
    const [links] = await sqlQuery(
      pool,
      `SELECT program_course_id, enroll_passkey
       FROM tbl_program_courses
       WHERE program_id = ? AND course_id = ?
         AND is_deleted = FALSE AND is_active = TRUE
       LIMIT 1`,
      [program_id, course_id]
    );
    if (!links?.[0]) throw fail("This course is not part of the selected program");
    program_passkey = String(links[0].enroll_passkey || "").trim();
  }

  if (courses[0].is_offline) {
    const given = String(body.passkey || body.enroll_passkey || "").trim();
    const expected =
      program_passkey || String(courses[0].enroll_passkey || "").trim();
    if (!expected) {
      throw fail("This course has no passkey for this program yet. Contact the instructor.");
    }
    if (given.toUpperCase() !== expected.toUpperCase()) {
      throw fail("Wrong passkey");
    }
  }

  const [existing] = await sqlQuery(
    pool,
    program_id == null ?
      `SELECT registration_id, status, is_deleted
       FROM tbl_course_registrations
       WHERE student_id = ? AND course_id = ?
         AND is_deleted = FALSE AND status = 'registered'
       ORDER BY registration_id DESC
       LIMIT 1` :
      `SELECT registration_id, status, is_deleted
       FROM tbl_course_registrations
       WHERE student_id = ? AND course_id = ? AND program_id = ?
       ORDER BY registration_id DESC
       LIMIT 1`,
    program_id == null ? [student.student_id, course_id] : [student.student_id, course_id, program_id]
  );
  const current = existing?.[0];
  if (current && !current.is_deleted && current.status === "registered") {
    throw fail("You are already registered for this course", 409);
  }

  if (current) {
    await sqlQuery(
      pool,
      `UPDATE tbl_course_registrations
       SET status = 'registered', is_deleted = FALSE, program_id = ?,
           learning_status = 'not_started', progress_percent = 0, updated_at = NOW()
       WHERE registration_id = ?`,
      [program_id, current.registration_id]
    );
    log.pass("registerCourse", `${student.student_id} re_registered course ${course_id}`);
    return { registration_id: current.registration_id, course_id: course_id, status: "registered" };
  }

  const [result] = await sqlQuery(
    pool,
    `INSERT INTO tbl_course_registrations
       (student_id, course_id, program_id, status, learning_status, progress_percent)
     VALUES (?, ?, ?, 'registered', 'not_started', 0)`,
    [student.student_id, course_id, program_id]
  );

  log.pass("registerCourse", `${student.student_id} registered course ${course_id}`);
  return {
    registration_id: result.insertId,
    course_id: course_id,
    status: "registered"
  };
}

export async function set_wishlist(user, body = {}, wished) {
  await ensure_registration_schema();
  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const course_id = Number(body.course_id || body);
  if (!Number.isInteger(course_id) || course_id < 1) {
    throw fail("Select a course");
  }

  const [courses] = await sqlQuery(
    pool,
    `SELECT course_id FROM tbl_courses
     WHERE course_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [course_id]
  );
  if (!courses?.[0]) throw fail("Course was not found", 404);

  if (wished) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_course_wishlist (student_id, course_id)
       SELECT ?, ?
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM tbl_course_wishlist
         WHERE student_id = ? AND course_id = ?
       )`,
      [student.student_id, course_id, student.student_id, course_id]
    );
    log.pass("setWishlist", `${student.student_id} saved course ${course_id}`);
  } else {
    await sqlQuery(
      pool,
      `DELETE FROM tbl_course_wishlist WHERE student_id = ? AND course_id = ?`,
      [student.student_id, course_id]
    );
    log.pass("setWishlist", `${student.student_id} removed course ${course_id}`);
  }

  return { course_id: course_id, is_wishlisted: Boolean(wished) };
}

function day_text(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${date}`;
  }
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function learning_status(row) {
  const value = String(row.learning_status || "not_started").toLowerCase();
  if (["in_progress", "completed", "not_started"].includes(value)) {
    return value;
  }
  return "not_started";
}

async function last_taught_map(pool, rows) {
  const scoped = (rows || []).filter((row) => row.program_id && row.course_id);
  if (!scoped.length) return new Map();
  try {
    await ensure_lesson_done_schema();
    const program_ids = [...new Set(scoped.map((row) => Number(row.program_id)))];
    const course_ids = [...new Set(scoped.map((row) => Number(row.course_id)))];
    const [taught] = await sqlQuery(
      pool,
      `SELECT d.cohort_id, d.program_id, d.course_id, d.lesson_id, d.marked_at, l.lesson_title
       FROM tbl_lesson_done d
       INNER JOIN tbl_course_lessons l
         ON l.lesson_id = d.lesson_id AND l.is_deleted = FALSE
       WHERE d.program_id IN (${program_ids.map(() => "?").join(", ")})
         AND d.course_id IN (${course_ids.map(() => "?").join(", ")})
       ORDER BY d.marked_at DESC, d.lesson_done_id DESC`,
      [...program_ids, ...course_ids]
    );
    const found = new Map();
    for (const mark of taught || []) {
      const exact = `${mark.cohort_id}:${mark.program_id}:${mark.course_id}`;
      const loose = `${mark.program_id}:${mark.course_id}`;
      if (!found.has(exact)) found.set(exact, mark);
      if (!found.has(loose)) found.set(loose, mark);
    }
    return found;
  } catch (err) {
    log.warn("listMyCourses", `last taught skipped: ${err.message}`);
    return new Map();
  }
}

function stamp_day(value) {
  const text = day_text(value);
  if (text) return text;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function class_marks(pool, student_id, rows) {
  const course_ids = [...new Set((rows || []).map((row) => Number(row.course_id)).filter((id) => id > 0))];
  if (!student_id || !course_ids.length) return [];
  const marks = [];
  try {
    await ensure_learn_schema();
    const [completed] = await sqlQuery(
      pool,
      `SELECT p.course_id, p.registration_id, p.lesson_id, p.completed_at AS marked_at, l.lesson_title, c.course_name
       FROM tbl_lesson_progress p
       INNER JOIN tbl_course_lessons l
         ON l.lesson_id = p.lesson_id AND l.is_deleted = FALSE
       INNER JOIN tbl_courses c ON c.course_id = p.course_id AND c.is_deleted = FALSE
       WHERE p.student_id = ? AND p.is_completed = TRUE AND p.completed_at IS NOT NULL
         AND p.course_id IN (${course_ids.map(() => "?").join(", ")})
       ORDER BY p.completed_at DESC, p.progress_id DESC`,
      [student_id, ...course_ids]
    );
    marks.push(...(completed || []));
  } catch (err) {
    log.warn("listMyCourses", `completed lessons skipped: ${err.message}`);
  }
  try {
    await ensure_lesson_done_schema();
    const scoped = (rows || []).filter((row) => row.program_id && row.course_id);
    const program_ids = [...new Set(scoped.map((row) => Number(row.program_id)))];
    if (program_ids.length) {
      const [taught] = await sqlQuery(
        pool,
        `SELECT d.cohort_id, d.program_id, d.course_id, d.lesson_id, d.marked_at, l.lesson_title, c.course_name
         FROM tbl_lesson_done d
         INNER JOIN tbl_course_lessons l
           ON l.lesson_id = d.lesson_id AND l.is_deleted = FALSE
         INNER JOIN tbl_courses c ON c.course_id = d.course_id AND c.is_deleted = FALSE
         WHERE d.program_id IN (${program_ids.map(() => "?").join(", ")})
           AND d.course_id IN (${course_ids.map(() => "?").join(", ")})
         ORDER BY d.marked_at DESC, d.lesson_done_id DESC`,
        [...program_ids, ...course_ids]
      );
      for (const mark of taught || []) {
        const enrolled = scoped.some((row) =>
          Number(row.course_id) === Number(mark.course_id) &&
          Number(row.program_id) === Number(mark.program_id) &&
          (row.cohort_id == null || mark.cohort_id == null || Number(row.cohort_id) === Number(mark.cohort_id))
        );
        if (enrolled) marks.push(mark);
      }
    }
  } catch (err) {
    log.warn("listMyCourses", `taught lessons skipped: ${err.message}`);
  }
  const seen = new Set();
  const unique = [];
  const ordered = [...marks].sort((a, b) => new Date(b.marked_at) - new Date(a.marked_at));
  for (const mark of ordered) {
    const key = `${mark.registration_id || `taught:${mark.program_id}:${mark.cohort_id}`}:${mark.course_id}:${mark.lesson_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      registration_id: mark.registration_id == null ? null : Number(mark.registration_id),
      course_id: mark.course_id,
      course_name: mark.course_name || "",
      lesson_id: mark.lesson_id,
      lesson_title: mark.lesson_title || "",
      marked_at: mark.marked_at,
      marked_on: stamp_day(mark.marked_at)
    });
  }
  return unique;
}

export async function list_my_courses(user, query = {}) {
  await ensure_registration_schema();
  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const search = String(query.search || "").trim();
  const tab = String(query.tab || "all").trim().toLowerCase();
  const sort = String(query.sort || "recent").trim().toLowerCase();
  const like = `%${search}%`;

  const [stat_rows] = await sqlQuery(
    pool,
    `SELECT
       COUNT(*) AS enrolled,
       SUM(CASE WHEN COALESCE(r.learning_status, 'not_started') = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN COALESCE(r.learning_status, 'not_started') = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN COALESCE(r.learning_status, 'not_started') = 'completed' THEN 1 ELSE 0 END) AS certificates
     FROM tbl_course_registrations r
     WHERE r.student_id = ? AND r.is_deleted = FALSE AND r.status = 'registered'`,
    [student.student_id]
  );

  const where = [
  "r.student_id = ?",
  "r.is_deleted = FALSE",
  "r.status = 'registered'",
  "c.is_deleted = FALSE"];

  const params = [student.student_id];

  if (tab && tab !== "all") {
    where.push("COALESCE(r.learning_status, 'not_started') = ?");
    params.push(tab);
  }
  if (search) {
    where.push(`(
      c.course_name LIKE ? OR c.course_code LIKE ? OR COALESCE(c.course_description, '') LIKE ?
      OR COALESCE(p.program_name, '') LIKE ? OR COALESCE(p.program_code, '') LIKE ?
      OR EXISTS (
        SELECT 1
        FROM tbl_lessons l
        INNER JOIN tbl_modules m ON m.module_id = l.module_id AND m.is_deleted = FALSE
        WHERE m.course_id = c.course_id AND l.is_deleted = FALSE AND l.lesson_title LIKE ?
      )
    )`);
    params.push(like, like, like, like, like, like);
  }

  const order_sql =
  sort === "name" ?
  "c.course_name ASC" :
  "r.last_accessed_at DESC, r.updated_at DESC, r.created_at DESC";

  const [rows] = await sqlQuery(
    pool,
    `SELECT r.registration_id, r.course_id, r.program_id, r.learning_status,
            r.progress_percent, r.last_accessed_at, r.created_at,
            c.course_code, c.course_name, c.course_description, c.duration_hours,
            c.level, c.thumbnail_url, t.course_type_name AS course_type,
            p.program_code, p.program_name, p.description AS program_description,
            p.thumbnail_url AS program_thumbnail, p.start_date, p.end_date,
            h.cohort_id, h.cohort_name
     FROM tbl_course_registrations r
     INNER JOIN tbl_courses c ON c.course_id = r.course_id
     LEFT JOIN mst_course_types t ON t.course_type_id = c.course_type_id
     LEFT JOIN tbl_programs p ON p.program_id = r.program_id AND p.is_deleted = FALSE
     LEFT JOIN tbl_cohort_programs cp
       ON cp.program_id = r.program_id AND cp.is_deleted = FALSE
      AND cp.cohort_program_id = (
        SELECT MIN(cp2.cohort_program_id)
        FROM tbl_cohort_programs cp2
        WHERE cp2.program_id = r.program_id AND cp2.is_deleted = FALSE
      )
     LEFT JOIN tbl_cohorts h ON h.cohort_id = cp.cohort_id AND h.is_deleted = FALSE
     WHERE ${where.join(" AND ")}
     ORDER BY ${order_sql}`,
    params
  );

  const taught = await last_taught_map(pool, rows);
  const lesson_marks = await class_marks(pool, student.student_id, rows);
  log.pass("listMyCourses", `${student.student_id} loaded ${(rows || []).length} courses`);
  const stats = stat_rows?.[0] || {};
  let quizzes = [];
  try {
    quizzes = await list_student_quizzes(pool, student.student_id);
  } catch (err) {
    log.warn("listMyCourses", `quizzes skipped: ${err.message}`);
  }
  return {
    student: {
      ...student,
      learning_streak: Number(student.learning_streak) || 0,
      last_streak_date: student.last_streak_date || null
    },
    quizzes,
    lesson_marks,
    stats: {
      enrolled: Number(stats.enrolled) || 0,
      in_progress: Number(stats.in_progress) || 0,
      completed: Number(stats.completed) || 0,
      certificates: Number(stats.certificates) || 0
    },
    items: (rows || []).map((row) => ({
      registration_id: row.registration_id,
      course_id: row.course_id,
      program_id: row.program_id,
      course_code: row.course_code,
      course_name: row.course_name,
      course_description: row.course_description || "",
      course_type: row.course_type || "",
      duration_hours: row.duration_hours == null ? null : Number(row.duration_hours),
      level: row.level || "",
      thumbnail_url: row.thumbnail_url || "",
      program_name: row.program_name || "",
      program_description: row.program_description || "",
      program_thumbnail: row.program_thumbnail || "",
      program_code: row.program_code || "",
      cohort_id: row.cohort_id == null ? null : Number(row.cohort_id),
      cohort_name: row.cohort_name || "",
      last_taught_title: (
        taught.get(`${row.cohort_id}:${row.program_id}:${row.course_id}`) ||
        taught.get(`${row.program_id}:${row.course_id}`)
      )?.lesson_title || "",
      last_taught_lesson_id: (
        taught.get(`${row.cohort_id}:${row.program_id}:${row.course_id}`) ||
        taught.get(`${row.program_id}:${row.course_id}`)
      )?.lesson_id || null,
      last_taught_at: (
        taught.get(`${row.cohort_id}:${row.program_id}:${row.course_id}`) ||
        taught.get(`${row.program_id}:${row.course_id}`)
      )?.marked_at || null,
      program_start: day_text(row.start_date),
      program_end: day_text(row.end_date),
      learning_status: learning_status(row),
      progress_percent: Number(row.progress_percent) || 0,
      last_accessed_at: row.last_accessed_at,
      enrolled_at: row.created_at
    }))
  };
}

export async function access_my_course(user, course_id, registration_id = null) {
  await ensure_registration_schema();
  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const id = Number(course_id);
  const asked = Number(registration_id);
  if (!Number.isInteger(id) || id < 1) throw fail("Select a course");

  const params = [student.student_id, id];
  let registration_sql = "";
  if (Number.isInteger(asked) && asked > 0) {
    registration_sql = "AND registration_id = ?";
    params.push(asked);
  }
  const [rows] = await sqlQuery(
    pool,
    `SELECT registration_id, learning_status
     FROM tbl_course_registrations
     WHERE student_id = ? AND course_id = ? AND is_deleted = FALSE AND status = 'registered'
       ${registration_sql}
     ORDER BY registration_id ASC`,
    params
  );
  if (!rows?.length) throw fail("You are not enrolled in this course", 404);
  if (!(Number.isInteger(asked) && asked > 0) && rows.length > 1) {
    throw fail("Open this course from the program you are registered in", 409);
  }
  const current = rows[0];

  const next_status =
  current.learning_status === "completed" ?
  current.learning_status :
  "in_progress";

  await sqlQuery(
    pool,
    `UPDATE tbl_course_registrations
     SET learning_status = ?, last_accessed_at = NOW(), updated_at = NOW()
     WHERE registration_id = ?`,
    [next_status, current.registration_id]
  );

  const streak = await touch_learning_streak(pool, student.student_id);
  log.pass("accessMyCourse", `${student.student_id} opened course ${id}`);
  return { course_id: id, learning_status: next_status, ...streak };
}

export async function get_catalog_course(user, course_id, query = {}) {
  await ensure_registration_schema();
  await ensure_student_profile_schema();
  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const id = Number(course_id);
  if (!Number.isInteger(id) || id < 1) throw fail("Course was not found", 404);
  const program_id = query.program_id == null || query.program_id === "" ? null : Number(query.program_id);

  const registered_sql =
    program_id != null && Number.isInteger(program_id) && program_id > 0 ?
      `EXISTS (
         SELECT 1 FROM tbl_course_registrations r
         WHERE r.student_id = ? AND r.course_id = c.course_id
           AND r.program_id = ?
           AND r.is_deleted = FALSE AND r.status = 'registered'
       ) AS is_registered` :
      `EXISTS (
         SELECT 1 FROM tbl_course_registrations r
         WHERE r.student_id = ? AND r.course_id = c.course_id
           AND r.is_deleted = FALSE AND r.status = 'registered'
       ) AS is_registered`;
  const registered_params =
    program_id != null && Number.isInteger(program_id) && program_id > 0 ?
      [student.student_id, program_id] :
      [student.student_id];

  const [rows] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.course_code, c.course_name, c.course_description,
            t.course_type_name AS course_type, c.duration_hours, c.level, c.fee_amount,
            c.thumbnail_url, c.is_offline,
            ${registered_sql}
     FROM tbl_courses c
     LEFT JOIN mst_course_types t ON t.course_type_id = c.course_type_id
     WHERE c.course_id = ? AND c.is_deleted = FALSE AND c.is_active = TRUE
     LIMIT 1`,
    [...registered_params, id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Course was not found", 404);

  const payload = await get_course_content(id, { hydrate: false });
  const modules = (payload.modules || []).
  filter((module) => module.is_active !== false).
  map((module) => {
    const lessons = (module.blocks || []).
    filter((block) => block.content_type === "lesson" && block.lesson && block.lesson.is_active !== false).
    map((block) => {
      const items = block.lesson.items || [];
      const resources = items.
      filter((item) => {
        const type = String(item.content_type || "").toLowerCase();
        if (type === "video" || type === "overview" || type === "announcement") return false;
        return type === "material" || type === "notes" || type === "resource" || Boolean(item.file_path || item.content_url);
      }).
      map((item) => ({
        content_id: item.content_id,
        content_title: item.content_title,
        content_type: item.content_type
      }));
      return {
        lesson_id: block.lesson.lesson_id,
        lesson_title: block.lesson.lesson_title,
        duration_minutes: block.lesson.duration_minutes,
        item_count: items.length,
        resources
      };
    });
    const quizzes = (module.blocks || []).
    filter((block) => block.content_type === "quiz" && block.quiz && block.quiz.is_published !== false).
    map((block) => ({
      quiz_id: block.quiz.quiz_id,
      quiz_title: block.quiz.quiz_title,
      question_count: block.quiz.questions_shown || block.quiz.question_count,
      lesson_id: block.quiz.lesson_id || null
    }));
    const nested_lessons = lessons.map((lesson) => ({
      ...lesson,
      quizzes: quizzes.filter((quiz) => Number(quiz.lesson_id) === Number(lesson.lesson_id))
    }));
    const resources = nested_lessons.flatMap((lesson) => lesson.resources || []);
    return {
      module_id: module.module_id,
      module_title: module.module_title,
      lessons: nested_lessons,
      quizzes,
      resources
    };
  });

  log.pass("getCatalogCourse", `${student.student_id} previewed course ${id}`);
  return {
    ...map_course(row),
    modules,
    lesson_count: modules.reduce((sum, module) => sum + module.lessons.length, 0),
    quiz_count: modules.reduce((sum, module) => sum + module.quizzes.length, 0),
    resource_count: modules.reduce((sum, module) => sum + module.resources.length, 0)
  };
}
