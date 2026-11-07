import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sqlQuery } from "@datapromr/auth/server";
import { log } from "@datapromr/log";
import { ai_backend_url } from "../utils/ai_backend.js";
import { ask_code_help, coding_cases, compiler_language, grade_code, public_grade, starter_code } from "../utils/coding_compiler.js";
import { get_pool } from "../utils/db_setup.js";
import { student_code } from "../utils/student_code.js";
import { list_certificates, render_issued_certificate } from "../certificate_manager/certificate_service.js";
import { ensure_certificate_schema } from "../certificate_manager/schema.js";
import { ensure_hackathon_schema } from "./schema.js";

const TYPE_ORDER = ["mcq", "coding", "project"];
const TYPES = new Set(TYPE_ORDER);

function parse_types(value) {
  const found = new Set(String(value || "").split(",").map((part) => part.trim()).filter((part) => TYPES.has(part)));
  return TYPE_ORDER.filter((part) => found.has(part));
}

function resolve_kind(item, types) {
  const kind = String(item?.item_type || "").trim();
  if (TYPES.has(kind)) return kind;
  return types.length === 1 ? types[0] : "";
}
const AUDIENCES = new Set(["program", "open"]);
const DIFFICULTY_KEYS = ["easy", "medium", "hard"];
const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function as_int(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function answered_text(value) {
  return Boolean(String(value || "").trim());
}

function project_submitted(answer) {
  const parsed = read_stored_project(answer);
  return Boolean(parsed.github_url || parsed.repo_url || parsed.demo_url || parsed.documentation_url || parsed.file_name);
}

function item_submitted(item, answer) {
  if (item.item_type === "project") return project_submitted(answer);
  if (item.item_type === "coding") return Boolean(String(coding_payload(answer).student_code || "").trim());
  return answered_text(answer);
}

function hackathon_progress(items, answers_by_item, required_submissions) {
  const list = items || [];
  const projects = list.filter((item) => item.item_type === "project");
  const required = projects.length ? Math.min(projects.length, Math.max(1, Number(required_submissions) || 1)) : 0;
  const goal = list.length - projects.length + required;
  let answered = 0;
  let answered_projects = 0;
  for (const item of list) {
    if (!item_submitted(item, answers_by_item.get(item.item_id))) continue;
    if (item.item_type === "project") answered_projects += 1;
    else answered += 1;
  }
  const done = answered + Math.min(answered_projects, required);
  return { goal_count: goal, done_count: done, complete: goal > 0 && done >= goal };
}

async function resolve_certificate_id(certificate_id) {
  await ensure_certificate_schema();
  const listed = await list_certificates();
  const items = listed.items || [];
  const id = as_int(certificate_id);
  if (id && items.some((item) => item.certificate_id === id)) return id;
  if (items[0]?.certificate_id) return items[0].certificate_id;
  throw fail("No certificate template is available", 400);
}

async function require_certificate(certificate_id) {
  const id = as_int(certificate_id);
  if (!id) throw fail("Choose a certificate template");
  await ensure_certificate_schema();
  const listed = await list_certificates();
  if (!(listed.items || []).some((item) => item.certificate_id === id)) {
    throw fail("Choose a certificate template that exists");
  }
  return id;
}

function certificate_file_name(title) {
  const stem = String(title || "certificate").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return `${stem || "certificate"}-certificate.png`;
}

function read_json(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sql_datetime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!match) return null;
  return `${match[1]} ${match[2]}:00`;
}

function split_count(count, keys) {
  const mix = Object.fromEntries(keys.map((key) => [key, 0]));
  for (let index = 0; index < count; index += 1) mix[keys[index % keys.length]] += 1;
  return mix;
}

function mix_or_split(value, keys, count) {
  if (!value || typeof value !== "object") return split_count(count, keys);
  const mix = {};
  let total = 0;
  for (const key of keys) {
    const amount = Number(value[key]);
    if (!Number.isInteger(amount) || amount < 0) return null;
    mix[key] = amount;
    total += amount;
  }
  return total === count ? mix : null;
}

function map_item(row, hackathon_type) {
  const body = read_json(row.body_json, {});
  const kind = resolve_kind(body, parse_types(hackathon_type)) || "mcq";
  const base = {
    item_id: Number(row.item_id),
    item_type: kind,
    title: row.title || "",
    marks: Number(row.marks) || 1
  };
  if (kind === "mcq") {
    const options = Array.isArray(body.options) ? body.options.map((item) => String(item || "")) : ["", "", "", ""];
    while (options.length < 4) options.push("");
    return {
      ...base,
      question_text: body.question_text || row.title || "",
      options: options.slice(0, 6),
      correct_answer: body.correct_answer || "",
      explanation: body.explanation || ""
    };
  }
  if (kind === "coding") {
    return {
      ...base,
      prompt: body.prompt || "",
      programming_language_id: body.programming_language_id || "",
      language: body.language || "",
      description: body.description || "",
      function_name: body.function_name || "",
      reference_code: body.reference_code || "",
      validation_status: body.validation_status || "",
      validation_errors: body.validation_errors || [],
      test_cases: coding_cases(body.test_cases)
    };
  }
  const deliverables = body.deliverables && typeof body.deliverables === "object" ? body.deliverables : {};
  return {
    ...base,
    description: body.overview || body.description || "",
    overview: body.overview || body.description || "",
    objectives: Array.isArray(body.objectives) ? body.objectives : [],
    features: Array.isArray(body.features) ? body.features : [],
    team_size: body.team_size || "",
    technology: body.technology || "",
    project_duration: body.project_duration || "",
    submission_type: body.submission_type || "",
    deliverables: {
      source_code: deliverables.source_code !== false,
      project_report: Boolean(deliverables.project_report),
      demo_video: Boolean(deliverables.demo_video),
      presentation: Boolean(deliverables.presentation)
    }
  };
}

function item_title(item, hackathon_type, index) {
  const title = String(item.title || "").trim();
  if (title) return title.slice(0, 200);
  if (hackathon_type === "mcq") {
    const text = String(item.question_text || "").trim();
    return (text || `Question ${index + 1}`).slice(0, 200);
  }
  return `${hackathon_type === "coding" ? "Coding question" : "Task"} ${index + 1}`;
}

