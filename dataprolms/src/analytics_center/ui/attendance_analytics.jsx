import { useEffect, useMemo, useState } from "react";
import { get_attendance_analytics } from "../api.js";
import {
  Bar_List,
  Data_Table,
  Detail_Drawer,
  ICONS,
  Kpi_Grid,
  Panel,
  RANGES,
  day_label,
  export_csv,
  initials,
  show
} from "../../ai_monitor/ui/monitor_parts.jsx";
import { ANC_ICONS, Course_Tabs, Scope_Head, Scope_State, use_scope } from "./scope_bar.jsx";
import "../../ai_monitor/theme/ai_monitor.css";
import "../theme/analytics_center.css";
import { ANALYTICS_CENTER_ENGLISH as ENGLISH } from "../../constants/english/analytics_center_constants_english.js";

const STATUS_LABEL = { get excellent() { return ENGLISH.excellent; }, get good() { return ENGLISH.on_track; }, get at_risk() { return ENGLISH.at_risk; }, get unmarked() { return ENGLISH.not_marked; } };
const STATUS_TONE = { excellent: "good", good: "warn", at_risk: "bad", unmarked: "none" };
const CELL_LABEL = { get present() { return ENGLISH.present; }, get late() { return ENGLISH.late; }, get absent() { return ENGLISH.absent; } };
const VIEWS = [
  { id: "", get label() { return ENGLISH.all; } },
  { id: "at_risk", get label() { return ENGLISH.at_risk; } },
  { id: "good", get label() { return ENGLISH.on_track; } },
  { id: "excellent", get label() { return ENGLISH.excellent; } },
  { id: "unmarked", get label() { return ENGLISH.not_marked; } }
];

