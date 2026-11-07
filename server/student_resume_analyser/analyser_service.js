import path from "node:path";
import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { ensure_student_profile_schema } from "../student_authentication/student_auth_service.js";
import { get_pool } from "../utils/db_setup.js";
import { STORAGE_BUCKETS, upload_to_bucket } from "../utils/storage_buckets.js";
import { student_code } from "../utils/student_code.js";

const ALLOWED_EXT = new Set([".pdf", ".docx", ".pptx", ".txt"]);

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function as_list(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

function read_json(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

let schema_ready = null;

async function ensure_schema() {
  if (!schema_ready) {
    schema_ready = sqlQuery(
      get_pool(),
      `CREATE TABLE IF NOT EXISTS tbl_student_resume_analysis (
         analysis_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         student_id VARCHAR(20) NOT NULL,
         file_name VARCHAR(255) NOT NULL,
         analysis_json JSON NOT NULL,
         overall_score DECIMAL(5,1) NULL,
         resume_url VARCHAR(500) NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (analysis_id),
         KEY idx_resume_analysis_student (student_id, analysis_id)
       )`
    ).catch((err) => {
      schema_ready = null;
      throw err;
    });
  }
  await schema_ready;
}

function map_row(row) {
  if (!row) return null;
  return {
    analysis_id: Number(row.analysis_id),
    file_name: row.file_name || "",
    analysis: read_json(row.analysis_json),
    overall_score: row.overall_score == null ? null : Number(row.overall_score),
    resume_url: row.resume_url || "",
    created_at: row.created_at || null
  };
}

function ai_base() {
  return String(process.env.AI_BACKEND || "http://localhost:8000").replace(/\/+$/, "");
}

function check_file(file) {
  if (!file?.buffer?.length) throw fail("Choose a resume file");
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) throw fail("Use a PDF, DOCX, PPTX, or TXT resume");
  return ext;
}

async function call_analyzer(file) {
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || "application/octet-stream" });
  form.append("file", blob, path.basename(file.originalname || "resume.pdf"));
  let response;
  try {
    response = await fetch(`${ai_base()}/api/resume/analyze`, { method: "POST", body: form });
  } catch {
    throw fail("Resume analysis is unavailable right now", 503);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const detail = payload.detail || payload.error || payload.message;
    const message = typeof detail === "string" ? detail : "Resume analysis failed";
    throw fail(message, response.status || 502);
  }
  if (!payload.analysis || typeof payload.analysis !== "object") {
    throw fail("Resume analysis did not return a result", 502);
  }
  return {
    file_name: String(payload.filename || file.originalname || "resume").slice(0, 255),
    analysis: payload.analysis
  };
}

export async function get_latest_resume_analysis(user) {
  await ensure_schema();
  const code = student_code(user);
  const [rows] = await sqlQuery(
    get_pool(),
    `SELECT analysis_id, file_name, analysis_json, overall_score, resume_url, created_at
     FROM tbl_student_resume_analysis
     WHERE student_id = ?
     ORDER BY analysis_id DESC
     LIMIT 1`,
    [code]
  );
  return { item: map_row(rows?.[0]) };
}

export async function analyze_student_resume(user, file) {
  await ensure_schema();
  check_file(file);
  const code = student_code(user);
  const result = await call_analyzer(file);
  const score = Number(result.analysis.overall_score);
  const [insert] = await sqlQuery(
    get_pool(),
    `INSERT INTO tbl_student_resume_analysis
       (student_id, file_name, analysis_json, overall_score)
     VALUES (?, ?, CAST(? AS JSON), ?)`,
    [
      code,
      result.file_name,
      JSON.stringify(result.analysis),
      Number.isFinite(score) ? score : null
    ]
  );
  log.pass("analyze_student_resume", `saved analysis ${insert.insertId} for ${code}`);
  return {
    item: {
      analysis_id: Number(insert.insertId),
      file_name: result.file_name,
      analysis: result.analysis,
      overall_score: Number.isFinite(score) ? score : null,
      resume_url: "",
      created_at: new Date().toISOString()
    }
  };
}

function profile_patch(analysis) {
  const education = as_list(analysis.education)[0] || "";
  const cgpa_match = education.match(/CGPA:\s*([0-9.]+)/i);
  const role = clip(analysis.current_or_recent_role, 300);
  const parts = role.split(/\s+[–—-]\s+/).map((part) => part.trim()).filter(Boolean);
  const skills = [];
  const key_skills = clip(as_list(analysis.skills).join(", "), 2000);
  const technical = clip(as_list(analysis.technical_skills).join(", "), 2000);
  const soft = clip(as_list(analysis.soft_skills).join(", "), 2000);
  if (key_skills) skills.push({ skill_category: "Key Skills", skill_items: key_skills });
  if (technical) skills.push({ skill_category: "Technical Skills", skill_items: technical });
  if (soft) skills.push({ skill_category: "Soft Skills", skill_items: soft });
  return {
    headline: role,
    professional_summary: clip(analysis.professional_summary, 4000),
    degree: clip(education, 200),
    cgpa: cgpa_match ? clip(cgpa_match[1], 20) : "",
    skills,
    experience: role
      ? {
          company: clip(parts.length > 1 ? parts.slice(1).join(" – ") : "Recent role", 200),
          role_title: clip(parts[0] || role, 200),
          description: clip(analysis.total_experience, 8000)
        }
      : null,
    projects: as_list(analysis.projects).slice(0, 20).map((name) => clip(name, 200)).filter(Boolean),
    achievements: as_list(analysis.certifications).slice(0, 30).map((text) => clip(text, 500)).filter(Boolean)
  };
}

