import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "../utils/db_setup.js";
import { student_code } from "../utils/student_code.js";
import { mock_interview_detail, mock_row, resume_detail, resume_row, table_exists } from "../ai_monitor/monitor_service.js";
import { list_student_hackathons } from "../hackathon_manager/hackathon_service.js";
import { ensure_hackathon_schema } from "../hackathon_manager/schema.js";

const LIMIT = 100;

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
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

function read_json(value, fallback = null) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function marks(count) {
  return Array.from({ length: count }, () => "?").join(",");
}

function phase_of(item, now) {
  const starts = item.starts_at ? new Date(item.starts_at) : null;
  const ends = item.ends_at ? new Date(item.ends_at) : null;
  if (starts && !Number.isNaN(starts.getTime()) && now < starts) return "upcoming";
  if (ends && !Number.isNaN(ends.getTime()) && now > ends) return "ended";
  return starts || ends ? "live" : "open";
}

async function my_resumes(pool, student_id) {
  if (!await table_exists(pool, "tbl_student_resume_analysis")) return [];
  const [rows] = await sqlQuery(
    pool,
    `SELECT analysis_id, student_id, file_name, analysis_json, overall_score, resume_url, created_at
     FROM tbl_student_resume_analysis
     WHERE student_id = ?
     ORDER BY analysis_id DESC
     LIMIT ${LIMIT}`,
    [student_id]
  );
  return (rows || []).map((row) => {
    const { student_id: _owner, skills: _skills, ...rest } = resume_row(row);
    return rest;
  });
}

