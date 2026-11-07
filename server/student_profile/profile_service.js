import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import {
  validateMobile,
  validateOptionalText,
  validatePersonName,
  validateRequiredText } from
"@datapromr/validation";
import { get_pool } from "../utils/db_setup.js";
import { ensure_student_profile_schema } from "../student_authentication/student_auth_service.js";
import { save_student_photo } from "../student_authentication/student_image.js";
import { delete_stored_file, forget_stored_file } from "../utils/storage_buckets.js";
import { validate_email } from "./email.js";
import { student_code } from "../utils/student_code.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function stamp(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function pincode_error(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^\d{6}$/.test(text)) return "Enter a 6_digit pincode";
  return "";
}

function mask_api_key(value) {
  const key = String(value || "").trim();
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${"•".repeat(Math.min(12, key.length - 4))}${key.slice(-4)}`;
}

function map_student(row) {
  const raw_key = String(row.ollama_api_key || "").trim();
  return {
    student_id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    mobile_number: row.mobile_number,
    date_of_birth: stamp(row.date_of_birth),
    college: row.college || "",
    higher_study: row.higher_study || "",
    blood_group: row.blood_group || "",
    address_line: row.address_line || "",
    pincode: row.pincode || "",
    state: row.state || "",
    district: row.district || "",
    profile_photo_url: row.profile_photo_url || "",
    headline: row.headline || "",
    professional_summary: row.professional_summary || "",
    degree: row.degree || "",
    cgpa: row.cgpa || "",
    member_since: row.created_at || null,
    has_ollama_api_key: Boolean(raw_key),
    ollama_api_key_masked: mask_api_key(raw_key),
    ollama_fast_enabled: Boolean(Number(row.ollama_fast_enabled)) && Boolean(raw_key)
  };
}

function profile_dob_error(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return "Enter a valid date of birth";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return "Enter a valid date of birth";
  }
  const latest = new Date();
  latest.setHours(0, 0, 0, 0);
  latest.setFullYear(latest.getFullYear() - 10);
  if (date > latest) return "Date of birth must be at least 10 years before today";
  return "";
}

export function validate_student_profile(body = {}) {
  return {
    first_name: validatePersonName(body.first_name, "First name"),
    last_name: validatePersonName(body.last_name, "Last name"),
    email: validate_email(body.email),
    mobile_number: validateMobile(body.mobile_number),
    date_of_birth: profile_dob_error(body.date_of_birth),
    college: validateRequiredText(body.college, "College", 200),
    higher_study: validateRequiredText(body.higher_study, "Higher study", 200),
    blood_group: validateOptionalText(body.blood_group, "Blood group", 20),
    address_line: validateOptionalText(body.address_line, "Address", 300),
    pincode: pincode_error(body.pincode),
    state: validateOptionalText(body.state, "State", 100),
    district: validateOptionalText(body.district, "District", 100),
    headline: validateOptionalText(body.headline, "Headline", 300),
    professional_summary: validateOptionalText(body.professional_summary, "Professional summary", 4000),
    degree: validateOptionalText(body.degree, "Degree", 200),
    cgpa: validateOptionalText(body.cgpa, "CGPA", 20)
  };
}

async function load_student(pool, code) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT student_id, first_name, last_name, email, mobile_number, date_of_birth,
            college, higher_study, blood_group, address_line, pincode, state, district,
            profile_photo_url, headline, professional_summary, degree, cgpa,
            ollama_api_key, ollama_fast_enabled, created_at
     FROM tbl_students
     WHERE student_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  const row = rows?.[0];
  if (!row) throw fail("Student account was not found", 401);
  return row;
}

async function load_stats(pool, student_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT
       COUNT(*) AS enrolled,
       SUM(CASE WHEN COALESCE(r.learning_status, 'not_started') = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
       SUM(CASE WHEN COALESCE(r.learning_status, 'not_started') = 'completed' THEN 1 ELSE 0 END) AS completed
     FROM tbl_course_registrations r
     WHERE r.student_id = ? AND r.is_deleted = FALSE AND r.status = 'registered'`,
    [student_id]
  );
  const stats = rows?.[0] || {};
  return {
    enrolled: Number(stats.enrolled) || 0,
    in_progress: Number(stats.in_progress) || 0,
    completed: Number(stats.completed) || 0
  };
}

