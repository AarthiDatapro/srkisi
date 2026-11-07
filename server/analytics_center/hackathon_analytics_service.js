import { sqlQuery } from "@datapromr/auth/server";
import { get_pool } from "../utils/db_setup.js";
import { ensure_hackathon_schema } from "../hackathon_manager/schema.js";
import { ensure_registration_schema } from "../course_registration/schema.js";
import { analytics_access } from "./analytics_service.js";

const BUILDER_LIMIT = 12;

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

function marks(count) {
  return Array.from({ length: count }, () => "?").join(",");
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

function full_name(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || String(row.student_id);
}

function is_web_url(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}

function phase_of(row, now) {
  const starts = row.starts_at ? new Date(String(row.starts_at).replace(" ", "T")) : null;
  const ends = row.ends_at ? new Date(String(row.ends_at).replace(" ", "T")) : null;
  if (starts && now < starts) return "upcoming";
  if (ends && now > ends) return "ended";
  if (starts || ends) return "live";
  return "open";
}

export async function load_program(pool, program_id, only_hackathon_id = 0, course_id = 0) {
  const student_params = [];
  let student_where = "r.is_deleted = FALSE AND r.status = 'registered'";
  if (program_id) {
    student_where += " AND r.program_id = ?";
    student_params.push(program_id);
  }
  if (course_id) {
    student_where += " AND r.course_id = ?";
    student_params.push(course_id);
  }
  const [registered] = await sqlQuery(
    pool,
    `SELECT DISTINCT r.student_id, r.course_student_id
     FROM tbl_course_registrations r
     WHERE ${student_where}`,
    student_params
  );
  const program_students = new Set((registered || []).map((row) => String(row.student_id)));
  const itda = new Map();
  for (const row of registered || []) if (row.course_student_id && !itda.has(String(row.student_id))) itda.set(String(row.student_id), String(row.course_student_id));

  const hackathon_params = [];
  let program_scope = `EXISTS (
         SELECT 1 FROM tbl_hackathon_programs hp
         WHERE hp.hackathon_id = h.hackathon_id AND hp.is_deleted = FALSE`;
  if (program_id) {
    program_scope += " AND hp.program_id = ?";
    hackathon_params.push(program_id);
  } else if (course_id) {
    program_scope += ` AND EXISTS (
           SELECT 1 FROM tbl_program_courses pc
           WHERE pc.program_id = hp.program_id AND pc.course_id = ? AND pc.is_deleted = FALSE
         )`;
    hackathon_params.push(course_id);
  }
  program_scope += ")";
  const hackathon_scope = `(h.audience = 'open' OR ${program_scope})`;
  const [hackathon_rows] = await sqlQuery(
    pool,
    `SELECT h.hackathon_id, h.title, h.description, h.hackathon_type, h.audience, h.required_submissions,
            DATE_FORMAT(h.starts_at, '%Y-%m-%d %H:%i') AS starts_at,
            DATE_FORMAT(h.ends_at, '%Y-%m-%d %H:%i') AS ends_at
     FROM tbl_hackathons h
     WHERE h.is_deleted = FALSE AND h.status = 'published'
       AND ${hackathon_scope}
     ORDER BY h.starts_at IS NULL, h.starts_at ASC, h.hackathon_id ASC`,
    hackathon_params
  );
  const picked_rows = (hackathon_rows || []).filter((row) => !only_hackathon_id || Number(row.hackathon_id) === only_hackathon_id);
  const ids = picked_rows.map((row) => Number(row.hackathon_id));
  if (!ids.length) return { program_students, people: new Map(), hackathons: [] };

  const [item_rows] = await sqlQuery(
    pool,
    `SELECT item_id, hackathon_id, title,
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(body_json, '$.item_type')), 'project') AS kind,
            JSON_UNQUOTE(JSON_EXTRACT(body_json, '$.correct_answer')) AS correct,
            LEFT(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(body_json, '$.overview')), JSON_UNQUOTE(JSON_EXTRACT(body_json, '$.description')), ''), 400) AS overview
     FROM tbl_hackathon_items
     WHERE is_deleted = FALSE AND hackathon_id IN (${marks(ids.length)})
     ORDER BY sort_no ASC, item_id ASC`,
    ids
  );
  const [member_rows] = await sqlQuery(
    pool,
    `SELECT b.hackathon_id, b.batch_id, b.batch_name, bs.student_id
     FROM tbl_hackathon_batches b
     LEFT JOIN tbl_hackathon_batch_students bs ON bs.batch_id = b.batch_id AND bs.is_deleted = FALSE
     WHERE b.is_deleted = FALSE AND b.hackathon_id IN (${marks(ids.length)})
     ORDER BY b.batch_id ASC`,
    ids
  );
  const [response_rows] = await sqlQuery(
    pool,
    `SELECT r.hackathon_id, r.item_id, r.student_id,
            DATE_FORMAT(r.updated_at, '%Y-%m-%d %H:%i') AS saved_at,
            CASE
              WHEN NOT JSON_VALID(r.answer_text) THEN LEFT(r.answer_text, 200)
              WHEN COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.body_json, '$.item_type')), 'project') = 'coding'
                THEN JSON_UNQUOTE(JSON_EXTRACT(r.answer_text, '$.score'))
              WHEN COALESCE(JSON_UNQUOTE(JSON_EXTRACT(i.body_json, '$.item_type')), 'project') = 'project'
                THEN JSON_OBJECT(
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
     WHERE r.is_deleted = FALSE AND r.hackathon_id IN (${marks(ids.length)})
     ORDER BY r.updated_at DESC, r.response_id DESC`,
    ids
  );

  const kept_member_rows = course_id ? (member_rows || []).filter((row) => !row.student_id || program_students.has(String(row.student_id))) : (member_rows || []);
  const kept_response_rows = course_id ? (response_rows || []).filter((row) => program_students.has(String(row.student_id))) : (response_rows || []);
  const everyone = new Set(program_id || course_id ? program_students : []);
  for (const row of kept_member_rows) if (row.student_id) everyone.add(String(row.student_id));
  for (const row of kept_response_rows) everyone.add(String(row.student_id));
  const people = new Map();
  if (everyone.size) {
    const list = [...everyone];
    const [student_rows] = await sqlQuery(
      pool,
      `SELECT student_id, first_name, last_name, email, mobile_number
       FROM tbl_students WHERE is_deleted = FALSE AND student_id IN (${marks(list.length)})`,
      list
    );
    for (const row of student_rows || []) {
      const id = String(row.student_id);
      people.set(id, { name: full_name(row), email: row.email || "", mobile: row.mobile_number || "", itda_id: itda.get(id) || "" });
    }
  }
  const name_of = (id) => people.get(id)?.name || id;

  const items = new Map();
  for (const row of item_rows || []) {
    items.set(Number(row.item_id), {
      hackathon_id: Number(row.hackathon_id),
      kind: row.kind || "project",
      title: row.title || "Task",
      overview: String(row.overview || "").replace(/\s+/g, " ").trim().slice(0, 240),
      correct: String(row.correct || "").trim()
    });
  }
  const responses_by = new Map();
  for (const row of kept_response_rows) {
    const id = Number(row.hackathon_id);
    if (!responses_by.has(id)) responses_by.set(id, []);
    responses_by.get(id).push(row);
  }
  const members_by = new Map();
  for (const row of kept_member_rows) {
    const id = Number(row.hackathon_id);
    if (!members_by.has(id)) members_by.set(id, []);
    members_by.get(id).push(row);
  }

  const now = new Date();
  const hackathons = picked_rows.map((row) => {
    const hackathon_id = Number(row.hackathon_id);
    const tasks = { mcq: 0, coding: 0, project: 0 };
    for (const item of items.values()) if (item.hackathon_id === hackathon_id && item.kind in tasks) tasks[item.kind] += 1;
    const scorable = tasks.mcq + tasks.coding;

    const team_map = new Map();
    const team_of = new Map();
    for (const member of members_by.get(hackathon_id) || []) {
      const batch_id = Number(member.batch_id);
      if (!team_map.has(batch_id)) team_map.set(batch_id, { batch_id, name: member.batch_name || `Team ${batch_id}`, member_ids: [] });
      if (member.student_id) {
        const sid = String(member.student_id);
        if (!team_map.get(batch_id).member_ids.includes(sid)) team_map.get(batch_id).member_ids.push(sid);
        team_of.set(sid, team_map.get(batch_id).name);
      }
    }

    const responders = new Set();
    const project_by = new Map();
    const project_points = new Map();
    const points = new Map();
    const answered = new Map();
    const timeline = new Map();
    const projects = [];
    for (const response of responses_by.get(hackathon_id) || []) {
      const item = items.get(Number(response.item_id));
      if (!item) continue;
      const sid = String(response.student_id);
      responders.add(sid);
      const day = String(response.saved_at || "").slice(0, 10);
      if (day) timeline.set(day, (timeline.get(day) || 0) + 1);
      if (item.kind === "project") {
        const links = read_json(response.answer, {}) || {};
        const graded = Number(links.score);
        const out_of = Number(links.max_score) || 0;
        if (links.score != null && Number.isFinite(graded) && out_of > 0) {
          if (!project_points.has(sid)) project_points.set(sid, []);
          project_points.get(sid).push(Math.max(0, Math.min(100, (graded / out_of) * 100)));
        }
        const record = {
          github_url: String(links.github_url || ""),
          demo_url: String(links.demo_url || ""),
          documentation_url: String(links.documentation_url || ""),
          file_name: String(links.file_name || "")
        };
        if (!record.github_url && !record.demo_url && !record.documentation_url && !record.file_name) continue;
        project_by.set(sid, (project_by.get(sid) || 0) + 1);
        projects.push({
          key: `${hackathon_id}-${response.item_id}-${sid}`,
          title: item.title,
          overview: item.overview,
          student_id: sid,
          student_name: name_of(sid),
          team: team_of.get(sid) || "",
          submitted_at: response.saved_at || "",
          ...record
        });
        continue;
      }
      let value = 0;
      if (item.kind === "mcq") {
        const answer = String(response.answer || "").trim();
        value = answer && answer === item.correct ? 1 : 0;
      } else {
        const score = Number(response.answer);
        value = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) / 100 : 0;
      }
      points.set(sid, (points.get(sid) || 0) + value);
      answered.set(sid, (answered.get(sid) || 0) + 1);
    }

    const graded_projects = !scorable && project_points.size > 0;
    const scores = (scorable ?
      [...points.keys()].map((sid) => ({
        student_id: sid,
        name: name_of(sid),
        team: team_of.get(sid) || "",
        percent: round((points.get(sid) / scorable) * 100, 1),
        answered: answered.get(sid) || 0
      })) :
      [...project_points.entries()].map(([sid, list]) => ({
        student_id: sid,
        name: name_of(sid),
        team: team_of.get(sid) || "",
        percent: round(list.reduce((sum, value) => sum + value, 0) / list.length, 1),
        answered: list.length
      }))).sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));
    const score_of = new Map(scores.map((item) => [item.student_id, item.percent]));

    const required = as_int(row.required_submissions) || (tasks.project ? 1 : 0);
    const met_goal = (sid) => (tasks.project ? (project_by.get(sid) || 0) >= required : responders.has(sid));
    const teams = [...team_map.values()].map((team) => {
      const members = team.member_ids.map((sid) => ({
        student_id: sid,
        name: name_of(sid),
        projects: project_by.get(sid) || 0,
        responded: responders.has(sid),
        score: score_of.get(sid) ?? null
      }));
      const done = team.member_ids.filter(met_goal).length;
      return {
        batch_id: team.batch_id,
        name: team.name,
        size: members.length,
        done,
        rate: percent(done, members.length),
        projects: members.reduce((sum, member) => sum + member.projects, 0),
        members
      };
    }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || a.name.localeCompare(b.name, undefined, { numeric: true }));

    const roster_set = new Set(teams.flatMap((team) => team.members.map((member) => member.student_id)));
    const roster = roster_set.size ? roster_set : responders;
    const finished = [...roster].filter(met_goal);
    const pending = [...roster]
      .filter((sid) => !responders.has(sid))
      .map((sid) => ({ student_id: sid, name: name_of(sid), team: team_of.get(sid) || "" }))
      .sort((a, b) => a.team.localeCompare(b.team, undefined, { numeric: true }) || a.name.localeCompare(b.name));

    const participants = [...new Set([...roster, ...responders])].map((sid) => ({
      student_id: sid,
      team: team_of.get(sid) || "",
      projects: project_by.get(sid) || 0,
      score: score_of.get(sid) ?? null,
      status: !responders.has(sid) ? "Pending" : met_goal(sid) ? "Done" : "Partial"
    }));

    const live = projects.filter((item) => is_web_url(item.demo_url)).length;
    return {
      hackathon_id,
      title: row.title || "Hackathon",
      audience: row.audience || "program",
      description: String(row.description || "").replace(/\s+/g, " ").trim().slice(0, 180),
      phase: phase_of(row, now),
      starts_at: row.starts_at || "",
      ends_at: row.ends_at || "",
      required_submissions: tasks.project ? required : 0,
      tasks,
      scored: scorable > 0 || graded_projects,
      stats: {
        teams: teams.length,
        members: roster.size,
        participants: responders.size,
        finished: finished.length,
        completion: percent(finished.length, roster.size),
        participation: percent(responders.size, roster.size),
        projects: projects.length,
        live,
        live_rate: percent(live, projects.length),
        repos: projects.filter((item) => is_web_url(item.github_url)).length,
        docs: projects.filter((item) => is_web_url(item.documentation_url)).length,
        zips: projects.filter((item) => item.file_name).length,
        pending: pending.length,
        avg_score: scores.length ? round(scores.reduce((sum, item) => sum + item.percent, 0) / scores.length, 1) : null,
        top_score: scores.length ? scores[0].percent : null
      },
      timeline: [...timeline.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count })),
      teams,
      projects,
      scores,
      pending,
      participants
    };
  });
  return { program_students, people, hackathons };
}