function item_body(item, kind) {
  if (kind === "mcq") {
    return {
      item_type: "mcq",
      question_text: String(item.question_text || "").trim(),
      options: (Array.isArray(item.options) ? item.options : []).map((option) => String(option || "").trim()).filter(Boolean),
      correct_answer: String(item.correct_answer || "").trim(),
      explanation: String(item.explanation || "").trim()
    };
  }
  if (kind === "coding") {
    return {
      item_type: "coding",
      prompt: String(item.prompt || "").trim(),
      programming_language_id: as_int(item.programming_language_id) || null,
      language: String(item.language || "").trim(),
      description: String(item.description || "").trim(),
      function_name: String(item.function_name || "").trim(),
      reference_code: String(item.reference_code || "").trim(),
      validation_status: String(item.validation_status || "").trim(),
      validation_errors: Array.isArray(item.validation_errors) ? item.validation_errors : [],
      test_cases: coding_cases(item.test_cases)
    };
  }
  const lines = (value) => (Array.isArray(value) ? value : []).map((line) => String(line || "").trim()).filter(Boolean).slice(0, 20);
  const flags = item.deliverables && typeof item.deliverables === "object" ? item.deliverables : {};
  const overview = String(item.overview || item.description || "").trim();
  return {
    item_type: "project",
    description: overview,
    overview,
    objectives: lines(item.objectives),
    features: lines(item.features),
    team_size: String(item.team_size || "").replace(/\D/g, "").slice(0, 3),
    technology: String(item.technology || "").trim().slice(0, 80),
    project_duration: String(item.project_duration || "").replace(/\D/g, "").slice(0, 5),
    submission_type: String(item.submission_type || "").trim().slice(0, 80),
    deliverables: {
      source_code: Boolean(flags.source_code),
      project_report: Boolean(flags.project_report),
      demo_video: Boolean(flags.demo_video),
      presentation: Boolean(flags.presentation)
    }
  };
}

function validate_items(items, types, publishing) {
  if (!Array.isArray(items)) throw fail("Questions were not sent correctly");
  const allowed = new Set(types);
  const kept = items.filter((item) => allowed.has(resolve_kind(item, types)));
  if (publishing && !kept.length) throw fail("Add at least one question or task");
  return kept.map((item, index) => {
    const kind = resolve_kind(item, types);
    const body = item_body(item, kind);
    const marks = as_int(item.marks) || (kind === "mcq" ? 1 : 10);
    if (marks > 1000) throw fail("Marks must be 1000 or less");
    if (publishing && kind === "mcq") {
      if (!body.question_text) throw fail(`Question ${index + 1} needs text`);
      if (body.options.length < 2) throw fail(`Question ${index + 1} needs at least two options`);
      if (!body.options.includes(body.correct_answer)) throw fail(`Question ${index + 1} needs a correct option`);
    }
    if (kind === "coding" && publishing) {
      if (!String(item.title || "").trim()) throw fail(`Coding question ${index + 1} needs a name`);
      if (!body.language) throw fail(`Coding question ${index + 1} needs a language`);
      if (!body.description && !body.prompt) throw fail(`Coding question ${index + 1} needs a prompt`);
    }
    if (kind === "project" && publishing) {
      if (!String(item.title || "").trim()) throw fail(`Task ${index + 1} needs a title`);
      if (!body.overview) throw fail(`Task ${index + 1} needs an overview`);
      if (!body.objectives.length) throw fail(`Task ${index + 1} needs an objective`);
      if (!body.features.length) throw fail(`Task ${index + 1} needs an expected feature`);
      if (!body.team_size || !body.technology || !body.project_duration || !body.submission_type) {
        throw fail(`Task ${index + 1} needs team size, technology, duration, and submission type`);
      }
    }
    return {
      title: item_title(item, kind, index),
      marks,
      body
    };
  });
}

function now_sql(date = new Date()) {
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

async function require_programs(pool, cohort_id, program_ids, required) {
  const ids = [...new Set((program_ids || []).map(as_int).filter(Boolean))];
  if (!cohort_id) throw fail("Select a cohort");
  const [cohorts] = await sqlQuery(
    pool,
    `SELECT cohort_id FROM tbl_cohorts WHERE cohort_id = ? AND is_deleted = FALSE LIMIT 1`,
    [cohort_id]
  );
  if (!cohorts?.[0]) throw fail("Select a cohort");
  if (!ids.length) {
    if (required) throw fail("Select a program");
    return { cohort_id, program_ids: [] };
  }
  const [rows] = await sqlQuery(
    pool,
    `SELECT p.program_id
     FROM tbl_programs p
     INNER JOIN tbl_cohort_programs cp
       ON cp.program_id = p.program_id AND cp.cohort_id = ? AND cp.is_deleted = FALSE
     WHERE p.is_deleted = FALSE AND p.program_id IN (${ids.map(() => "?").join(",")})`,
    [cohort_id, ...ids]
  );
  const found = new Set((rows || []).map((row) => Number(row.program_id)));
  if (found.size !== ids.length) throw fail("Choose programs that belong to the selected cohort");
  return { cohort_id, program_ids: ids };
}

function read_hackathon(body) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const types = parse_types(body.hackathon_type);
  let audience = String(body.audience || "").trim();
  const status = body.status === "published" ? "published" : "draft";
  const publishing = status === "published";
  if (!title) throw fail("Enter a hackathon title");
  if (title.length > 200) throw fail("Title must be 200 characters or less");
  if (publishing && description.length < 10) throw fail("Describe the hackathon before publishing");
  if (!types.length) throw fail("Choose at least one type: quiz, coding, or project");
  if (audience === "cohort") audience = "program";
  if (!AUDIENCES.has(audience)) throw fail("Choose who this hackathon is for");
  const starts_at = sql_datetime(body.starts_at);
  const ends_at = sql_datetime(body.ends_at);
  if (!starts_at || !ends_at) throw fail("Set a start and end time");
  if (starts_at < now_sql()) throw fail("Start time cannot be in the past");
  if (ends_at <= starts_at) throw fail("End time must be after the start time");
  const rules = String(body.rules || "").trim();
  const items = validate_items(body.items || [], types, publishing);
  const project_count = items.filter((item) => item.body.item_type === "project").length;
  let required_submissions = null;
  if (types.includes("project")) {
    required_submissions = as_int(body.required_submissions) || 1;
    if (publishing && project_count && required_submissions > project_count) {
      throw fail(`Submissions required cannot be more than the ${project_count} project${project_count === 1 ? "" : "s"}`);
    }
  }
  return {
    title,
    description,
    hackathon_type: types.join(","),
    audience,
    status,
    publishing,
    starts_at,
    ends_at,
    rules,
    required_submissions,
    cohort_id: audience === "program" ? as_int(body.cohort_id) : 0,
    program_ids: audience === "program" ? body.program_ids : [],
    certificate_id: as_int(body.certificate_id),
    items
  };
}