function normalize_link_url(value) {
  let url = String(value || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function link_url_error(value) {
  const url = normalize_link_url(value);
  if (!url) return "Link URL is required";
  if (url.length > 500) return "Link URL is too long";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Enter a valid http or https link";
    }
  } catch {
    return "Enter a valid link URL";
  }
  return "";
}

function clean_student_links(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length > 20) throw fail("You can add up to 20 links");

  const cleaned = [];
  for (const item of list) {
    const link_title = String(item?.link_title || item?.title || "").trim();
    const link_url = normalize_link_url(item?.link_url || item?.url || "");
    if (!link_title && !String(item?.link_url || item?.url || "").trim()) continue;
    if (!link_title) throw fail("Each link needs a title");
    if (link_title.length > 100) throw fail("Link title is too long");
    const url_error = link_url_error(link_url);
    if (url_error) throw fail(url_error);
    cleaned.push({ link_title, link_url });
  }
  return cleaned;
}

async function load_student_links(pool, student_id) {
  try {
    const [rows] = await sqlQuery(
      pool,
      `SELECT link_id, link_title, link_url, sort_order
       FROM tbl_student_links
       WHERE student_id = ?
       ORDER BY sort_order ASC, link_id ASC`,
      [student_id]
    );
    return (rows || []).map((row) => ({
      link_id: row.link_id,
      link_title: row.link_title || "",
      link_url: row.link_url || "",
      sort_order: Number(row.sort_order) || 0
    }));
  } catch (err) {
    if (err?.code === "ER_NO_SUCH_TABLE") return [];
    throw err;
  }
}

async function save_student_links(pool, student_id, links) {
  const cleaned = clean_student_links(links);
  await sqlQuery(pool, `DELETE FROM tbl_student_links WHERE student_id = ?`, [student_id]);
  for (let index = 0; index < cleaned.length; index += 1) {
    const item = cleaned[index];
    await sqlQuery(
      pool,
      `INSERT INTO tbl_student_links (student_id, link_title, link_url, sort_order)
       VALUES (?, ?, ?, ?)`,
      [student_id, item.link_title, item.link_url, index]
    );
  }
  return cleaned;
}

function optional_url_error(value, label = "URL") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const url = normalize_link_url(raw);
  if (url.length > 500) return `${label} is too long`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `Enter a valid http or https ${label.toLowerCase()}`;
    }
  } catch {
    return `Enter a valid ${label.toLowerCase()}`;
  }
  return "";
}

function clean_student_skills(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length > 20) throw fail("You can add up to 20 skill groups");
  const cleaned = [];
  for (const item of list) {
    const skill_category = String(item?.skill_category || item?.category || "").trim();
    const skill_items = String(item?.skill_items || item?.items || "").trim();
    if (!skill_category && !skill_items) continue;
    if (!skill_category) throw fail("Each skill group needs a category");
    if (!skill_items) throw fail("Each skill group needs skills");
    if (skill_category.length > 100) throw fail("Skill category is too long");
    if (skill_items.length > 2000) throw fail("Skill list is too long");
    cleaned.push({ skill_category, skill_items });
  }
  return cleaned;
}

