import { useEffect, useMemo, useRef, useState } from "react";
import { get_analytics_scope } from "../api.js";
import { ANALYTICS_CENTER_ENGLISH as ENGLISH } from "../../constants/english/analytics_center_constants_english.js";

const STORE_KEY = "analytics_center_scope";

function read_saved() {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function save(value) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    return;
  }
}

export function resolve_scope(scope, picked, allow_program_ids) {
  if (!scope) return { cohorts: [], cohort: null, program: null, programs: [], cohort_id: "", program_id: "" };
  const allow = Array.isArray(allow_program_ids) ? new Set(allow_program_ids.map(Number)) : null;
  let cohorts = (scope.cohorts || []).filter((cohort) => cohort.program_ids.length);
  if (allow) {
    cohorts = cohorts.map((cohort) => ({
      ...cohort,
      program_ids: cohort.program_ids.filter((id) => allow.has(Number(id)))
    })).filter((cohort) => cohort.program_ids.length);
  }
  const cohort = cohorts.find((item) => String(item.id) === String(picked.cohort_id)) || cohorts[0] || null;
  const programs = cohort ? (scope.programs || []).filter((program) => cohort.program_ids.includes(program.id) && (!allow || allow.has(program.id))) : [];
  const program = programs.find((item) => String(item.id) === String(picked.program_id)) || programs[0] || null;
  return {
    cohorts,
    cohort,
    programs,
    program,
    cohort_id: cohort ? String(cohort.id) : "",
    program_id: program ? String(program.id) : ""
  };
}

export function use_scope() {
  const [scope, set_scope] = useState(null);
  const [error, set_error] = useState("");
  const [picked, set_picked] = useState(read_saved);

  useEffect(() => {
    let alive = true;
    get_analytics_scope().then((payload) => {
      if (alive) set_scope(payload);
    }).catch((err) => {
      if (alive) set_error(err.message);
    });
    return () => {
      alive = false;
    };
  }, []);

  const resolved = useMemo(() => resolve_scope(scope, picked), [scope, picked]);

  function pick(next) {
    set_picked((current) => {
      const value = { ...current, ...next };
      if ("cohort_id" in next && next.cohort_id !== current.cohort_id) value.program_id = "";
      save(value);
      return value;
    });
  }

  return { loading: !scope && !error, error, ...resolved, pick, picked, catalog: scope, quiz: scope?.quiz || null };
}

export function Scope_Head({ title, subtitle, icon, scope, children, tools = null, show_picks = true }) {
  const program = scope.program;
  return (
    <header className="anc_head">
      <div className="anc_head_top">
        <div className="anc_head_title">
          <span className="anc_head_mark" aria-hidden="true">{icon}</span>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        {show_picks ?
        <div className="anc_scope">
          <label className="anc_pick">
            <span>{ENGLISH.cohort}</span>
            <select value={scope.cohort_id} disabled={!scope.cohorts?.length} onChange={(event) => scope.pick({ cohort_id: event.target.value })}>
              {(scope.cohorts || []).map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
            </select>
          </label>
          <svg className="anc_scope_arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <label className="anc_pick">
            <span>{ENGLISH.program}</span>
            <select value={scope.program_id} disabled={!scope.programs?.length} onChange={(event) => scope.pick({ program_id: event.target.value })}>
              {(scope.programs || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div> :
        tools}
      </div>
      {show_picks && program ?
        <div className="anc_ribbon">
          <span className="anc_ribbon_chip is_code">{program.code || ENGLISH.program_2(program.id)}</span>
          <span className="anc_ribbon_chip"><b>{program.students}</b>{ENGLISH.registered_students}</span>
          <span className="anc_ribbon_chip"><b>{program.courses.length}</b> {program.courses.length === 1 ? "course" : "courses"}</span>
          {children ? <div className="anc_ribbon_tools">{children}</div> : null}
        </div> :
        null}
    </header>
  );
}

export function Scope_State({ scope }) {
  if (scope.error) return <p className="anc_note is_error">{scope.error}</p>;
  if (scope.loading) return <p className="anc_note">{ENGLISH.loading_cohorts_and_programs}</p>;
  if (!scope.cohorts?.length) return <p className="anc_note">{ENGLISH.no_cohorts_with_programs_yet_link_programs_to}</p>;
  if (!scope.program) return <p className="anc_note">{ENGLISH.this_cohort_has_no_programs_yet}</p>;
  return null;
}

export function Course_Tabs({ courses, value, on_change, all_label }) {
  const track_ref = useRef(null);
  const [edges, set_edges] = useState({ left: false, right: false });

  useEffect(() => {
    const track = track_ref.current;
    if (!track) return undefined;
    const measure = () => set_edges({
      left: track.scrollLeft > 4,
      right: track.scrollLeft + track.clientWidth < track.scrollWidth - 4
    });
    measure();
    track.addEventListener("scroll", measure, { passive: true });
    const watcher = "ResizeObserver" in window ? new ResizeObserver(measure) : null;
    watcher?.observe(track);
    return () => {
      track.removeEventListener("scroll", measure);
      watcher?.disconnect();
    };
  }, [courses.length]);

  useEffect(() => {
    const track = track_ref.current;
    const current = track?.querySelector(".is_on");
    if (!track || !current) return;
    track.scrollTo({ left: Math.max(0, current.offsetLeft - track.clientWidth / 2 + current.offsetWidth / 2), behavior: "smooth" });
  }, [value]);

  function nudge(direction) {
    track_ref.current?.scrollBy({ left: direction * track_ref.current.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className={`anc_tabs_rail${edges.left ? " has_left" : ""}${edges.right ? " has_right" : ""}`}>
      <button type="button" className="anc_tabs_step is_left" aria-label={ENGLISH.previous_courses} tabIndex={edges.left ? 0 : -1} onClick={() => nudge(-1)}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div ref={track_ref} className="anc_tabs_track">
        <nav className="anc_tabs" aria-label={ENGLISH.courses}>
          {all_label ?
            <button type="button" className={!value ? "is_on" : ""} onClick={() => on_change("")}>
              <b>{all_label}</b>
              <small>{courses.length}{ENGLISH.courses_2}</small>
            </button> :
            null}
          {courses.map((course) =>
            <button key={course.id} type="button" className={String(value) === String(course.id) ? "is_on" : ""} title={course.name} onClick={() => on_change(String(course.id))}>
              <b>{course.name}</b>
              <small>{course.code || ENGLISH.course_2(course.id)}</small>
            </button>
          )}
        </nav>
      </div>
      <button type="button" className="anc_tabs_step is_right" aria-label={ENGLISH.more_courses} tabIndex={edges.right ? 0 : -1} onClick={() => nudge(1)}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

export const ANC_ICONS = {
  quiz: <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="m8.5 9 1.5 1.5 3-3M8.5 15h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  trophy: <svg viewBox="0 0 24 24" fill="none"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.7" /><path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5 4.5 4.5 0 0 0 8.5 11M16 5h2.5A1.5 1.5 0 0 1 20 6.5 4.5 4.5 0 0 1 15.5 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M12 11v3M9 20h6M10 14h4v6h-4v-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  team: <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" /><circle cx="17" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.7" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14.5 15.2A4.5 4.5 0 0 1 21 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  attendance: <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 3v4M16 3v4M4 10h16M8.5 14.5l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
};
