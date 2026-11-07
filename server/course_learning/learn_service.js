import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_course_content, hydrate_learning_json, list_items, require_lesson } from "../course_content_manager/content_service.js";
import { get_pool } from "../utils/db_setup.js";
import { attach_coding_submissions, public_coding_set } from "./coding_student_service.js";
import { list_feedback_questions } from "./feedback_questions_service.js";
import { ensure_learn_schema } from "./schema.js";
import { require_registration } from "./enrollment.js";
import { student_code } from "../utils/student_code.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function get_student(pool, code) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT student_id, first_name, last_name, email
     FROM tbl_students
     WHERE student_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  const student = rows?.[0];
  if (!student) throw fail("Student account was not found", 401);
  return student;
}

async function require_enrollment(pool, student_id, course_id, registration_id) {
  return require_registration(pool, student_id, course_id, registration_id);
}

async function completed_lesson_ids(pool, registration_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT lesson_id FROM tbl_lesson_progress
     WHERE registration_id = ? AND is_completed = TRUE`,
    [registration_id]
  );
  return new Set((rows || []).map((row) => Number(row.lesson_id)));
}

async function sync_course_progress(pool, registration_id, total_lessons, done_count) {
  const percent = total_lessons ? Math.round(done_count / total_lessons * 100) : 0;
  const status = percent >= 100 && total_lessons ? "completed" : "in_progress";
  await sqlQuery(
    pool,
    `UPDATE tbl_course_registrations
     SET progress_percent = ?, learning_status = ?, last_accessed_at = NOW(), updated_at = NOW()
     WHERE registration_id = ? AND is_deleted = FALSE`,
    [percent, status, registration_id]
  );
  return { progress_percent: percent, learning_status: status };
}

function active_lessons(blocks) {
  return (blocks || []).
  filter((block) => block.content_type === "lesson" && block.lesson?.is_active !== false).
  map((block) => block.lesson);
}

async function student_feedback_by_lesson(pool, registration_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT lesson_id, quiz_id, rating, remarks, created_at
     FROM tbl_lesson_feedback
     WHERE registration_id = ?
     ORDER BY feedback_id DESC`,
    [registration_id]
  );
  const map = new Map();
  for (const row of rows || []) {
    const lesson_id = Number(row.lesson_id);
    if (map.has(lesson_id)) continue;
    map.set(lesson_id, {
      quiz_id: row.quiz_id == null ? null : Number(row.quiz_id),
      rating: Number(row.rating),
      remarks: row.remarks || "",
      created_at: row.created_at
    });
  }
  return map;
}

function modules_with_progress(payload, done, feedback) {
  const source = payload.modules?.length ?
  payload.modules :
  [{ module_id: 0, module_title: "Course", sequence_no: 1, is_active: true, blocks: payload.blocks || [] }];
  return source.
  filter((module) => module.is_active !== false).
  map((module) => {
    const coding_sets = (module.blocks || []).
    filter((block) => block.content_type === "coding" && block.coding && block.coding.is_published !== false).
    map((block) => public_coding_set(block.coding));
    const quizzes = (module.blocks || []).
    filter((block) => block.content_type === "quiz" && block.quiz).
    map((block) => {
      const quiz = block.quiz;
      return {
        quiz_id: quiz.quiz_id,
        quiz_title: quiz.quiz_title,
        question_count: quiz.question_count,
        questions_shown: quiz.questions_shown || quiz.question_count,
        difficulty: quiz.difficulty,
        bloom_level: quiz.bloom_level,
        is_published: quiz.is_published,
        is_active: quiz.is_active,
        module_id: quiz.module_id,
        lesson_id: quiz.lesson_id || null
      };
    });
    const lessons = active_lessons(module.blocks).map((lesson) => ({
      ...lesson,
      items: (lesson.items || []).filter((item) => item.is_active !== false),
      is_completed: done.has(Number(lesson.lesson_id)),
      feedback: feedback.get(Number(lesson.lesson_id)) || null,
      quizzes: quizzes.filter((quiz) => Number(quiz.lesson_id) === Number(lesson.lesson_id)),
      coding_sets: coding_sets.filter((set) => Number(set.lesson_id) === Number(lesson.lesson_id))
    }));
    return {
      module_id: module.module_id,
      module_title: module.module_title,
      sequence_no: module.sequence_no,
      lessons,
      quizzes
    };
  });
}

export async function get_learn_course(user, course_id, registration_id) {
  await ensure_learn_schema();
  const id = Number(course_id);
  if (!Number.isInteger(id) || id < 1) throw fail("Course was not found", 404);

  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const enrollment = await require_enrollment(pool, student.student_id, id, registration_id);
  const payload = await get_course_content(id, { include_html: false });
  const done = await completed_lesson_ids(pool, enrollment.registration_id);
  const feedback = await student_feedback_by_lesson(pool, enrollment.registration_id);
  const modules = await attach_coding_submissions(
    pool,
    student.student_id,
    id,
    modules_with_progress(payload, done, feedback),
    enrollment.registration_id
  );
  const lessons = modules.flatMap((module) => module.lessons);
  const quizzes = modules.flatMap((module) => module.quizzes || []);

  const done_count = lessons.filter((lesson) => lesson.is_completed).length;
  const progress = await sync_course_progress(pool, enrollment.registration_id, lessons.length, done_count);
  const feedback_pack = await list_feedback_questions(id);

  log.pass("getLearnCourse", `${student.student_id} opened course ${id}`);
  return {
    student,
    course: payload.course,
    modules,
    lessons,
    quizzes,
    feedback_questions: feedback_pack.questions,
    feedback_questions_source: feedback_pack.source,
    enrollment: {
      registration_id: enrollment.registration_id,
      program_id: enrollment.program_id == null ? null : Number(enrollment.program_id),
      cohort_id: enrollment.cohort_id == null ? null : Number(enrollment.cohort_id),
      ...progress
    }
  };
}

