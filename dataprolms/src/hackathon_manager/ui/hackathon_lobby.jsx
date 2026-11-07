import { useEffect, useMemo, useState } from "react";
import { TYPE_LABEL } from "../constants.js";
import { parse_types } from "../utils.js";
import "../theme/hackathon_lobby.css";
import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/hackathon_manager_constants_english.js";

const PALETTES = [
  { from: "#a78bfa", to: "#60a5fa", ink: "#4c1d95" },
  { from: "#fb7185", to: "#fbbf24", ink: "#9f1239" },
  { from: "#34d399", to: "#22d3ee", ink: "#065f46" },
  { from: "#f472b6", to: "#a78bfa", ink: "#831843" },
  { from: "#fbbf24", to: "#f97316", ink: "#9a3412" },
  { from: "#60a5fa", to: "#34d399", ink: "#1e3a8a" }
];

const FILTERS = [
  { id: "all", get label() { return ENGLISH.all; } },
  { id: "live", get label() { return ENGLISH.live_now; } },
  { id: "todo", get label() { return ENGLISH.to_do; } },
  { id: "upcoming", get label() { return ENGLISH.upcoming; } },
  { id: "done", get label() { return ENGLISH.completed; } }
];

function read_date(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function span_text(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function stamp(date) {
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function view_of(item, now) {
  const starts = read_date(item.starts_at);
  const ends = read_date(item.ends_at);
  const phase = starts && now < starts ? "upcoming" : ends && now > ends ? "ended" : "live";
  const goal = Number(item.goal_count ?? item.item_count) || 0;
  const done = Math.min(goal || Infinity, Number(item.done_count ?? 0) || 0);
  const complete = goal > 0 && done >= goal;
  let clock = ENGLISH.no_deadline;
  if (phase === "upcoming") clock = ENGLISH.starts_in(span_text(starts - now));
  else if (phase === "live" && ends) clock = ENGLISH.ends_in(span_text(ends - now));
  else if (phase === "ended") clock = ends ? ENGLISH.ended_2(stamp(ends)) : ENGLISH.ended;
  const urgent = phase === "live" && ends && ends - now < 6 * 3600000;
  const action = phase === "upcoming" ? ENGLISH.preview : complete ? ENGLISH.review : done ? ENGLISH.label_continue : phase === "ended" ? ENGLISH.view : ENGLISH.join_now;
  return { ...item, phase, goal, done, complete, clock, urgent, action, types: parse_types(item.hackathon_type) };
}

function matches(view, filter) {
  if (filter === "live") return view.phase === "live";
  if (filter === "upcoming") return view.phase === "upcoming";
  if (filter === "done") return view.complete;
  if (filter === "todo") return view.phase === "live" && !view.complete;
  return true;
}

function Mascot({ types }) {
  if (types.includes("coding")) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="8" y="14" width="48" height="34" rx="8" fill="#fff" opacity="0.95" />
        <path d="m24 26-6 6 6 6M40 26l6 6-6 6M34 23l-4 18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="24" y="50" width="16" height="4" rx="2" fill="#fff" opacity="0.8" />
      </svg>
    );
  }
  if (types.includes("project")) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 8c7 6 10 14 10 22v8H22v-8c0-8 3-16 10-22Z" fill="#fff" opacity="0.95" />
        <circle cx="32" cy="26" r="4.5" fill="currentColor" />
        <path d="m22 34-7 9 9-3M42 34l7 9-9-3" fill="#fff" opacity="0.85" />
        <path d="M27 42h10l-5 10Z" fill="#fde68a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M20 12h24v10a12 12 0 0 1-24 0V12Z" fill="#fff" opacity="0.95" />
      <path d="M20 15h-6a3 3 0 0 0-3 3c0 6 4 11 10 12M44 15h6a3 3 0 0 1 3 3c0 6-4 11-10 12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M28 34h8v8h-8z" fill="#fff" opacity="0.85" />
      <rect x="22" y="44" width="20" height="6" rx="2" fill="#fff" />
      <path d="m32 16 2 4 4 .6-3 2.8.8 4L32 25.5 28.2 27.4l.8-4-3-2.8 4-.6Z" fill="currentColor" />
    </svg>
  );
}

function Progress_Ring({ done, goal, complete }) {
  const ratio = goal ? Math.min(1, done / goal) : 0;
  return (
    <span className={`hkl_ring${complete ? " is_done" : ""}`} style={{ "--hkl-ratio": ratio }}>
      {complete ?
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg> :
        <b>{done}<small>/{goal || "—"}</small></b>}
    </span>
  );
}

