import { useEffect, useMemo, useState } from "react";
import { Quiz_Dashboard } from "../../course_content_manager/ui/quiz_dashboard.jsx";
import { get_program_quiz_analytics } from "../api.js";
import { ANC_ICONS, Course_Tabs, Scope_Head, use_scope } from "./scope_bar.jsx";
import "../../course_content_manager/theme/content.css";
import "../../course_content_manager/theme/content_2.css";
import "../../course_content_manager/theme/content_3.css";
import "../../course_content_manager/theme/content_4.css";
import "../../course_content_manager/theme/content_5.css";
import "../theme/analytics_center.css";
import { ANALYTICS_CENTER_ENGLISH as ENGLISH } from "../../constants/english/analytics_center_constants_english.js";

function Refresh_Button({ busy, on_click }) {
  return (
    <button type="button" className="anc_icon_btn" aria-label={ENGLISH.refresh} disabled={busy} onClick={on_click}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

function score_text(value) {
  return value == null || Number.isNaN(Number(value)) ? "—" : `${value}%`;
}

function use_quiz_query(filters) {
  const [tick, set_tick] = useState(0);
  const [state, set_state] = useState({ loading: false, error: "", data: null, key: "" });
  const key = filters ? JSON.stringify(filters) : "";

  useEffect(() => {
    if (!filters) {
      set_state({ loading: false, error: "", data: null, key });
      return undefined;
    }
    let alive = true;
    set_state((current) => ({ ...current, loading: true, error: "" }));
    get_program_quiz_analytics(filters).then((payload) => {
      if (alive) set_state({ loading: false, error: "", data: payload, key });
    }).catch((err) => {
      if (alive) set_state({ loading: false, error: err.message, data: null, key });
    });
    return () => {
      alive = false;
    };
  }, [filters, key, tick]);

  return {
    ...state,
    ready: Boolean(state.data && state.key === key),
    refresh: () => set_tick((value) => value + 1)
  };
}

function Quiz_Panel({ course_id, data, loading, error, program_id = "", enrollment = "" }) {
  if (error) return <p className="anc_note is_error">{error}</p>;
  if (!data) return loading ? <p className="anc_note">{ENGLISH.loading_quiz_analytics}</p> : null;
  return (
    <div className={`anc_quiz_body${loading ? " is_busy" : ""}`}>
      <Quiz_Dashboard
        key={`${enrollment}|${program_id}|${course_id}`}
        course_id={Number(course_id)}
        data={data}
        program_id={program_id}
        enrollment={enrollment}
        locked={Boolean(program_id)} />
    </div>
  );
}

function Course_Lane({ title, empty, rows, score_key, attempt_key, student_key, on_open }) {
  return (
    <section className="anc_lane">
      <header>
        <h2>{title}</h2>
        <span>{rows.length} {rows.length === 1 ? "course" : "courses"}</span>
      </header>
      {rows.length ?
        <ul>
          {rows.map((course) => {
            const average = course[score_key];
            const width = Math.max(0, Math.min(100, Number(average) || 0));
            return (
              <li key={course.id}>
                <button type="button" onClick={() => on_open(course)}>
                  <span className="anc_lane_name">
                    <b>{course.name}</b>
                    <small>
                      {course.code || ENGLISH.course_2(course.id)}
                      {course.programs?.length ? ` · ${course.programs.slice(0, 2).join(", ")}` : ""}
                    </small>
                  </span>
                  <span className="anc_lane_meter" aria-hidden="true"><i style={{ width: `${width}%` }} /></span>
                  <em>{score_text(average)}</em>
                  <small>{course[student_key] || 0}{ENGLISH.scored}{course[attempt_key] || 0}{ENGLISH.attempts}{course.quizzes}{ENGLISH.quizzes}</small>
                </button>
              </li>
            );
          })}
        </ul> :
        <p className="anc_note">{empty}</p>}
    </section>
  );
}

function Overall_Board({ summary, courses, on_open }) {
  const by_score = (key) => (left, right) => (right[key] || 0) - (left[key] || 0) || left.name.localeCompare(right.name);
  const program_rows = courses.filter((course) => course.kind === "program" || course.kind === "both").sort(by_score("program_attempts"));
  const open_rows = courses.filter((course) => course.kind === "open" || course.kind === "both").sort(by_score("open_attempts"));
  const other_rows = courses.filter((course) => course.kind === "other").map((course) => ({
    ...course,
    blend_average: course.program_average ?? course.open_average,
    blend_attempts: (course.program_attempts || 0) + (course.open_attempts || 0),
    blend_students: (course.program_students || 0) + (course.open_students || 0)
  })).sort(by_score("blend_attempts"));
  const program_attempts = summary?.program_attempts || 0;
  const open_attempts = summary?.open_attempts || 0;
  const total = program_attempts + open_attempts || 1;

  return (
    <div className="anc_overall">
      <div className="anc_split_hero">
        <article>
          <span>{ENGLISH.inside_programs}</span>
          <b>{summary?.program_courses || 0}</b>
          <small>{summary?.program_students || 0}{ENGLISH.students_scored}{program_attempts}{ENGLISH.attempts_2}</small>
        </article>
        <div className="anc_share" title={ENGLISH.program_attempts_open_attempts(program_attempts, open_attempts)}>
          <i className="is_program" style={{ width: `${(program_attempts / total) * 100}%` }} />
          <i className="is_open" style={{ width: `${(open_attempts / total) * 100}%` }} />
        </div>
        <article>
          <span>{ENGLISH.open_enrollment}</span>
          <b>{summary?.open_courses || 0}</b>
          <small>{summary?.open_students || 0}{ENGLISH.students_scored}{open_attempts}{ENGLISH.attempts_2}</small>
        </article>
      </div>
      <p className="anc_note">{ENGLISH.a_student_in_a_program_is_counted_only}</p>
      <div className="anc_lanes">
        <Course_Lane
          title={ENGLISH.courses_in_a_program}
          empty={ENGLISH.no_program_courses_with_quizzes_yet}
          rows={program_rows}
          score_key="program_average"
          attempt_key="program_attempts"
          student_key="program_students"
          on_open={on_open} />
        <Course_Lane
          title={ENGLISH.open_courses}
          empty={ENGLISH.no_open_courses_yet}
          rows={open_rows}
          score_key="open_average"
          attempt_key="open_attempts"
          student_key="open_students"
          on_open={on_open} />
      </div>
      {other_rows.length ?
        <Course_Lane
          title={ENGLISH.other_courses}
          empty=""
          rows={other_rows}
          score_key="blend_average"
          attempt_key="blend_attempts"
          student_key="blend_students"
          on_open={on_open} /> :
        null}
    </div>
  );
}

function course_label(course) {
  return course.is_open ? ENGLISH.open(course.name) : course.name;
}

export function Quiz_Analytics() {
  const base = use_scope();
  const pending = base.loading && !base.quiz;
  const mode = pending ? "loading" : (base.quiz?.mode || "all");
  const [program_id, set_program_id] = useState("");
  const [course_id, set_course_id] = useState("");
  const [tab_id, set_tab_id] = useState("");
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
  const program_courses = selected_program?.courses || [];
  const tab_course = program_courses.some((course) => String(course.id) === String(tab_id)) ?
    String(tab_id) :
    program_courses[0] ? String(program_courses[0].id) : "";
  const in_program = Boolean(program_value && program_courses.some((course) => String(course.id) === picked_course));

  const filters = useMemo(() => {
    if (mode === "none" || mode === "loading") return null;
    if (program_value && !picked_course) {
      if (!tab_course) return null;
      return { track: "program", program_id: program_value, course_id: tab_course };
    }
    if (program_value && in_program) return { track: "program", program_id: program_value, course_id: picked_course };
    if (picked_course && mode === "all") return { track: "course", course_id: picked_course };
    if (program_value && tab_course) return { track: "program", program_id: program_value, course_id: tab_course };
    if (mode === "all") return { track: "overall" };
    return null;
  }, [mode, program_value, picked_course, tab_course, in_program]);

  const query = use_quiz_query(filters);
  const subtitle = mode === "none" ?
    ENGLISH.quiz_analytics_stays_closed_until_a_program_is :
    mode === "program" ?
      ENGLISH.quiz_performance_for_the_programs_assigned_to_you :
      ENGLISH.choose_a_program_a_course_or_leave_both;
  const refresh = <Refresh_Button busy={query.loading} on_click={query.refresh} />;
  const show_filters = mode === "all" || mode === "program";

  function pick_program(value) {
    set_program_id(value);
    set_course_id("");
    set_tab_id("");
  }

  return (
    <section className="anc_desk">
      <Scope_Head
        title={ENGLISH.quiz_analytics}
        subtitle={subtitle}
        icon={ANC_ICONS.quiz}
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
            {refresh}
          </div>
        } />

      {base.error ? <p className="anc_note is_error">{base.error}</p> : null}
      {pending ? <p className="anc_note">{ENGLISH.loading_programs_and_courses}</p> : null}
      {mode === "none" ? <p className="anc_note">{ENGLISH.you_are_not_assigned_to_a_program_so}</p> : null}
      {mode === "program" && !pending && !programs.length ?
        <p className="anc_note">{ENGLISH.none_of_your_assigned_programs_are_available_yet}</p> :
        null}

      {show_filters && program_value && !picked_course ?
        program_courses.length ?
          <>
            <Course_Tabs courses={program_courses} value={tab_course} on_change={set_tab_id} />
            <Quiz_Panel
              course_id={tab_course}
              program_id={program_value}
              loading={query.loading}
              error={query.ready ? "" : query.error}
              data={query.ready ? query.data?.quiz_analytics : null} />
          </> :
          <p className="anc_note">{ENGLISH.this_program_has_no_courses_yet}</p> :
        null}

      {show_filters && picked_course ?
        <Quiz_Panel
          course_id={picked_course}
          program_id={in_program ? program_value : ""}
          loading={query.loading}
          error={query.ready ? "" : query.error}
          data={query.ready ? query.data?.quiz_analytics : null} /> :
        null}

      {mode === "all" && !program_value && !picked_course ?
        query.error && !query.ready ?
          <p className="anc_note is_error">{query.error}</p> :
          query.ready ?
            <Overall_Board
              summary={query.data.summary}
              courses={query.data.courses || []}
              on_open={(course) => set_course_id(String(course.id))} /> :
            pending ? null : <p className="anc_note">{ENGLISH.loading_the_overall_picture}</p> :
        null}
    </section>
  );
}
