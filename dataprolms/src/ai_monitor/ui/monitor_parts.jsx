import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@datapromr/modal";
import { LMS_MEDIA_PHONE } from "../../design_system/breakpoints.js";
import { list_monitor_options } from "../api.js";
import { AI_MONITOR_ENGLISH as ENGLISH } from "../../constants/english/ai_monitor_constants_english.js";

export const RANGES = [
  { id: "7", label: ENGLISH.label_7_days },
  { id: "30", label: ENGLISH.label_30_days },
  { id: "90", label: ENGLISH.label_90_days },
  { id: "365", label: ENGLISH.label_1_year },
  { id: "all", label: ENGLISH.all_time }
];

export function when_label(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function day_label(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function show(value, suffix = "") {
  if (value == null || value === "" || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
}

export function use_report(load, filters) {
  const [data, set_data] = useState(null);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState("");
  const [tick, set_tick] = useState(0);
  const key = JSON.stringify(filters);

  useEffect(() => {
    let alive = true;
    set_loading(true);
    set_error("");
    const handle = setTimeout(() => {
      load(filters).then((payload) => {
        if (alive) set_data(payload);
      }).catch((err) => {
        if (alive) set_error(err.message);
      }).finally(() => {
        if (alive) set_loading(false);
      });
    }, filters.q ? 300 : 0);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [key, tick]);

  return { data, loading, error, reload: () => set_tick((value) => value + 1) };
}

export function use_programs() {
  const [options, set_options] = useState({ programs: [], courses: [] });
  useEffect(() => {
    let alive = true;
    list_monitor_options().then((payload) => {
      if (alive) set_options({ programs: payload.programs || [], courses: payload.courses || [] });
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return options;
}

export function Monitor_Head({ title, subtitle, icon, filters, on_filters, programs, courses = [], loading, on_reload, on_export, extra }) {
  const custom = filters.days === "custom";
  return (
    <header className="aim_head">
      <div className="aim_head_title">
        <span className="aim_head_mark" aria-hidden="true">{icon}</span>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="aim_head_tools">
        <div className="aim_ranges" role="group" aria-label={ENGLISH.date_range}>
          {RANGES.map((range) =>
            <button
              key={range.id}
              type="button"
              className={filters.days === range.id ? "is_on" : ""}
              onClick={() => on_filters({ ...filters, days: range.id, from: "", to: "" })}>
              {range.label}
            </button>
          )}
          <button type="button" className={custom ? "is_on" : ""} onClick={() => on_filters({ ...filters, days: "custom" })}>{ENGLISH.custom}</button>
        </div>
        {custom ?
          <span className="aim_dates">
            <input type="date" aria-label={ENGLISH.from} value={filters.from} onChange={(event) => on_filters({ ...filters, from: event.target.value })} />
            <em>{ENGLISH.to}</em>
            <input type="date" aria-label={ENGLISH.to_2} value={filters.to} onChange={(event) => on_filters({ ...filters, to: event.target.value })} />
          </span> :
          null}
        <select aria-label={ENGLISH.program} value={filters.program_id} onChange={(event) => on_filters({ ...filters, program_id: event.target.value })}>
          <option value="">{ENGLISH.all_programs}</option>
          {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
        </select>
        <select aria-label={ENGLISH.course} value={filters.course_id} onChange={(event) => on_filters({ ...filters, course_id: event.target.value })}>
          <option value="">{ENGLISH.all_courses}</option>
          {courses.map((course) =>
            <option key={course.id} value={course.id}>{course.is_open ? ENGLISH.open(course.name) : course.name}</option>
          )}
        </select>
        <label className="aim_search">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          <input value={filters.q} placeholder={ENGLISH.email_or_phone_number} onChange={(event) => on_filters({ ...filters, q: event.target.value })} />
        </label>
        {is_filtered(filters) ?
          <button type="button" className="aim_clear" onClick={() => on_filters(EMPTY_FILTERS)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>{ENGLISH.clear_filters}</button> :
          null}
        <button type="button" className="aim_icon_btn" aria-label={ENGLISH.refresh} disabled={loading} onClick={on_reload}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {extra}
        <button type="button" className="aim_export" onClick={on_export}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.export_csv}</button>
      </div>
    </header>
  );
}

export function query_of(filters) {
  const custom = filters.days === "custom";
  return {
    days: custom ? "" : filters.days,
    from: custom ? filters.from : "",
    to: custom ? filters.to : "",
    program_id: filters.program_id,
    course_id: filters.course_id,
    q: filters.q.trim()
  };
}

export const EMPTY_FILTERS = { days: "30", from: "", to: "", program_id: "", course_id: "", q: "" };

export function is_filtered(filters) {
  return Object.keys(EMPTY_FILTERS).some((key) => String(filters[key] ?? "") !== EMPTY_FILTERS[key]);
}

export function Kpi_Grid({ items }) {
  return (
    <div className="aim_kpis">
      {items.map((item) =>
        <article key={item.label} className={`aim_kpi is_${item.tone || "indigo"}`}>
          <span className="aim_kpi_label">{item.label}</span>
          <b>{item.value}</b>
          <span className="aim_kpi_foot">
            {item.change != null ?
              <em className={item.change > 0 ? "is_up" : item.change < 0 ? "is_down" : ""}>
                {item.change > 0 ? "▲" : item.change < 0 ? "▼" : "•"} {Math.abs(item.change)}%
              </em> :
              null}
            {item.hint ? <small>{item.hint}</small> : null}
          </span>
        </article>
      )}
    </div>
  );
}

export function Panel({ title, icon, aside, children, className = "" }) {
  return (
    <section className={`aim_panel ${className}`.trim()}>
      <header className="aim_panel_head">
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <h2>{title}</h2>
        {aside ? <div className="aim_panel_aside">{aside}</div> : null}
      </header>
      <div className="aim_panel_body">{children}</div>
    </section>
  );
}

export function Trend_Chart({ points, primary = "count", secondary, primary_label, secondary_label }) {
  const max = Math.max(1, ...points.map((point) => point[primary] || 0));
  const step = Math.max(1, Math.ceil(points.length / 8));
  if (!points.length) return <p className="aim_empty">{ENGLISH.no_activity_in_this_period}</p>;
  return (
    <div className="aim_trend">
      <div className="aim_trend_legend">
        <span className="is_primary">{primary_label}</span>
        {secondary ? <span className="is_secondary">{secondary_label}</span> : null}
      </div>
      <div className="aim_trend_bars" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
        {points.map((point) =>
          <div key={point.day} className="aim_trend_col" title={`${day_label(point.day)}: ${point[primary] || 0} ${primary_label}${secondary ? `, ${point[secondary] || 0} ${secondary_label}` : ""}`}>
            <span className="aim_trend_bar" style={{ height: `${((point[primary] || 0) / max) * 100}%` }}>
              {secondary ? <i style={{ height: `${point[primary] ? ((point[secondary] || 0) / point[primary]) * 100 : 0}%` }} /> : null}
            </span>
          </div>
        )}
      </div>
      <div className="aim_trend_axis" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
        {points.map((point, index) => <span key={point.day}>{index % step === 0 ? day_label(point.day) : ""}</span>)}
      </div>
    </div>
  );
}

export function Bar_List({ items, value = "count", extra, empty = ENGLISH.nothing_to_show_yet, tone = "indigo", max: fixed_max, suffix = "" }) {
  const max = fixed_max || Math.max(1, ...items.map((item) => Number(item[value]) || 0));
  if (!items.length) return <p className="aim_empty">{empty}</p>;
  return (
    <ul className={`aim_bars is_${tone}`}>
      {items.map((item) =>
        <li key={item.label}>
          <div>
            <span title={item.label}>{item.label}</span>
            <b>{item[value]}{suffix}{extra ? <small> {extra(item)}</small> : null}</b>
          </div>
          <i><em style={{ width: `${((Number(item[value]) || 0) / max) * 100}%` }} /></i>
        </li>
      )}
    </ul>
  );
}

function column_band(label) {
  const text = String(label || "").replace(/\s/g, "");
  if (/^0[–-]/.test(text)) return "low";
  if (/^2[–-]/.test(text)) return "midlow";
  if (/^4[–-]/.test(text)) return "mid";
  if (/^6[–-]/.test(text)) return "midhigh";
  if (/^8[–-]/.test(text)) return "high";
  return "";
}

export function Column_Chart({ items, label = "label", value = "count", tone = "indigo" }) {
  const max = Math.max(1, ...items.map((item) => item[value] || 0));
  return (
    <div className={`aim_columns is_${tone}`} style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}>
      {items.map((item) => {
        const count = Number(item[value]) || 0;
        const band = column_band(item[label]);
        return (
          <div key={item[label]} className={band ? `is_${band}` : ""} title={`${item[label]}: ${count}`}>
            <span>
              <b>{count}</b>
              <em>
                <i style={{ height: `${Math.max(count ? 8 : 0, (count / max) * 100)}%` }} />
              </em>
            </span>
            <small>{item[label]}</small>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({ items, center_value, center_label }) {
  const colors = ["#4f46e5", "#16a34a", "#f59e0b", "#e11d48", "#0ea5e9", "#7c3aed"];
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let offset = 0;
  return (
    <div className="aim_donut">
      <svg viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef0f6" strokeWidth="6" />
        {total ? items.map((item, index) => {
          const part = (item.count / total) * 100;
          const node = <circle key={item.label} cx="21" cy="21" r="15.9" fill="none" stroke={colors[index % colors.length]} strokeWidth="6" strokeDasharray={`${part} ${100 - part}`} strokeDashoffset={25 - offset} />;
          offset += part;
          return node;
        }) : null}
        <text x="21" y="21" textAnchor="middle" className="aim_donut_value">{center_value}</text>
        <text x="21" y="27" textAnchor="middle" className="aim_donut_label">{center_label}</text>
      </svg>
      <ul>
        {items.map((item, index) =>
          <li key={item.label}>
            <i style={{ background: colors[index % colors.length] }} />
            <span>{item.label}</span>
            <b>{item.count}</b>
            <small>{total ? Math.round((item.count / total) * 100) : 0}%</small>
          </li>
        )}
      </ul>
    </div>
  );
}

export function People_List({ items, metric, detail, empty, tone = "indigo" }) {
  if (!items.length) return <p className="aim_empty">{empty}</p>;
  return (
    <ol className={`aim_people is_${tone}`}>
      {items.map((item, index) =>
        <li key={item.student_id}>
          <span className="aim_rank">{index + 1}</span>
          <span className="aim_avatar">{initials(item.name)}</span>
          <div>
            <b title={item.email}>{item.name}</b>
            <small>{detail(item)}</small>
          </div>
          <em>{metric(item)}</em>
        </li>
      )}
    </ol>
  );
}

export function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

export function Student_Cell({ student }) {
  if (!student) return <span className="aim_muted">{ENGLISH.staff_guest}</span>;
  return (
    <span className="aim_student">
      <i>{initials(student.name)}</i>
      <span>
        <b>{student.name}</b>
        <small>{[student.itda_id, student.programs?.[0]].filter(Boolean).join(" · ") || student.email || student.student_id}</small>
      </span>
    </span>
  );
}

function use_phone() {
  const [phone, set_phone] = useState(() => typeof window !== "undefined" && window.matchMedia(LMS_MEDIA_PHONE).matches);
  useEffect(() => {
    const media = window.matchMedia(LMS_MEDIA_PHONE);
    const on_change = () => set_phone(media.matches);
    on_change();
    media.addEventListener("change", on_change);
    return () => media.removeEventListener("change", on_change);
  }, []);
  return phone;
}

function phone_columns(columns) {
  const marked = columns.filter((column) => column.phone);
  if (marked.length) return marked;
  const text = (column) => `${column.key} ${column.label}`;
  const identity = columns.find((column) => /student|name|title/i.test(text(column))) || columns[0];
  const measure = columns.find((column) => /score|overall|grade|attendance|rate/i.test(text(column)) && column !== identity)
    || columns.find((column) => /status/i.test(text(column)) && column !== identity);
  const extra = columns.find((column) => column !== identity && column !== measure && /role|question|course/i.test(text(column)));
  return [identity, extra, measure].filter(Boolean);
}

export function Data_Table({ columns, rows, row_key, on_open, empty, total }) {
  const phone = use_phone();
  const shown = useMemo(() => (phone ? phone_columns(columns) : columns), [columns, phone]);
  const [sort, set_sort] = useState({ key: "", dir: "desc" });
  const [page, set_page] = useState(0);
  const per_page = 15;
  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const column = columns.find((item) => item.key === sort.key);
    const value_of = column?.sort || ((row) => row[sort.key]);
    return [...rows].sort((a, b) => {
      const left = value_of(a);
      const right = value_of(b);
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      return sort.dir === "asc" ? result : -result;
    });
  }, [rows, sort, columns]);
  useEffect(() => set_page(0), [rows]);
  const pages = Math.max(1, Math.ceil(sorted.length / per_page));
  const visible = sorted.slice(page * per_page, page * per_page + per_page);

  return (
    <div className="aim_table_wrap">
      <table className="aim_table">
        <thead>
          <tr>
            {shown.map((column) =>
              <th key={column.key} className={column.align === "end" ? "is_end" : ""}>
                <button type="button" onClick={() => set_sort((current) => ({ key: column.key, dir: current.key === column.key && current.dir === "desc" ? "asc" : "desc" }))}>
                  {column.label}
                  {sort.key === column.key ? <span aria-hidden="true">{sort.dir === "asc" ? "▲" : "▼"}</span> : null}
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {visible.length ? visible.map((row) =>
            <tr key={row_key(row)} onClick={() => on_open(row)} tabIndex={0} onKeyDown={(event) => { if (event.key === ENGLISH.enter) on_open(row); }}>
              {shown.map((column) =>
                <td key={column.key} className={column.align === "end" ? "is_end" : ""}>{column.render ? column.render(row) : show(row[column.key])}</td>
              )}
            </tr>
          ) : <tr><td colSpan={shown.length} className="aim_empty_row">{empty}</td></tr>}
        </tbody>
      </table>
      <footer className="aim_table_foot">
        <span>{total > rows.length ? ENGLISH.showing_latest_of(rows.length, total) : ENGLISH.records(rows.length)}</span>
        <span className="aim_pager">
          <button type="button" disabled={page === 0} onClick={() => set_page(page - 1)}>‹</button>
          <b>{page + 1} / {pages}</b>
          <button type="button" disabled={page >= pages - 1} onClick={() => set_page(page + 1)}>›</button>
        </span>
      </footer>
    </div>
  );
}

export function Score_Pill({ value, max, good, warn }) {
  if (value == null) return <span className="aim_pill is_none">—</span>;
  const tone = value >= good ? "good" : value >= warn ? "warn" : "bad";
  return <span className={`aim_pill is_${tone}`}>{value}{max ? <small>/{max}</small> : null}</span>;
}

export function Status_Pill({ value }) {
  const map = { completed: "good", ok: "good", in_progress: "warn", aborted: "warn", error: "bad" };
  const label = { get completed() { return ENGLISH.completed_3; }, get in_progress() { return ENGLISH.in_progress; }, get ok() { return ENGLISH.answered; }, get aborted() { return ENGLISH.stopped; }, error: ENGLISH.error };
  return <span className={`aim_pill is_${map[value] || "none"}`}>{label[value] || value || "—"}</span>;
}

export function Detail_Drawer({ open, title, loading, error, on_close, children }) {
  return (
    <Modal open={open} title={title} size="sheet" onClose={on_close}>
      <div className="aim_drawer">
        {loading ? <p className="aim_empty">{ENGLISH.loading_details}</p> : null}
        {error ? <p className="aim_error">{error}</p> : null}
        {!loading && !error ? children : null}
      </div>
    </Modal>
  );
}

export function score_tone(score, max = 10) {
  if (score == null) return "none";
  const ratio = Number(score) / max;
  if (ratio >= 0.7) return "good";
  if (ratio >= 0.4) return "warn";
  return "bad";
}

export function Score_Ring({ score, max = 10 }) {
  const value = score == null ? 0 : Math.max(0, Math.min(max, Number(score)));
  return (
    <div className={`aim_ring is_${score_tone(score, max)}`} aria-label={score == null ? ENGLISH.not_scored : ENGLISH.score_out_of(score, max)}>
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="18" className="aim_ring_track" />
        <circle cx="22" cy="22" r="18" className="aim_ring_fill" strokeDasharray={`${(value / max) * 113.1} 113.1`} />
      </svg>
      <div>
        <b>{score == null ? "—" : score}</b>
        <small>/{max}</small>
      </div>
    </div>
  );
}

export function Meter({ label, value, max = 100, suffix = "%" }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, (Number(value) / max) * 100));
  return (
    <div className={`aim_meter is_${score_tone(value, max)}`}>
      <span>{label}</span>
      <i><em style={{ width: `${width}%` }} /></i>
      <b>{show(value, suffix)}</b>
    </div>
  );
}

export function Hero({ name, meta, chips = [], children }) {
  return (
    <header className="aim_iv_hero">
      <span className="aim_iv_avatar">{initials(name)}</span>
      <div className="aim_iv_who">
        <b>{name}</b>
        <small>{meta}</small>
        {chips.filter(Boolean).length ?
          <span className="aim_iv_chips">{chips.filter(Boolean).map((chip) => <span key={chip} className="aim_iv_role">{chip}</span>)}</span> :
          null}
      </div>
      {children}
    </header>
  );
}

export function Tabs({ items, value, on_change }) {
  return (
    <nav className="aim_iv_tabs" aria-label={ENGLISH.sections}>
      {items.map((entry) =>
        <button key={entry.id} type="button" className={value === entry.id ? "is_on" : ""} onClick={() => on_change(entry.id)}>
          {entry.icon ? <span aria-hidden="true">{entry.icon}</span> : null}
          {entry.label}
          {entry.count != null ? <em>{entry.count}</em> : null}
        </button>
      )}
    </nav>
  );
}

export function Section_Card({ icon, title, tone = "indigo", count, children }) {
  return (
    <section className={`aim_card is_${tone}`}>
      <header>
        <span aria-hidden="true">{icon}</span>
        <h3>{title}</h3>
        {count != null ? <em>{count}</em> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

export function Point_List({ items, tone = "indigo", numbered = false, empty = ENGLISH.nothing_recorded }) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return <p className="aim_muted">{empty}</p>;
  const mark = {
    green: <path d="m6 12 4 4 8-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
    rose: <path d="M12 7v6M12 16.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
    amber: <path d="M12 7v6M12 16.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
    indigo: <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
    sky: <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  };
  return (
    <ul className={`aim_points is_${tone}`}>
      {list.map((item, index) =>
        <li key={`${index}-${item}`}>
          <i aria-hidden="true">{numbered ? <b>{index + 1}</b> : <svg viewBox="0 0 24 24" fill="none">{mark[tone] || mark.indigo}</svg>}</i>
          <span>{item}</span>
        </li>
      )}
    </ul>
  );
}

export function Carousel({ children, className = "", label }) {
  const track = useRef(null);
  const [edges, set_edges] = useState({ left: false, right: false });

  function read_edges() {
    const node = track.current;
    if (!node) return;
    const left = node.scrollLeft > 2;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 2;
    set_edges((current) => (current.left === left && current.right === right ? current : { left, right }));
  }

  useEffect(() => {
    const node = track.current;
    if (!node) return undefined;
    read_edges();
    const observer = new ResizeObserver(read_edges);
    observer.observe(node);
    node.addEventListener("scroll", read_edges, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", read_edges);
    };
  }, []);

  function slide(direction) {
    const node = track.current;
    if (node) node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className={`aim_carousel${edges.left ? " is_left" : ""}${edges.right ? " is_right" : ""}`}>
      {edges.left ?
        <button type="button" className="aim_carousel_btn is_left" aria-label={ENGLISH.previous} onClick={() => slide(-1)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button> :
        null}
      <ol ref={track} className={`aim_carousel_track ${className}`.trim()} aria-label={label}>{children}</ol>
      {edges.right ?
        <button type="button" className="aim_carousel_btn is_right" aria-label={ENGLISH.next} onClick={() => slide(1)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button> :
        null}
    </div>
  );
}

export function Tag_List({ items, tone = "indigo", empty = ENGLISH.none }) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return <p className="aim_muted">{empty}</p>;
  return <ul className={`aim_tags is_${tone}`}>{list.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>;
}

export function use_detail(load) {
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
  return { ...state, open_detail: open, close };
}

export function export_csv(file_name, columns, rows) {
  const escape = (value) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
  };
  const lines = [columns.map((column) => escape(column.label)).join(",")];
  for (const row of rows) lines.push(columns.map((column) => escape(column.value(row))).join(","));
  const blob = new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${file_name}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const ICONS = {
  interview: <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M9 20h6M12 16v4M9 9.5h6M9 12.5h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  resume: <svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M14 3v5h5M10 12h6M10 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none"><path d="M5 5h14v10H9l-4 4V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  trend: <svg viewBox="0 0 24 24" fill="none"><path d="M4 18 10 12l4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none"><path d="M5 19V9M10 19V5M15 19v-7M20 19v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  star: <svg viewBox="0 0 24 24" fill="none"><path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none"><path d="M12 4 21 19H3L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  list: <svg viewBox="0 0 24 24" fill="none"><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  pie: <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v9h9a9 9 0 1 1-9-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" /><path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  target: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" /><path d="m8.5 12 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  spark: <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" /></svg>,
  bulb: <svg viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M12 3a6 6 0 0 0-3 11.2V16h6v-1.8A6 6 0 0 0 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  missing: <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" strokeDasharray="3 3" /><path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  code: <svg viewBox="0 0 24 24" fill="none"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  cap: <svg viewBox="0 0 24 24" fill="none"><path d="M3 9l9-5 9 5-9 5-9-5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  folder: <svg viewBox="0 0 24 24" fill="none"><path d="M4 7.5h6l2 2H20v9H4v-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  award: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="5" stroke="currentColor" strokeWidth="1.7" /><path d="M9 13.5 8 21l4-2 4 2-1-7.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M14 3v5h5M10 12h6M10 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" /><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>,
  link: <svg viewBox="0 0 24 24" fill="none"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
};
