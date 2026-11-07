import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@datapromr/toast";
import { export_hackathon_analytics, get_hackathon_analytics, get_hackathon_detail } from "../api.js";
import { create_showcase_link, showcase_url } from "../../hackathon_showcase/api.js";
import {
  Bar_List,
  Data_Table,
  Detail_Drawer,
  ICONS,
  Kpi_Grid,
  Panel,
  People_List,
  Trend_Chart,
  initials,
  show
} from "../../ai_monitor/ui/monitor_parts.jsx";
import { Report_Sheet_Preview } from "../../course_content_manager/ui/report_sheet_preview.jsx";
import { save_workbook } from "../../design_system/excel_workbook.js";
import { ANC_ICONS, Scope_Head, use_scope } from "./scope_bar.jsx";
import "../../ai_monitor/theme/ai_monitor.css";
import "../theme/analytics_center.css";
import { ANALYTICS_CENTER_ENGLISH as ENGLISH } from "../../constants/english/analytics_center_constants_english.js";

const MEDALS = { 1: "#e3b01b", 2: "#9aa3b8", 3: "#c77d45" };
const PHASE = {
  live: { get label() { return ENGLISH.live_now; }, tone: "good" },
  upcoming: { get label() { return ENGLISH.upcoming; }, tone: "warn" },
  ended: { get label() { return ENGLISH.ended; }, tone: "none" },
  open: { get label() { return ENGLISH.no_schedule; }, tone: "none" }
};
const TEAM_VIEWS = [
  { id: "", label: ENGLISH.all_teams },
  { id: "open", label: ENGLISH.incomplete },
  { id: "done", label: ENGLISH.complete }
];

function percent_text(value) {
  return value == null ? "" : `${value}%`;
}

function hackathon_workbook(hackathons, program_code) {
  const stamp = new Date().toISOString().slice(0, 10);
  const overall = {
    id: "overall",
    get label() { return ENGLISH.overall; },
    widths: [240, 90, 140, 140, 70, 80, 90, 90, 80, 80, 80, 90],
    headers: [ENGLISH.hackathon, ENGLISH.status, ENGLISH.starts, ENGLISH.ends, ENGLISH.teams, ENGLISH.builders, ENGLISH.participated, ENGLISH.completed, ENGLISH.projects, ENGLISH.live_sites, ENGLISH.repos, ENGLISH.avg_score],
    rows: hackathons.map((item) => [
      item.title,
      PHASE[item.phase]?.label || item.phase,
      item.starts_at || "",
      item.ends_at || "",
      item.stats.teams,
      item.stats.members,
      percent_text(item.stats.participation),
      percent_text(item.stats.completion),
      item.stats.projects,
      item.stats.live,
      item.stats.repos,
      item.scored ? percent_text(item.stats.avg_score) : ""
    ])
  };
  const sheets = hackathons.map((item) => ({
    id: `h${item.hackathon_id}`,
    label: item.title,
    widths: [170, 90, 200, 110, 80, 80, 70, 70, 200, 260, 260, 220, 140],
    headers: [ENGLISH.student, ENGLISH.itda_id, ENGLISH.email, ENGLISH.mobile, ENGLISH.team, ENGLISH.status, ENGLISH.projects, ENGLISH.score, ENGLISH.project, ENGLISH.live_site, ENGLISH.repository, ENGLISH.documentation, ENGLISH.submitted_at],
    rows: item.rows.map((row) => [
      row.student,
      row.itda_id,
      row.email,
      row.mobile,
      row.team,
      row.status,
      row.projects,
      percent_text(row.score),
      row.project_titles,
      row.live_sites,
      row.repositories,
      row.documentation,
      row.submitted_at
    ])
  }));
  return { file_name: `hackathons_${program_code || "program"}_${stamp}.xls`, sheets: [overall, ...sheets] };
}

function ord(number) {
  const teen = number % 100;
  const suffix = ["th", "st", "nd", "rd"][teen > 10 && teen < 14 ? 0 : number % 10 < 4 ? number % 10 : 0];
  return `${number}${suffix}`;
}

