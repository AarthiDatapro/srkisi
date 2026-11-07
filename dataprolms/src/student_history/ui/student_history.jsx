import { useEffect, useMemo, useRef, useState } from "react";
import { Detail_Drawer, Interview_Detail, Resume_Detail } from "../../ai_monitor/index.js";
import { get_my_history, get_my_interview, get_my_resume } from "../api.js";
import { Report_Card_Button } from "./report_card_button.jsx";
import "../../ai_monitor/theme/ai_monitor.css";
import "../theme/student_history.css";
import { STUDENT_HISTORY_ENGLISH as ENGLISH } from "../../constants/english/student_history_constants_english.js";

const TABS = [
  { id: "overview", label: ENGLISH.overview },
  { id: "interviews", label: ENGLISH.mock_interviews },
  { id: "resumes", label: ENGLISH.resume_analyser },
  { id: "hackathons", label: ENGLISH.hackathons }
];

const STATUS = {
  completed: { get label() { return ENGLISH.completed; }, tone: "good" },
  in_progress: { get label() { return ENGLISH.in_progress; }, tone: "warn" },
  aborted: { get label() { return ENGLISH.stopped; }, tone: "bad" }
};

const PHASE = {
  live: { get label() { return ENGLISH.live_now; }, tone: "good" },
  upcoming: { get label() { return ENGLISH.upcoming; }, tone: "info" },
  ended: { get label() { return ENGLISH.ended; }, tone: "none" },
  open: { get label() { return ENGLISH.open; }, tone: "info" }
};

const TOPIC_LIMIT = 10;
const ATTEMPT_LIMIT = 8;

