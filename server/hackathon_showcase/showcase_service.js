import crypto from "node:crypto";
import { sqlQuery } from "@datapromr/auth/server";
import { load_program, prepare } from "../analytics_center/hackathon_analytics_service.js";
import { ensure_showcase_schema } from "./schema.js";

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

function percent(part, whole) {
  return whole ? round((part / whole) * 100, 1) : null;
}

function is_web_url(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}

function scope_from(body) {
  const program_id = as_int(body.program_id);
  if (!program_id) throw fail("Choose a program");
  return program_id;
}

async function program_label(pool, program_id, cohort_id) {
  const [rows] = await sqlQuery(pool, "SELECT program_name, program_code FROM tbl_programs WHERE program_id = ? AND is_deleted = FALSE", [program_id]);
  if (!rows?.length) throw fail("Program not found", 404);
  let cohort_name = "";
  if (cohort_id) {
    const [cohorts] = await sqlQuery(pool, "SELECT cohort_name FROM tbl_cohorts WHERE cohort_id = ? AND is_deleted = FALSE", [cohort_id]);
    cohort_name = cohorts?.[0]?.cohort_name || "";
  }
  return { program_name: rows[0].program_name, program_code: rows[0].program_code, cohort_name };
}

export async function share_hackathon_showcase(body = {}, user = {}) {
  const program_id = scope_from(body);
  const cohort_id = as_int(body.cohort_id) || null;
  const pool = await prepare();
  await ensure_showcase_schema();
  await program_label(pool, program_id, cohort_id);
  const [existing] = await sqlQuery(
    pool,
    `SELECT token FROM tbl_hackathon_share_links
     WHERE program_id = ? AND ((cohort_id IS NULL AND ? IS NULL) OR cohort_id = ?) AND is_revoked = FALSE
     ORDER BY share_id DESC LIMIT 1`,
    [program_id, cohort_id, cohort_id]
  );
  if (existing?.length) return { token: existing[0].token };
  const token = crypto.randomBytes(24).toString("hex");
  await sqlQuery(
    pool,
    "INSERT INTO tbl_hackathon_share_links (token, cohort_id, program_id, created_by) VALUES (?, ?, ?, ?)",
    [token, cohort_id, program_id, as_int(user.sub) || null]
  );
  return { token };
}

export async function public_hackathon_showcase(token) {
  const value = String(token || "").trim();
  if (!/^[a-f0-9]{48}$/.test(value)) throw fail("This showcase link is not valid", 404);
  const pool = await prepare();
  await ensure_showcase_schema();
  const [links] = await sqlQuery(
    pool,
    "SELECT cohort_id, program_id FROM tbl_hackathon_share_links WHERE token = ? AND is_revoked = FALSE LIMIT 1",
    [value]
  );
  if (!links?.length) throw fail("This showcase link is not valid", 404);
  return program_showcase(Number(links[0].program_id), as_int(links[0].cohort_id));
}

export async function program_showcase(program_id, cohort_id = 0) {
  const pool = await prepare();
  const label = await program_label(pool, program_id, cohort_id);
  const loaded = await load_program(pool, program_id);
  return { ...label, ...showcase_payload(loaded) };
}

function most_common(values) {
  const counts = new Map();
  for (const value of values) if (value) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function unique_urls(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(is_web_url))];
}

function showcase_payload(loaded) {
  const keys = new Map();
  const people = new Map();
  const person_key = (student_id) => {
    if (!keys.has(student_id)) {
      const key = `p${keys.size + 1}`;
      const person = loaded.people.get(student_id) || {};
      keys.set(student_id, key);
      people.set(key, { key, name: person.name || "Builder", itda_id: person.itda_id || "" });
    }
    return keys.get(student_id);
  };
  const hackathons = [];
  const teams = [];
  for (const hackathon of loaded.hackathons) {
    const projects_by = new Map();
    for (const project of hackathon.projects) {
      if (!projects_by.has(project.student_id)) projects_by.set(project.student_id, []);
      projects_by.get(project.student_id).push(project);
    }
    const score_by = new Map(hackathon.scores.map((row) => [row.student_id, row.percent]));
    const groups = hackathon.teams.map((team) => ({ name: team.name, member_ids: team.members.map((member) => member.student_id) }));
    const grouped = new Set(groups.flatMap((group) => group.member_ids));
    for (const student_id of new Set([...projects_by.keys(), ...score_by.keys()])) {
      if (!grouped.has(student_id)) groups.push({ name: "Individual", member_ids: [student_id] });
    }
    const entries = [];
    groups.forEach((group, index) => {
      const submissions = group.member_ids.flatMap((student_id) => projects_by.get(student_id) || []);
      const scores = group.member_ids.map((student_id) => score_by.get(student_id)).filter((value) => value != null);
      if (!submissions.length && !scores.length) return;
      const submitted = group.member_ids.filter((student_id) => projects_by.has(student_id) || score_by.has(student_id)).length;
      const score = scores.length ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 1) : null;
      const lives = unique_urls(submissions.map((item) => item.demo_url));
      entries.push({
        key: `${hackathon.hackathon_id}-${index}`,
        hackathon_id: hackathon.hackathon_id,
        team: group.name,
        title: most_common(submissions.map((item) => item.title)) || hackathon.title,
        overview: submissions.find((item) => item.overview)?.overview || "",
        live: lives[0] || "",
        lives,
        repos: unique_urls(submissions.map((item) => item.github_url)),
        docs: unique_urls(submissions.map((item) => item.documentation_url)),
        files: [...new Set(submissions.map((item) => item.file_name).filter(Boolean))],
        members: group.member_ids.map(person_key),
        submitted,
        size: group.member_ids.length,
        score,
        value: hackathon.scored && score != null ? score : percent(submitted, group.member_ids.length) ?? 0,
        submitted_at: submissions.map((item) => item.submitted_at).sort().at(-1) || ""
      });
    });
    entries.sort((a, b) =>
      b.value - a.value ||
      Number(Boolean(b.live)) - Number(Boolean(a.live)) ||
      b.repos.length - a.repos.length ||
      a.submitted_at.localeCompare(b.submitted_at)
    );
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    teams.push(...entries);
    hackathons.push({
      hackathon_id: hackathon.hackathon_id,
      title: hackathon.title,
      starts_at: hackathon.starts_at,
      ends_at: hackathon.ends_at,
      phase: hackathon.phase,
      scored: hackathon.scored,
      required: hackathon.required_submissions,
      team_count: hackathon.stats.teams
    });
  }
  return { hackathons, teams, people: [...people.values()] };
}