async function replace_skills(pool, student_id, skills) {
  await sqlQuery(pool, `DELETE FROM tbl_student_skills WHERE student_id = ?`, [student_id]);
  for (let index = 0; index < skills.length; index += 1) {
    const item = skills[index];
    await sqlQuery(
      pool,
      `INSERT INTO tbl_student_skills (student_id, skill_category, skill_items, sort_order)
       VALUES (?, ?, ?, ?)`,
      [student_id, item.skill_category, item.skill_items, index]
    );
  }
}

async function replace_experience(pool, student_id, experience) {
  await sqlQuery(pool, `DELETE FROM tbl_student_experiences WHERE student_id = ?`, [student_id]);
  if (!experience) return;
  await sqlQuery(
    pool,
    `INSERT INTO tbl_student_experiences
       (student_id, company, role_title, start_label, end_label, description, sort_order)
     VALUES (?, ?, ?, '', '', ?, 0)`,
    [student_id, experience.company, experience.role_title, experience.description]
  );
}

async function replace_projects(pool, student_id, projects) {
  await sqlQuery(pool, `DELETE FROM tbl_student_projects WHERE student_id = ?`, [student_id]);
  for (let index = 0; index < projects.length; index += 1) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_student_projects
         (student_id, project_name, role_title, live_url, tech_stack, description, sort_order)
       VALUES (?, ?, '', '', '', '', ?)`,
      [student_id, projects[index], index]
    );
  }
}

async function replace_achievements(pool, student_id, achievements) {
  await sqlQuery(pool, `DELETE FROM tbl_student_achievements WHERE student_id = ?`, [student_id]);
  for (let index = 0; index < achievements.length; index += 1) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_student_achievements (student_id, achievement_text, sort_order)
       VALUES (?, ?, ?)`,
      [student_id, achievements[index], index]
    );
  }
}

async function save_resume_link(pool, student_id, resume_url) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT link_id FROM tbl_student_links
     WHERE student_id = ? AND link_title = 'Resume'
     ORDER BY link_id ASC
     LIMIT 1`,
    [student_id]
  );
  if (rows?.[0]) {
    await sqlQuery(
      pool,
      `UPDATE tbl_student_links SET link_url = ? WHERE link_id = ? AND student_id = ?`,
      [resume_url, rows[0].link_id, student_id]
    );
    return;
  }
  const [count_rows] = await sqlQuery(
    pool,
    `SELECT COUNT(*) AS total, COALESCE(MAX(sort_order), -1) AS last_sort
     FROM tbl_student_links WHERE student_id = ?`,
    [student_id]
  );
  if (Number(count_rows?.[0]?.total) >= 20) return;
  const sort_order = Number(count_rows?.[0]?.last_sort ?? -1) + 1;
  await sqlQuery(
    pool,
    `INSERT INTO tbl_student_links (student_id, link_title, link_url, sort_order)
     VALUES (?, 'Resume', ?, ?)`,
    [student_id, resume_url, sort_order]
  );
}

export async function save_resume_to_profile(user, analysis_id, file) {
  await ensure_schema();
  await ensure_student_profile_schema();
  const ext = check_file(file);
  const code = student_code(user);
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT analysis_id, analysis_json
     FROM tbl_student_resume_analysis
     WHERE analysis_id = ? AND student_id = ?
     LIMIT 1`,
    [analysis_id, code]
  );
  const row = rows?.[0];
  if (!row) throw fail("Resume analysis was not found", 404);
  const analysis = read_json(row.analysis_json);
  if (!analysis) throw fail("Resume analysis was not found", 404);

  const object_path = `resumes/${code}-${Date.now()}${ext}`;
  const resume_url = await upload_to_bucket(
    STORAGE_BUCKETS.STUDENTS,
    object_path,
    file.buffer,
    file.mimetype || "application/octet-stream"
  );
  const patch = profile_patch(analysis);
  const sets = [];
  const params = [];
  if (patch.headline) {
    sets.push("headline = ?");
    params.push(patch.headline);
  }
  if (patch.professional_summary) {
    sets.push("professional_summary = ?");
    params.push(patch.professional_summary);
  }
  if (patch.degree) {
    sets.push("degree = ?");
    params.push(patch.degree);
  }
  if (patch.cgpa) {
    sets.push("cgpa = ?");
    params.push(patch.cgpa);
  }
  if (sets.length) {
    params.push(code);
    await sqlQuery(
      pool,
      `UPDATE tbl_students
       SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = ? AND is_deleted = FALSE`,
      params
    );
  }
  if (patch.skills.length) await replace_skills(pool, code, patch.skills);
  if (patch.experience) await replace_experience(pool, code, patch.experience);
  if (patch.projects.length) await replace_projects(pool, code, patch.projects);
  if (patch.achievements.length) await replace_achievements(pool, code, patch.achievements);
  await save_resume_link(pool, code, resume_url);
  await sqlQuery(
    pool,
    `UPDATE tbl_student_resume_analysis SET resume_url = ? WHERE analysis_id = ? AND student_id = ?`,
    [resume_url, analysis_id, code]
  );
  log.pass("save_resume_to_profile", `saved resume for ${code}`);
  return { resume_url, saved: true };
}