async function load_hackathon(pool, hackathon_id) {
  const id = as_int(hackathon_id);
  if (!id) throw fail("Hackathon not found", 404);
  const [rows] = await sqlQuery(
    pool,
    `SELECT hackathon_id, title, description, hackathon_type, audience, cohort_id,
            DATE_FORMAT(starts_at, '%Y-%m-%dT%H:%i') AS starts_at,
            DATE_FORMAT(ends_at, '%Y-%m-%dT%H:%i') AS ends_at,
            rules, required_submissions, certificate_id, status
     FROM tbl_hackathons
     WHERE hackathon_id = ? AND is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  const row = rows?.[0];
  if (!row) throw fail("Hackathon not found", 404);
  const [programs] = await sqlQuery(
    pool,
    `SELECT program_id FROM tbl_hackathon_programs
     WHERE hackathon_id = ? AND is_deleted = FALSE
     ORDER BY hackathon_program_id ASC`,
    [id]
  );
  const [items] = await sqlQuery(
    pool,
    `SELECT item_id, title, marks, body_json
     FROM tbl_hackathon_items
     WHERE hackathon_id = ? AND is_deleted = FALSE
     ORDER BY sort_no ASC, item_id ASC`,
    [id]
  );
  return {
    hackathon_id: Number(row.hackathon_id),
    title: row.title || "",
    description: row.description || "",
    hackathon_type: row.hackathon_type,
    audience: row.audience,
    cohort_id: row.cohort_id == null ? "" : Number(row.cohort_id),
    program_ids: (programs || []).map((program) => Number(program.program_id)),
    starts_at: row.starts_at || "",
    ends_at: row.ends_at || "",
    rules: row.rules || "",
    required_submissions: row.required_submissions == null ? "" : Number(row.required_submissions),
    certificate_id: row.certificate_id == null ? "" : Number(row.certificate_id),
    status: row.status || "draft",
    items: (items || []).map((item) => map_item(item, row.hackathon_type))
  };
}

async function replace_children(pool, hackathon_id, fields) {
  await sqlQuery(
    pool,
    `UPDATE tbl_hackathon_programs SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE hackathon_id = ? AND is_deleted = FALSE`,
    [hackathon_id]
  );
  for (const program_id of fields.program_ids) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_hackathon_programs (hackathon_id, program_id) VALUES (?, ?)`,
      [hackathon_id, program_id]
    );
  }
  await sqlQuery(
    pool,
    `UPDATE tbl_hackathon_items SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE hackathon_id = ? AND is_deleted = FALSE`,
    [hackathon_id]
  );
  for (let index = 0; index < fields.items.length; index += 1) {
    const item = fields.items[index];
    await sqlQuery(
      pool,
      `INSERT INTO tbl_hackathon_items (hackathon_id, sort_no, title, marks, body_json)
       VALUES (?, ?, ?, ?, ?)`,
      [hackathon_id, index + 1, item.title, item.marks, JSON.stringify(item.body)]
    );
  }
}

export async function list_hackathon_options() {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT c.cohort_id, c.cohort_name, p.program_id, p.program_name
     FROM tbl_cohorts c
     LEFT JOIN tbl_cohort_programs cp
       ON cp.cohort_id = c.cohort_id AND cp.is_deleted = FALSE
     LEFT JOIN tbl_programs p
       ON p.program_id = cp.program_id AND p.is_deleted = FALSE
     WHERE c.is_deleted = FALSE
     ORDER BY c.cohort_name ASC, p.program_name ASC`
  );
  const cohorts = [];
  const by_id = new Map();
  for (const row of rows || []) {
    const cohort_id = Number(row.cohort_id);
    let cohort = by_id.get(cohort_id);
    if (!cohort) {
      cohort = { cohort_id, cohort_name: row.cohort_name || "Cohort", programs: [] };
      by_id.set(cohort_id, cohort);
      cohorts.push(cohort);
    }
    if (row.program_id) {
      cohort.programs.push({
        program_id: Number(row.program_id),
        program_name: row.program_name || "Program"
      });
    }
  }
  let languages = [];
  try {
    const [language_rows] = await sqlQuery(
      pool,
      `SELECT programming_language_id, programming_language_name
       FROM mst_programming_languages
       WHERE is_deleted = FALSE AND is_active = TRUE
       ORDER BY programming_language_name ASC`
    );
    languages = (language_rows || []).map((row) => ({
      id: Number(row.programming_language_id),
      name: row.programming_language_name
    }));
  } catch (err) {
    log.fail("list_hackathon_options", err.message);
    languages = [];
  }
  let certificates = [];
  try {
    await ensure_certificate_schema();
    const listed = await list_certificates();
    certificates = (listed.items || []).map((item) => ({
      certificate_id: item.certificate_id,
      certificate_name: item.certificate_name
    }));
  } catch (err) {
    log.fail("list_hackathon_options", err.message);
    certificates = [];
  }
  return { cohorts, languages, certificates };
}

export async function list_hackathons() {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT h.hackathon_id, h.title, h.description, h.hackathon_type, h.audience, h.status,
            DATE_FORMAT(h.starts_at, '%Y-%m-%dT%H:%i') AS starts_at,
            DATE_FORMAT(h.ends_at, '%Y-%m-%dT%H:%i') AS ends_at,
            c.cohort_name,
            (SELECT p.program_name
              FROM tbl_hackathon_programs hp
              INNER JOIN tbl_programs p ON p.program_id = hp.program_id
              WHERE hp.hackathon_id = h.hackathon_id AND hp.is_deleted = FALSE
              ORDER BY hp.hackathon_program_id ASC
              LIMIT 1) AS program_name,
            (SELECT COUNT(*) FROM tbl_hackathon_items i
              WHERE i.hackathon_id = h.hackathon_id AND i.is_deleted = FALSE) AS item_count,
            (SELECT COUNT(*) FROM tbl_hackathon_programs hp
              WHERE hp.hackathon_id = h.hackathon_id AND hp.is_deleted = FALSE) AS program_count,
            (SELECT COUNT(*) FROM tbl_hackathon_batches b
              WHERE b.hackathon_id = h.hackathon_id AND b.is_deleted = FALSE) AS batch_count,
            (SELECT COUNT(DISTINCT bs.student_id)
              FROM tbl_hackathon_batch_students bs
              INNER JOIN tbl_hackathon_batches b ON b.batch_id = bs.batch_id AND b.is_deleted = FALSE
              WHERE b.hackathon_id = h.hackathon_id AND bs.is_deleted = FALSE) AS participant_count
     FROM tbl_hackathons h
     LEFT JOIN tbl_cohorts c ON c.cohort_id = h.cohort_id AND c.is_deleted = FALSE
     WHERE h.is_deleted = FALSE
     ORDER BY h.updated_at DESC, h.hackathon_id DESC`
  );
  return (rows || []).map((row) => ({
    hackathon_id: Number(row.hackathon_id),
    title: row.title || "",
    description: String(row.description || "").replace(/\s+/g, " ").trim().slice(0, 140),
    hackathon_type: row.hackathon_type,
    audience: row.audience,
    status: row.status || "draft",
    starts_at: row.starts_at || "",
    ends_at: row.ends_at || "",
    cohort_name: row.cohort_name || "",
    program_name: row.program_name || "",
    item_count: Number(row.item_count) || 0,
    program_count: Number(row.program_count) || 0,
    batch_count: Number(row.batch_count) || 0,
    participant_count: Number(row.participant_count) || 0
  }));
}

export async function get_hackathon(hackathon_id) {
  await ensure_hackathon_schema();
  return load_hackathon(get_pool(), hackathon_id);
}