function summary_of(loaded) {
  const { program_students, hackathons } = loaded;
  const builder_map = new Map();
  for (const hackathon of hackathons) {
    for (const row of hackathon.participants) {
      const entry = builder_map.get(row.student_id) || { student_id: row.student_id, joined: 0, projects: 0, scores: [] };
      entry.joined += 1;
      entry.projects += row.projects;
      if (row.score != null) entry.scores.push(row.score);
      builder_map.set(row.student_id, entry);
    }
  }
  const in_program = [...builder_map.keys()].filter((sid) => program_students.has(sid)).length;
  const all_projects = hackathons.reduce((sum, item) => sum + item.stats.projects, 0);
  const all_live = hackathons.reduce((sum, item) => sum + item.stats.live, 0);
  const score_values = hackathons.flatMap((item) => item.scores.map((score) => score.percent));
  return {
    summary: {
      hackathons: hackathons.length,
      live_now: hackathons.filter((item) => item.phase === "live").length,
      participants: builder_map.size,
      participation: percent(in_program, program_students.size),
      teams: hackathons.reduce((sum, item) => sum + item.stats.teams, 0),
      projects: all_projects,
      live_rate: percent(all_live, all_projects),
      avg_score: score_values.length ? round(score_values.reduce((sum, value) => sum + value, 0) / score_values.length, 1) : null
    },
    builders: [...builder_map.values()]
      .map((entry) => ({
        student_id: entry.student_id,
        name: loaded.people.get(entry.student_id)?.name || entry.student_id,
        joined: entry.joined,
        projects: entry.projects,
        avg_score: entry.scores.length ? round(entry.scores.reduce((sum, value) => sum + value, 0) / entry.scores.length, 1) : null
      }))
      .sort((a, b) => b.projects - a.projects || b.joined - a.joined || a.name.localeCompare(b.name))
      .slice(0, BUILDER_LIMIT)
  };
}