function clean_student_experiences(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length > 20) throw fail("You can add up to 20 experiences");
  const cleaned = [];
  for (const item of list) {
    const company = String(item?.company || "").trim();
    const role_title = String(item?.role_title || item?.role || "").trim();
    const start_label = String(item?.start_label || item?.start || "").trim();
    const end_label = String(item?.end_label || item?.end || "").trim();
    const description = String(item?.description || "").trim();
    if (!company && !role_title && !start_label && !end_label && !description) continue;
    if (!company) throw fail("Each experience needs a company");
    if (!role_title) throw fail("Each experience needs a role");
    if (company.length > 200) throw fail("Company name is too long");
    if (role_title.length > 200) throw fail("Role title is too long");
    if (start_label.length > 50) throw fail("Start date is too long");
    if (end_label.length > 50) throw fail("End date is too long");
    if (description.length > 8000) throw fail("Experience description is too long");
    cleaned.push({ company, role_title, start_label, end_label, description });
  }
  return cleaned;
}

function clean_student_projects(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length > 20) throw fail("You can add up to 20 projects");
  const cleaned = [];
  for (const item of list) {
    const project_name = String(item?.project_name || item?.name || "").trim();
    const role_title = String(item?.role_title || item?.role || "").trim();
    const live_raw = String(item?.live_url || item?.url || "").trim();
    const live_url = live_raw ? normalize_link_url(live_raw) : "";
    const tech_stack = String(item?.tech_stack || item?.tech || "").trim();
    const description = String(item?.description || "").trim();
    if (!project_name && !role_title && !live_raw && !tech_stack && !description) continue;
    if (!project_name) throw fail("Each project needs a name");
    if (project_name.length > 200) throw fail("Project name is too long");
    if (role_title.length > 200) throw fail("Project role is too long");
    const url_error = optional_url_error(live_raw, "Live URL");
    if (url_error) throw fail(url_error);
    if (tech_stack.length > 500) throw fail("Tech stack is too long");
    if (description.length > 8000) throw fail("Project description is too long");
    cleaned.push({ project_name, role_title, live_url, tech_stack, description });
  }
  return cleaned;
}

function clean_student_achievements(raw) {
  const list = Array.isArray(raw) ? raw : [];
  if (list.length > 30) throw fail("You can add up to 30 achievements");
  const cleaned = [];
  for (const item of list) {
    const achievement_text = String(
      typeof item === "string" ? item : item?.achievement_text || item?.text || ""
    ).trim();
    if (!achievement_text) continue;
    if (achievement_text.length > 500) throw fail("Achievement text is too long");
    cleaned.push({ achievement_text });
  }
  return cleaned;
}

async function load_rows_safe(pool, sql, student_id, map_row) {
  try {
    const [rows] = await sqlQuery(pool, sql, [student_id]);
    return (rows || []).map(map_row);
  } catch (err) {
    if (err?.code === "ER_NO_SUCH_TABLE") return [];
    throw err;
  }
}

async function load_student_skills(pool, student_id) {
  return load_rows_safe(
    pool,
    `SELECT skill_id, skill_category, skill_items, sort_order
     FROM tbl_student_skills
     WHERE student_id = ?
     ORDER BY sort_order ASC, skill_id ASC`,
    student_id,
    (row) => ({
      skill_id: row.skill_id,
      skill_category: row.skill_category || "",
      skill_items: row.skill_items || "",
      sort_order: Number(row.sort_order) || 0
    })
  );
}

async function load_student_experiences(pool, student_id) {
  return load_rows_safe(
    pool,
    `SELECT experience_id, company, role_title, start_label, end_label, description, sort_order
     FROM tbl_student_experiences
     WHERE student_id = ?
     ORDER BY sort_order ASC, experience_id ASC`,
    student_id,
    (row) => ({
      experience_id: row.experience_id,
      company: row.company || "",
      role_title: row.role_title || "",
      start_label: row.start_label || "",
      end_label: row.end_label || "",
      description: row.description || "",
      sort_order: Number(row.sort_order) || 0
    })
  );
}