export async function save_hackathon(hackathon_id, body) {
  await ensure_hackathon_schema();
  const fields = read_hackathon(body);
  const pool = get_pool();
  const scope = fields.audience === "open" ?
    { cohort_id: null, program_ids: [] } :
    await require_programs(pool, fields.cohort_id, fields.program_ids, fields.audience === "program");
  fields.cohort_id = scope.cohort_id;
  fields.program_ids = scope.program_ids;
  fields.certificate_id = await require_certificate(fields.certificate_id);
  const id = as_int(hackathon_id);
  if (id) await load_hackathon(pool, id);
  const params = [
    fields.title,
    fields.description || null,
    fields.hackathon_type,
    fields.audience,
    fields.cohort_id,
    fields.starts_at,
    fields.ends_at,
    fields.rules || null,
    fields.required_submissions,
    fields.certificate_id,
    fields.status
  ];
  let saved_id = id;
  if (id) {
    await sqlQuery(
      pool,
      `UPDATE tbl_hackathons
       SET title = ?, description = ?, hackathon_type = ?, audience = ?, cohort_id = ?,
           starts_at = ?, ends_at = ?, rules = ?, required_submissions = ?, certificate_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE hackathon_id = ? AND is_deleted = FALSE`,
      [...params, id]
    );
  } else {
    const [result] = await sqlQuery(
      pool,
      `INSERT INTO tbl_hackathons
         (title, description, hackathon_type, audience, cohort_id, starts_at, ends_at, rules, required_submissions, certificate_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params
    );
    saved_id = Number(result.insertId);
  }
  await replace_children(pool, saved_id, fields);
  log.pass("save_hackathon", `${fields.status} ${saved_id}`);
  return load_hackathon(pool, saved_id);
}

export async function delete_hackathon(hackathon_id) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const current = await load_hackathon(pool, hackathon_id);
  await sqlQuery(
    pool,
    `UPDATE tbl_hackathons SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE hackathon_id = ?`,
    [current.hackathon_id]
  );
  log.pass("delete_hackathon", `deleted ${current.hackathon_id}`);
  return { ok: true };
}

export async function generate_mcq_items(body) {
  const text = String(body.text || "").trim();
  const count = as_int(body.count) || 5;
  if (text.length < 20) throw fail("Paste at least 20 characters of source text");
  if (text.length > 20000) throw fail("Source text must be 20000 characters or less");
  if (count < 1 || count > 100) throw fail("Generate between 1 and 100 questions");
  const difficulty = mix_or_split(body.difficulty, DIFFICULTY_KEYS, count);
  const bloom = mix_or_split(body.bloom, BLOOM_KEYS, count);
  if (!difficulty) throw fail(`Difficulty counts must add up to ${count}`);
  if (!bloom) throw fail(`Bloom counts must add up to ${count}`);
  let url;
  try {
    url = ai_backend_url("/api/quiz/generate_from_text");
  } catch (err) {
    throw fail(err.message || "AI_BACKEND is not configured", err.status || 500);
  }
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        content: text,
        count,
        difficulty,
        bloom
      }),
      signal: AbortSignal.timeout(120000)
    });
  } catch (err) {
    log.fail("generate_mcq_items", err.message);
    throw fail("Unable to reach the quiz generator", 502);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw fail(data.error || data.message || "Quiz generator did not return questions", 502);
  }
  const items = (Array.isArray(data.questions) ? data.questions : []).map((item) => {
    const options = (Array.isArray(item.options) ? item.options : []).map((option) => String(option || "").trim()).filter(Boolean);
    const question_text = String(item.question_text || "").trim();
    const correct_answer = String(item.correct_answer || "").trim();
    if (!question_text || options.length < 2 || !options.includes(correct_answer)) return null;
    return {
      item_id: null,
      item_type: "mcq",
      title: question_text.slice(0, 200),
      marks: 1,
      question_text,
      options,
      correct_answer,
      explanation: String(item.explanation || "").trim()
    };
  }).filter(Boolean);
  if (!items.length) throw fail("Quiz generator returned no usable questions", 502);
  return { items };
}

export async function generate_coding_item(body) {
  const title = String(body.title || "").trim();
  const prompt = String(body.prompt || "").trim();
  const language_id = as_int(body.programming_language_id);
  if (!title) throw fail("Name the coding question");
  if (prompt.length < 10) throw fail("Describe the question in at least 10 characters");
  if (prompt.length > 4000) throw fail("The prompt must be 4000 characters or less");
  if (!language_id) throw fail("Select a programming language");
  const pool = get_pool();
  const [rows] = await sqlQuery(
    pool,
    `SELECT programming_language_name
     FROM mst_programming_languages
     WHERE programming_language_id = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [language_id]
  );
  const language_name = String(rows?.[0]?.programming_language_name || "").trim();
  const language = compiler_language(language_name);
  if (!language) throw fail("Select Python or Node.js for coding questions");
  let url;
  try {
    url = ai_backend_url("/api/compiler/generate");
  } catch (err) {
    throw fail(err.message || "AI_BACKEND is not configured", err.status || 500);
  }
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ prompt, language }),
      signal: AbortSignal.timeout(180000)
    });
  } catch (err) {
    log.fail("generate_coding_item", err.message);
    throw fail("Unable to reach the coding generator", 502);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw fail(data.error || data.message || "Coding generator did not return a question", 502);
  }
  const description = String(data.description || "").trim();
  const function_name = String(data.function_name || "").trim();
  const reference_code = String(data.reference_code || "").trim();
  const cases = coding_cases(data.test_cases);
  const validation = data.validation && typeof data.validation === "object" ? data.validation : {};
  if (!description || !function_name || !reference_code || !cases.length) {
    throw fail("Coding generator returned an incomplete question", 502);
  }
  if (validation.status === "invalid") {
    throw fail("The generated reference code failed its test cases. Generate again.");
  }
  return {
    item_id: null,
    item_type: "coding",
    title: title.slice(0, 200),
    marks: as_int(body.marks) || 10,
    prompt,
    programming_language_id: language_id,
    language,
    description,
    function_name,
    reference_code,
    validation_status: validation.status || "valid",
    validation_errors: Array.isArray(validation.errors) ? validation.errors : [],
    test_cases: cases
  };
}

function student_name(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || `Student ${row.student_id}`;
}

function student_initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?";
}

function student_key(value) {
  const id = String(value ?? "").trim();
  return id && id.length <= 20 ? id : "";
}

function roster_scope(hackathon) {
  const cohort_id = as_int(hackathon.cohort_id);
  const program_ids = [...new Set((hackathon.program_ids || []).map(as_int).filter(Boolean))];
  if (!cohort_id || !program_ids.length) return null;
  return { cohort_id, program_ids };
}

function map_student(row) {
  const full_name = student_name(row);
  return {
    student_id: student_key(row.student_id),
    full_name,
    initials: student_initials(full_name),
    course_student_id: row.course_student_id || ""
  };
}

