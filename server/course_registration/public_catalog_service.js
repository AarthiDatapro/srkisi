import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { get_pool } from "../utils/db_setup.js";
import { ensure_course_schema } from "../course_manager/schema.js";
import { ensure_content_schema } from "../course_content_manager/schema.js";
import { ensure_program_dropdown_schema } from "../dropdown_manager/schema.js";
import { ensure_cohort_schema } from "../cohorts/schema.js";

function map_program(row) {
  return {
    program_id: row.program_id,
    program_code: row.program_code,
    program_name: row.program_name,
    program_type: row.program_type || "",
    description: row.description || "",
    thumbnail_url: row.thumbnail_url || "",
    course_count: Number(row.course_count) || 0,
    is_active: Boolean(row.is_active)
  };
}

function map_course(row) {
  const fee = row.fee_amount == null ? null : Number(row.fee_amount);
  return {
    course_id: row.course_id,
    course_code: row.course_code || "",
    course_name: row.course_name,
    course_description: row.course_description || "",
    course_type: row.course_type || "",
    duration_hours: row.duration_hours == null ? null : Number(row.duration_hours),
    level: row.level || "",
    fee_amount: fee,
    thumbnail_url: row.thumbnail_url || "",
    is_offline: Boolean(row.is_offline),
    is_free: fee == null || fee === 0,
    lesson_count: Number(row.lesson_count) || 0
  };
}

export async function list_public_programs(query = {}) {
  await ensure_program_dropdown_schema();
  await ensure_course_schema();
  await ensure_cohort_schema();
  const pool = get_pool();
  const limit = Math.min(500, Math.max(1, Number(query.limit) || 500));

  const [rows] = await sqlQuery(
    pool,
    `SELECT p.program_id, p.program_code, p.program_name, p.description,
            h.profile_url AS thumbnail_url, p.is_active, t.program_type_name AS program_type,
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
     WHERE p.is_deleted = FALSE AND p.is_active = TRUE
     ORDER BY p.program_name ASC
     LIMIT ${limit}`
  );

  log.pass("list_public_programs", `${(rows || []).length} programs`);
  return { programs: (rows || []).map(map_program) };
}

export async function list_public_courses(query = {}) {
  await ensure_course_schema();
  await ensure_content_schema();
  const pool = get_pool();
  const limit = Math.min(500, Math.max(1, Number(query.limit) || 500));

  const [rows] = await sqlQuery(
    pool,
    `SELECT c.course_id, c.course_code, c.course_name, c.course_description,
            t.course_type_name AS course_type, c.duration_hours, c.level,
            c.fee_amount, c.thumbnail_url, c.is_offline,
            (
              SELECT COUNT(*)
              FROM tbl_course_lessons l
              WHERE l.course_id = c.course_id
                AND l.is_deleted = FALSE
                AND l.is_active = TRUE
            ) AS lesson_count
     FROM tbl_courses c
     LEFT JOIN mst_course_types t ON t.course_type_id = c.course_type_id
     WHERE c.is_deleted = FALSE AND c.is_active = TRUE
     ORDER BY c.updated_at DESC, c.course_name ASC
     LIMIT ${limit}`
  );

  log.pass("list_public_courses", `${(rows || []).length} courses`);
  return { courses: (rows || []).map(map_course) };
}

