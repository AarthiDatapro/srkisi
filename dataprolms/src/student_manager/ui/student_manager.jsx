import { useEffect, useMemo, useState } from "react";
import { LMS_MEDIA_PHONE } from "../../design_system/breakpoints.js";
import { createPortal } from "react-dom";
import { get_report_card, get_report_cards, list_program_students, list_report_programs } from "../api.js";
import { Report_Card } from "./report_card.jsx";
import { print_report_cards } from "./print_report.jsx";
import "../theme/report_card.css";
import "../theme/student_manager.css";
import { STUDENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/student_manager_constants_english.js";

const GRADE_TONES = { "A+": "gold", A: "gold", "B+": "green", B: "sky", C: "indigo", D: "amber", F: "rose" };

function fmt(value, suffix = "%") {
  return value == null ? "—" : `${value}${suffix}`;
}

function use_phone() {
  const [phone, set_phone] = useState(
    () => typeof window !== "undefined" && window.matchMedia(LMS_MEDIA_PHONE).matches
  );

  useEffect(() => {
    const media = window.matchMedia(LMS_MEDIA_PHONE);
    const sync = () => set_phone(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return phone;
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

function tone(value) {
  if (value == null) return "none";
  if (value >= 75) return "good";
  if (value >= 50) return "fair";
  return "low";
}

function file_name(program, student) {
  const base = student ? `${student.name}_${program.program_name}` : `${program.program_name}_report_cards`;
  return `${base.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}`;
}

function Mini({ value }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <span className={`stm_mini is_${tone(value)}`}>
      <i><em style={{ width: `${width}%` }} /></i>
      <b>{fmt(value)}</b>
    </span>
  );
}

function export_csv(program, rows) {
  const headers = [ENGLISH.rank, ENGLISH.student, ENGLISH.itda_id, ENGLISH.student_id, ENGLISH.email, ENGLISH.mobile, ENGLISH.overall, ENGLISH.grade, ENGLISH.band, ENGLISH.progress, ENGLISH.quiz, ENGLISH.coding_3, ENGLISH.attendance_3, ENGLISH.hackathon_2, ENGLISH.quizzes_attempted, ENGLISH.quizzes_total, ENGLISH.hackathons_joined_2, ENGLISH.mock_best_10, ENGLISH.resume_100];
  const escape = (value) => {
    const text = value == null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push([
      row.rank, row.student.name, row.student.itda_id, row.student.student_id, row.student.email, row.student.mobile,
      row.overall, row.grade, row.band, row.metrics.progress, row.metrics.quiz, row.metrics.coding, row.metrics.attendance, row.metrics.hackathon,
      row.counts.quizzes_attempted, row.counts.quizzes_total, row.career.hackathons_joined, row.career.mock_best, row.career.resume_score
    ].map(escape).join(","));
  }
  const blob = new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${file_name(program)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function Student_Manager() {
  const [programs, set_programs] = useState([]);
  const [program_id, set_program_id] = useState("");
  const [query, set_query] = useState("");
  const [grade, set_grade] = useState("");
  const [data, set_data] = useState(null);
  const [loading, set_loading] = useState(false);
  const [error, set_error] = useState("");
  const [selected, set_selected] = useState(() => new Set());
  const [busy, set_busy] = useState("");
  const [preview, set_preview] = useState(null);
  const phone = use_phone();

  useEffect(() => {
    list_report_programs().then((payload) => {
      const list = payload.programs || [];
      set_programs(list);
      const first = list.find((row) => row.students > 0) || list[0];
      if (first) set_program_id(String(first.id));
    }).catch((err) => set_error(err.message));
  }, []);

  useEffect(() => {
    if (!program_id) return undefined;
    let alive = true;
    set_loading(true);
    set_error("");
    const handle = setTimeout(() => {
      list_program_students({ program_id, q: query.trim() }).then((payload) => {
        if (alive) set_data(payload);
      }).catch((err) => {
        if (alive) set_error(err.message);
      }).finally(() => {
        if (alive) set_loading(false);
      });
    }, query ? 300 : 0);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [program_id, query]);

  useEffect(() => {
    set_selected(new Set());
    set_grade("");
  }, [program_id]);

  const rows = useMemo(() => (data?.rows || []).filter((row) => !grade || row.grade === grade), [data, grade]);
  const summary = data?.summary || {};
  const program = data?.program;
  const all_selected = rows.length > 0 && rows.every((row) => selected.has(row.student.student_id));

  function toggle(id) {
    set_selected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggle_all() {
    set_selected(all_selected ? new Set() : new Set(rows.map((row) => row.student.student_id)));
  }

  async function download_one(row) {
    set_busy(row.student.student_id);
    try {
      const payload = await get_report_card(row.student.student_id, program_id);
      await print_report_cards(payload, file_name(payload.program, row.student));
    } catch (err) {
      set_error(err.message);
    } finally {
      set_busy("");
    }
  }

  async function download_many(ids) {
    set_busy("bulk");
    try {
      const payload = await get_report_cards({ program_id, student_ids: ids.join(",") });
      await print_report_cards(payload, file_name(payload.program));
    } catch (err) {
      set_error(err.message);
    } finally {
      set_busy("");
    }
  }

  useEffect(() => {
    if (phone) set_preview(null);
  }, [phone]);

  async function open_preview(index) {
    const row = rows[index];
    if (!row) return;
    set_preview({ index, loading: true, payload: null, error: "" });
    try {
      const payload = await get_report_card(row.student.student_id, program_id);
      set_preview((current) => (current?.index === index ? { index, loading: false, payload, error: "" } : current));
    } catch (err) {
      set_preview((current) => (current?.index === index ? { index, loading: false, payload: null, error: err.message } : current));
    }
  }

  const max_grade = Math.max(1, ...(data?.grade_counts || []).map((row) => row.count));

  return (
    <section className="stm_desk">
      <header className="stm_head">
        <div className="stm_head_title">
          <span className="stm_head_mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M3 9l9-5 9 5-9 5-9-5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 9v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </span>
          <div>
            <h1>{ENGLISH.student_manager}</h1>
            <p>{ENGLISH.program_wise_performance_rankings_and_report_cards}</p>
          </div>
        </div>
        <div className="stm_head_tools">
          <select aria-label={ENGLISH.program} value={program_id} onChange={(event) => set_program_id(event.target.value)}>
            {programs.map((row) => <option key={row.id} value={row.id}>{row.name} ({row.students})</option>)}
          </select>
          <label className="stm_search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            <input value={query} placeholder={ENGLISH.email_or_phone_number} onChange={(event) => set_query(event.target.value)} />
          </label>
          {query || grade ?
            <button type="button" className="stm_clear" onClick={() => { set_query(""); set_grade(""); }}>{ENGLISH.clear_filters}</button> :
            null}
          <button type="button" className="stm_ghost" disabled={!rows.length} onClick={() => export_csv(program, rows)}>{ENGLISH.export_csv}</button>
          <button type="button" className="stm_primary" disabled={!rows.length || busy === "bulk"} onClick={() => download_many(rows.map((row) => row.student.student_id))}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {busy === "bulk" ? "Preparing..." : ENGLISH.all_report_cards(rows.length)}
          </button>
        </div>
      </header>

      {error ? <p className="stm_error">{error}</p> : null}

      {program ?
        <div className={`stm_body${loading ? " is_loading" : ""}`}>
          <section className="stm_program">
            <div>
              <small>{program.program_code}</small>
              <b>{program.program_name}</b>
              <span>{[program.cohorts?.join(", "), program.start_date ? `${program.start_date} → ${program.end_date || "ongoing"}` : "", program.duration_months ? ENGLISH.months(program.duration_months) : ""].filter(Boolean).join("  ·  ")}</span>
            </div>
            <div className="stm_grades" aria-label={ENGLISH.grade_distribution}>
              {(data.grade_counts || []).map((row) =>
                <button
                  key={row.grade}
                  type="button"
                  className={`stm_grade_col is_${GRADE_TONES[row.grade]}${grade === row.grade ? " is_on" : ""}`}
                  title={ENGLISH.students_2(row.band, row.count)}
                  onClick={() => set_grade(grade === row.grade ? "" : row.grade)}>
                  <b>{row.count}</b>
                  <span><i style={{ height: `${(row.count / max_grade) * 100}%` }} /></span>
                  <small>{row.grade}</small>
                </button>
              )}
            </div>
          </section>

          <div className="stm_kpis">
            <article className="is_indigo"><span>{ENGLISH.students}</span><b>{summary.students ?? "—"}</b><small>{summary.graded}{ENGLISH.graded}</small></article>
            <article className="is_violet"><span>{ENGLISH.class_average}</span><b>{fmt(summary.class_average)}</b><small>{ENGLISH.overall_score}</small></article>
            <article className="is_gold"><span>{ENGLISH.distinction}</span><b>{summary.distinction ?? "—"}</b><small>{ENGLISH.label_80_and_above}</small></article>
            <article className="is_rose"><span>{ENGLISH.at_risk}</span><b>{summary.at_risk ?? "—"}</b><small>{ENGLISH.below_40}</small></article>
            <article className="is_green"><span>{ENGLISH.avg_attendance}</span><b>{fmt(summary.avg_attendance)}</b><small>{ENGLISH.across_courses}</small></article>
            <article className="is_sky"><span>{ENGLISH.avg_quiz_score}</span><b>{fmt(summary.avg_quiz)}</b><small>{ENGLISH.all_quizzes_counted}</small></article>
            <article className="is_violet"><span>{ENGLISH.avg_hackathons}</span><b>{fmt(summary.avg_hackathon)}</b><small>{ENGLISH.across_program_hackathons}</small></article>
          </div>

          <section className="stm_panel">
            <header>
              <h2>{ENGLISH.students}{grade ? ENGLISH.grade_2(grade) : ""}</h2>
              {selected.size ?
                <button type="button" className="stm_primary is_small" disabled={busy === "bulk"} onClick={() => download_many([...selected])}>{ENGLISH.download_selected}{selected.size})
                </button> :
                <small>{ENGLISH.tick_students_to_download_their_report_cards_together}</small>}
            </header>
            <div className="stm_table_wrap">
              <table className="stm_table">
                <thead>
                  <tr>
                    <th><input type="checkbox" aria-label={ENGLISH.select_all} checked={all_selected} onChange={toggle_all} /></th>
                    <th>{ENGLISH.rank}</th>
                    <th>{ENGLISH.student}</th>
                    <th>{ENGLISH.progress_2}</th>
                    <th>{ENGLISH.quizzes}</th>
                    <th>{ENGLISH.coding}</th>
                    <th>{ENGLISH.attendance}</th>
                    <th>{ENGLISH.hackathons}</th>
                    <th>{ENGLISH.career}</th>
                    <th className="is_end">{ENGLISH.overall_2}</th>
                    <th className="is_end">{ENGLISH.report_card}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((row, index) =>
                    <tr key={row.student.student_id} className={selected.has(row.student.student_id) ? "is_selected" : ""}>
                      <td><input type="checkbox" aria-label={ENGLISH.select(row.student.name)} checked={selected.has(row.student.student_id)} onChange={() => toggle(row.student.student_id)} /></td>
                      <td><span className={`stm_rank${row.rank && row.rank <= 3 ? ` is_top${row.rank}` : ""}`}>{row.rank ?? "—"}</span></td>
                      <td>
                        <span className="stm_student">
                          <i>{initials(row.student.name)}</i>
                          <span>
                            <b>{row.student.name}</b>
                            <small>{[row.student.itda_id, row.student.email || row.student.mobile].filter(Boolean).join(" · ")}</small>
                          </span>
                        </span>
                      </td>
                      <td><Mini value={row.metrics.progress} /></td>
                      <td><Mini value={row.metrics.quiz} /></td>
                      <td><Mini value={row.metrics.coding} /></td>
                      <td><Mini value={row.metrics.attendance} /></td>
                      <td><Mini value={row.metrics.hackathon} /></td>
                      <td>
                        <span className="stm_career">
                          <em title={ENGLISH.hackathons_joined_2}>🏆 {row.career.hackathons_joined}</em>
                          <em title={ENGLISH.career_readiness_10(row.career.mock_best ?? "—")}>🎤 {row.career.mock_best ?? "—"}</em>
                          <em title={ENGLISH.latest_resume_score_2}>📄 {row.career.resume_score ?? "—"}</em>
                        </span>
                      </td>
                      <td className="is_end">
                        <span className={`stm_overall is_${GRADE_TONES[row.grade] || "none"}`}>
                          <b>{row.grade}</b>
                          <small>{fmt(row.overall)}</small>
                        </span>
                      </td>
                      <td className="is_end">
                        <span className="stm_actions">
                          <button type="button" disabled={busy === row.student.student_id} onClick={() => phone ? download_one(row) : open_preview(index)}>
                            {phone ? ENGLISH.download : ENGLISH.view}
                          </button>
                          {phone ? null :
                          <button type="button" className="is_icon" aria-label={ENGLISH.download_s_report_card(row.student.name)} disabled={busy === row.student.student_id} onClick={() => download_one(row)}>
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>}
                        </span>
                      </td>
                    </tr>
                  ) :
                    <tr><td colSpan={11} className="stm_empty">{loading ? ENGLISH.loading_students : ENGLISH.no_students_match_these_filters}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div> :
        <p className="stm_empty">{loading ? "Loading..." : ENGLISH.choose_a_program_to_see_its_students}</p>}

      {preview && !phone ?
        <Report_Preview
          preview={preview}
          total={rows.length}
          on_close={() => set_preview(null)}
          on_step={(step) => open_preview(preview.index + step)}
          on_download={() => preview.payload && print_report_cards(preview.payload, file_name(preview.payload.program, preview.payload.cards[0].student))} /> :
        null}
    </section>
  );
}

export function Report_Preview({ preview, total, on_close, on_step, on_download, title, step_noun = "student" }) {
  useEffect(() => {
    function on_key(event) {
      if (event.key === ENGLISH.escape) on_close();
      if (event.key === "ArrowRight" && on_step && preview.index < total - 1) on_step(1);
      if (event.key === "ArrowLeft" && on_step && preview.index > 0) on_step(-1);
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [preview.index, total]);

  const card = preview.payload?.cards?.[0];
  return createPortal(
    <div className="stm_preview" role="dialog" aria-modal="true" aria-label={ENGLISH.report_card_preview}>
      <div className="stm_preview_bar">
        <button type="button" className="stm_preview_close" onClick={on_close} aria-label={ENGLISH.close_preview}>✕</button>
        <b>{title || (card ? card.student.name : ENGLISH.report_card)}</b>
        {on_step && total > 1 ?
          <span className="stm_preview_steps">
            <button type="button" disabled={preview.index <= 0} onClick={() => on_step(-1)} aria-label={ENGLISH.previous(step_noun)}>‹</button>
            <small>{preview.index + 1} / {total}</small>
            <button type="button" disabled={preview.index >= total - 1} onClick={() => on_step(1)} aria-label={ENGLISH.next(step_noun)}>›</button>
          </span> :
          null}
        <button type="button" className="stm_primary" disabled={!card} onClick={on_download}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.download_pdf}</button>
      </div>
      <div className="stm_preview_stage" onClick={(event) => { if (event.target === event.currentTarget) on_close(); }}>
        {preview.loading ? <p className="stm_preview_note">{ENGLISH.building_report_card}</p> : null}
        {preview.error ? <p className="stm_preview_note is_error">{preview.error}</p> : null}
        {card ?
          <div className="stm_preview_paper">
            <Report_Card card={card} program={preview.payload.program} generated_at={preview.payload.generated_at} grading={preview.payload.grading} />
          </div> :
          null}
      </div>
    </div>,
    document.body
  );
}