function long_day(value) {
  const date = new Date(`${value}T00:00:00`);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function Rate_Pill({ value }) {
  if (value == null) return <span className="aim_pill is_none">—</span>;
  const tone = value >= 90 ? "good" : value >= 75 ? "warn" : "bad";
  return <span className={`aim_pill is_${tone}`}>{value}%</span>;
}

function Stack_Trend({ points }) {
  if (!points.length) return <p className="aim_empty">{ENGLISH.no_attendance_marked_in_this_period}</p>;
  const max = Math.max(1, ...points.map((point) => point.present + point.late + point.absent));
  const step = Math.max(1, Math.ceil(points.length / 8));
  const columns = { gridTemplateColumns: ENGLISH.repeat_minmax_0_1fr(points.length) };
  return (
    <div className="anc_stack">
      <div className="anc_legend">
        <span className="is_present">{ENGLISH.present}</span>
        <span className="is_late">{ENGLISH.late}</span>
        <span className="is_absent">{ENGLISH.absent}</span>
      </div>
      <div className="anc_stack_bars" style={columns}>
        {points.map((point) => {
          const total = point.present + point.late + point.absent;
          return (
            <div key={point.day} className="anc_stack_col" title={ENGLISH.present_late_absent(long_day(point.day), point.present, point.late, point.absent, show(point.rate, "%"))}>
              <span style={{ height: `${(total / max) * 100}%` }}>
                <i className="is_absent" style={{ flexGrow: point.absent }} />
                <i className="is_late" style={{ flexGrow: point.late }} />
                <i className="is_present" style={{ flexGrow: point.present }} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="anc_stack_axis" style={columns}>
        {points.map((point, index) => <span key={point.day}>{index % step === 0 ? day_label(point.day) : ""}</span>)}
      </div>
    </div>
  );
}

function Weekday_Chart({ items }) {
  if (!items.length) return <p className="aim_empty">{ENGLISH.no_sessions_yet}</p>;
  return (
    <div className="anc_week" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) =>
        <div key={item.label} title={ENGLISH.across_marks(item.label, item.count, item.sessions)}>
          <b>{item.count}%</b>
          <span><i className={`is_${item.count >= 90 ? "good" : item.count >= 75 ? "warn" : "bad"}`} style={{ height: `${Math.max(0, Math.min(100, item.count))}%` }} /></span>
          <small>{item.label}</small>
        </div>
      )}
    </div>
  );
}

function Split_Bar({ summary }) {
  const total = summary.present + summary.late + summary.absent;
  const parts = [
    { id: "present", get label() { return ENGLISH.present; }, count: summary.present },
    { id: "late", get label() { return ENGLISH.late; }, count: summary.late },
    { id: "absent", get label() { return ENGLISH.absent; }, count: summary.absent }
  ];
  return (
    <div className="anc_split">
      <div className="anc_split_rate">
        <b>{show(summary.rate, "%")}</b>
        <span>{ENGLISH.attended_present_late}</span>
      </div>
      <div className="anc_split_bar">
        {total ? parts.map((part) => part.count ? <i key={part.id} className={`is_${part.id}`} style={{ flexGrow: part.count }} /> : null) : <i className="is_none" />}
      </div>
      <ul className="anc_split_list">
        {parts.map((part) =>
          <li key={part.id} className={`is_${part.id}`}>
            <span>{part.label}</span>
            <b>{part.count}</b>
            <small>{total ? Math.round((part.count / total) * 100) : 0}%</small>
          </li>
        )}
      </ul>
    </div>
  );
}

function Register({ register, on_open, students }) {
  if (!register.dates.length || !register.rows.length) return <p className="aim_empty">{ENGLISH.the_register_fills_in_once_attendance_is_marked}</p>;
  const by_id = new Map(students.map((row) => [row.student_id, row]));
  const columns = { gridTemplateColumns: ENGLISH.minmax_150px_200px_repeat_minmax_14px_1fr_54px(register.dates.length) };
  return (
    <div className="anc_register">
      <div className="anc_register_row is_head" style={columns}>
        <span>{ENGLISH.student}</span>
        {register.dates.map((day) => <span key={day} className="anc_register_day" title={long_day(day)}>{new Date(`${day}T00:00:00`).getDate()}</span>)}
        <span className="is_end">{ENGLISH.rate}</span>
      </div>
      <div className="anc_register_body">
        {register.rows.map((row) =>
          <button key={row.student_id} type="button" className="anc_register_row" style={columns} onClick={() => on_open(by_id.get(row.student_id))}>
            <span className="anc_register_name" title={row.name}>{row.name}</span>
            {row.cells.map((status, index) =>
              <i key={register.dates[index]} className={`anc_cell is_${status || "none"}`} title={`${long_day(register.dates[index])}: ${CELL_LABEL[status] || ENGLISH.not_marked}`} />
            )}
            <b className={`anc_register_rate is_${row.rate == null ? "none" : row.rate >= 90 ? "good" : row.rate >= 75 ? "warn" : "bad"}`}>{show(row.rate, "%")}</b>
          </button>
        )}
      </div>
      <footer className="anc_register_foot">
        <span><i className="anc_cell is_present" />{ENGLISH.present_2}</span>
        <span><i className="anc_cell is_late" />{ENGLISH.late_2}</span>
        <span><i className="anc_cell is_absent" />{ENGLISH.absent_2}</span>
        <span><i className="anc_cell is_none" />{ENGLISH.not_marked_2}</span>
        <em>{ENGLISH.last}{register.dates.length}{ENGLISH.sessions}</em>
      </footer>
    </div>
  );
}

function Month_Calendar({ history }) {
  const months = useMemo(() => {
    const map = new Map();
    for (const item of history) {
      const key = item.day.slice(0, 7);
      if (!map.has(key)) map.set(key, new Map());
      map.get(key).set(item.day, item.status);
    }
    return [...map.entries()].reverse();
  }, [history]);
  if (!months.length) return <p className="aim_empty">{ENGLISH.no_attendance_marked_for_this_student_in_this}</p>;
  return (
    <div className="anc_months">
      {months.map(([key, days]) => {
        const [year, month] = key.split("-").map(Number);
        const first = new Date(year, month - 1, 1);
        const count = new Date(year, month, 0).getDate();
        const blanks = first.getDay();
        return (
          <section key={key} className="anc_month">
            <header>{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</header>
            <div className="anc_month_grid">
              {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => <span key={`${label}-${index}`} className="anc_month_label">{label}</span>)}
              {Array.from({ length: blanks }, (_, index) => <span key={`blank-${index}`} />)}
              {Array.from({ length: count }, (_, index) => {
                const day = `${key}-${String(index + 1).padStart(2, "0")}`;
                const status = days.get(day) || "";
                return <span key={day} className={`anc_month_day is_${status || "none"}`} title={`${long_day(day)}: ${CELL_LABEL[status] || ENGLISH.no_session}`}>{index + 1}</span>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Student_Detail({ student }) {
  if (!student) return null;
  const tone = STATUS_TONE[student.status];
  return (
    <div className="anc_detail">
      <header className="anc_detail_hero">
        <span className="anc_detail_avatar">{initials(student.name)}</span>
        <div>
          <h3>{student.name}</h3>
          <p>{[student.itda_id, student.email, student.mobile].filter(Boolean).join(" · ") || student.student_id}</p>
        </div>
        <span className={`aim_pill is_${tone}`}>{STATUS_LABEL[student.status]}</span>
      </header>
      <div className="anc_detail_stats">
        <article className="is_rate"><b>{show(student.rate, "%")}</b><span>{ENGLISH.attendance}</span></article>
        <article className="is_present"><b>{student.present}</b><span>{ENGLISH.present}</span></article>
        <article className="is_late"><b>{student.late}</b><span>{ENGLISH.late}</span></article>
        <article className="is_absent"><b>{student.absent}</b><span>{ENGLISH.absent}</span></article>
        <article><b>{student.streak}</b><span>{ENGLISH.current_streak}</span></article>
        <article><b>{student.best_streak}</b><span>{ENGLISH.best_streak}</span></article>
      </div>
      <p className="anc_detail_note">
        {student.last_absent ? ENGLISH.last_absent_on(long_day(student.last_absent)) : student.marked ? ENGLISH.no_absences_in_this_period : ENGLISH.attendance_has_not_been_marked_for_this_student}
      </p>
      <Month_Calendar history={student.history || []} />
    </div>
  );
}

const COLUMNS = [
  {
    key: "name",
    get label() { return ENGLISH.student; },
    render: (row) =>
      <span className="aim_student">
        <i>{initials(row.name)}</i>
        <span>
          <b>{row.name}</b>
          <small>{row.itda_id || row.email || row.mobile || row.student_id}</small>
        </span>
      </span>
  },
  { key: "present", get label() { return ENGLISH.present; }, align: "end" },
  { key: "late", get label() { return ENGLISH.late; }, align: "end" },
  { key: "absent", get label() { return ENGLISH.absent; }, align: "end" },
  { key: "rate", get label() { return ENGLISH.attendance; }, align: "end", render: (row) => <Rate_Pill value={row.rate} /> },
  { key: "streak", get label() { return ENGLISH.streak; }, align: "end", render: (row) => (row.marked ? `${row.streak} ${row.streak === 1 ? "session" : "sessions"}` : "—") },
  { key: "last_absent", get label() { return ENGLISH.last_absent; }, render: (row) => (row.last_absent ? day_label(row.last_absent) : "—") },
  { key: "status", get label() { return ENGLISH.status; }, render: (row) => <span className={`aim_pill is_${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>, sort: (row) => row.rate }
];

export function Attendance_Analytics() {
  const scope = use_scope();
  const courses = scope.program?.courses || [];
  const [course_id, set_course_id] = useState("");
  const [range, set_range] = useState({ days: "all", from: "", to: "" });
  const [search, set_search] = useState("");
  const [view, set_view] = useState("");
  const [state, set_state] = useState({ loading: false, error: "", data: null });
  const [tick, set_tick] = useState(0);
  const [open_student, set_open_student] = useState(null);
  const active_course = courses.some((course) => String(course.id) === String(course_id)) ? course_id : "";
  const custom = range.days === "custom";
  const query = {
    program_id: scope.program_id,
    course_id: active_course,
    days: custom ? "" : range.days,
    from: custom ? range.from : "",
    to: custom ? range.to : ""
  };
  const key = JSON.stringify(query);

  useEffect(() => {
    if (!scope.program_id) {
      set_state({ loading: false, error: "", data: null });
      return undefined;
    }
    if (custom && (!range.from || !range.to)) return undefined;
    let alive = true;
    set_state((current) => ({ ...current, loading: true, error: "" }));
    get_attendance_analytics(query).then((payload) => {
      if (alive) set_state({ loading: false, error: "", data: payload });
    }).catch((err) => {
      if (alive) set_state({ loading: false, error: err.message, data: null });
    });
    return () => {
      alive = false;
    };
  }, [key, tick]);

  const data = state.data;
  const summary = data?.summary;
  const students = data?.students || [];
  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return students.filter((row) => {
      if (view && row.status !== view) return false;
      if (!text) return true;
      return [row.name, row.email, row.mobile, row.itda_id].some((value) => String(value || "").toLowerCase().includes(text));
    });
  }, [students, search, view]);
  const at_risk = students.filter((row) => row.status === "at_risk").slice(0, 8);
  const counts = useMemo(() => {
    const map = {};
    for (const row of students) map[row.status] = (map[row.status] || 0) + 1;
    return map;
  }, [students]);

  function export_rows() {
    const course = courses.find((item) => String(item.id) === String(active_course));
    export_csv(`attendance_${scope.program?.code || "program"}${course ? `_${course.code || course.id}` : ""}`, [
      { get label() { return ENGLISH.student; }, value: (row) => row.name },
      { get label() { return ENGLISH.itda_id; }, value: (row) => row.itda_id },
      { get label() { return ENGLISH.email; }, value: (row) => row.email },
      { get label() { return ENGLISH.mobile; }, value: (row) => row.mobile },
      { get label() { return ENGLISH.present; }, value: (row) => row.present },
      { get label() { return ENGLISH.late; }, value: (row) => row.late },
      { get label() { return ENGLISH.absent; }, value: (row) => row.absent },
      { get label() { return ENGLISH.marked_sessions; }, value: (row) => row.marked },
      { get label() { return ENGLISH.attendance_2; }, value: (row) => row.rate },
      { get label() { return ENGLISH.current_streak; }, value: (row) => row.streak },
      { get label() { return ENGLISH.best_streak; }, value: (row) => row.best_streak },
      { get label() { return ENGLISH.last_absent; }, value: (row) => row.last_absent },
      { get label() { return ENGLISH.status; }, value: (row) => STATUS_LABEL[row.status] }
    ], visible);
  }

  return (
    <section className="aim_desk anc_desk">
      <Scope_Head
        title={ENGLISH.attendance_analytics}
        subtitle={ENGLISH.session_by_session_attendance_trends_and_students_who}
        icon={ANC_ICONS.attendance}
        scope={scope}>
        <div className="aim_ranges" role="group" aria-label={ENGLISH.date_range}>
          {RANGES.map((item) =>
            <button key={item.id} type="button" className={range.days === item.id ? "is_on" : ""} onClick={() => set_range({ days: item.id, from: "", to: "" })}>{item.label}</button>
          )}
          <button type="button" className={custom ? "is_on" : ""} onClick={() => set_range((current) => ({ ...current, days: "custom" }))}>{ENGLISH.custom}</button>
        </div>
        {custom ?
          <span className="aim_dates">
            <input type="date" aria-label={ENGLISH.from} value={range.from} max={range.to || undefined} onChange={(event) => set_range((current) => ({ ...current, from: event.target.value }))} />
            <em>{ENGLISH.to}</em>
            <input type="date" aria-label={ENGLISH.to_2} value={range.to} min={range.from || undefined} onChange={(event) => set_range((current) => ({ ...current, to: event.target.value }))} />
          </span> :
          null}
        <button type="button" className="anc_icon_btn" aria-label={ENGLISH.refresh} disabled={state.loading} onClick={() => set_tick((value) => value + 1)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="aim_export" disabled={!students.length} onClick={export_rows}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.export_csv}</button>
      </Scope_Head>
      <Scope_State scope={scope} />
      {scope.program ?
        <>
          {courses.length > 1 ? <Course_Tabs courses={courses} value={active_course} on_change={set_course_id} all_label={ENGLISH.all_courses} /> : null}
          {custom && (!range.from || !range.to) ? <p className="anc_note">{ENGLISH.pick_both_dates_to_load_the_custom_range}</p> : null}
          {state.error ? <p className="anc_note is_error">{state.error}</p> : null}
          {!data && state.loading ? <p className="anc_note">{ENGLISH.loading_attendance_analytics}</p> : null}
          {data && !summary ? <p className="anc_note">{courses.length ? ENGLISH.no_registered_students_in_this_program_yet : ENGLISH.this_program_has_no_courses_yet}</p> : null}
          {summary ?
            <div className={`anc_body ${state.loading ? "is_busy" : ""}`.trim()}>
              <Kpi_Grid items={[
                { get label() { return ENGLISH.attendance_rate; }, value: show(summary.rate, "%"), get hint() { return ENGLISH.present_late; }, tone: summary.rate == null ? "indigo" : summary.rate >= 90 ? "green" : summary.rate >= 75 ? "amber" : "rose" },
                { get label() { return ENGLISH.sessions_held; }, value: summary.sessions, hint: summary.latest_day ? ENGLISH.last_2(day_label(summary.latest_day)) : ENGLISH.none_yet, tone: "indigo" },
                { get label() { return ENGLISH.avg_attending; }, value: show(summary.avg_present), hint: ENGLISH.of_students(summary.students), tone: "sky" },
                { get label() { return ENGLISH.at_risk; }, value: summary.at_risk, hint: ENGLISH.below_2(summary.threshold), tone: "rose" },
                { get label() { return ENGLISH.perfect_attendance; }, value: summary.perfect, get hint() { return ENGLISH.zero_absences; }, tone: "green" },
                { get label() { return ENGLISH.last_session; }, value: show(summary.latest?.rate, "%"), hint: summary.latest ? ENGLISH.absent_unmarked(summary.latest.absent, summary.latest.unmarked) : ENGLISH.no_sessions, tone: "violet" }
              ]} />

              <div className="anc_grid is_wide">
                <Panel title={ENGLISH.daily_attendance} icon={ICONS.trend} aside={<span className="aim_muted">{summary.sessions}{ENGLISH.sessions}</span>}>
                  <Stack_Trend points={data.trend} />
                </Panel>
                <Panel title={ENGLISH.overall_split} icon={ICONS.pie}>
                  <Split_Bar summary={summary} />
                </Panel>
              </div>

              <div className="anc_grid">
                <Panel title={ENGLISH.weekday_pattern} icon={ICONS.chart} aside={<span className="aim_muted">{ENGLISH.attendance_3}</span>}>
                  <Weekday_Chart items={data.weekdays} />
                </Panel>
                <Panel title={ENGLISH.by_course} icon={ICONS.cap}>
                  <Bar_List
                    items={data.course_stats.map((row) => ({ label: row.name, count: row.rate ?? 0, sessions: row.sessions }))}
                    max={100}
                    suffix="%"
                    tone="green"
                    extra={(item) => ENGLISH.sessions_2(item.sessions)}
                    empty={ENGLISH.no_courses_in_this_program} />
                </Panel>
                <Panel title={ENGLISH.needs_attention} icon={ICONS.alert} aside={<span className="aim_muted">{ENGLISH.below}{summary.threshold}%</span>}>
                  {at_risk.length ?
                    <ol className="anc_risk">
                      {at_risk.map((row) =>
                        <li key={row.student_id}>
                          <button type="button" onClick={() => set_open_student(row)}>
                            <span className="anc_risk_avatar">{initials(row.name)}</span>
                            <span className="anc_risk_text">
                              <b>{row.name}</b>
                              <small>{row.absent}{ENGLISH.absent_3}{row.last_absent ? ENGLISH.last_2(day_label(row.last_absent)) : "—"}</small>
                            </span>
                            <em>{show(row.rate, "%")}</em>
                          </button>
                        </li>
                      )}
                    </ol> :
                    <p className="aim_empty">{ENGLISH.everyone_is_at_or_above}{summary.threshold}%.</p>}
                </Panel>
              </div>

              <Panel title={ENGLISH.attendance_register} icon={ANC_ICONS.attendance} aside={<span className="aim_muted">{ENGLISH.click_a_student_for_their_calendar}</span>}>
                <Register register={data.register} students={students} on_open={set_open_student} />
              </Panel>

              <Panel
                title={ENGLISH.students}
                icon={ICONS.list}
                aside={
                  <div className="anc_table_tools">
                    <div className="anc_views" role="group" aria-label={ENGLISH.status}>
                      {VIEWS.map((item) =>
                        <button key={item.id || "all"} type="button" className={view === item.id ? "is_on" : ""} onClick={() => set_view(item.id)}>
                          {item.label}
                          <small>{item.id ? counts[item.id] || 0 : students.length}</small>
                        </button>
                      )}
                    </div>
                    <label className="aim_search">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                      <input value={search} placeholder={ENGLISH.name_email_phone_or_itda_id} onChange={(event) => set_search(event.target.value)} />
                    </label>
                  </div>
                }>
                <Data_Table
                  columns={COLUMNS}
                  rows={visible}
                  row_key={(row) => row.student_id}
                  on_open={set_open_student}
                  total={visible.length}
                  empty={ENGLISH.no_students_match_these_filters} />
              </Panel>
            </div> :
            null}
        </> :
        null}
      <Detail_Drawer open={Boolean(open_student)} title={ENGLISH.student_attendance} on_close={() => set_open_student(null)}>
        <Student_Detail student={open_student} />
      </Detail_Drawer>
    </section>
  );
}