function read_points(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  const text = String(value || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function sale_amount(is_paid, fee, discount) {
  if (!is_paid || fee == null) return 0;
  const percent = Number(discount) || 0;
  return Math.round(Number(fee) * (100 - percent)) / 100;
}

function map_languages(ids_text, names_text) {
  const ids = String(ids_text || "").split(",").map((id) => Number(id)).filter((id) => id > 0);
  const names = String(names_text || "").split("||").map((name) => name.trim()).filter(Boolean);
  return ids.map((id, index) => ({ id, name: names[index] || "" })).filter((item) => item.name);
}

function map_open_course(row) {
  const fee = row.fee_amount == null ? null : Number(row.fee_amount);
  const discount = row.discount_percent == null ? null : Number(row.discount_percent);
  const paid = Boolean(row.is_paid);
  return {
    course_id: row.course_id,
    course_code: row.course_code || "",
    course_name: row.course_name,
    course_tagline: row.course_tagline || "",
    course_description: row.course_description || "",
    created_by_display: row.created_by_display || "",
    real_world_project_count: row.real_world_project_count == null ? 0 : Number(row.real_world_project_count),
    has_completion_certificate: Boolean(row.has_completion_certificate),
    learn_points: read_points(row.learn_points),
    audience_points: read_points(row.audience_points),
    is_paid: paid,
    fee_amount: fee,
    discount_percent: discount,
    sale_amount: sale_amount(paid, fee, discount),
    thumbnail_url: row.thumbnail_url || "",
    duration_hours: row.duration_hours == null ? null : Number(row.duration_hours),
    domain_id: row.course_domain_id == null ? null : Number(row.course_domain_id),
    domain_name: row.course_domain || "",
    level_id: row.course_level_id == null ? null : Number(row.course_level_id),
    level_name: row.course_level || row.level || "",
    tag_id: row.course_tag_id == null ? null : Number(row.course_tag_id),
    tag_name: row.course_tag || "",
    tag_color: row.tag_color || "",
    languages: map_languages(row.language_ids, row.language_names),
    lesson_count: Number(row.lesson_count) || 0,
    quiz_count: Number(row.quiz_count) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at
  };
}

const OPEN_COURSE_SELECT = `
  c.course_id, c.course_code, c.course_name, c.course_tagline, c.course_description, c.created_by_display,
  c.real_world_project_count, c.has_completion_certificate, c.learn_points, c.audience_points,
  c.is_paid, c.fee_amount, c.discount_percent, c.thumbnail_url, c.duration_hours, c.level,
  c.created_at, c.updated_at,
  c.course_domain_id, d.course_domain_name AS course_domain,
  c.course_level_id, lv.course_level_name AS course_level,
  c.course_tag_id, tg.course_tag_name AS course_tag, tg.tag_color AS tag_color,
  (
    SELECT GROUP_CONCAT(cl.course_language_id ORDER BY lang.course_language_name)
    FROM tbl_course_languages cl
    INNER JOIN mst_course_languages lang ON lang.course_language_id = cl.course_language_id
    WHERE cl.course_id = c.course_id AND cl.is_deleted = FALSE
  ) AS language_ids,
  (
    SELECT GROUP_CONCAT(lang.course_language_name ORDER BY lang.course_language_name SEPARATOR '||')
    FROM tbl_course_languages cl
    INNER JOIN mst_course_languages lang ON lang.course_language_id = cl.course_language_id
    WHERE cl.course_id = c.course_id AND cl.is_deleted = FALSE
  ) AS language_names,
  (
    SELECT COUNT(*)
    FROM tbl_course_lessons l
    WHERE l.course_id = c.course_id AND l.is_deleted = FALSE AND l.is_active = TRUE
  ) AS lesson_count,
  (
    SELECT COUNT(*)
    FROM tbl_course_quizzes q
    WHERE q.course_id = c.course_id AND q.is_deleted = FALSE AND q.is_active = TRUE
  ) AS quiz_count
`;

const OPEN_COURSE_JOINS = `
  LEFT JOIN mst_course_domains d ON d.course_domain_id = c.course_domain_id
  LEFT JOIN mst_course_levels lv ON lv.course_level_id = c.course_level_id
  LEFT JOIN mst_course_tags tg ON tg.course_tag_id = c.course_tag_id
`;

async function active_options(pool, table, id_column, name_column) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${id_column} AS id, ${name_column} AS name
     FROM ${table}
     WHERE is_deleted = FALSE AND is_active = TRUE
     ORDER BY ${name_column} ASC`
  );
  return (rows || []).map((row) => ({ id: Number(row.id), name: row.name }));
}

export async function list_open_courses() {
  await ensure_course_schema();
  await ensure_content_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${OPEN_COURSE_SELECT}
     FROM tbl_courses c
     ${OPEN_COURSE_JOINS}
     WHERE c.is_deleted = FALSE AND c.is_active = TRUE AND c.is_open = TRUE
     ORDER BY c.created_at DESC, c.course_name ASC`
  );
  const [domains, levels, languages, tags] = await Promise.all([
    active_options(pool, "mst_course_domains", "course_domain_id", "course_domain_name"),
    active_options(pool, "mst_course_levels", "course_level_id", "course_level_name"),
    active_options(pool, "mst_course_languages", "course_language_id", "course_language_name"),
    active_options(pool, "mst_course_tags", "course_tag_id", "course_tag_name")
  ]);
  log.pass("list_open_courses", `${(rows || []).length} open courses`);
  return {
    courses: (rows || []).map(map_open_course),
    domains,
    levels,
    languages,
    tags
  };
}