function list_row(hackathon) {
  const { teams, projects, scores, pending, participants, timeline, ...rest } = hackathon;
  return rest;
}

async function scope_from(query, user) {
  const viewer = await analytics_access(user);
  if (viewer.mode === "none") throw fail("Hackathon analytics is not available until you are assigned to a program", 403);
  const program_id = as_int(query.program_id);
  const course_id = as_int(query.course_id);
  if (viewer.mode === "program") {
    if (!program_id || !viewer.program_ids.includes(program_id)) throw fail("This program is not assigned to you", 403);
    if (course_id) {
      const pool = get_pool();
      const [rows] = await sqlQuery(
        pool,
        `SELECT 1 AS ok FROM tbl_program_courses
         WHERE program_id = ? AND course_id = ? AND is_deleted = FALSE LIMIT 1`,
        [program_id, course_id]
      );
      if (!rows?.[0]) throw fail("This course is not part of the program", 404);
    }
  }
  return { program_id, course_id };
}

export async function prepare() {
  await ensure_hackathon_schema();
  await ensure_registration_schema();
  return get_pool();
}

export async function hackathon_analytics(query = {}, user = {}) {
  const scope = await scope_from(query, user);
  const pool = await prepare();
  const loaded = await load_program(pool, scope.program_id, 0, scope.course_id);
  if (!loaded.hackathons.length) return { students_total: loaded.program_students.size, summary: null, builders: [], hackathons: [] };
  return { students_total: loaded.program_students.size, ...summary_of(loaded), hackathons: loaded.hackathons.map(list_row) };
}