export async function get_learn_lesson(user, course_id, lesson_id, registration_id) {
  await ensure_learn_schema();
  const id = Number(course_id);
  const lesson = Number(lesson_id);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(lesson) || lesson < 1) {
    throw fail("Lesson was not found", 404);
  }

  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  await require_enrollment(pool, student.student_id, id, registration_id);
  const row = await require_lesson(pool, id, lesson);
  if (row.is_active === false || row.is_active === 0) throw fail("Lesson was not found", 404);

  const items = await list_items(pool, [lesson], { include_html: true });
  await hydrate_learning_json(pool, items);
  log.pass("getLearnLesson", `${student.student_id} opened lesson ${lesson}`);
  return {
    lesson_id: lesson,
    items: items.filter((item) => item.is_active !== false)
  };
}

export async function complete_lesson(user, course_id, lesson_id, registration_id) {
  await ensure_learn_schema();
  const id = Number(course_id);
  const lesson = Number(lesson_id);
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(lesson) || lesson < 1) {
    throw fail("Lesson was not found", 404);
  }

  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const enrollment = await require_enrollment(pool, student.student_id, id, registration_id);

  const [rows] = await sqlQuery(
    pool,
    `SELECT lesson_id FROM tbl_course_lessons
     WHERE lesson_id = ? AND course_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [lesson, id]
  );
  if (!rows?.[0]) throw fail("Lesson was not found", 404);

  await sqlQuery(
    pool,
    `INSERT INTO tbl_lesson_progress (
       student_id, lesson_id, course_id, registration_id, is_completed, completed_at
     )
     VALUES (?, ?, ?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE is_completed = TRUE, completed_at = NOW(), updated_at = NOW()`,
    [student.student_id, lesson, id, enrollment.registration_id]
  );

  log.pass("completeLesson", `${student.student_id} completed lesson ${lesson}`);
  return get_learn_course(user, id, enrollment.registration_id);
}

export async function save_lesson_feedback(user, course_id, lesson_id, body = {}, registration_id) {
  await ensure_learn_schema();
  const id = Number(course_id);
  const lesson = Number(lesson_id);
  const rating = Number(body.rating);
  const remarks = String(body.remarks || "").trim();
  if (!Number.isInteger(id) || id < 1 || !Number.isInteger(lesson) || lesson < 1) {
    throw fail("Lesson was not found", 404);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw fail("Choose a rating from 1 to 5 stars");
  }
  if (remarks.length > 2000) throw fail("Remarks must be 2000 characters or less");
  const quiz_raw = body.quiz_id;
  const quiz_id = quiz_raw == null || quiz_raw === "" ? null : Number(quiz_raw);
  if (quiz_id != null && (!Number.isInteger(quiz_id) || quiz_id < 1)) {
    throw fail("Quiz was not found", 404);
  }

  const pool = get_pool();
  const student = await get_student(pool, student_code(user));
  const enrollment = await require_enrollment(pool, student.student_id, id, registration_id);

  const [rows] = await sqlQuery(
    pool,
    `SELECT lesson_id FROM tbl_course_lessons
     WHERE lesson_id = ? AND course_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [lesson, id]
  );
  if (!rows?.[0]) throw fail("Lesson was not found", 404);

  if (quiz_id != null) {
    const [quiz_rows] = await sqlQuery(
      pool,
      `SELECT quiz_id FROM tbl_course_quizzes
       WHERE quiz_id = ? AND course_id = ? AND lesson_id = ? AND is_deleted = FALSE
       LIMIT 1`,
      [quiz_id, id, lesson]
    );
    if (!quiz_rows?.[0]) throw fail("Quiz was not found", 404);
  }

  await sqlQuery(
    pool,
    `INSERT INTO tbl_lesson_feedback (
       student_id, lesson_id, course_id, registration_id, quiz_id, rating, remarks
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [student.student_id, lesson, id, enrollment.registration_id, quiz_id, rating, remarks || null]
  );

  await sqlQuery(
    pool,
    `INSERT INTO tbl_lesson_progress (
       student_id, lesson_id, course_id, registration_id, is_completed, completed_at
     )
     VALUES (?, ?, ?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE is_completed = TRUE, completed_at = COALESCE(completed_at, NOW()), updated_at = NOW()`,
    [student.student_id, lesson, id, enrollment.registration_id]
  );

  log.pass("saveLessonFeedback", `${student.student_id} rated lesson ${lesson} ${rating} and completed it`);
  return get_learn_course(user, id, enrollment.registration_id);
}