async function course_curriculum(pool, course_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT m.module_id, m.module_title, m.sequence_no,
            l.lesson_id, l.lesson_title, l.duration_minutes, l.sequence_no AS lesson_no
     FROM tbl_course_modules m
     LEFT JOIN tbl_course_lessons l
       ON l.module_id = m.module_id AND l.course_id = m.course_id
      AND l.is_deleted = FALSE AND l.is_active = TRUE
     WHERE m.course_id = ? AND m.is_deleted = FALSE AND m.is_active = TRUE
     ORDER BY m.sequence_no ASC, l.sequence_no ASC`,
    [course_id]
  );
  const sections = [];
  const index = new Map();
  for (const row of rows || []) {
    let section = index.get(row.module_id);
    if (!section) {
      section = { title: row.module_title, lessons: [] };
      index.set(row.module_id, section);
      sections.push(section);
    }
    if (row.lesson_id) {
      section.lessons.push({
        title: row.lesson_title,
        minutes: row.duration_minutes == null ? null : Number(row.duration_minutes)
      });
    }
  }
  return sections.map((section) => {
    const minutes = section.lessons.reduce((sum, lesson) => sum + (lesson.minutes || 0), 0);
    const lesson_label = `${section.lessons.length} lesson${section.lessons.length === 1 ? "" : "s"}`;
    const time_label = minutes ? ` · ${minutes} min` : "";
    return {
      title: section.title,
      meta: `${lesson_label}${time_label}`,
      lessons: section.lessons
    };
  });
}

function code_from_slug(slug) {
  const text = String(slug || "").trim().toLowerCase();
  const domain_code = text.match(/(dp-[a-z]{1,5}-\d{1,5})$/);
  if (domain_code) return domain_code[1];
  const stamp_code = text.match(/(crs-[a-z0-9-]+)$/);
  return stamp_code ? stamp_code[1] : text;
}

export async function get_open_course(course_ref) {
  await ensure_course_schema();
  await ensure_content_schema();
  const pool = get_pool();
  const text = String(course_ref || "").trim();
  const numeric = /^\d+$/.test(text) ? Number(text) : 0;
  const code = code_from_slug(text);
  const [rows] = await sqlQuery(
    pool,
    `SELECT ${OPEN_COURSE_SELECT}
     FROM tbl_courses c
     ${OPEN_COURSE_JOINS}
     WHERE c.is_deleted = FALSE AND c.is_active = TRUE AND c.is_open = TRUE
       AND ((? > 0 AND c.course_id = ?) OR LOWER(c.course_code) = ?)
     LIMIT 1`,
    [numeric, numeric, code]
  );
  const row = rows?.[0];
  if (!row) {
    const error = new Error("Course not found");
    error.status = 404;
    throw error;
  }
  const course = map_open_course(row);
  course.curriculum = await course_curriculum(pool, course.course_id);
  const [related_rows] = await sqlQuery(
    pool,
    `SELECT ${OPEN_COURSE_SELECT}
     FROM tbl_courses c
     ${OPEN_COURSE_JOINS}
     WHERE c.is_deleted = FALSE AND c.is_active = TRUE AND c.is_open = TRUE
       AND c.course_id <> ?
     ORDER BY c.created_at DESC
     LIMIT 4`,
    [course.course_id]
  );
  course.related = (related_rows || []).map(map_open_course);
  log.pass("get_open_course", String(course.course_id));
  return { course };
}