export async function list_batches(hackathon_id) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const hackathon = await load_hackathon(pool, hackathon_id);
  const scope = roster_scope(hackathon);
  const code_filter = scope ?
    `AND r.status = 'registered' AND r.program_id IN (${scope.program_ids.map(() => "?").join(",")})
     AND EXISTS (
       SELECT 1 FROM tbl_cohort_programs cp
       WHERE cp.program_id = r.program_id AND cp.cohort_id = ? AND cp.is_deleted = FALSE
     )` :
    "";
  const code_params = scope ? [...scope.program_ids, scope.cohort_id, hackathon.hackathon_id] : [hackathon.hackathon_id];
  const [rows] = await sqlQuery(
    pool,
    `SELECT b.batch_id, b.batch_name, s.student_id, s.first_name, s.last_name,
            (
              SELECT r.course_student_id
              FROM tbl_course_registrations r
              WHERE r.student_id COLLATE utf8mb4_unicode_ci = s.student_id COLLATE utf8mb4_unicode_ci AND r.is_deleted = FALSE
                AND r.course_student_id IS NOT NULL AND TRIM(r.course_student_id) <> ''
                ${code_filter}
              ORDER BY r.updated_at DESC, r.registration_id DESC
              LIMIT 1
            ) AS course_student_id
     FROM tbl_hackathon_batches b
     LEFT JOIN tbl_hackathon_batch_students bs
       ON bs.batch_id = b.batch_id AND bs.is_deleted = FALSE
     LEFT JOIN tbl_students s
       ON s.student_id COLLATE utf8mb4_unicode_ci = bs.student_id COLLATE utf8mb4_unicode_ci AND s.is_deleted = FALSE
     WHERE b.hackathon_id = ? AND b.is_deleted = FALSE
     ORDER BY b.batch_id ASC, s.first_name ASC, s.last_name ASC`,
    code_params
  );
  const batches = [];
  const by_id = new Map();
  for (const row of rows || []) {
    const batch_id = Number(row.batch_id);
    let batch = by_id.get(batch_id);
    if (!batch) {
      batch = { batch_id, batch_name: row.batch_name || "Batch", students: [] };
      by_id.set(batch_id, batch);
      batches.push(batch);
    }
    if (row.student_id) batch.students.push(map_student(row));
  }
  return {
    program_name: hackathon.audience === "open" ? "Open hackathon" : "",
    items: batches.map((batch) => ({
      ...batch,
      student_count: batch.students.length
    }))
  };
}

export async function search_batch_students(hackathon_id, query = {}) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const hackathon = await load_hackathon(pool, hackathon_id);
  const scope = roster_scope(hackathon);
  if (!scope) return { items: [] };
  const q = String(query.q || "").trim();
  const except_batch = as_int(query.batch_id);
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const [rows] = await sqlQuery(
    pool,
    `SELECT s.student_id, s.first_name, s.last_name, MAX(r.course_student_id) AS course_student_id
     FROM tbl_students s
     INNER JOIN tbl_course_registrations r
       ON r.student_id COLLATE utf8mb4_unicode_ci = s.student_id COLLATE utf8mb4_unicode_ci
       AND r.is_deleted = FALSE AND r.status = 'registered'
       AND r.program_id IN (${scope.program_ids.map(() => "?").join(",")})
     INNER JOIN tbl_cohort_programs cp
       ON cp.program_id = r.program_id AND cp.cohort_id = ? AND cp.is_deleted = FALSE
     WHERE s.is_deleted = FALSE
       AND (s.student_id COLLATE utf8mb4_unicode_ci) NOT IN (
         SELECT bs.student_id COLLATE utf8mb4_unicode_ci
         FROM tbl_hackathon_batch_students bs
         INNER JOIN tbl_hackathon_batches b
           ON b.batch_id = bs.batch_id AND b.is_deleted = FALSE
         WHERE b.hackathon_id = ? AND bs.is_deleted = FALSE
           AND (? = 0 OR b.batch_id <> ?)
       )
       AND (
         CONCAT(IFNULL(s.first_name, ''), ' ', IFNULL(s.last_name, '')) COLLATE utf8mb4_unicode_ci LIKE ?
         OR s.student_id COLLATE utf8mb4_unicode_ci LIKE ?
         OR IFNULL(r.course_student_id, '') COLLATE utf8mb4_unicode_ci LIKE ?
       )
     GROUP BY s.student_id, s.first_name, s.last_name
     ORDER BY s.first_name ASC, s.last_name ASC
     LIMIT 30`,
    [...scope.program_ids, scope.cohort_id, hackathon.hackathon_id, except_batch, except_batch, like, like, like]
  );
  return { items: (rows || []).map(map_student).filter((student) => student.student_id) };
}