function safe_url(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function host_label(value) {
  try {
    const url = new URL(value);
    if (url.hostname.replace(/^www\./, "") === "github.com") return url.pathname.split("/").filter(Boolean).slice(0, 2).join("/") || "GitHub";
    return url.hostname.replace(/^www\./, "");
  } catch {
    return ENGLISH.link;
  }
}

function when_label(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function task_summary(tasks) {
  return [
    tasks.mcq ? ENGLISH.mcq(tasks.mcq) : "",
    tasks.coding ? ENGLISH.coding(tasks.coding) : "",
    tasks.project ? ENGLISH.project_2(tasks.project, tasks.project === 1 ? "" : "s") : ""
  ].filter(Boolean).join(" · ") || ENGLISH.no_tasks;
}

function Phase_Pill({ phase }) {
  const item = PHASE[phase] || PHASE.open;
  return <span className={`aim_pill is_${item.tone}`}>{item.label}</span>;
}

function Link_Pills({ project }) {
  return (
    <span className="anc_links_row">
      <i className={safe_url(project.demo_url) ? "is_on" : ""} title={ENGLISH.live_site}>{ENGLISH.live}</i>
      <i className={safe_url(project.github_url) ? "is_on" : ""} title={ENGLISH.repository}>{ENGLISH.repo}</i>
      <i className={safe_url(project.documentation_url) ? "is_on" : ""} title={ENGLISH.documentation}>{ENGLISH.docs}</i>
      <i className={project.file_name ? "is_on" : ""} title={ENGLISH.zip_upload}>{ENGLISH.zip}</i>
    </span>
  );
}

const PHASE_VIEWS = [
  { id: "", label: ENGLISH.all },
  { id: "live", label: ENGLISH.live },
  { id: "upcoming", label: ENGLISH.upcoming },
  { id: "ended", label: ENGLISH.ended },
  { id: "open", label: ENGLISH.no_schedule }
];

function compare_columns(active_id) {
  return [
    {
      key: "title",
      get label() { return ENGLISH.hackathon; },
      render: (row) =>
        <span className={`anc_compare_title ${row.hackathon_id === active_id ? "is_on" : ""}`.trim()}>
          <b title={row.title}>{row.title}</b>
          <small>
            <Phase_Pill phase={row.phase} />
            {row.audience === "open" ? <em className="anc_open_tag">{ENGLISH.open_to_all}</em> : null}
            {" "}{task_summary(row.tasks)}
          </small>
        </span>
    },
    { key: "members", get label() { return ENGLISH.builders; }, align: "end", render: (row) => row.stats.members, sort: (row) => row.stats.members },
    {
      key: "completion",
      get label() { return ENGLISH.completion; },
      render: (row) =>
        <span className="anc_compare_bar">
          <i><em style={{ width: `${row.stats.completion || 0}%` }} /></i>
          <b>{show(row.stats.completion, "%")}</b>
        </span>,
      sort: (row) => row.stats.completion
    },
    { key: "projects", get label() { return ENGLISH.projects; }, align: "end", render: (row) => row.stats.projects, sort: (row) => row.stats.projects },
    { key: "live_rate", get label() { return ENGLISH.live; }, align: "end", render: (row) => show(row.stats.live_rate, "%"), sort: (row) => row.stats.live_rate }
  ];
}

function Podium({ hackathon, on_project }) {
  const scored = hackathon.scored && hackathon.scores.length > 0;
  const featured = scored ?
    hackathon.scores.slice(0, 3).map((row) => ({ key: row.student_id, title: row.name, who: row.team || ENGLISH.individual, stamp: `${row.percent}%` })) :
    hackathon.projects.slice(0, 3).map((row) => ({ key: row.key, title: row.title, who: `${row.student_name}${row.team ? ` · ${row.team}` : ""}`, stamp: when_label(row.submitted_at), project: row }));
  if (!featured.length) return <p className="aim_empty">{ENGLISH.no_submissions_for_this_hackathon_yet}</p>;
  return (
    <>
      <p className="anc_pod_note">
        {scored ? ENGLISH.ranked_by_score_across_the_mcq_and_coding : ENGLISH.project_rounds_are_not_scored_so_these_are}
      </p>
      <div className="anc_podium">
        {featured.map((item, index) => {
          const place = index + 1;
          const body =
            <>
              <div className="anc_pod_rank">{ord(place)}</div>
              <div className="anc_pod_title">{item.title}</div>
              <div className="anc_pod_who">{item.who}</div>
              <div className="anc_pod_stamp">{item.stamp}</div>
            </>;
          return item.project ?
            <button key={item.key} type="button" className={`anc_pod is_r${place}`} style={{ "--mc": MEDALS[place] }} onClick={() => on_project(item.project)}>{body}</button> :
            <div key={item.key} className={`anc_pod is_r${place}`} style={{ "--mc": MEDALS[place] }}>{body}</div>;
        })}
      </div>
    </>
  );
}

function Team_Grid({ teams, on_open }) {
  if (!teams.length) return <p className="aim_empty">{ENGLISH.no_teams_were_set_up_for_this_hackathon}</p>;
  return (
    <div className="anc_teams">
      {teams.map((team) => {
        const tone = team.rate == null ? "none" : team.rate >= 100 ? "good" : team.rate > 0 ? "warn" : "bad";
        return (
          <button key={team.batch_id} type="button" className={`anc_team is_${tone}`} onClick={() => on_open(team)}>
            <header>
              <b>{team.name}</b>
              <em>{team.done}/{team.size}</em>
            </header>
            <span className="anc_team_faces">
              {team.members.slice(0, 5).map((member) => <i key={member.student_id} className={member.responded ? "is_on" : ""} title={member.name}>{initials(member.name)}</i>)}
              {team.members.length > 5 ? <i className="is_more">+{team.members.length - 5}</i> : null}
            </span>
            <span className="anc_team_bar"><em style={{ width: `${team.rate || 0}%` }} /></span>
          </button>
        );
      })}
    </div>
  );
}

function Project_Detail({ project, hackathon }) {
  const links = [
    safe_url(project.demo_url) ? { id: "live", get label() { return ENGLISH.open_live_site; }, href: safe_url(project.demo_url) } : null,
    safe_url(project.github_url) ? { id: "repo", label: host_label(project.github_url), href: safe_url(project.github_url) } : null,
    safe_url(project.documentation_url) ? { id: "docs", get label() { return ENGLISH.documentation; }, href: safe_url(project.documentation_url) } : null
  ].filter(Boolean);
  return (
    <div className="anc_detail">
      <header className="anc_detail_hero">
        <span className="anc_detail_avatar">{initials(project.student_name)}</span>
        <div>
          <h3>{project.title}</h3>
          <p>{[project.student_name, project.team, hackathon.title].filter(Boolean).join(" · ")}</p>
        </div>
      </header>
      <div className="anc_detail_stats is_four">
        <article className="is_rate"><b>{when_label(project.submitted_at)}</b><span>{ENGLISH.submitted}</span></article>
        <article className={safe_url(project.demo_url) ? "is_present" : "is_absent"}><b>{safe_url(project.demo_url) ? ENGLISH.yes : ENGLISH.no}</b><span>{ENGLISH.live_site}</span></article>
        <article className={safe_url(project.github_url) ? "is_present" : "is_absent"}><b>{safe_url(project.github_url) ? ENGLISH.yes : ENGLISH.no}</b><span>{ENGLISH.repository}</span></article>
        <article className={safe_url(project.documentation_url) ? "is_present" : "is_late"}><b>{safe_url(project.documentation_url) ? ENGLISH.yes : ENGLISH.no}</b><span>{ENGLISH.documentation}</span></article>
      </div>
      {project.overview ? <p className="anc_detail_note">{project.overview}</p> : null}
      <div className="anc_link_list">
        {links.map((link) =>
          <a key={link.id} className={`is_${link.id}`} href={link.href} target="_blank" rel="noopener noreferrer">
            {link.id === "live" ? ICONS.spark : link.id === "repo" ? ICONS.code : ICONS.doc}
            <span>{link.label}</span>
          </a>
        )}
        {project.file_name ? <span className="anc_link_file">{ICONS.folder}<span>{project.file_name}</span></span> : null}
        {!links.length && !project.file_name ? <p className="aim_muted">{ENGLISH.no_links_were_recorded_for_this_project}</p> : null}
      </div>
    </div>
  );
}

function Team_Detail({ team, required }) {
  return (
    <div className="anc_detail">
      <header className="anc_detail_hero">
        <span className="anc_detail_avatar">{ANC_ICONS.team}</span>
        <div>
          <h3>{team.name}</h3>
          <p>{team.size}{ENGLISH.members}{team.done}{ENGLISH.met_the_goal}{required ? ENGLISH.of_submission(required, required === 1 ? "" : "s") : ""}</p>
        </div>
        <span className={`aim_pill is_${team.rate >= 100 ? "good" : team.rate > 0 ? "warn" : "bad"}`}>{show(team.rate, "%")}</span>
      </header>
      <ul className="anc_member_list">
        {team.members.map((member) =>
          <li key={member.student_id}>
            <span className="anc_risk_avatar">{initials(member.name)}</span>
            <span className="anc_risk_text">
              <b>{member.name}</b>
              <small>{member.projects ? ENGLISH.project_submitted(member.projects, member.projects === 1 ? "" : "s") : member.responded ? ENGLISH.answered_no_project : ENGLISH.nothing_submitted_yet}{member.score != null ? ` · ${member.score}%` : ""}</small>
            </span>
            <span className={`aim_pill is_${member.projects || (member.responded && !required) ? "good" : member.responded ? "warn" : "bad"}`}>
              {member.projects || (member.responded && !required) ? ENGLISH.done : member.responded ? ENGLISH.partial : ENGLISH.pending}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

const PROJECT_COLUMNS = [
  { key: "title", get label() { return ENGLISH.project; }, render: (row) => <span className="aim_clip" title={row.title}><b>{row.title}</b></span> },
  {
    key: "student_name",
    get label() { return ENGLISH.builder; },
    render: (row) =>
      <span className="aim_student">
        <i>{initials(row.student_name)}</i>
        <span><b>{row.student_name}</b><small>{row.team || ENGLISH.no_team}</small></span>
      </span>
  },
  { key: "links", get label() { return ENGLISH.deliverables; }, render: (row) => <Link_Pills project={row} />, sort: (row) => [row.demo_url, row.github_url, row.documentation_url, row.file_name].filter(Boolean).length },
  { key: "submitted_at", get label() { return ENGLISH.submitted; }, render: (row) => when_label(row.submitted_at) }
];

const SCORE_COLUMNS = [
  {
    key: "name",
    get label() { return ENGLISH.student; },
    render: (row) =>
      <span className="aim_student">
        <i>{initials(row.name)}</i>
        <span><b>{row.name}</b><small>{row.team || ENGLISH.individual}</small></span>
      </span>
  },
  { key: "answered", get label() { return ENGLISH.graded; }, align: "end" },
  { key: "percent", get label() { return ENGLISH.score; }, align: "end", render: (row) => <span className={`aim_pill is_${row.percent >= 70 ? "good" : row.percent >= 40 ? "warn" : "bad"}`}>{row.percent}%</span> }
];

function Spotlight({ hackathon, hackathons, on_pick, detail, loading, error, on_drawer }) {
  const newest = [...hackathons].reverse();
  const position = newest.findIndex((item) => item.hackathon_id === hackathon.hackathon_id);
  const [query, set_query] = useState("");
  const [team_view, set_team_view] = useState("");
  const stats = hackathon.stats;
  const ready = detail && detail.hackathon_id === hackathon.hackathon_id;
  const projects = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (ready ? detail.projects : []).filter((row) => !text || `${row.title} ${row.student_name} ${row.team}`.toLowerCase().includes(text));
  }, [ready, detail, query]);
  const teams = useMemo(() => (ready ? detail.teams : []).filter((team) => {
    if (team_view === "done") return team.rate >= 100;
    if (team_view === "open") return (team.rate ?? 0) < 100;
    return true;
  }), [ready, detail, team_view]);
  const quality = stats.projects ? [
    { get label() { return ENGLISH.live_site; }, count: Math.round((stats.live / stats.projects) * 100), raw: stats.live },
    { get label() { return ENGLISH.github_repository; }, count: Math.round((stats.repos / stats.projects) * 100), raw: stats.repos },
    { get label() { return ENGLISH.documentation; }, count: Math.round((stats.docs / stats.projects) * 100), raw: stats.docs },
    { get label() { return ENGLISH.zip_upload; }, count: Math.round((stats.zips / stats.projects) * 100), raw: stats.zips }
  ] : [];

  return (
    <>
      <div className="anc_switcher_row">
            <div className="anc_switcher" role="group" aria-label={ENGLISH.switch_hackathon}>
              <button type="button" className="anc_switcher_step" aria-label={ENGLISH.previous_hackathon} disabled={position <= 0} onClick={() => on_pick(newest[position - 1].hackathon_id)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <label className="anc_switcher_select">
                <span className="anc_switcher_count">{position + 1}<em>/{newest.length}</em></span>
                <select value={hackathon.hackathon_id} aria-label={ENGLISH.choose_a_hackathon} onChange={(event) => on_pick(Number(event.target.value))}>
                  {newest.map((item) => <option key={item.hackathon_id} value={item.hackathon_id}>{item.title}</option>)}
                </select>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </label>
              <button type="button" className="anc_switcher_step" aria-label={ENGLISH.next_hackathon} disabled={position < 0 || position >= newest.length - 1} onClick={() => on_pick(newest[position + 1].hackathon_id)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
      </div>
      <section className="anc_spot">
        <header className="anc_spot_head">
          <span className="anc_spot_kicker"><Phase_Pill phase={hackathon.phase} /> {task_summary(hackathon.tasks)}</span>
          <div className="anc_spot_main">
          <div>
            <h2>{hackathon.title}</h2>
            <p>
              {hackathon.starts_at ? `${when_label(hackathon.starts_at)} → ${when_label(hackathon.ends_at)}` : ENGLISH.no_schedule_set}
              {hackathon.required_submissions ? ENGLISH.project_submission_required_per_student(hackathon.required_submissions, hackathon.required_submissions === 1 ? "" : "s") : ""}
            </p>
          </div>
          <ul className="anc_spot_stats">
            <li><b>{stats.teams}</b><span>{ENGLISH.teams}</span></li>
            <li><b>{stats.members}</b><span>{ENGLISH.builders}</span></li>
            <li><b>{show(stats.participation, "%")}</b><span>{ENGLISH.participated}</span></li>
            <li><b>{show(stats.completion, "%")}</b><span>{ENGLISH.completed}</span></li>
            <li><b>{stats.projects}</b><span>{ENGLISH.projects}</span></li>
            {hackathon.scored ? <li><b>{show(stats.avg_score, "%")}</b><span>{ENGLISH.avg_score}</span></li> : null}
          </ul>
          </div>
        </header>
        <div className="anc_spot_body">
          {error ? <p className="anc_note is_error">{error}</p> : null}
          {ready ? <Podium hackathon={detail} on_project={(project) => on_drawer({ kind: "project", project, hackathon: detail })} /> : <p className="aim_empty">{loading ? ENGLISH.loading_this_hackathon : ""}</p>}
        </div>
      </section>

      {ready ?
        <div className={`anc_body ${loading ? "is_busy" : ""}`.trim()}>
          <div className="anc_grid">
            <Panel title={ENGLISH.submission_activity} icon={ICONS.trend} aside={<span className="aim_muted">{ENGLISH.answers_saved_per_day}</span>}>
              <Trend_Chart points={detail.timeline} primary="count" primary_label={ENGLISH.submissions} />
            </Panel>
            <Panel title={ENGLISH.deliverable_quality} icon={ICONS.check} aside={<span className="aim_muted">{ENGLISH.of_projects}</span>}>
              <Bar_List items={quality} max={100} suffix="%" tone="green" extra={(item) => `· ${item.raw}`} empty={ENGLISH.no_project_submissions_yet} />
            </Panel>
            <Panel title={ENGLISH.needs_follow_up} icon={ICONS.alert} aside={<span className="aim_muted">{detail.pending.length}{ENGLISH.pending_2}</span>}>
              {detail.pending.length ?
                <ol className="anc_risk">
                  {detail.pending.slice(0, 8).map((row) =>
                    <li key={row.student_id}>
                      <button type="button" onClick={() => {
                        const team = detail.teams.find((item) => item.members.some((member) => member.student_id === row.student_id));
                        if (team) on_drawer({ kind: "team", team, hackathon: detail });
                      }}>
                        <span className="anc_risk_avatar">{initials(row.name)}</span>
                        <span className="anc_risk_text">
                          <b>{row.name}</b>
                          <small>{row.team || ENGLISH.no_team} · {detail.contacts?.[row.student_id]?.mobile || detail.contacts?.[row.student_id]?.email || ENGLISH.no_contact}</small>
                        </span>
                        <em>0</em>
                      </button>
                    </li>
                  )}
                  {detail.pending.length > 8 ? <li className="anc_risk_more">+{detail.pending.length - 8}{ENGLISH.more_in_the_export}</li> : null}
                </ol> :
                <p className="aim_empty">{ENGLISH.every_builder_has_submitted_something}</p>}
            </Panel>
          </div>

          <Panel
            title={ENGLISH.teams}
            icon={ANC_ICONS.team}
            aside={
              <div className="anc_views" role="group" aria-label={ENGLISH.team_status}>
                {TEAM_VIEWS.map((item) =>
                  <button key={item.id || "all"} type="button" className={team_view === item.id ? "is_on" : ""} onClick={() => set_team_view(item.id)}>{item.label}</button>
                )}
              </div>
            }>
            <Team_Grid teams={teams} on_open={(team) => on_drawer({ kind: "team", team, hackathon: detail })} />
          </Panel>

          {detail.scored && detail.scores.length ?
            <Panel title={ENGLISH.round_leaderboard} icon={ICONS.star} aside={<span className="aim_muted">{ENGLISH.mcq_coding_score}</span>}>
              <Data_Table columns={SCORE_COLUMNS} rows={detail.scores} row_key={(row) => row.student_id} on_open={() => {}} total={detail.scores.length} empty={ENGLISH.no_scored_answers_yet} />
            </Panel> :
            null}

          {detail.tasks.project ?
            <Panel
              title={ENGLISH.projects}
              icon={ICONS.folder}
              aside={
                <label className="aim_search">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                  <input value={query} placeholder={ENGLISH.project_builder_or_team} onChange={(event) => set_query(event.target.value)} />
                </label>
              }>
              <Data_Table
                columns={PROJECT_COLUMNS}
                rows={projects}
                row_key={(row) => row.key}
                on_open={(project) => on_drawer({ kind: "project", project, hackathon: detail })}
                total={projects.length}
                empty={ENGLISH.no_projects_match} />
            </Panel> :
            null}
        </div> :
        null}
    </>
  );
}

function course_label(course) {
  return course.is_open ? ENGLISH.open(course.name) : course.name;
}

export function Hackathon_Analytics() {
  const toast = useToast();
  const base = use_scope();
  const pending = base.loading && !base.quiz;
  const mode = pending ? "loading" : (base.quiz?.mode || "all");
  const [program_id, set_program_id] = useState("");
  const [course_id, set_course_id] = useState("");
  const [state, set_state] = useState({ loading: false, error: "", data: null });
  const [tick, set_tick] = useState(0);
  const [picked, set_picked] = useState(0);
  const [search, set_search] = useState("");
  const [phase, set_phase] = useState("");
  const [detail, set_detail] = useState({ loading: false, error: "", data: null });
  const [drawer, set_drawer] = useState(null);
  const [busy, set_busy] = useState("");
  const [report, set_report] = useState(null);
  const spot_ref = useRef(null);
  const programs = useMemo(() => {
    const all = base.catalog?.programs || [];
    if (mode !== "program") return all;
    const allow = new Set((base.quiz?.program_ids || []).map(Number));
    return all.filter((program) => allow.has(Number(program.id)));
  }, [base.catalog, base.quiz, mode]);
  const program_value = programs.some((program) => String(program.id) === String(program_id)) ?
    program_id :
    mode === "program" && programs[0] ? String(programs[0].id) : "";
  const selected_program = programs.find((program) => String(program.id) === String(program_value)) || null;
  const course_options = mode === "all" ? (base.quiz?.courses || []) : (selected_program?.courses || []);
  const picked_course = course_options.some((course) => String(course.id) === String(course_id)) ? String(course_id) : "";
  const filters = useMemo(() => {
    if (mode === "none" || mode === "loading") return null;
    if (!program_value && mode === "program") return null;
    const next = {};
    if (program_value) next.program_id = program_value;
    if (picked_course) next.course_id = picked_course;
    return next;
  }, [mode, program_value, picked_course]);
  const filter_key = filters ? JSON.stringify(filters) : "";

  useEffect(() => {
    set_picked(0);
    set_search("");
    set_phase("");
  }, [filter_key]);

  useEffect(() => {
    if (!filters) {
      set_state({ loading: false, error: "", data: null });
      return undefined;
    }
    let alive = true;
    set_state((current) => ({ ...current, loading: true, error: "" }));
    get_hackathon_analytics(filters).then((payload) => {
      if (alive) set_state({ loading: false, error: "", data: payload });
    }).catch((err) => {
      if (alive) set_state({ loading: false, error: err.message, data: null });
    });
    return () => {
      alive = false;
    };
  }, [filter_key, tick]);

  const data = state.data;
  const hackathons = data?.hackathons || [];
  const summary = data?.summary;
  const active = hackathons.find((item) => item.hackathon_id === picked) || hackathons.find((item) => item.phase === "live") || hackathons[hackathons.length - 1] || null;
  const active_id = active?.hackathon_id || 0;

  useEffect(() => {
    if (!active_id || !filters) {
      set_detail({ loading: false, error: "", data: null });
      return undefined;
    }
    let alive = true;
    set_detail((current) => ({ ...current, loading: true, error: "" }));
    get_hackathon_detail(active_id, filters).then((payload) => {
      if (alive) set_detail({ loading: false, error: "", data: payload });
    }).catch((err) => {
      if (alive) set_detail({ loading: false, error: err.message, data: null });
    });
    return () => {
      alive = false;
    };
  }, [active_id, filter_key, tick]);

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return hackathons
      .filter((item) => (!phase || item.phase === phase) && (!text || item.title.toLowerCase().includes(text)))
      .slice()
      .reverse();
  }, [hackathons, search, phase]);
  const phase_counts = useMemo(() => {
    const map = {};
    for (const item of hackathons) map[item.phase] = (map[item.phase] || 0) + 1;
    return map;
  }, [hackathons]);

  function pick(row) {
    set_picked(row.hackathon_id);
    window.requestAnimationFrame(() => spot_ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function export_all() {
    set_busy("export");
    try {
      const payload = await export_hackathon_analytics(filters || {});
      set_report(hackathon_workbook(payload.hackathons || [], selected_program?.code || (picked_course ? "course" : "all")));
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  async function open_showcase() {
    const tab = window.open("", "_blank");
    set_busy("share");
    try {
      const cohort = (base.catalog?.cohorts || []).find((item) => item.id && (item.program_ids || []).map(Number).includes(Number(program_value)));
      const { token } = await create_showcase_link({ cohort_id: cohort ? cohort.id : "", program_id: program_value });
      const url = showcase_url(token);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener");
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.success(ENGLISH.showcase_link_copied_anyone_with_the_link_can);
      } catch {
        toast.success(ENGLISH.showcase_opened_in_a_new_tab);
      }
    } catch (err) {
      tab?.close();
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  const subtitle = mode === "none" ?
    ENGLISH.hackathon_analytics_stays_closed_until_a_program_is :
    mode === "program" ?
      ENGLISH.hackathon_results_for_the_programs_assigned_to_you :
      ENGLISH.choose_a_program_a_course_or_leave_both;
  const show_filters = mode === "all" || mode === "program";

  function pick_program(value) {
    set_program_id(value);
    set_course_id("");
  }

  return (
    <section className="aim_desk anc_desk">
      <Scope_Head
        title={ENGLISH.hackathon_analytics}
        subtitle={subtitle}
        icon={ANC_ICONS.trophy}
        scope={base}
        show_picks={false}
        tools={
          <div className="anc_scope_tools">
            {show_filters ?
              <>
                <select aria-label={ENGLISH.program} value={program_value} onChange={(event) => pick_program(event.target.value)}>
                  {mode === "all" ? <option value="">{ENGLISH.all_programs}</option> : null}
                  {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                </select>
                <select aria-label={ENGLISH.course} value={picked_course} onChange={(event) => set_course_id(event.target.value)}>
                  <option value="">{ENGLISH.all_courses}</option>
                  {course_options.map((course) =>
                    <option key={course.id} value={course.id}>{course_label(course)}</option>
                  )}
                </select>
              </> :
              null}
            <button type="button" className="anc_icon_btn" aria-label={ENGLISH.refresh} disabled={state.loading || !filters} onClick={() => set_tick((value) => value + 1)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className="anc_share" disabled={!program_value || busy === "share"} onClick={open_showcase}>
              {ICONS.link}
              {busy === "share" ? "Opening…" : ENGLISH.showcase_link}
            </button>
            <button type="button" className="aim_export" disabled={!hackathons.length || busy === "export"} onClick={export_all}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {busy === "export" ? "Preparing…" : ENGLISH.export_workbook}
            </button>
          </div>
        } />
      {base.error ? <p className="anc_note is_error">{base.error}</p> : null}
      {pending ? <p className="anc_note">{ENGLISH.loading_programs_and_courses}</p> : null}
      {mode === "none" ? <p className="anc_note">{ENGLISH.you_are_not_assigned_to_a_program_so}</p> : null}
      {mode === "program" && !pending && !programs.length ?
        <p className="anc_note">{ENGLISH.none_of_your_assigned_programs_are_available_yet}</p> :
        null}
      {state.error ? <p className="anc_note is_error">{state.error}</p> : null}
      {filters && !data && state.loading ? <p className="anc_note">{ENGLISH.loading_hackathon_analytics}</p> : null}
      {filters && data && !hackathons.length ? <p className="anc_note">{ENGLISH.no_published_hackathons_for_this_selection_yet}</p> : null}

      {summary && active ?
        <div className={`anc_body ${state.loading ? "is_busy" : ""}`.trim()}>
          <Kpi_Grid items={[
            { get label() { return ENGLISH.hackathons; }, value: summary.hackathons, hint: summary.live_now ? ENGLISH.live_now_2(summary.live_now) : ENGLISH.none_live, tone: "indigo" },
            { get label() { return ENGLISH.participants; }, value: summary.participants, hint: ENGLISH.of_students_2(show(summary.participation, "%"), data.students_total), tone: "violet" },
            { get label() { return ENGLISH.teams; }, value: summary.teams, get hint() { return ENGLISH.across_all_hackathons; }, tone: "sky" },
            { get label() { return ENGLISH.projects_shipped; }, value: summary.projects, get hint() { return ENGLISH.with_at_least_one_link; }, tone: "green" },
            { get label() { return ENGLISH.live_demo_rate; }, value: show(summary.live_rate, "%"), get hint() { return ENGLISH.projects_with_a_live_site; }, tone: "amber" },
            { get label() { return ENGLISH.avg_round_score; }, value: show(summary.avg_score, "%"), hint: summary.avg_score == null ? ENGLISH.no_scored_rounds : ENGLISH.mcq_coding, tone: "rose" }
          ]} />

          <div className="anc_grid is_wide">
            <Panel
              title={ENGLISH.all_hackathons}
              icon={ICONS.chart}
              aside={
                <label className="aim_search">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                  <input value={search} placeholder={ENGLISH.search_hackathons} onChange={(event) => set_search(event.target.value)} />
                </label>
              }>
              <div className="anc_compare_tools">
                <div className="anc_views" role="group" aria-label={ENGLISH.status}>
                  {PHASE_VIEWS.filter((item) => !item.id || phase_counts[item.id]).map((item) =>
                    <button key={item.id || "all"} type="button" className={phase === item.id ? "is_on" : ""} onClick={() => set_phase(item.id)}>
                      {item.label}
                      <small>{item.id ? phase_counts[item.id] : hackathons.length}</small>
                    </button>
                  )}
                </div>
                <span className="aim_muted">{ENGLISH.click_a_row_to_open_that_hackathon}</span>
              </div>
              <Data_Table
                columns={compare_columns(active.hackathon_id)}
                rows={visible}
                row_key={(row) => row.hackathon_id}
                on_open={pick}
                total={visible.length}
                empty={ENGLISH.no_hackathons_match} />
            </Panel>

            <Panel title={ENGLISH.most_active_builders} icon={ICONS.award} aside={<span className="aim_muted">{ENGLISH.across_all_hackathons}</span>}>
              <People_List
                items={(data.builders || []).slice(0, 8)}
                tone="violet"
                metric={(item) => `${item.projects} ${item.projects === 1 ? "project" : "projects"}`}
                detail={(item) => ENGLISH.hackathon_2(item.joined, item.joined === 1 ? "" : "s", item.avg_score != null ? ENGLISH.avg(item.avg_score) : "")}
                empty={ENGLISH.no_builders_yet} />
            </Panel>
          </div>

          <div ref={spot_ref} className="anc_spot_anchor">
            <Spotlight
              key={active.hackathon_id}
              hackathon={active}
              hackathons={hackathons}
              on_pick={(id) => set_picked(id)}
              detail={detail.data}
              loading={detail.loading}
              error={detail.error}
              on_drawer={set_drawer} />
          </div>
        </div> :
        null}

      {report ?
        <Report_Sheet_Preview
          title={ENGLISH.hackathon_report}
          report={report}
          on_close={() => set_report(null)}
          on_download={() => save_workbook(report)} /> :
        null}

      <Detail_Drawer open={Boolean(drawer)} title={drawer?.kind === ENGLISH.team_2 ? ENGLISH.team_progress : ENGLISH.project} on_close={() => set_drawer(null)}>
        {drawer?.kind === "project" ? <Project_Detail project={drawer.project} hackathon={drawer.hackathon} /> : null}
        {drawer?.kind === "team" ? <Team_Detail team={drawer.team} required={drawer.hackathon.required_submissions} /> : null}
      </Detail_Drawer>
    </section>
  );
}

