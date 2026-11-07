import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { ai_backend_url } from "../utils/ai_backend.js";
import { get_pool } from "../utils/db_setup.js";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

let schema_ready = null;

export function ensure_jobs_schema() {
  if (!schema_ready) {
    schema_ready = sqlQuery(
      get_pool(),
      `CREATE TABLE IF NOT EXISTS tbl_jobs (
         job_id BIGINT NOT NULL AUTO_INCREMENT,
         job_title VARCHAR(150) NOT NULL,
         company_name VARCHAR(150) NULL,
         location VARCHAR(120) NULL,
         company_website VARCHAR(500) NULL,
         job_description TEXT NOT NULL,
         is_active BOOLEAN NOT NULL DEFAULT TRUE,
         is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NULL,
         PRIMARY KEY (job_id)
       )`
    ).then(() => sqlQuery(
      get_pool(),
      "ALTER TABLE tbl_jobs ADD COLUMN company_website VARCHAR(500) NULL"
    ).catch((err) => {
      if (!/duplicate column/i.test(String(err?.message || err?.sqlMessage || ""))) throw err;
    })).then(() => sqlQuery(
      get_pool(),
      `CREATE TABLE IF NOT EXISTS tbl_job_fresher_quizzes (
         fresher_quiz_id BIGINT NOT NULL AUTO_INCREMENT,
         job_id BIGINT NOT NULL,
         difficulty VARCHAR(20) NOT NULL,
         question_count INT NOT NULL DEFAULT 0,
         is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NULL,
         PRIMARY KEY (fresher_quiz_id),
         KEY idx_job_fresher_job (job_id)
       )`
    )).then(() => sqlQuery(
      get_pool(),
      `CREATE TABLE IF NOT EXISTS tbl_job_fresher_questions (
         question_id BIGINT NOT NULL AUTO_INCREMENT,
         fresher_quiz_id BIGINT NOT NULL,
         job_id BIGINT NOT NULL,
         section_key VARCHAR(40) NOT NULL,
         question_number INT NOT NULL,
         question_text TEXT NOT NULL,
         options_json JSON NOT NULL,
         correct_answer TEXT NOT NULL,
         explanation TEXT NULL,
         difficulty VARCHAR(20) NULL,
         is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NULL,
         PRIMARY KEY (question_id),
         KEY idx_job_fresher_quiz (fresher_quiz_id),
         KEY idx_job_fresher_question_job (job_id)
       )`
    )).then(() => sqlQuery(
      get_pool(),
      `CREATE TABLE IF NOT EXISTS tbl_student_fresher_attempts (
         attempt_id BIGINT NOT NULL AUTO_INCREMENT,
         student_id VARCHAR(20) NOT NULL,
         job_id BIGINT NOT NULL,
         fresher_quiz_id BIGINT NOT NULL,
         status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
         score INT NOT NULL DEFAULT 0,
         total INT NOT NULL DEFAULT 0,
         answers_json JSON NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NULL,
         PRIMARY KEY (attempt_id),
         KEY idx_student_fresher_attempt (student_id, job_id),
         KEY idx_student_fresher_status (student_id, status)
       )`
    )).then(() => sqlQuery(
      get_pool(),
      "ALTER TABLE tbl_student_fresher_attempts ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'in_progress'"
    ).catch((err) => {
      if (!/duplicate column/i.test(String(err?.message || err?.sqlMessage || ""))) throw err;
    }    )).then(() => sqlQuery(
      get_pool(),
      "ALTER TABLE tbl_student_fresher_attempts ADD COLUMN updated_at DATETIME NULL"
    ).catch((err) => {
      if (!/duplicate column/i.test(String(err?.message || err?.sqlMessage || ""))) throw err;
    })).then(() => sqlQuery(
      get_pool(),
      "ALTER TABLE tbl_student_fresher_attempts ADD COLUMN experience_level VARCHAR(30) NULL"
    ).catch((err) => {
      if (!/duplicate column/i.test(String(err?.message || err?.sqlMessage || ""))) throw err;
    })).then(() => sqlQuery(
      get_pool(),
      "ALTER TABLE tbl_student_fresher_attempts ADD COLUMN interview_language VARCHAR(20) NULL"
    ).catch((err) => {
      if (!/duplicate column/i.test(String(err?.message || err?.sqlMessage || ""))) throw err;
    })).catch((err) => {
      schema_ready = null;
      throw err;
    });
  }
  return schema_ready;
}