export async function hackathon_analytics_detail(query = {}, user = {}) {
  const scope = await scope_from(query, user);
  const hackathon_id = as_int(query.hackathon_id);
  if (!hackathon_id) throw fail("Choose a hackathon");
  const pool = await prepare();
  const loaded = await load_program(pool, scope.program_id, hackathon_id, scope.course_id);
  const hackathon = loaded.hackathons.find((item) => item.hackathon_id === hackathon_id);
  if (!hackathon) throw fail("Hackathon not found", 404);
  const { participants, ...detail } = hackathon;
  const contacts = {};
  for (const row of hackathon.pending) {
    const person = loaded.people.get(row.student_id);
    if (person) contacts[row.student_id] = { email: person.email, mobile: person.mobile };
  }
  return { ...detail, contacts };
}

export async function hackathon_analytics_export(query = {}, user = {}) {
  const scope = await scope_from(query, user);
  const pool = await prepare();
  const loaded = await load_program(pool, scope.program_id, 0, scope.course_id);
  const join = (list, field) => [...new Set(list.map((item) => item[field]).filter(Boolean))].join("\n");
  const hackathons = loaded.hackathons.map((hackathon) => {
    const projects_by = new Map();
    for (const project of hackathon.projects) {
      if (!projects_by.has(project.student_id)) projects_by.set(project.student_id, []);
      projects_by.get(project.student_id).push(project);
    }
    const ordered = [...hackathon.participants].sort((a, b) =>
      a.team.localeCompare(b.team, undefined, { numeric: true }) ||
      (loaded.people.get(a.student_id)?.name || "").localeCompare(loaded.people.get(b.student_id)?.name || ""));
    return {
      hackathon_id: hackathon.hackathon_id,
      title: hackathon.title,
      phase: hackathon.phase,
      starts_at: hackathon.starts_at,
      ends_at: hackathon.ends_at,
      required: hackathon.required_submissions,
      scored: hackathon.scored,
      stats: hackathon.stats,
      rows: ordered.map((row) => {
        const person = loaded.people.get(row.student_id) || {};
        const projects = projects_by.get(row.student_id) || [];
        return {
          student: person.name || row.student_id,
          itda_id: person.itda_id || "",
          email: person.email || "",
          mobile: person.mobile || "",
          team: row.team,
          status: row.status,
          projects: row.projects,
          score: row.score,
          project_titles: join(projects, "title"),
          live_sites: join(projects, "demo_url"),
          repositories: join(projects, "github_url"),
          documentation: join(projects, "documentation_url"),
          files: join(projects, "file_name"),
          submitted_at: projects.map((item) => item.submitted_at).filter(Boolean).sort().at(-1) || ""
        };
      })
    };
  });
  return { hackathons };
}