async function my_interviews(pool, student_id) {
  if (!await table_exists(pool, "tbl_student_mock_interviews")) return [];
  const [rows] = await sqlQuery(
    pool,
    `SELECT mock_interview_id, student_id, role_source, status, total_questions, analysis_json,
            answers_json, performance_json, session_json, created_at, updated_at
     FROM tbl_student_mock_interviews
     WHERE student_id = ?
     ORDER BY mock_interview_id DESC
     LIMIT ${LIMIT}`,
    [student_id]
  );
  return (rows || []).map((row) => {
    const { student_id: _owner, topics, gaps: _gaps, ...rest } = mock_row(row);
    const by_topic = new Map();
    for (const entry of topics || []) {
      const name = String(entry.topic || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const current = by_topic.get(key) || { topic: name, scores: [] };
      if (Number.isFinite(entry.score)) current.scores.push(entry.score);
      by_topic.set(key, current);
    }
    return {
      ...rest,
      topics: [...by_topic.values()].map((entry) => ({
        topic: entry.topic,
        asked: entry.scores.length,
        score: round(average(entry.scores), 1)
      }))
    };
  });
}

async function my_hackathons(pool, user, student_id) {
  await ensure_hackathon_schema();
  const visible = await list_student_hackathons(user);
  const joined = visible.filter((item) => item.done_count > 0 || item.batch_name);
  if (!joined.length) return [];
  const ids = joined.map((item) => item.hackathon_id);
  const kind_sql = "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.body_json, '$.item_type')), 'project')";
  const [item_rows] = await sqlQuery(
    pool,
    `SELECT i.hackathon_id, ${kind_sql} AS kind, COUNT(*) AS total
     FROM tbl_hackathon_items i
     WHERE i.is_deleted = FALSE AND i.hackathon_id IN (${marks(ids.length)})
     GROUP BY i.hackathon_id, kind`,
    ids
  );
  const [response_rows] = await sqlQuery(
    pool,
    `SELECT r.hackathon_id, r.item_id, i.title, ${kind_sql} AS kind,
            JSON_UNQUOTE(JSON_EXTRACT(i.body_json, '$.correct_answer')) AS correct,
            DATE_FORMAT(r.updated_at, '%Y-%m-%dT%H:%i') AS saved_at,
            CASE
              WHEN NOT JSON_VALID(r.answer_text) THEN LEFT(r.answer_text, 200)
              WHEN ${kind_sql} = 'coding' THEN JSON_UNQUOTE(JSON_EXTRACT(r.answer_text, '$.score'))
              WHEN ${kind_sql} = 'project' THEN JSON_OBJECT(
                'github_url', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.answer_text, '$.github_url')), JSON_UNQUOTE(JSON_EXTRACT(r.answer_text, '$.repo_url')), ''),
                'demo_url', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.answer_text, '$.demo_url')), ''),
                'documentation_url', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.answer_text, '$.documentation_url')), ''),
                'file_name', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(r.answer_text, '$.file_name')), ''),
                'score', JSON_EXTRACT(r.answer_text, '$.score'),
                'max_score', COALESCE(JSON_EXTRACT(r.answer_text, '$.max_score'), i.marks)
              )
              ELSE LEFT(r.answer_text, 200)
            END AS answer
     FROM tbl_hackathon_responses r
     INNER JOIN tbl_hackathon_items i ON i.item_id = r.item_id AND i.is_deleted = FALSE
     WHERE r.is_deleted = FALSE AND r.student_id COLLATE utf8mb4_unicode_ci = ?
       AND r.hackathon_id IN (${marks(ids.length)})
     ORDER BY r.updated_at DESC`,
    [student_id, ...ids]
  );
  const totals = new Map();
  for (const row of item_rows || []) {
    const id = Number(row.hackathon_id);
    if (!totals.has(id)) totals.set(id, { mcq: 0, coding: 0, project: 0 });
    if (row.kind in totals.get(id)) totals.get(id)[row.kind] = Number(row.total) || 0;
  }
  const now = new Date();
  return joined.map((item) => {
    const counts = totals.get(item.hackathon_id) || { mcq: 0, coding: 0, project: 0 };
    const mine = (response_rows || []).filter((row) => Number(row.hackathon_id) === item.hackathon_id);
    let points = 0;
    let mcq_correct = 0;
    let mcq_answered = 0;
    let coding_answered = 0;
    const projects = [];
    const project_percents = [];
    for (const row of mine) {
      if (row.kind === "mcq") {
        mcq_answered += 1;
        if (String(row.answer || "").trim() && String(row.answer).trim() === String(row.correct || "").trim()) {
          mcq_correct += 1;
          points += 1;
        }
      } else if (row.kind === "coding") {
        coding_answered += 1;
        const score = Number(row.answer);
        if (Number.isFinite(score)) points += Math.max(0, Math.min(100, score)) / 100;
      } else {
        const { score: graded, max_score: out_of, ...links } = read_json(row.answer, {}) || {};
        const percent = graded != null && Number(out_of) > 0 ? Math.max(0, Math.min(100, (Number(graded) / Number(out_of)) * 100)) : null;
        if (Number.isFinite(percent)) project_percents.push(percent);
        if (!links.github_url && !links.demo_url && !links.documentation_url && !links.file_name) continue;
        projects.push({
          item_id: Number(row.item_id),
          title: row.title || "Project",
          submitted_at: row.saved_at || "",
          ...links,
          score: Number.isFinite(Number(graded)) && graded != null ? Number(graded) : null,
          max_score: Number(out_of) || null
        });
      }
    }
    const scorable = counts.mcq + counts.coding;
    const project_score = project_percents.length ? round(average(project_percents), 1) : null;
    return {
      hackathon_id: item.hackathon_id,
      title: item.title,
      description: item.description,
      phase: phase_of(item, now),
      starts_at: item.starts_at,
      ends_at: item.ends_at,
      place: item.audience === "open" ? "Open to all" : item.program_name || item.cohort_name || "",
      team: item.batch_name || "",
      done_count: item.done_count,
      goal_count: item.goal_count,
      score: scorable && (mcq_answered || coding_answered) ? round((points / scorable) * 100, 1) : scorable ? null : project_score,
      mcq: { total: counts.mcq, answered: mcq_answered, correct: mcq_correct },
      coding: { total: counts.coding, answered: coding_answered },
      projects,
      last_activity: mine[0]?.saved_at || ""
    };
  }).sort((a, b) => String(b.last_activity).localeCompare(String(a.last_activity)));
}

export async function student_history(user) {
  const student_id = student_code(user);
  const pool = get_pool();
  const [resumes, interviews, hackathons] = await Promise.all([
    my_resumes(pool, student_id),
    my_interviews(pool, student_id),
    my_hackathons(pool, user, student_id)
  ]);
  const scored_interviews = interviews.filter((row) => row.score != null);
  return {
    summary: {
      resumes: resumes.length,
      best_resume: resumes.length ? Math.max(...resumes.map((row) => row.overall_score ?? 0)) : null,
      latest_resume: resumes[0]?.overall_score ?? null,
      interviews: interviews.length,
      completed_interviews: interviews.filter((row) => row.status === "completed").length,
      avg_interview: round(average(scored_interviews.map((row) => row.score)), 1),
      hackathons: hackathons.length,
      projects: hackathons.reduce((sum, row) => sum + row.projects.length, 0)
    },
    resumes,
    interviews,
    hackathons
  };
}

export async function my_interview_detail(user, id) {
  const student_id = student_code(user);
  const detail = await mock_interview_detail(id);
  if (String(detail.student_id) !== student_id) throw fail("Interview not found", 404);
  return detail;
}

export async function my_resume_detail(user, id) {
  const student_id = student_code(user);
  const detail = await resume_detail(id);
  if (String(detail.student_id) !== student_id) throw fail("Analysis not found", 404);
  return detail;
}