function map_job(row) {
  if (!row) return null;
  return {
    job_id: Number(row.job_id),
    job_title: row.job_title || "",
    company_name: row.company_name || "",
    location: row.location || "",
    company_website: row.company_website || "",
    job_description: row.job_description || "",
    is_active: Boolean(row.is_active),
    has_fresher_quiz: Number(row.has_fresher_quiz) > 0,
    created_at: row.created_at || null
  };
}

function read_job(body = {}) {
  const job_title = String(body.job_title || "").trim();
  const company_name = String(body.company_name || "").trim();
  const location = String(body.location || "").trim();
  const job_description = String(body.job_description || "").trim();
  const company_website = String(body.company_website || "").trim();
  if (!job_title) throw fail("Job title is required");
  if (job_title.length > 150) throw fail("Job title must be 150 characters or less");
  if (company_name.length > 150) throw fail("Company name must be 150 characters or less");
  if (location.length > 120) throw fail("Location must be 120 characters or less");
  if (company_website && !/^https?:\/\//i.test(company_website)) throw fail("Company website must start with http:// or https://");
  if (company_website.length > 500) throw fail("Company website must be 500 characters or less");
  if (!job_description) throw fail("Job description is required");
  if (job_description.length > 12000) throw fail("Job description must be 12000 characters or less");
  return {
    job_title,
    company_name: company_name || null,
    location: location || null,
    company_website: company_website || null,
    job_description,
    is_active: body.is_active !== false && body.is_active !== "false"
  };
}

export async function list_jobs({ active_only = false, latest_first = false } = {}) {
  await ensure_jobs_schema();
  const order = latest_first ? "created_at DESC, job_id DESC" : "job_title ASC, job_id DESC";
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT job_id, job_title, company_name, location, company_website, job_description, is_active, created_at,
            EXISTS (
              SELECT 1 FROM tbl_job_fresher_quizzes q
              WHERE q.job_id = tbl_jobs.job_id AND q.is_deleted = FALSE
            ) AS has_fresher_quiz
     FROM tbl_jobs
     WHERE is_deleted = FALSE ${active_only ? "AND is_active = TRUE" : ""}
     ORDER BY ${order}`
  );
  return (rows || []).map(map_job);
}

export async function get_active_job(job_id) {
  await ensure_jobs_schema();
  const id = Number(job_id);
  if (!Number.isInteger(id) || id < 1) throw fail("Select a job");
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT job_id, job_title, company_name, location, company_website, job_description, is_active, created_at
     FROM tbl_jobs
     WHERE job_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [id]
  );
  if (!rows?.[0]) throw fail("That job is no longer open", 404);
  return map_job(rows[0]);
}

async function get_job(job_id) {
  const id = Number(job_id);
  if (!Number.isInteger(id) || id < 1) throw fail("Job was not found", 404);
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT job_id, job_title, company_name, location, company_website, job_description, is_active, created_at
     FROM tbl_jobs
     WHERE job_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  if (!rows?.[0]) throw fail("Job was not found", 404);
  return map_job(rows[0]);
}

export async function create_job(body) {
  await ensure_jobs_schema();
  const data = read_job(body);
  const [result] = await sqlQuery(
    get_pool(),
    `INSERT INTO tbl_jobs (job_title, company_name, location, company_website, job_description, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.job_title, data.company_name, data.location, data.company_website, data.job_description, data.is_active]
  );
  log.pass("createJob", `created job ${result.insertId}`);
  return get_job(result.insertId);
}