export function Hackathon_Lobby({ items, loading, error, on_open }) {
  const [filter, set_filter] = useState("all");
  const [query, set_query] = useState("");
  const [now, set_now] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => set_now(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const views = useMemo(() => {
    const rank = { live: 0, upcoming: 1, ended: 2 };
    return items.map((item, index) => ({ ...view_of(item, now), palette: PALETTES[index % PALETTES.length] }))
      .sort((a, b) => rank[a.phase] - rank[b.phase] || Number(a.complete) - Number(b.complete));
  }, [items, now]);

  const counts = useMemo(() => {
    const map = {};
    for (const entry of FILTERS) map[entry.id] = views.filter((view) => matches(view, entry.id)).length;
    return map;
  }, [views]);

  const visible = views.filter((view) => {
    if (!matches(view, filter)) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${view.title} ${view.description} ${view.program_name} ${view.batch_name}`.toLowerCase().includes(needle);
  });

  return (
    <section className="hkl">
      <header className="hkl_head">
        <span className="hkl_head_mark" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <path d="M38 22h44v20a22 22 0 0 1-44 0V22Z" fill="#fde68a" />
            <path d="M38 28H27a6 6 0 0 0-6 6c0 11 8 19 18 20M82 28h11a6 6 0 0 1 6 6c0 11-8 19-18 20" stroke="#fcd34d" strokeWidth="7" fill="none" strokeLinecap="round" />
            <rect x="53" y="62" width="14" height="16" rx="2" fill="#fbbf24" />
            <rect x="40" y="78" width="40" height="12" rx="4" fill="#fff" />
            <path d="m60 30 4 8 8.6 1.2-6.2 6 1.5 8.6L60 49.7l-7.9 4.1 1.5-8.6-6.2-6L56 38Z" fill="#f59e0b" />
          </svg>
        </span>
        <div className="hkl_head_title">
          <h1>{ENGLISH.hackathons}</h1>
          <p>{ENGLISH.pick_a_challenge_and_start_building}</p>
        </div>
        <ul className="hkl_head_stats">
          <li className="is_live"><i />{counts.live}{ENGLISH.live}</li>
          <li className="is_soon">{counts.upcoming}{ENGLISH.upcoming_2}</li>
          <li className="is_done">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {counts.done}{ENGLISH.completed_2}</li>
        </ul>
      </header>

      <div className="hkl_tools">
        <div className="hkl_filters" role="group" aria-label={ENGLISH.filter_hackathons}>
          {FILTERS.map((entry) =>
            <button key={entry.id} type="button" className={filter === entry.id ? "is_on" : ""} onClick={() => set_filter(entry.id)}>
              {entry.label}
              <em>{counts[entry.id]}</em>
            </button>
          )}
        </div>
        <label className="hkl_search">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input value={query} placeholder={ENGLISH.search_hackathons_2} onChange={(event) => set_query(event.target.value)} />
        </label>
      </div>

      {loading ? <p className="hkl_note">{ENGLISH.loading_hackathons_2}</p> : null}
      {error ? <p className="hkl_note is_error">{error}</p> : null}
      {!loading && !error && !visible.length ?
        <div className="hkl_empty">
          <b>{items.length ? ENGLISH.nothing_here_yet : ENGLISH.no_hackathons_for_you_yet}</b>
          <p>{items.length ? ENGLISH.try_another_filter_or_clear_the_search : ENGLISH.when_a_hackathon_opens_for_your_program_it}</p>
        </div> :
        null}

      <ul className="hkl_grid">
        {visible.map((view, index) =>
          <li key={view.hackathon_id} style={{ "--hkl-from": view.palette.from, "--hkl-to": view.palette.to, "--hkl-ink": view.palette.ink, "--hkl-delay": `${Math.min(index, 8) * 60}ms` }}>
            <button type="button" className={`hkl_card is_${view.phase}${view.complete ? " is_complete" : ""}`} onClick={() => on_open(view.hackathon_id)}>
              <span className="hkl_card_top">
                <span className="hkl_badges">
                  <span className={`hkl_phase is_${view.phase}`}>
                    {view.phase === "live" ? <i /> : null}
                    {view.phase === "live" ? ENGLISH.live_2 : view.phase === "upcoming" ? ENGLISH.upcoming : ENGLISH.ended}
                  </span>
                  {view.complete ?
                    <span className="hkl_done_badge">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.completed_3}</span> :
                    <span className="hkl_cert_lock">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="11" width="12" height="9" rx="1.8" stroke="currentColor" strokeWidth="2" /><path d="M8.5 11V8.2a3.5 3.5 0 0 1 7 0V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      {ENGLISH.certificate_locked}
                    </span>}
                </span>
                <span className="hkl_mascot"><Mascot types={view.types} /></span>
                <span className="hkl_shine" aria-hidden="true" />
              </span>
              <span className="hkl_card_body">
                <strong>{view.title}</strong>
                {view.description ? <small>{view.description}</small> : null}
                <span className="hkl_tags">
                  {view.types.map((id) => <em key={id} className={`is_${id}`}>{TYPE_LABEL[id]}</em>)}
                  {view.batch_name ? <em className="is_team">{view.batch_name}</em> : null}
                </span>
                <span className="hkl_meta">
                  <span className={`hkl_clock${view.urgent ? " is_urgent" : ""}`}>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    {view.clock}
                  </span>
                  <span>{view.audience === "open" ? ENGLISH.open_to_all : view.program_name || view.cohort_name || ENGLISH.your_program}</span>
                </span>
              </span>
              <span className="hkl_card_foot">
                <Progress_Ring done={view.done} goal={view.goal} complete={view.complete} />
                <span className="hkl_progress_text">
                  <b>{view.complete ? ENGLISH.all_done : view.done ? ENGLISH.in_progress : view.phase === "upcoming" ? ENGLISH.not_open_yet : ENGLISH.not_started}</b>
                  <small>{view.done}{ENGLISH.label_of_2}{view.goal || "—"}{ENGLISH.task}{view.goal === 1 ? "" : "s"}</small>
                </span>
                <span className="hkl_cta">
                  {view.action}
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </span>
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