async function load_student_projects(pool, student_id) {
  return load_rows_safe(
    pool,
    `SELECT project_id, project_name, role_title, live_url, tech_stack, description, sort_order
     FROM tbl_student_projects
     WHERE student_id = ?
     ORDER BY sort_order ASC, project_id ASC`,
    student_id,
    (row) => ({
      project_id: row.project_id,
      project_name: row.project_name || "",
      role_title: row.role_title || "",
      live_url: row.live_url || "",
      tech_stack: row.tech_stack || "",
      description: row.description || "",
      sort_order: Number(row.sort_order) || 0
    })
  );
}

async function load_student_achievements(pool, student_id) {
  return load_rows_safe(
    pool,
    `SELECT achievement_id, achievement_text, sort_order
     FROM tbl_student_achievements
     WHERE student_id = ?
     ORDER BY sort_order ASC, achievement_id ASC`,
    student_id,
    (row) => ({
      achievement_id: row.achievement_id,
      achievement_text: row.achievement_text || "",
      sort_order: Number(row.sort_order) || 0
    })
  );
}

async function save_student_skills(pool, student_id, skills) {
  const cleaned = clean_student_skills(skills);
  await sqlQuery(pool, `DELETE FROM tbl_student_skills WHERE student_id = ?`, [student_id]);
  for (let index = 0; index < cleaned.length; index += 1) {
    const item = cleaned[index];
    await sqlQuery(
      pool,
      `INSERT INTO tbl_student_skills (student_id, skill_category, skill_items, sort_order)
       VALUES (?, ?, ?, ?)`,
      [student_id, item.skill_category, item.skill_items, index]
    );
  }
  return cleaned;
}

async function save_student_experiences(pool, student_id, experiences) {
  const cleaned = clean_student_experiences(experiences);
  await sqlQuery(pool, `DELETE FROM tbl_student_experiences WHERE student_id = ?`, [student_id]);
  for (let index = 0; index < cleaned.length; index += 1) {
    const item = cleaned[index];
    await sqlQuery(
      pool,
      `INSERT INTO tbl_student_experiences
         (student_id, company, role_title, start_label, end_label, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        item.company,
        item.role_title,
        item.start_label || null,
        item.end_label || null,
        item.description || null,
        index
      ]
    );
  }
  return cleaned;
}

async function save_student_projects(pool, student_id, projects) {
  const cleaned = clean_student_projects(projects);
  await sqlQuery(pool, `DELETE FROM tbl_student_projects WHERE student_id = ?`, [student_id]);
  for (let index = 0; index < cleaned.length; index += 1) {
    const item = cleaned[index];
    await sqlQuery(
      pool,
      `INSERT INTO tbl_student_projects
         (student_id, project_name, role_title, live_url, tech_stack, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        item.project_name,
        item.role_title || null,
        item.live_url || null,
        item.tech_stack || null,
        item.description || null,
        index
      ]
    );
  }
  return cleaned;
}

async function save_student_achievements(pool, student_id, achievements) {
  const cleaned = clean_student_achievements(achievements);
  await sqlQuery(pool, `DELETE FROM tbl_student_achievements WHERE student_id = ?`, [student_id]);
  for (let index = 0; index < cleaned.length; index += 1) {
    const item = cleaned[index];
    await sqlQuery(
      pool,
      `INSERT INTO tbl_student_achievements (student_id, achievement_text, sort_order)
       VALUES (?, ?, ?)`,
      [student_id, item.achievement_text, index]
    );
  }
  return cleaned;
}

async function profile_payload(pool, student_id) {
  const student = map_student(await load_student(pool, student_id));
  const stats = await load_stats(pool, student_id);
  const links = await load_student_links(pool, student_id);
  const skills = await load_student_skills(pool, student_id);
  const experiences = await load_student_experiences(pool, student_id);
  const projects = await load_student_projects(pool, student_id);
  const achievements = await load_student_achievements(pool, student_id);
  return { student, stats, links, skills, experiences, projects, achievements };
}