function when(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function short_day(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function safe_url(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function round(value) {
  return value == null ? null : Math.round(Number(value) * 10) / 10;
}

function average(values) {
  const list = values.filter((value) => value != null && Number.isFinite(Number(value))).map(Number);
  return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
}

function tone_for(ratio) {
  if (ratio == null) return "none";
  if (ratio >= 0.7) return "good";
  if (ratio >= 0.4) return "warn";
  return "bad";
}

function delta_text(value, unit = "") {
  if (value == null) return "";
  const rounded = round(value);
  if (rounded === 0) return `±0${unit}`;
  return `${rounded > 0 ? "+" : ""}${rounded}${unit}`;
}

function Ring({ value, max, label }) {
  const ratio = value == null ? 0 : Math.max(0, Math.min(1, Number(value) / max));
  return (
    <span className={`sth_ring is_${tone_for(value == null ? null : ratio)}`} style={{ "--sth-ratio": ratio }} aria-label={label}>
      <b>{value == null ? "—" : round(value)}</b>
      <small>/{max}</small>
    </span>
  );
}

function Empty({ title, text }) {
  return (
    <div className="sth_empty">
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

function Panel({ title, aside, children, className = "" }) {
  return (
    <section className={`sth_panel ${className}`.trim()}>
      <header className="sth_panel_head">
        <h2>{title}</h2>
        {aside ? <span className="sth_panel_aside">{aside}</span> : null}
      </header>
      <div className="sth_panel_body">{children}</div>
    </section>
  );
}

function use_drawer(load) {
  const [state, set_state] = useState({ open: false, loading: false, error: "", item: null, title: "" });
  const token = useRef(0);
  function open(id, title) {
    const current = token.current + 1;
    token.current = current;
    set_state({ open: true, loading: true, error: "", item: null, title });
    load(id).then((item) => {
      if (token.current === current) set_state((value) => ({ ...value, loading: false, item }));
    }).catch((err) => {
      if (token.current === current) set_state((value) => ({ ...value, loading: false, error: err.message }));
    });
  }
  function close() {
    token.current += 1;
    set_state((value) => ({ ...value, open: false }));
  }
  return { ...state, open_item: open, close };
}

function Score_Chart({ points, max, unit = "", on_pick, empty }) {
  if (!points.length) return <p className="sth_muted">{empty}</p>;
  return (
    <div className="sth_chart" style={{ "--sth-cols": points.length }}>
      {points.map((point, index) => {
        const previous = index ? points[index - 1].value : null;
        const change = point.value != null && previous != null ? point.value - previous : null;
        const ratio = point.value == null ? 0 : Math.max(0, Math.min(1, point.value / max));
        return (
          <button key={point.key} type="button" className={`sth_chart_col is_${tone_for(point.value == null ? null : ratio)}`} title={`${point.title} · ${point.value ?? ENGLISH.no_score}${point.value != null ? `/${max}` : ""}`} onClick={() => on_pick?.(point)}>
            <b>{point.value == null ? "—" : round(point.value)}</b>
            <span className="sth_chart_track"><i style={{ height: `${Math.max(4, ratio * 100)}%` }} /></span>
            <small>{point.label}</small>
            <em className={change > 0 ? "is_up" : change < 0 ? "is_down" : ""}>{index ? delta_text(change, unit) || "—" : ENGLISH.first}</em>
          </button>
        );
      })}
    </div>
  );
}

function Topic_Grid({ interviews, on_pick }) {
  const attempts = interviews.filter((row) => row.topics?.length).slice(0, ATTEMPT_LIMIT).reverse();
  const topics = useMemo(() => {
    const counts = new Map();
    for (const row of attempts) {
      for (const entry of row.topics) {
        const key = entry.topic.toLowerCase();
        const current = counts.get(key) || { key, name: entry.topic, seen: 0 };
        current.seen += 1;
        counts.set(key, current);
      }
    }
    return [...counts.values()].sort((a, b) => b.seen - a.seen || a.name.localeCompare(b.name)).slice(0, TOPIC_LIMIT);
  }, [attempts]);
  if (!attempts.length || !topics.length) return <p className="sth_muted">{ENGLISH.topic_scores_appear_once_you_answer_questions_in}</p>;
  const columns = { gridTemplateColumns: ENGLISH.minmax_140px_1_4fr_repeat_minmax_44px_1fr(attempts.length) };
  return (
    <div className="sth_topics">
      <div className="sth_topics_row is_head" style={columns}>
        <span>{ENGLISH.topic}</span>
        {attempts.map((row, index) =>
          <button key={row.mock_interview_id} type="button" title={`${row.target_role || ENGLISH.interview} · ${when(row.created_at)}`} onClick={() => on_pick(row)}>
            #{interviews.length - interviews.indexOf(row)}
            <small>{short_day(row.created_at)}</small>
          </button>
        )}
        <span className="is_end">{ENGLISH.trend}</span>
      </div>
      {topics.map((topic) => {
        const cells = attempts.map((row) => row.topics.find((entry) => entry.topic.toLowerCase() === topic.key) || null);
        const scored = cells.filter((cell) => cell?.score != null);
        const change = scored.length > 1 ? scored[scored.length - 1].score - scored[0].score : null;
        return (
          <div key={topic.key} className="sth_topics_row" style={columns}>
            <span className="sth_topics_name" title={topic.name}>{topic.name}</span>
            {cells.map((cell, index) =>
              <span key={attempts[index].mock_interview_id} className={`sth_topics_cell is_${cell ? tone_for(cell.score == null ? null : cell.score / 10) : "skip"}`} title={cell ? ENGLISH.label_10_question(topic.name, cell.score ?? "—", cell.asked, cell.asked === 1 ? "" : ENGLISH.s) : ENGLISH.not_asked}>
                {cell ? cell.score ?? "—" : ""}
              </span>
            )}
            <span className={`sth_topics_trend ${change > 0 ? "is_up" : change < 0 ? "is_down" : ""}`}>{change == null ? "—" : delta_text(change)}</span>
          </div>
        );
      })}
      <footer className="sth_topics_foot">
        <span><i className="is_good" />7+</span>
        <span><i className="is_warn" />4–7</span>
        <span><i className="is_bad" />{ENGLISH.below_4}</span>
        <span><i className="is_skip" />{ENGLISH.not_asked}</span>
        <em>{ENGLISH.scores_out_of_10_oldest_attempt_first}</em>
      </footer>
    </div>
  );
}

function Interview_Stats({ rows }) {
  const total = rows.length;
  const completed = rows.filter((row) => row.status === "completed").length;
  const active = rows.filter((row) => row.status === "in_progress").length;
  const stopped = total - completed - active;
  const answered = rows.reduce((sum, row) => sum + (row.answered || 0), 0);
  const asked = rows.reduce((sum, row) => sum + (row.total_questions || row.answered || 0), 0);
  const scores = rows.map((row) => row.score).filter((value) => value != null);
  const items = [
    { get label() { return ENGLISH.attempts; }, value: total, hint: ENGLISH.in_progress_2(active) },
    { get label() { return ENGLISH.completed; }, value: completed, hint: ENGLISH.stopped_early(stopped) },
    { get label() { return ENGLISH.completion_rate; }, value: total ? `${Math.round((completed / total) * 100)}%` : "—", get hint() { return ENGLISH.finished_interviews; }, bar: total ? completed / total : 0 },
    { get label() { return ENGLISH.questions_answered; }, value: asked ? `${answered}/${asked}` : "—", hint: asked ? ENGLISH.of_questions(Math.round((answered / asked) * 100)) : ENGLISH.no_questions_yet, bar: asked ? answered / asked : 0 },
    { get label() { return ENGLISH.career_readiness; }, value: scores.length ? `${round(average(scores))}/10` : "—", hint: scores.length ? ENGLISH.best_10(round(Math.max(...scores))) : ENGLISH.no_scored_answers },
    { get label() { return ENGLISH.average_time; }, value: rows.some((row) => row.minutes != null) ? ENGLISH.min_2(round(average(rows.map((row) => row.minutes)))) : "—", hint: ENGLISH.per_attempt }
  ];
  return (
    <ul className="sth_stats">
      {items.map((item) =>
        <li key={item.label}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          {item.bar != null ? <i><em style={{ width: `${Math.round(item.bar * 100)}%` }} /></i> : null}
          <small>{item.hint}</small>
        </li>
      )}
    </ul>
  );
}

function interview_points(rows) {
  return [...rows].reverse().map((row, index) => ({
    key: row.mock_interview_id,
    value: row.score,
    label: `#${index + 1}`,
    title: `${row.target_role || ENGLISH.interview} · ${when(row.created_at)}`,
    row
  }));
}

function resume_points(rows) {
  return [...rows].reverse().map((row, index) => ({
    key: row.analysis_id,
    value: row.overall_score,
    label: `#${index + 1}`,
    title: `${row.target_role || row.file_name} · ${when(row.created_at)}`,
    row
  }));
}

function Overview_Pane({ data, open_interview, open_resume, go_tab }) {
  const interviews = data.interviews;
  const resumes = data.resumes;
  const hackathons = data.hackathons;
  const latest_interview = interviews.find((row) => row.score != null);
  const previous_interview = latest_interview ? interviews.slice(interviews.indexOf(latest_interview) + 1).find((row) => row.score != null) : null;
  const first_resume = resumes[resumes.length - 1];
  const activity = useMemo(() => [
    ...interviews.map((row) => ({ key: `i${row.mock_interview_id}`, kind: "interview", at: row.created_at, title: row.target_role || ENGLISH.mock_interview, meta: ENGLISH.answered_2((STATUS[row.status] || {}).label || row.status, row.answered, row.total_questions || "—"), score: row.score != null ? `${round(row.score)}/10` : "—", row })),
    ...resumes.map((row) => ({ key: `r${row.analysis_id}`, kind: "resume", at: row.created_at, title: row.target_role || row.file_name || ENGLISH.resume_analysis, meta: row.file_name, score: row.overall_score != null ? `${row.overall_score}/100` : "—", row })),
    ...hackathons.flatMap((row) => row.projects.map((project) => ({ key: `h${row.hackathon_id}-${project.item_id}`, kind: "hackathon", at: project.submitted_at, title: project.title, meta: row.title, get score() { return ENGLISH.submitted; }, row })))
  ].filter((item) => item.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 10), [interviews, resumes, hackathons]);

  function open(item) {
    if (item.kind === "interview") open_interview(item.row);
    else if (item.kind === "resume") open_resume(item.row);
    else go_tab("hackathons");
  }

  return (
    <div className="sth_overview">
      <div className="sth_snap">
        <button type="button" className="sth_snap_card is_blue" onClick={() => go_tab("interviews")}>
          <span>{ENGLISH.career_readiness}</span>
          <b>{latest_interview ? `${round(latest_interview.score)}/10` : "—"}</b>
          <small className={previous_interview && latest_interview.score - previous_interview.score > 0 ? "is_up" : previous_interview && latest_interview.score - previous_interview.score < 0 ? "is_down" : ""}>
            {previous_interview ? ENGLISH.vs_previous_attempt(delta_text(latest_interview.score - previous_interview.score)) : ENGLISH.attempt(interviews.length, interviews.length === 1 ? "" : "s")}
          </small>
        </button>
        <button type="button" className="sth_snap_card is_violet" onClick={() => go_tab("resumes")}>
          <span>{ENGLISH.latest_resume_score}</span>
          <b>{resumes[0]?.overall_score != null ? `${resumes[0].overall_score}/100` : "—"}</b>
          <small className={resumes.length > 1 && resumes[0].overall_score - first_resume.overall_score > 0 ? "is_up" : resumes.length > 1 && resumes[0].overall_score - first_resume.overall_score < 0 ? "is_down" : ""}>
            {resumes.length > 1 ? ENGLISH.since_your_first_report(delta_text(resumes[0].overall_score - first_resume.overall_score, ENGLISH.pts)) : ENGLISH.report(resumes.length, resumes.length === 1 ? "" : "s")}
          </small>
        </button>
        <button type="button" className="sth_snap_card is_amber" onClick={() => go_tab("hackathons")}>
          <span>{ENGLISH.hackathons_joined}</span>
          <b>{hackathons.length}</b>
          <small>{data.summary.projects}{ENGLISH.project}{data.summary.projects === 1 ? "" : "s"}{ENGLISH.submitted_2}</small>
        </button>
      </div>

      <div className="sth_two">
        <Panel title={ENGLISH.interview_scores} aside={ENGLISH.click_a_bar_to_open_it}>
          <Score_Chart points={interview_points(interviews)} max={10} on_pick={(point) => open_interview(point.row)} empty={ENGLISH.take_a_mock_interview_to_start_your_score} />
        </Panel>
        <Panel title={ENGLISH.resume_scores} aside={ENGLISH.click_a_bar_to_open_it}>
          <Score_Chart points={resume_points(resumes)} max={100} unit={ENGLISH.pts} on_pick={(point) => open_resume(point.row)} empty={ENGLISH.analyse_your_resume_to_start_tracking_its_score} />
        </Panel>
      </div>

      <Panel title={ENGLISH.recent_activity} aside={ENGLISH.latest(activity.length)}>
        {activity.length ?
          <ol className="sth_timeline">
            {activity.map((item) =>
              <li key={item.key}>
                <button type="button" className={`is_${item.kind}`} onClick={() => open(item)}>
                  <span className="sth_timeline_dot" aria-hidden="true" />
                  <span className="sth_timeline_kind">{item.kind === "interview" ? ENGLISH.mock_interview : item.kind === "resume" ? ENGLISH.resume_report : ENGLISH.hackathon_project}</span>
                  <span className="sth_timeline_main">
                    <b>{item.title}</b>
                    <small>{item.meta}</small>
                  </span>
                  <span className="sth_timeline_score">{item.score}</span>
                  <time>{when(item.at)}</time>
                </button>
              </li>
            )}
          </ol> :
          <p className="sth_muted">{ENGLISH.your_interviews_resume_reports_and_hackathon_submissions_will}</p>}
      </Panel>
    </div>
  );
}

function count_voices(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = row.voice?.[key];
    if (!value) continue;
    const label = value.charAt(0).toUpperCase() + value.slice(1);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function mean_voice(rows, key) {
  return round(average(rows.map((row) => row.voice?.[key])));
}

function Interviews_Pane({ rows, on_open }) {
  if (!rows.length) return <Empty title={ENGLISH.no_mock_interviews_yet} text={ENGLISH.start_a_mock_interview_and_every_attempt_will} />;
  const voices = rows.filter((row) => row.voice);
  const sentiment_mix = count_voices(voices, "sentiment");
  const talk = [
    [ENGLISH.communication, "communication"],
    [ENGLISH.clarity, "clarity"],
    [ENGLISH.vocabulary, "vocabulary"],
    [ENGLISH.technical_terms, "technical"],
    [ENGLISH.grammar, "grammar"]
  ].map(([label, key]) => ({ label, value: mean_voice(voices, key) })).filter((item) => item.value != null);
  return (
    <div className="sth_overview">
      <Interview_Stats rows={rows} />
      {voices.length ?
        <Panel title={ENGLISH.sentiment_analysis} aside={ENGLISH.analysed(voices.length)}>
          <div className="sth_voice">
            <ul className="sth_voice_mix">
              {sentiment_mix.map((item) =>
                <li key={item.label}>
                  <b>{item.count}</b>
                  <span>{item.label}</span>
                </li>
              )}
            </ul>
            <div className="sth_meters">
              {talk.map((item) =>
                <span key={item.label} className="sth_meter">
                  <em>{item.label}</em>
                  <i><b style={{ width: `${Math.max(0, Math.min(100, item.value * 10))}%` }} /></i>
                  <strong>{item.value}/10</strong>
                </span>
              )}
            </div>
          </div>
        </Panel> :
        null}
      <Panel title={ENGLISH.scores_across_attempts} aside={ENGLISH.change_from_the_previous_attempt}>
        <Score_Chart points={interview_points(rows)} max={10} on_pick={(point) => on_open(point.row)} empty={ENGLISH.no_scored_attempts_yet} />
      </Panel>
      <Panel title={ENGLISH.topic_wise_progress} aside={ENGLISH.last_attempts(Math.min(ATTEMPT_LIMIT, rows.length))}>
        <Topic_Grid interviews={rows} on_pick={on_open} />
      </Panel>
      <Panel title={ENGLISH.all_attempts} aside={ENGLISH.total(rows.length)}>
        <div className="sth_list">
          {rows.map((row, index) => {
            const status = STATUS[row.status] || { label: row.status || "—", tone: "none" };
            return (
              <button key={row.mock_interview_id} type="button" className="sth_row" onClick={() => on_open(row)}>
                <Ring value={row.score} max={10} label={ENGLISH.career_readiness} />
                <span className="sth_row_main">
                  <b>#{rows.length - index} · {row.target_role || ENGLISH.mock_interview}</b>
                  <small>{when(row.created_at)} · {row.source_label || ENGLISH.interview}</small>
                  <span className="sth_chips">
                    <span className={`sth_pill is_${status.tone}`}>{status.label}</span>
                    <span className="sth_chip">{row.answered}/{row.total_questions || "—"}{ENGLISH.answered}</span>
                    {row.minutes != null ? <span className="sth_chip">{row.minutes}{ENGLISH.min}</span> : null}
                    {row.voice?.sentiment ? <span className="sth_chip">{row.voice.sentiment}</span> : null}
                    {row.match_score != null ? <span className="sth_chip">{row.match_score}{ENGLISH.role_match}</span> : null}
                  </span>
                </span>
                <span className="sth_row_go" aria-hidden="true">{ENGLISH.view}</span>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Resumes_Pane({ rows, on_open }) {
  if (!rows.length) return <Empty title={ENGLISH.no_resume_analyses_yet} text={ENGLISH.upload_your_resume_in_the_resume_analyser_and} />;
  return (
    <div className="sth_overview">
      <Panel title={ENGLISH.resume_score_over_time} aside={ENGLISH.click_a_bar_to_open_the_report}>
        <Score_Chart points={resume_points(rows)} max={100} unit={ENGLISH.pts} on_pick={(point) => on_open(point.row)} empty="" />
      </Panel>
      <div className="sth_list">
        {rows.map((row) =>
          <button key={row.analysis_id} type="button" className="sth_row" onClick={() => on_open(row)}>
            <Ring value={row.overall_score} max={100} label={ENGLISH.resume_score} />
            <span className="sth_row_main">
              <b>{row.target_role || row.file_name || ENGLISH.resume_analysis}</b>
              <small>{when(row.created_at)} · {row.file_name}</small>
              <span className="sth_meters">
                {[[ENGLISH.impact, row.impact_score], [ENGLISH.clarity, row.clarity_score], [ENGLISH.completeness, row.completeness_score]].map(([label, value]) =>
                  <span key={label} className="sth_meter">
                    <em>{label}</em>
                    <i><b style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} /></i>
                    <strong>{value ?? "—"}</strong>
                  </span>
                )}
              </span>
            </span>
            <span className="sth_row_go" aria-hidden="true">{ENGLISH.view}</span>
          </button>
        )}
      </div>
    </div>
  );
}

const HACK_PALETTES = [
  { from: "#a78bfa", to: "#60a5fa", ink: "#4c1d95" },
  { from: "#fb7185", to: "#fbbf24", ink: "#9f1239" },
  { from: "#34d399", to: "#22d3ee", ink: "#065f46" },
  { from: "#f472b6", to: "#a78bfa", ink: "#831843" },
  { from: "#fbbf24", to: "#f97316", ink: "#9a3412" },
  { from: "#60a5fa", to: "#34d399", ink: "#1e3a8a" }
];

const LINK_ICONS = {
  live: <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5S9.5 6.1 12 3.5Z" stroke="currentColor" strokeWidth="1.6" /></svg>,
  repo: <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  docs: <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3.5h7l4.5 4.5V20H7V3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M14 3.8V8.5h4.2M9.5 13h5M9.5 16.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  file: <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7.5h6l2 2H20v9H4v-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
};

function Hack_Card({ row, palette, index, on_open }) {
  const [all_projects, set_all_projects] = useState(false);
  const phase = PHASE[row.phase] || PHASE.open;
  const ratio = row.goal_count ? Math.min(1, row.done_count / row.goal_count) : 0;
  const complete = row.goal_count > 0 && row.done_count >= row.goal_count;
  const projects = all_projects ? row.projects : row.projects.slice(0, 2);
  return (
    <article
      className={`sth_hk${complete ? " is_complete" : ""}`}
      style={{ "--hk-from": palette.from, "--hk-to": palette.to, "--hk-ink": palette.ink, "--hk-delay": `${Math.min(index, 8) * 60}ms` }}>
      <header className="sth_hk_top">
        <span className="sth_hk_badges">
          <span className={`sth_hk_phase is_${row.phase}`}>{row.phase === "live" ? <i /> : null}{phase.label}</span>
          {row.team ? <span className="sth_hk_team">{row.team}</span> : null}
          {complete ?
            <span className="sth_hk_done">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.completed_2}</span> :
            null}
        </span>
        <span className="sth_hk_art" aria-hidden="true">
          <svg viewBox="0 0 64 64">
            <path d="M20 12h24v10a12 12 0 0 1-24 0V12Z" fill="#fff" opacity="0.95" />
            <path d="M20 15h-6a3 3 0 0 0-3 3c0 6 4 11 10 12M44 15h6a3 3 0 0 1 3 3c0 6-4 11-10 12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M28 34h8v8h-8z" fill="#fff" opacity="0.85" />
            <rect x="22" y="44" width="20" height="6" rx="2" fill="#fff" />
            <path d="m32 16 2 4 4 .6-3 2.8.8 4L32 25.5 28.2 27.4l.8-4-3-2.8 4-.6Z" fill="currentColor" />
          </svg>
        </span>
      </header>
      <div className="sth_hk_body">
        <h3>{row.title}</h3>
        <p>{[row.place, row.last_activity ? ENGLISH.active(short_day(row.last_activity)) : ""].filter(Boolean).join(" · ")}</p>
        <ul className="sth_hk_bubbles">
          {row.mcq.total ? <li className="is_mcq"><b>{row.mcq.correct}/{row.mcq.total}</b><span>{ENGLISH.mcq_correct}</span></li> : null}
          {row.coding.total ? <li className="is_code"><b>{row.coding.answered}/{row.coding.total}</b><span>{ENGLISH.coding}</span></li> : null}
          {row.score != null ? <li className="is_score"><b>{row.score}%</b><span>{ENGLISH.round_score}</span></li> : null}
          <li className="is_proj"><b>{row.projects.length}</b><span>{ENGLISH.project_2}{row.projects.length === 1 ? "" : "s"}</span></li>
        </ul>
        {projects.map((project) => {
          const links = [
            safe_url(project.demo_url) ? { id: "live", get label() { return ENGLISH.live_site; }, href: safe_url(project.demo_url) } : null,
            safe_url(project.github_url) ? { id: "repo", get label() { return ENGLISH.code; }, href: safe_url(project.github_url) } : null,
            safe_url(project.documentation_url) ? { id: "docs", get label() { return ENGLISH.docs; }, href: safe_url(project.documentation_url) } : null
          ].filter(Boolean);
          return (
            <div key={project.item_id} className="sth_hk_ticket">
              <span className="sth_hk_tile" aria-hidden="true">{(project.title || "P").trim()[0].toUpperCase()}</span>
              <span className="sth_hk_ticket_main">
                <b title={project.title}>{project.title}</b>
                <small>{ENGLISH.submitted_3}{when(project.submitted_at)}</small>
                <span className="sth_hk_links">
                  {links.map((link) =>
                    <a key={link.id} className={`is_${link.id}`} href={link.href} target="_blank" rel="noopener noreferrer">{LINK_ICONS[link.id]}{link.label}</a>
                  )}
                  {project.file_name ? <span>{LINK_ICONS.file}{project.file_name}</span> : null}
                </span>
              </span>
            </div>
          );
        })}
        {row.projects.length > 2 ?
          <button type="button" className="sth_hk_more" onClick={() => set_all_projects((value) => !value)}>
            {all_projects ? ENGLISH.show_fewer_projects : ENGLISH.show_all_projects(row.projects.length)}
          </button> :
          null}
        {!row.projects.length && !row.mcq.total && !row.coding.total ? <p className="sth_hk_none">{ENGLISH.nothing_submitted_yet_jump_in_and_start_building}</p> : null}
      </div>
      <footer className="sth_hk_foot">
        <span className={`sth_hk_ring${complete ? " is_done" : ""}`} style={{ "--hk-ratio": ratio }}>
          {complete ?
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg> :
            <b>{row.done_count}<small>/{row.goal_count || "—"}</small></b>}
        </span>
        <span className="sth_hk_status">
          <b>{complete ? ENGLISH.all_done : row.done_count ? ENGLISH.in_progress : ENGLISH.not_started}</b>
          <small>{row.done_count}{ENGLISH.label_of}{row.goal_count || "—"}{ENGLISH.task}{row.goal_count === 1 ? "" : "s"}</small>
        </span>
        <button type="button" className="sth_hk_open" onClick={() => on_open?.(row.hackathon_id)}>
          {complete ? ENGLISH.review : row.phase === "ended" ? ENGLISH.view : ENGLISH.label_continue}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </footer>
    </article>
  );
}

function Hackathons_Pane({ rows, on_open }) {
  if (!rows.length) return <Empty title={ENGLISH.no_hackathons_yet} text={ENGLISH.once_you_join_a_hackathon_or_submit_an} />;
  const completed = rows.filter((row) => row.goal_count > 0 && row.done_count >= row.goal_count).length;
  const projects = rows.reduce((sum, row) => sum + row.projects.length, 0);
  const scores = rows.map((row) => row.score).filter((value) => value != null);
  const lives = rows.reduce((sum, row) => sum + row.projects.filter((project) => safe_url(project.demo_url)).length, 0);
  return (
    <div className="sth_overview">
      <ul className="sth_hk_summary">
        <li className="is_violet"><b>{rows.length}</b><span>{ENGLISH.hackathons_joined}</span></li>
        <li className="is_green"><b>{completed}</b><span>{ENGLISH.completed}</span></li>
        <li className="is_amber"><b>{projects}</b><span>{ENGLISH.projects_shipped}</span></li>
        <li className="is_sky"><b>{lives}</b><span>{ENGLISH.live_sites}</span></li>
        <li className="is_rose"><b>{scores.length ? `${round(average(scores))}%` : "—"}</b><span>{ENGLISH.avg_round_score}</span></li>
      </ul>
      <div className="sth_hk_grid">
        {rows.map((row, index) => <Hack_Card key={row.hackathon_id} row={row} palette={HACK_PALETTES[index % HACK_PALETTES.length]} index={index} on_open={on_open} />)}
      </div>
    </div>
  );
}

export function Student_History({ on_open_hackathon }) {
  const [tab, set_tab] = useState("overview");
  const [state, set_state] = useState({ loading: true, error: "", data: null });
  const interview = use_drawer(get_my_interview);
  const resume = use_drawer(get_my_resume);

  useEffect(() => {
    let alive = true;
    get_my_history().then((data) => {
      if (alive) set_state({ loading: false, error: "", data });
    }).catch((err) => {
      if (alive) set_state({ loading: false, error: err.message, data: null });
    });
    return () => {
      alive = false;
    };
  }, []);

  const data = state.data;
  const summary = data?.summary;
  const counts = { interviews: data?.interviews.length, resumes: data?.resumes.length, hackathons: data?.hackathons.length };
  const open_interview = (row) => interview.open_item(row.mock_interview_id, row.target_role || ENGLISH.mock_interview);
  const open_resume = (row) => resume.open_item(row.analysis_id, row.target_role || ENGLISH.resume_analysis);

  return (
    <section className="sth_desk">
      <header className="sth_head">
        <span className="sth_head_mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <div className="sth_head_title">
          <h1>{ENGLISH.my_history}</h1>
          <p>{ENGLISH.interviews_resume_reports_and_hackathons_in_one_place}</p>
        </div>
        {summary ?
          <ul className="sth_head_chips">
            <li><b>{summary.interviews}</b>{ENGLISH.interviews}</li>
            <li><b>{summary.best_resume ?? "—"}</b>{ENGLISH.best_resume}</li>
            <li><b>{summary.hackathons}</b>{ENGLISH.hackathons_2}</li>
          </ul> :
          null}
        <Report_Card_Button />
      </header>

      <nav className="sth_tabs" aria-label={ENGLISH.history_sections}>
        {TABS.map((item) =>
          <button key={item.id} type="button" className={tab === item.id ? "is_on" : ""} onClick={() => set_tab(item.id)}>
            {item.label}
            {counts[item.id] != null ? <em>{counts[item.id]}</em> : null}
          </button>
        )}
      </nav>

      {state.loading ? <p className="sth_note">{ENGLISH.loading_your_history}</p> :
        state.error ? <p className="sth_note is_error">{state.error}</p> :
          tab === "overview" ? <Overview_Pane data={data} open_interview={open_interview} open_resume={open_resume} go_tab={set_tab} /> :
            tab === "interviews" ? <Interviews_Pane rows={data.interviews} on_open={open_interview} /> :
              tab === "resumes" ? <Resumes_Pane rows={data.resumes} on_open={open_resume} /> :
                <Hackathons_Pane rows={data.hackathons} on_open={on_open_hackathon} />}

      <Detail_Drawer open={interview.open} title={interview.title} loading={interview.loading} error={interview.error} on_close={interview.close}>
        {interview.item ? <Interview_Detail item={interview.item} /> : null}
      </Detail_Drawer>
      <Detail_Drawer open={resume.open} title={resume.title} loading={resume.loading} error={resume.error} on_close={resume.close}>
        {resume.item ? <Resume_Detail item={resume.item} /> : null}
      </Detail_Drawer>
    </section>
  );
}