export async function save_batch(hackathon_id, batch_id, body) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const hackathon = await load_hackathon(pool, hackathon_id);
  const batch_name = String(body.batch_name || "").trim();
  if (!batch_name) throw fail("Enter a batch name");
  if (batch_name.length > 120) throw fail("Batch name must be 120 characters or less");
  const student_ids = [...new Set((body.student_ids || []).map(student_key).filter(Boolean))];
  const current_id = as_int(batch_id);
  if (current_id) {
    const [found] = await sqlQuery(
      pool,
      `SELECT batch_id FROM tbl_hackathon_batches
       WHERE batch_id = ? AND hackathon_id = ? AND is_deleted = FALSE LIMIT 1`,
      [current_id, hackathon.hackathon_id]
    );
    if (!found?.[0]) throw fail("Batch not found", 404);
  }
  if (student_ids.length) {
    const scope = roster_scope(hackathon);
    if (!scope) throw fail("Choose a cohort and program before adding students");
    const [allowed] = await sqlQuery(
      pool,
      `SELECT DISTINCT s.student_id
       FROM tbl_students s
       INNER JOIN tbl_course_registrations r
         ON r.student_id COLLATE utf8mb4_unicode_ci = s.student_id COLLATE utf8mb4_unicode_ci
         AND r.is_deleted = FALSE AND r.status = 'registered'
         AND r.program_id IN (${scope.program_ids.map(() => "?").join(",")})
       INNER JOIN tbl_cohort_programs cp
         ON cp.program_id = r.program_id AND cp.cohort_id = ? AND cp.is_deleted = FALSE
       WHERE s.is_deleted = FALSE
         AND s.student_id COLLATE utf8mb4_unicode_ci IN (${student_ids.map(() => "?").join(",")})`,
      [...scope.program_ids, scope.cohort_id, ...student_ids]
    );
    if ((allowed || []).length !== student_ids.length) {
      throw fail("Choose students from this hackathon's cohort and program");
    }
    const [taken] = await sqlQuery(
      pool,
      `SELECT bs.student_id
       FROM tbl_hackathon_batch_students bs
       INNER JOIN tbl_hackathon_batches b ON b.batch_id = bs.batch_id AND b.is_deleted = FALSE
       WHERE b.hackathon_id = ? AND bs.is_deleted = FALSE
         AND bs.student_id COLLATE utf8mb4_unicode_ci IN (${student_ids.map(() => "?").join(",")})
         AND (? = 0 OR b.batch_id <> ?)`,
      [hackathon.hackathon_id, ...student_ids, current_id, current_id]
    );
    if (taken?.[0]) throw fail("A chosen student is already in another batch");
  }
  let saved_id = current_id;
  if (current_id) {
    await sqlQuery(
      pool,
      `UPDATE tbl_hackathon_batches SET batch_name = ?, updated_at = CURRENT_TIMESTAMP WHERE batch_id = ?`,
      [batch_name, current_id]
    );
  } else {
    const [created] = await sqlQuery(
      pool,
      `INSERT INTO tbl_hackathon_batches (hackathon_id, batch_name) VALUES (?, ?)`,
      [hackathon.hackathon_id, batch_name]
    );
    saved_id = Number(created.insertId);
  }
  await sqlQuery(
    pool,
    `UPDATE tbl_hackathon_batch_students SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE batch_id = ? AND is_deleted = FALSE`,
    [saved_id]
  );
  for (const student_id of student_ids) {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_hackathon_batch_students (batch_id, student_id) VALUES (?, ?)`,
      [saved_id, student_id]
    );
  }
  const listed = await list_batches(hackathon.hackathon_id);
  return listed.items.find((item) => item.batch_id === saved_id) || { batch_id: saved_id, batch_name, students: [], student_count: 0 };
}

async function require_student(pool, user) {
  const code = student_code(user);
  const [rows] = await sqlQuery(
    pool,
    `SELECT student_id, first_name, last_name
     FROM tbl_students
     WHERE student_id COLLATE utf8mb4_unicode_ci = ? AND is_deleted = FALSE AND is_active = TRUE
     LIMIT 1`,
    [code]
  );
  if (!rows?.[0]) throw fail("Student account was not found", 401);
  return rows[0];
}

async function student_can_enter(pool, student_id, hackathon) {
  if (hackathon.status !== "published") return false;
  if (hackathon.audience === "open") return true;
  const program_ids = hackathon.program_ids || [];
  if (!program_ids.length) return false;
  const [rows] = await sqlQuery(
    pool,
    `SELECT r.registration_id
     FROM tbl_course_registrations r
     WHERE r.student_id COLLATE utf8mb4_unicode_ci = ?
       AND r.is_deleted = FALSE AND r.status = 'registered'
       AND r.program_id IN (${program_ids.map(() => "?").join(",")})
     LIMIT 1`,
    [student_id, ...program_ids]
  );
  return Boolean(rows?.[0]);
}

function public_case(row) {
  const [item] = coding_cases([row]);
  if (!item) return null;
  return { test_case: item.test_case, inputs: item.inputs, output: item.output };
}

function public_item(item) {
  const base = {
    item_id: item.item_id,
    item_type: item.item_type,
    title: item.title,
    marks: item.marks
  };
  if (item.item_type === "mcq") {
    return { ...base, question_text: item.question_text || item.title, options: item.options || [] };
  }
  if (item.item_type === "coding") {
    return {
      ...base,
      prompt: item.prompt || "",
      language: item.language || "",
      description: item.description || "",
      function_name: item.function_name || "",
      template: starter_code(item),
      test_cases: (item.test_cases || []).map(public_case).filter(Boolean)
    };
  }
  return {
    ...base,
    description: item.overview || item.description || "",
    overview: item.overview || item.description || "",
    objectives: item.objectives || [],
    features: item.features || [],
    team_size: item.team_size || "",
    technology: item.technology || "",
    project_duration: item.project_duration || "",
    submission_type: item.submission_type || "",
    deliverables: item.deliverables || {}
  };
}

function read_stored_project(answer) {
  try {
    const parsed = JSON.parse(answer || "");
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* older plain-text notes */
  }
  return { notes: String(answer || "") };
}

function public_project_answer(answer) {
  const parsed = read_stored_project(answer);
  return JSON.stringify({
    github_url: parsed.github_url || parsed.repo_url || "",
    demo_url: parsed.demo_url || "",
    documentation_url: parsed.documentation_url || "",
    file_name: parsed.file_name || ""
  });
}

function coding_payload(answer) {
  try {
    const parsed = JSON.parse(answer || "");
    if (parsed && typeof parsed === "object" && parsed.student_code != null) return parsed;
  } catch {
    /* stored as plain code */
  }
  return { student_code: String(answer || "") };
}

function graded_answer(item, answer) {
  if (item.item_type === "coding") {
    const payload = coding_payload(answer);
    return {
      item_id: item.item_id,
      answer: payload.student_code || "",
      grade: payload,
      correct: null,
      explanation: "",
      correct_answer: ""
    };
  }
  const text = item.item_type === "project" ? public_project_answer(answer) : String(answer || "");
  if (item.item_type !== "mcq" || !text.trim()) {
    return { item_id: item.item_id, answer: text, correct: null, explanation: "", correct_answer: "" };
  }
  const chosen = text.trim();
  return {
    item_id: item.item_id,
    answer: chosen,
    correct: chosen === item.correct_answer,
    explanation: item.explanation || "",
    correct_answer: item.correct_answer || ""
  };
}

async function batch_name_for(pool, hackathon_id, student_id) {
  const [rows] = await sqlQuery(
    pool,
    `SELECT b.batch_name
     FROM tbl_hackathon_batches b
     INNER JOIN tbl_hackathon_batch_students bs
       ON bs.batch_id = b.batch_id AND bs.is_deleted = FALSE
       AND bs.student_id COLLATE utf8mb4_unicode_ci = ?
     WHERE b.hackathon_id = ? AND b.is_deleted = FALSE
     ORDER BY b.batch_id ASC
     LIMIT 1`,
    [student_id, hackathon_id]
  );
  return rows?.[0]?.batch_name || "";
}

export async function list_student_hackathons(user) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const student = await require_student(pool, user);
  const [rows] = await sqlQuery(
    pool,
    `SELECT h.hackathon_id, h.title, h.description, h.hackathon_type, h.audience,
            DATE_FORMAT(h.starts_at, '%Y-%m-%dT%H:%i') AS starts_at,
            DATE_FORMAT(h.ends_at, '%Y-%m-%dT%H:%i') AS ends_at,
            c.cohort_name,
            (SELECT p.program_name
              FROM tbl_hackathon_programs hp
              INNER JOIN tbl_programs p ON p.program_id = hp.program_id
              WHERE hp.hackathon_id = h.hackathon_id AND hp.is_deleted = FALSE
              ORDER BY hp.hackathon_program_id ASC
              LIMIT 1) AS program_name,
            (SELECT COUNT(*) FROM tbl_hackathon_items i
              WHERE i.hackathon_id = h.hackathon_id AND i.is_deleted = FALSE) AS item_count,
            (SELECT b.batch_name
              FROM tbl_hackathon_batches b
              INNER JOIN tbl_hackathon_batch_students bs
                ON bs.batch_id = b.batch_id AND bs.is_deleted = FALSE
                AND bs.student_id COLLATE utf8mb4_unicode_ci = ?
              WHERE b.hackathon_id = h.hackathon_id AND b.is_deleted = FALSE
              ORDER BY b.batch_id ASC
              LIMIT 1) AS batch_name,
            (SELECT COUNT(DISTINCT r.item_id) FROM tbl_hackathon_responses r
              WHERE r.hackathon_id = h.hackathon_id AND r.is_deleted = FALSE
                AND r.student_id COLLATE utf8mb4_unicode_ci = ?) AS answered_count,
            (SELECT COUNT(*) FROM tbl_hackathon_items i
              WHERE i.hackathon_id = h.hackathon_id AND i.is_deleted = FALSE
                AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.body_json, '$.item_type')), 'project') = 'project') AS project_count,
            (SELECT COUNT(DISTINCT r.item_id) FROM tbl_hackathon_responses r
              INNER JOIN tbl_hackathon_items i ON i.item_id = r.item_id AND i.is_deleted = FALSE
              WHERE r.hackathon_id = h.hackathon_id AND r.is_deleted = FALSE
                AND r.student_id COLLATE utf8mb4_unicode_ci = ?
                AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.body_json, '$.item_type')), 'project') = 'project') AS answered_projects,
            h.required_submissions,
            h.certificate_id
     FROM tbl_hackathons h
     LEFT JOIN tbl_cohorts c ON c.cohort_id = h.cohort_id AND c.is_deleted = FALSE
     WHERE h.is_deleted = FALSE AND h.status = 'published'
       AND (
         h.audience = 'open'
         OR EXISTS (
           SELECT 1
           FROM tbl_hackathon_programs hp
           INNER JOIN tbl_course_registrations r
             ON r.program_id = hp.program_id
            AND r.student_id COLLATE utf8mb4_unicode_ci = ?
            AND r.is_deleted = FALSE AND r.status = 'registered'
           WHERE hp.hackathon_id = h.hackathon_id AND hp.is_deleted = FALSE
         )
       )
     ORDER BY h.starts_at ASC, h.hackathon_id DESC`,
    [student.student_id, student.student_id, student.student_id, student.student_id]
  );
  return (rows || []).map((row) => {
    const items = Number(row.item_count) || 0;
    const projects = Number(row.project_count) || 0;
    const answered = Number(row.answered_count) || 0;
    const answered_projects = Number(row.answered_projects) || 0;
    const required = projects ? Math.min(projects, Math.max(1, Number(row.required_submissions) || 1)) : 0;
    const goal_count = items - projects + required;
    const done_count = answered - answered_projects + Math.min(answered_projects, required);
    const complete = goal_count > 0 && done_count >= goal_count;
    return {
    hackathon_id: Number(row.hackathon_id),
    goal_count,
    done_count,
    complete,
    certificate_id: row.certificate_id == null ? "" : Number(row.certificate_id),
    certificate_locked: !complete,
    title: row.title || "",
    description: String(row.description || "").replace(/\s+/g, " ").trim().slice(0, 180),
    hackathon_type: row.hackathon_type,
    audience: row.audience,
    starts_at: row.starts_at || "",
    ends_at: row.ends_at || "",
    cohort_name: row.cohort_name || "",
    program_name: row.program_name || "",
    batch_name: row.batch_name || "",
    item_count: items,
    answered_count: answered
    };
  });
}

export async function get_student_hackathon(user, hackathon_id) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const student = await require_student(pool, user);
  const hackathon = await load_hackathon(pool, hackathon_id);
  if (!await student_can_enter(pool, student.student_id, hackathon)) throw fail("This hackathon is not open for you", 403);
  const [saved] = await sqlQuery(
    pool,
    `SELECT item_id, answer_text
     FROM tbl_hackathon_responses
     WHERE hackathon_id = ? AND student_id COLLATE utf8mb4_unicode_ci = ? AND is_deleted = FALSE`,
    [hackathon.hackathon_id, student.student_id]
  );
  const by_item = new Map((saved || []).map((row) => [Number(row.item_id), row.answer_text || ""]));
  const answers = hackathon.items.filter((item) => by_item.has(item.item_id)).map((item) => graded_answer(item, by_item.get(item.item_id)));
  const progress = hackathon_progress(hackathon.items, by_item, hackathon.required_submissions);
  const place = await place_label(pool, hackathon);
  return {
    item: {
      hackathon_id: hackathon.hackathon_id,
      title: hackathon.title,
      description: hackathon.description || "",
      hackathon_type: hackathon.hackathon_type,
      audience: hackathon.audience,
      starts_at: hackathon.starts_at,
      ends_at: hackathon.ends_at,
      required_submissions: hackathon.required_submissions,
      certificate_id: hackathon.certificate_id || "",
      certificate_locked: !progress.complete,
      goal_count: progress.goal_count,
      done_count: progress.done_count,
      cohort_name: place.cohort_name,
      program_name: place.program_name,
      batch_name: await batch_name_for(pool, hackathon.hackathon_id, student.student_id),
      items: hackathon.items.map(public_item)
    },
    answers
  };
}

export async function download_student_certificate(user, hackathon_id) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const student = await require_student(pool, user);
  const hackathon = await load_hackathon(pool, hackathon_id);
  if (!await student_can_enter(pool, student.student_id, hackathon)) throw fail("This hackathon is not open for you", 403);
  const [saved] = await sqlQuery(
    pool,
    `SELECT item_id, answer_text
     FROM tbl_hackathon_responses
     WHERE hackathon_id = ? AND student_id COLLATE utf8mb4_unicode_ci = ? AND is_deleted = FALSE`,
    [hackathon.hackathon_id, student.student_id]
  );
  const by_item = new Map((saved || []).map((row) => [Number(row.item_id), row.answer_text || ""]));
  const progress = hackathon_progress(hackathon.items, by_item, hackathon.required_submissions);
  if (!progress.complete) throw fail("Finish the hackathon to unlock your certificate", 403);
  const certificate_id = await resolve_certificate_id(hackathon.certificate_id);
  const issued = await render_issued_certificate(certificate_id, {
    student_id: student.student_id,
    hackathon_id: hackathon.hackathon_id
  });
  return {
    buffer: issued.buffer,
    content_type: issued.content_type,
    file_name: certificate_file_name(hackathon.title)
  };
}

async function place_label(pool, hackathon) {
  if (hackathon.audience === "open") return { cohort_name: "", program_name: "Open hackathon" };
  const [rows] = await sqlQuery(
    pool,
    `SELECT c.cohort_name,
            (SELECT p.program_name
              FROM tbl_hackathon_programs hp
              INNER JOIN tbl_programs p ON p.program_id = hp.program_id
              WHERE hp.hackathon_id = h.hackathon_id AND hp.is_deleted = FALSE
              ORDER BY hp.hackathon_program_id ASC
              LIMIT 1) AS program_name
     FROM tbl_hackathons h
     LEFT JOIN tbl_cohorts c ON c.cohort_id = h.cohort_id AND c.is_deleted = FALSE
     WHERE h.hackathon_id = ?
     LIMIT 1`,
    [hackathon.hackathon_id]
  );
  return { cohort_name: rows?.[0]?.cohort_name || "", program_name: rows?.[0]?.program_name || "" };
}

export async function save_student_answer(user, hackathon_id, item_id, body) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const student = await require_student(pool, user);
  const hackathon = await load_hackathon(pool, hackathon_id);
  if (!await student_can_enter(pool, student.student_id, hackathon)) throw fail("This hackathon is not open for you", 403);
  const item = hackathon.items.find((row) => row.item_id === as_int(item_id));
  if (!item) throw fail("Question not found", 404);
  const answer = String(body.answer ?? "").slice(0, 20000);
  if (item.item_type === "mcq" && answer.trim() && !(item.options || []).includes(answer.trim())) {
    throw fail("Choose one of the options");
  }
  const [found] = await sqlQuery(
    pool,
    `SELECT response_id
     FROM tbl_hackathon_responses
     WHERE hackathon_id = ? AND item_id = ? AND student_id COLLATE utf8mb4_unicode_ci = ?
     LIMIT 1`,
    [hackathon.hackathon_id, item.item_id, student.student_id]
  );
  if (found?.[0]) {
    await sqlQuery(
      pool,
      `UPDATE tbl_hackathon_responses
       SET answer_text = ?, is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE response_id = ?`,
      [answer, found[0].response_id]
    );
  } else {
    await sqlQuery(
      pool,
      `INSERT INTO tbl_hackathon_responses (hackathon_id, student_id, item_id, answer_text)
       VALUES (?, ?, ?, ?)`,
      [hackathon.hackathon_id, student.student_id, item.item_id, answer]
    );
  }
  return graded_answer(item, answer);
}

async function grade_hackathon_coding(user, hackathon_id, item_id, body) {
  const pool = get_pool();
  const student = await require_student(pool, user);
  const hackathon = await load_hackathon(pool, hackathon_id);
  if (!await student_can_enter(pool, student.student_id, hackathon)) throw fail("This hackathon is not open for you", 403);
  const item = hackathon.items.find((row) => row.item_id === as_int(item_id));
  if (!item || item.item_type !== "coding") throw fail("Coding question not found", 404);
  const code = String(body?.student_code ?? body?.answer ?? "");
  const result = await grade_code(item, code);
  return { pool, student, hackathon, item, code, result };
}

export async function run_student_coding(user, hackathon_id, item_id, body = {}) {
  await ensure_hackathon_schema();
  const { item, code, result } = await grade_hackathon_coding(user, hackathon_id, item_id, body);
  const help = result.failed > 0 ? await ask_code_help(item, code, result) : "";
  return { saved: false, ...public_grade(result), help };
}

export async function submit_student_coding(user, hackathon_id, item_id, body = {}) {
  await ensure_hackathon_schema();
  const { pool, student, hackathon, item, code, result } = await grade_hackathon_coding(user, hackathon_id, item_id, body);
  const grade_result = public_grade(result);
  const stored = JSON.stringify({ student_code: code, ...grade_result });
  const current = await stored_response(pool, hackathon.hackathon_id, item.item_id, student.student_id);
  await write_response(pool, current, hackathon.hackathon_id, student.student_id, item.item_id, stored);
  return { saved: true, ...grade_result, answer: graded_answer(item, stored) };
}

const PROJECT_FILE_LIMIT = 1024 * 1024;
const PROJECT_FOLDER = "hackathon_project_submissions";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", PROJECT_FOLDER);
const PROJECT_STORAGE_MISSING = "storage location not existing";

function link_value(value) {
  return String(value || "").trim().slice(0, 500);
}

async function require_project_folder() {
  try {
    const info = await fs.stat(PROJECT_ROOT);
    if (!info.isDirectory()) throw fail(PROJECT_STORAGE_MISSING);
  } catch (err) {
    if (err.status) throw err;
    throw fail(PROJECT_STORAGE_MISSING);
  }
}

function project_file_name(hackathon_id, student_id, item_id) {
  const safe_student = String(student_id).replace(/[^A-Za-z0-9-]/g, "");
  return `${hackathon_id}-${safe_student}-${item_id}-${Date.now()}.zip`;
}

function project_file_path(file_key) {
  const name = String(file_key || "").replace(/^hackathon_project_submissions\//, "");
  const root = path.resolve(PROJECT_ROOT);
  const absolute = path.resolve(root, name);
  const root_prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (!name || !absolute.startsWith(root_prefix)) throw fail("File not found", 404);
  return absolute;
}

async function stored_response(pool, hackathon_id, item_id, student_id) {
  const [found] = await sqlQuery(
    pool,
    `SELECT response_id, answer_text
     FROM tbl_hackathon_responses
     WHERE hackathon_id = ? AND item_id = ? AND student_id COLLATE utf8mb4_unicode_ci = ?
     LIMIT 1`,
    [hackathon_id, item_id, student_id]
  );
  return found?.[0] || null;
}

async function write_response(pool, current, hackathon_id, student_id, item_id, answer) {
  if (current) {
    await sqlQuery(
      pool,
      `UPDATE tbl_hackathon_responses
       SET answer_text = ?, is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE response_id = ?`,
      [answer, current.response_id]
    );
    return;
  }
  await sqlQuery(
    pool,
    `INSERT INTO tbl_hackathon_responses (hackathon_id, student_id, item_id, answer_text)
     VALUES (?, ?, ?, ?)`,
    [hackathon_id, student_id, item_id, answer]
  );
}

export async function save_student_project(user, hackathon_id, item_id, fields, file) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const student = await require_student(pool, user);
  const hackathon = await load_hackathon(pool, hackathon_id);
  if (!await student_can_enter(pool, student.student_id, hackathon)) throw fail("This hackathon is not open for you", 403);
  const item = hackathon.items.find((row) => row.item_id === as_int(item_id));
  if (!item || item.item_type !== "project") throw fail("Project not found", 404);
  const current = await stored_response(pool, hackathon.hackathon_id, item.item_id, student.student_id);
  const previous = read_stored_project(current?.answer_text);
  let file_name = previous.file_name || "";
  let file_key = previous.file_key || "";
  if (file) {
    const original = String(file.originalname || "project.zip");
    if (!original.toLowerCase().endsWith(".zip")) throw fail("Only a .zip file is allowed");
    if (!file.buffer || file.size >= PROJECT_FILE_LIMIT) throw fail("Zip must be under 1 MB");
    const zip_mark = file.buffer.slice(0, 2).toString("utf8");
    if (zip_mark !== "PK") throw fail("Only a .zip file is allowed");
    await require_project_folder();
    const stored_name = project_file_name(hackathon.hackathon_id, student.student_id, item.item_id);
    await fs.writeFile(path.join(PROJECT_ROOT, stored_name), file.buffer);
    log.pass("save_student_project", `saved ${stored_name} to ${PROJECT_FOLDER}`);
    file_key = `${PROJECT_FOLDER}/${stored_name}`;
    file_name = original.slice(0, 180);
  }
  if (item.deliverables?.source_code && !file_key) throw fail("Upload a zip under 1 MB");
  const github_url = link_value(fields.github_url);
  const demo_url = link_value(fields.demo_url);
  const documentation_url = link_value(fields.documentation_url);
  if (!file_key && !github_url && !demo_url && !documentation_url) throw fail("Add a zip or a submission link");
  const graded = previous.score != null ? { score: previous.score, max_score: previous.max_score } : {};
  const answer = JSON.stringify({ github_url, demo_url, documentation_url, file_name, file_key, ...graded });
  await write_response(pool, current, hackathon.hackathon_id, student.student_id, item.item_id, answer);
  return graded_answer(item, answer);
}

export async function read_student_project_file(user, hackathon_id, item_id) {
  await ensure_hackathon_schema();
  const pool = get_pool();
  const student = await require_student(pool, user);
  const hackathon = await load_hackathon(pool, hackathon_id);
  if (!await student_can_enter(pool, student.student_id, hackathon)) throw fail("This hackathon is not open for you", 403);
  const current = await stored_response(pool, hackathon.hackathon_id, as_int(item_id), student.student_id);
  const stored = read_stored_project(current?.answer_text);
  if (!stored.file_key) throw fail("No zip has been uploaded", 404);
  return { absolute: project_file_path(stored.file_key), file_name: stored.file_name || "project.zip" };
}