export async function update_job(job_id, body) {
  await ensure_jobs_schema();
  await get_job(job_id);
  const data = read_job(body);
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_jobs
     SET job_title = ?, company_name = ?, location = ?, company_website = ?, job_description = ?, is_active = ?, updated_at = NOW()
     WHERE job_id = ? AND is_deleted = FALSE`,
    [data.job_title, data.company_name, data.location, data.company_website, data.job_description, data.is_active, Number(job_id)]
  );
  log.pass("updateJob", `updated job ${job_id}`);
  return get_job(job_id);
}

export async function delete_job(job_id) {
  await ensure_jobs_schema();
  await get_job(job_id);
  const id = Number(job_id);
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_job_fresher_questions SET is_deleted = TRUE, updated_at = NOW()
     WHERE job_id = ? AND is_deleted = FALSE`,
    [id]
  );
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_job_fresher_quizzes SET is_deleted = TRUE, updated_at = NOW()
     WHERE job_id = ? AND is_deleted = FALSE`,
    [id]
  );
  await sqlQuery(
    get_pool(),
    `UPDATE tbl_jobs SET is_deleted = TRUE, is_active = FALSE, updated_at = NOW()
     WHERE job_id = ?`,
    [id]
  );
  log.pass("deleteJob", `deleted job ${job_id}`);
  return { deleted: true };
}

const DATE_POSTED = new Set(["all", "today", "3days", "week", "month"]);
const EMPLOYMENT_TYPES = new Set(["FULLTIME", "PARTTIME", "CONTRACTOR", "INTERN"]);

function clip(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function search_query(body = {}) {
  const keyword = String(body.keyword || "").trim();
  const country = String(body.country || "in").trim().toLowerCase();
  const location = String(body.location || "").trim();
  const date_posted = String(body.date_posted || "week").trim();
  const employment_types = String(body.employment_types || "").trim().toUpperCase();
  const job_requirements = String(body.job_requirements || "").trim();
  const language = String(body.language || "en").trim() || "en";
  const radius_raw = body.radius;
  const pages_raw = body.num_pages;
  if (!keyword) throw fail("Keyword is required");
  if (keyword.length > 200) throw fail("Keyword must be 200 characters or less");
  if (!/^[a-z]{2}$/.test(country)) throw fail("Country must be a 2-letter code");
  if (location.length > 120) throw fail("Location must be 120 characters or less");
  if (!DATE_POSTED.has(date_posted)) throw fail("Choose a date posted range");
  if (employment_types && !EMPLOYMENT_TYPES.has(employment_types)) throw fail("Choose a valid employment type");
  if (job_requirements.length > 200) throw fail("Job requirements must be 200 characters or less");
  if (language.length > 12) throw fail("Language must be 12 characters or less");
  let radius = null;
  if (radius_raw !== "" && radius_raw != null) {
    radius = Number(radius_raw);
    if (!Number.isInteger(radius) || radius < 0 || radius > 200) throw fail("Radius must be a whole number from 0 to 200");
  }
  const num_pages = Number(pages_raw || 1);
  if (!Number.isInteger(num_pages) || num_pages < 1 || num_pages > 20) throw fail("Pages must be a whole number from 1 to 20");
  return {
    keyword,
    country,
    location: location || null,
    date_posted,
    remote_only: body.remote_only === true || body.remote_only === "true",
    employment_types: employment_types || null,
    job_requirements: job_requirements || null,
    radius,
    language,
    num_pages,
    cursor: null,
    include_company_website: body.include_company_website !== false && body.include_company_website !== "false"
  };
}

function pair_key(title, company, location, description) {
  const blurb = String(description || "").replace(/\s+/g, " ").trim().slice(0, 80).toLowerCase();
  return [title, company, location, blurb].
    map((part) => String(part || "").trim().toLowerCase()).
    join("\n");
}

export async function import_searched_jobs(body = {}) {
  await ensure_jobs_schema();
  const query = search_query(body);
  let response;
  try {
    response = await fetch(ai_backend_url("/api/jobs/search"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(120000)
    });
  } catch (err) {
    if (err?.status) throw err;
    throw fail("Job search is unavailable right now", 503);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const detail = typeof payload.detail === "string" ? payload.detail : "Job search failed";
    throw fail(detail, response.status || 502);
  }
  const found = Array.isArray(payload.jobs) ? payload.jobs : [];
  const [existing] = await sqlQuery(
    get_pool(),
    `SELECT job_title, company_name, location, LEFT(job_description, 80) AS blurb
     FROM tbl_jobs WHERE is_deleted = FALSE`
  );
  const seen = new Set((existing || []).map((row) => pair_key(row.job_title, row.company_name, row.location, row.blurb)));
  const items = [];
  let skipped = 0;
  for (const job of found) {
    const job_title = clip(job.job_title, 150);
    const company_name = clip(job.employer_name, 150);
    const location = clip(job.job_location, 120);
    let job_description = String(job.job_description || "").replace(/\u0000/g, "").trim();
    if (job_description.length > 12000) job_description = `${job_description.slice(0, 11999).trim()}…`;
    if (!job_description) job_description = "No description was provided.";
    if (!job_title) {
      skipped += 1;
      continue;
    }
    const key = pair_key(job_title, company_name, location, job_description);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    let company_website = String(job.company_website || "").trim();
    if (!/^https?:\/\//i.test(company_website)) company_website = "";
    if (company_website.length > 500) company_website = company_website.slice(0, 500);
    try {
      items.push(await create_job({
        job_title,
        company_name,
        location,
        company_website,
        job_description,
        is_active: true
      }));
    } catch (err) {
      seen.delete(key);
      skipped += 1;
      log.fail("importJobs", err.message || "skipped one listing");
    }
  }
  log.pass("importJobs", `posted ${items.length}, skipped ${skipped}`);
  return { posted: items.length, skipped, items };
}