export async function get_student_profile(user) {
  await ensure_student_profile_schema();
  const pool = get_pool();
  const code = student_code(user);
  const payload = await profile_payload(pool, code);
  log.pass("getStudentProfile", `${code} opened profile`);
  return payload;
}

export async function get_student_ollama_api_key(user) {
  if (!user?.sub) return "";
  if (user.role && user.role !== "student") return "";
  await ensure_student_profile_schema();
  const pool = get_pool();
  const code = student_code(user);
  const [rows] = await sqlQuery(
    pool,
    `SELECT ollama_api_key FROM tbl_students
     WHERE student_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  return String(rows?.[0]?.ollama_api_key || "").trim();
}

export async function has_student_ollama_api_key(user) {
  await ensure_student_profile_schema();
  const pool = get_pool();
  const code = student_code(user);
  const [rows] = await sqlQuery(
    pool,
    `SELECT ollama_api_key, ollama_fast_enabled FROM tbl_students
     WHERE student_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  const row = rows?.[0] || {};
  const has_key = Boolean(String(row.ollama_api_key || "").trim());
  return {
    has_ollama_api_key: has_key,
    ollama_fast_enabled: has_key && Boolean(Number(row.ollama_fast_enabled))
  };
}

export async function update_student_ollama_api_key(user, body = {}) {
  await ensure_student_profile_schema();
  const pool = get_pool();
  const code = student_code(user);
  await load_student(pool, code);

  if (!Object.prototype.hasOwnProperty.call(body, "ollama_api_key")) {
    throw fail("Ollama API key is required");
  }

  const key = String(body.ollama_api_key || "").trim();
  if (key && key.length < 8) throw fail("Enter a valid Ollama API key");
  if (key.length > 500) throw fail("Ollama API key is too long");

  if (!key) {
    await sqlQuery(
      pool,
      `UPDATE tbl_students
       SET ollama_api_key = NULL,
           ollama_fast_enabled = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = ? AND is_deleted = FALSE`,
      [code]
    );
  } else {
    await sqlQuery(
      pool,
      `UPDATE tbl_students
       SET ollama_api_key = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = ? AND is_deleted = FALSE`,
      [key, code]
    );
  }

  log.pass("updateStudentOllamaApiKey", key ? `saved for ${code}` : `cleared for ${code}`);
  return profile_payload(pool, code);
}

export async function update_student_ollama_fast_enabled(user, body = {}) {
  await ensure_student_profile_schema();
  const pool = get_pool();
  const code = student_code(user);
  const row = await load_student(pool, code);
  const has_key = Boolean(String(row.ollama_api_key || "").trim());
  const enabled = Boolean(body.ollama_fast_enabled);

  if (enabled && !has_key) {
    throw fail("Add your Ollama API key before enabling Fast Mentoring");
  }

  await sqlQuery(
    pool,
    `UPDATE tbl_students
     SET ollama_fast_enabled = ?, updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND is_deleted = FALSE`,
    [enabled ? 1 : 0, code]
  );

  log.pass(
    "updateStudentOllamaFastEnabled",
    `${enabled ? "enabled" : "disabled"} for ${code}`
  );
  return has_student_ollama_api_key(user);
}

export async function update_student_profile(user, body = {}) {
  await ensure_student_profile_schema();
  const errors = validate_student_profile(body);
  const first_error = Object.values(errors).find(Boolean);
  if (first_error) throw fail(first_error);

  const pool = get_pool();
  const code = student_code(user);
  await load_student(pool, code);

  const mobile = String(body.mobile_number).trim();
  const email = String(body.email).trim().toLowerCase();
  const [taken] = await sqlQuery(
    pool,
    `SELECT student_id FROM tbl_students
     WHERE mobile_number = ? AND student_id <> ? AND is_deleted = FALSE
     LIMIT 1`,
    [mobile, code]
  );
  if (taken?.[0]) throw fail("This mobile number is already registered", 409);

  const [email_taken] = await sqlQuery(
    pool,
    `SELECT student_id FROM tbl_students
     WHERE email = ? AND student_id <> ? AND is_deleted = FALSE
     LIMIT 1`,
    [email, code]
  );
  if (email_taken?.[0]) throw fail("This email is already registered", 409);

  await sqlQuery(
    pool,
    `UPDATE tbl_students
     SET first_name = ?, last_name = ?, email = ?, mobile_number = ?, date_of_birth = ?,
         college = ?, higher_study = ?, blood_group = ?, address_line = ?,
         pincode = ?, state = ?, district = ?,
         headline = ?, professional_summary = ?, degree = ?, cgpa = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND is_deleted = FALSE`,
    [
    String(body.first_name).trim(),
    String(body.last_name).trim(),
    email,
    mobile,
    String(body.date_of_birth || "").trim() || null,
    String(body.college).trim(),
    String(body.higher_study).trim(),
    String(body.blood_group || "").trim() || null,
    String(body.address_line || "").trim() || null,
    String(body.pincode || "").trim() || null,
    String(body.state || "").trim() || null,
    String(body.district || "").trim() || null,
    String(body.headline || "").trim() || null,
    String(body.professional_summary || "").trim() || null,
    String(body.degree || "").trim() || null,
    String(body.cgpa || "").trim() || null,
    code]

  );

  if (Object.prototype.hasOwnProperty.call(body, "ollama_api_key")) {
    const key = String(body.ollama_api_key || "").trim();
    if (key && key.length < 8) throw fail("Enter a valid Ollama API key");
    if (key.length > 500) throw fail("Ollama API key is too long");
    await sqlQuery(
      pool,
      `UPDATE tbl_students
       SET ollama_api_key = ?, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = ? AND is_deleted = FALSE`,
      [key || null, code]
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, "links")) {
    await save_student_links(pool, code, body.links);
  }
  if (Object.prototype.hasOwnProperty.call(body, "skills")) {
    await save_student_skills(pool, code, body.skills);
  }
  if (Object.prototype.hasOwnProperty.call(body, "experiences")) {
    await save_student_experiences(pool, code, body.experiences);
  }
  if (Object.prototype.hasOwnProperty.call(body, "projects")) {
    await save_student_projects(pool, code, body.projects);
  }
  if (Object.prototype.hasOwnProperty.call(body, "achievements")) {
    await save_student_achievements(pool, code, body.achievements);
  }

  log.pass("updateStudentProfile", `updated ${code}`);
  return profile_payload(pool, code);
}

export async function update_student_photo(user, file) {
  await ensure_student_profile_schema();
  if (!file?.buffer) throw fail("Choose a photo to upload");

  const pool = get_pool();
  const code = student_code(user);
  const current = await load_student(pool, code);
  const previous = current.profile_photo_url || "";
  const profile_photo_url = await save_student_photo(code, file);
  if (!profile_photo_url) throw fail("Upload failed because no storage bucket is available", 503);

  await sqlQuery(
    pool,
    `UPDATE tbl_students SET profile_photo_url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND is_deleted = FALSE`,
    [profile_photo_url, code]
  );
  if (previous && previous !== profile_photo_url) await forget_stored_file(previous);

  log.pass("updateStudentPhoto", `photo updated for ${code}`);
  return profile_payload(pool, code);
}

export async function delete_student_photo(user) {
  await ensure_student_profile_schema();
  const pool = get_pool();
  const code = student_code(user);
  const current = await load_student(pool, code);
  const previous = current.profile_photo_url || "";
  if (previous) await delete_stored_file(previous);
  await sqlQuery(
    pool,
    `UPDATE tbl_students SET profile_photo_url = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ? AND is_deleted = FALSE`,
    [code]
  );
  log.pass("deleteStudentPhoto", `removed photo for ${code}`);
  return profile_payload(pool, code);
}
