import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@datapromr/button";
import { LMS_MEDIA_PHONE } from "../../design_system/breakpoints.js";
import { list_hackathon_batches, save_hackathon_batch } from "../api.js";
import { TYPE_LABEL } from "../constants.js";
import { parse_types } from "../utils.js";
import { Batch_Modal } from "./batch_modal.jsx";
import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/hackathon_manager_constants_english.js";

const TEAM_COLORS = ["#4f46e5", "#16a34a", "#f59e0b", "#7c3aed"];
const CHIP_COLORS = ["#e0e7ff", "#dcfce7", "#ffedd5", "#f3e8ff"];

function date_parts(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return { day: "Not scheduled", time: "" };
  return {
    day: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  };
}

function type_kind(value) {
  const types = parse_types(value);
  if (types.length === 1) return types[0];
  return types[0] || "mcq";
}

function Stat_Art({ kind }) {
  if (kind === "live") {
    return <svg viewBox="0 0 72 40" aria-hidden="true"><path d="M8 30h8v-8H8zm14 8h8V14h-8zm14-4h8V10h-8zm14 6h8V18h-8z" /></svg>;
  }
  if (kind === "batch") {
    return <svg viewBox="0 0 72 40" fill="none" aria-hidden="true"><circle cx="24" cy="14" r="5" fill="currentColor" /><circle cx="36" cy="12" r="6" fill="currentColor" /><circle cx="48" cy="14" r="5" fill="currentColor" /><path d="M14 32c1.2-6 5-9 10-9s8.8 3 10 9M32 32c.8-5 3.4-8 8-8s7.2 3 8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
  }
  if (kind === "people") {
    return <svg viewBox="0 0 72 40" fill="none" aria-hidden="true"><path d="M6 28c8-10 14-6 22-8s12 2 20-6 14 0 18 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M52 14l8 4-8 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  return <svg viewBox="0 0 72 40" aria-hidden="true"><path d="M4 30c8-2 10-14 18-14s8 10 16 8 10-16 18-14 8 12 12 10v12H4Z" /></svg>;
}

function Type_Tile({ kind }) {
  if (kind === "coding") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (kind === "project") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.4.5.7 1 .8 1.6h4.4c.1-.6.4-1.1.8-1.6A6 6 0 0 0 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M9 9h6M9 13h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
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

function Hack_Cards({ items, chosen_id, can_edit, on_pick, on_view, on_open, on_delete }) {
  if (!items.length) return null;
  return items.map((item) => {
    const when = date_parts(item.starts_at);
    const lead = type_kind(item.hackathon_type);
    const labels = parse_types(item.hackathon_type);
    const place = item.audience === "open" ? ENGLISH.open_hackathon_2 : item.program_name || item.cohort_name || "—";
    const on = chosen_id === item.hackathon_id;
    return (
      <li key={item.hackathon_id} className={on ? "hkm_hack_card is_on" : "hkm_hack_card"}>
        <button type="button" className="hkm_hack_open" onClick={() => on_pick(item.hackathon_id)}>
          <i className={`is_${lead}`}><Type_Tile kind={lead} /></i>
          <span>
            <strong>{item.title}</strong>
            <span className="hkm_hack_meta">
              {(labels.length ? labels : ["mcq"]).map((id) =>
                <em key={id} className={`hkm_type is_${id}`}>{TYPE_LABEL[id] || ENGLISH.hackathon}</em>
              )}
              <span>{place}</span>
              <span>{[when.day, when.time].filter(Boolean).join(" · ")}</span>
            </span>
          </span>
          <em className={item.status === "published" ? "hkm_status is_live" : "hkm_status is_draft"}>{item.status === "published" ? ENGLISH.published : ENGLISH.draft}</em>
        </button>
        <div className="hkm_row_tools">
          <button type="button" aria-label={ENGLISH.view_hackathon} onClick={() => on_view(item.hackathon_id)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" /></svg>
          </button>
          {can_edit ?
            <button type="button" aria-label={ENGLISH.edit_hackathon} onClick={() => on_open(item.hackathon_id)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4.2L19 9.2 14.8 5 4 15.8V20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
            </button> :
            null}
          {can_edit ?
            <button type="button" className="is_remove" aria-label={ENGLISH.delete_hackathon} onClick={() => on_delete(item)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button> :
            null}
        </div>
      </li>
    );
  });
}

export function Hackathon_Board({ items, loading, can_edit, on_view, on_open, on_create, on_delete, on_counts }) {
  const [query, set_query] = useState("");
  const [chosen_id, set_chosen_id] = useState(null);
  const [batches, set_batches] = useState([]);
  const [batch_loading, set_batch_loading] = useState(false);
  const [batch_error, set_batch_error] = useState("");
  const [batch_edit, set_batch_edit] = useState(null);
  const [batch_busy, set_batch_busy] = useState(false);
  const [open_batch, set_open_batch] = useState(null);
  const [team_query, set_team_query] = useState("");
  const [sheet_open, set_sheet_open] = useState(false);
  const phone = use_phone();

  const chosen = items.find((item) => item.hackathon_id === chosen_id) || items[0] || null;

  useEffect(() => {
    set_team_query("");
  }, [chosen?.hackathon_id]);

  useEffect(() => {
    if (!phone) set_sheet_open(false);
  }, [phone]);

  useEffect(() => {
    if (!chosen) {
      set_batches([]);
      return;
    }
    let alive = true;
    set_batch_loading(true);
    set_batch_error("");
    list_hackathon_batches(chosen.hackathon_id).then((payload) => {
      if (!alive) return;
      const next = payload.items || [];
      set_batches(next);
      on_counts(chosen.hackathon_id, {
        batch_count: next.length,
        participant_count: next.reduce((sum, batch) => sum + (batch.student_count || 0), 0)
      });
    }).catch((err) => {
      if (alive) set_batch_error(err.message);
    }).finally(() => {
      if (alive) set_batch_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [chosen?.hackathon_id]);

  const visible = useMemo(() => items.filter((item) => {
    const text = `${item.title} ${item.description || ""} ${item.cohort_name || ""} ${item.program_name || ""}`.toLowerCase();
    if (query.trim() && !text.includes(query.trim().toLowerCase())) return false;
    return true;
  }), [items, query]);

  const published = items.filter((item) => item.status === "published").length;
  const batch_total = items.reduce((sum, item) => sum + (item.batch_count || 0), 0);
  const people_total = items.reduce((sum, item) => sum + (item.participant_count || 0), 0);
  const place = chosen?.program_name || chosen?.cohort_name || (chosen?.audience === "open" ? ENGLISH.open_hackathon : ENGLISH.no_program);
  const place_students = batches.reduce((sum, batch) => sum + (batch.student_count || 0), 0);
  const team_needle = team_query.trim().toLowerCase();
  const shown_batches = team_needle ?
    batches.filter((batch) => [
      batch.batch_name,
      ...batch.students.flatMap((student) => [student.full_name, student.course_student_id, student.student_id])
    ].some((value) => String(value || "").toLowerCase().includes(team_needle))) :
    batches;

  async function save_batch(body) {
    if (!chosen) return;
    set_batch_busy(true);
    set_batch_error("");
    try {
      await save_hackathon_batch(chosen.hackathon_id, body.batch_id, body);
      const payload = await list_hackathon_batches(chosen.hackathon_id);
      const next = payload.items || [];
      set_batches(next);
      on_counts(chosen.hackathon_id, {
        batch_count: next.length,
        participant_count: next.reduce((sum, batch) => sum + (batch.student_count || 0), 0)
      });
      set_batch_edit(null);
    } catch (err) {
      set_batch_error(err.message);
    } finally {
      set_batch_busy(false);
    }
  }

  return (
    <div className={phone ? "hkm_dash is_phone" : "hkm_dash"}>
      <header className="hkm_dash_head">
        <div>
          <h1 className="hkm_dash_title">{ENGLISH.hackathon_management_2}</h1>
        </div>
        <div className="hkm_dash_actions">
          {can_edit ?
            <Button type="button" onClick={on_create}>{ENGLISH.new_hackathon}</Button> :
            null}
        </div>
      </header>
      <div className="hkm_stats">
        <article className="hkm_stat is_total">
          <span className="hkm_stat_icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.7" /><path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5 4.5 4.5 0 0 0 8.5 11M16 5h2.5A1.5 1.5 0 0 1 20 6.5 4.5 4.5 0 0 1 15.5 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M12 11v3M9 20h6M10 14h4v6h-4v-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg></span>
          <div><b>{items.length}</b><em>{ENGLISH.total_hackathons}</em></div>
          <span className="hkm_stat_art"><Stat_Art kind="total" /></span>
        </article>
        <article className="hkm_stat is_live">
          <span className="hkm_stat_icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 7.5v9l8-4.5-8-4.5Z" /></svg></span>
          <div><b>{published}</b><em>{ENGLISH.published_hackathons}</em></div>
          <span className="hkm_stat_art"><Stat_Art kind="live" /></span>
        </article>
        <article className="hkm_stat is_batch">
          <span className="hkm_stat_icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" /><circle cx="16" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.7" /><path d="M4.5 18v-1.2A3.3 3.3 0 0 1 7.8 13.5h2.4A3.3 3.3 0 0 1 13.5 16.8V18M14 18v-.8a2.6 2.6 0 0 1 2.2-2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></span>
          <div><b>{batch_total}</b><em>{ENGLISH.active_batches}</em></div>
          <span className="hkm_stat_art"><Stat_Art kind="batch" /></span>
        </article>
        <article className="hkm_stat is_people">
          <span className="hkm_stat_icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.7" /><path d="M6.5 18.5v-1.2A3.8 3.8 0 0 1 10.3 13.5h3.4a3.8 3.8 0 0 1 3.8 3.8v1.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></span>
          <div><b>{people_total}</b><em>{ENGLISH.participants}</em></div>
          <span className="hkm_stat_art"><Stat_Art kind="people" /></span>
        </article>
      </div>
      <div className="hkm_dash_grid">
        {phone ? null :
        <section className="hkm_panel">
          <header className="hkm_panel_head">
            <span className="hkm_panel_mark is_list" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><path d="M6 8h.01M6 12h.01M6 16h.01M10 8h8M10 12h8M10 16h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </span>
            <div>
              <h2>{ENGLISH.hackathon_list}</h2>
            </div>
            <div className="hkm_filters">
            <label className="hkm_search">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              <input value={query} placeholder={ENGLISH.search_hackathons} onChange={(event) => set_query(event.target.value)} />
            </label>
            </div>
          </header>
          {loading ? <p className="hkm_note">{ENGLISH.loading_hackathons}</p> : null}
          <ul className="hkm_hack_cards">
            {visible.length ?
              <Hack_Cards
                items={visible}
                chosen_id={chosen?.hackathon_id}
                can_edit={can_edit}
                on_pick={set_chosen_id}
                on_view={on_view}
                on_open={on_open}
                on_delete={on_delete} /> :
              <li className="hkm_hack_empty">{loading ? "Loading..." : ENGLISH.no_hackathons_match}</li>}
          </ul>
        </section>}
        <aside className="hkm_panel hkm_batches">
          <header className="hkm_panel_head">
            <span className="hkm_panel_mark is_batch" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" /><circle cx="16" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.7" /><path d="M4.5 18v-1.2A3.3 3.3 0 0 1 7.8 13.5h2.4A3.3 3.3 0 0 1 13.5 16.8V18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </span>
            <div>
              <h2>{ENGLISH.batch_management}</h2>
            </div>
            {can_edit ?
              <button type="button" className="hkm_create_batch" disabled={!chosen} onClick={() => set_batch_edit({ batch_name: "", students: [] })}>{ENGLISH.create_batch_2}</button> :
              null}
          </header>
          {chosen ?
            <div className="hkm_team_head" title={chosen.title}>
              <i aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 9.5 12 5l9 4.5M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 19.5h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </i>
              <strong>{place}</strong>
              <span>{batches.length} {batches.length === 1 ? "batch" : "batches"}</span>
              <span>{place_students} {place_students === 1 ? "student" : "students"}</span>
            </div> :
            null}
          <label className="hkm_search hkm_team_search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            <input value={team_query} disabled={!chosen} placeholder={ENGLISH.search_teams_or_students} onChange={(event) => set_team_query(event.target.value)} />
          </label>
          {batch_error ? <p className="hkm_page_error">{batch_error}</p> : null}
          {batch_loading ? <p className="hkm_note">{ENGLISH.loading_batches}</p> : null}
          <ul className="hkm_teams">
            {shown_batches.map((batch) => {
              const index = batches.indexOf(batch);
              const preview = batch.students.slice(0, 3);
              const extra = Math.max(0, batch.students.length - preview.length);
              const open = open_batch === batch.batch_id;
              return (
                <li key={batch.batch_id} style={{ borderLeftColor: TEAM_COLORS[index % TEAM_COLORS.length] }}>
                  <div className="hkm_team_main">
                    <strong>{batch.batch_name}</strong>
                    <small>{batch.student_count} {batch.student_count === 1 ? "student" : "students"}</small>
                  </div>
                  <div className="hkm_team_side">
                    <div className="hkm_chips">
                      {preview.map((student, chip) =>
                        <b key={student.student_id} style={{ background: CHIP_COLORS[(index + chip) % CHIP_COLORS.length] }}>{student.initials}</b>
                      )}
                      {extra ? <b className="is_more">+{extra}</b> : null}
                    </div>
                    <button type="button" onClick={() => set_open_batch(open ? null : batch.batch_id)}>{open ? ENGLISH.hide : ENGLISH.view}</button>
                    {can_edit ?
                      <button type="button" aria-label={ENGLISH.edit_batch} onClick={() => set_batch_edit(batch)}>
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4.2L19 9.2 14.8 5 4 15.8V20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                      </button> :
                      null}
                  </div>
                  {open ?
                    <ul className="hkm_member_list">
                      {batch.students.map((student) =>
                        <li key={student.student_id}>{student.full_name} <small>{student.course_student_id || `ID ${student.student_id}`}</small></li>
                      )}
                    </ul> :
                    null}
                </li>
              );
            })}
          </ul>
          {!batch_loading && chosen && !batches.length ? <p className="hkm_note">{ENGLISH.no_batches_yet}</p> : null}
          {!batch_loading && batches.length > 0 && !shown_batches.length ? <p className="hkm_note">{ENGLISH.no_teams_match}</p> : null}
        </aside>
      </div>
      {phone && chosen && typeof document !== "undefined" ?
        createPortal(
          <>
            {sheet_open ? null :
              <button
                type="button"
                className="hkm_pick_dock"
                aria-haspopup="dialog"
                onClick={() => set_sheet_open(true)}>
                <span>
                  <small>{place}</small>
                  <b>{chosen.title}</b>
                </span>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 14 5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>}
            {sheet_open ?
              <div className="hkm_pick_sheet" role="presentation">
                <button type="button" className="hkm_pick_scrim" aria-label={ENGLISH.close_hackathon_list} onClick={() => set_sheet_open(false)} />
                <div className="hkm_pick_panel" role="dialog" aria-modal="true" aria-label={ENGLISH.choose_a_hackathon}>
                  <div className="hkm_pick_handle" aria-hidden="true" />
                  <header className="hkm_pick_head">
                    <strong>{ENGLISH.hackathons}</strong>
                    <button type="button" aria-label={ENGLISH.close} onClick={() => set_sheet_open(false)}>×</button>
                  </header>
                  <label className="hkm_search">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                    <input value={query} placeholder={ENGLISH.search_hackathons} onChange={(event) => set_query(event.target.value)} />
                  </label>
                  <ul className="hkm_hack_cards">
                    {visible.length ?
                      <Hack_Cards
                        items={visible}
                        chosen_id={chosen.hackathon_id}
                        can_edit={can_edit}
                        on_pick={(id) => {
                          set_chosen_id(id);
                          set_sheet_open(false);
                        }}
                        on_view={(id) => {
                          set_sheet_open(false);
                          on_view(id);
                        }}
                        on_open={(id) => {
                          set_sheet_open(false);
                          on_open(id);
                        }}
                        on_delete={on_delete} /> :
                      <li className="hkm_hack_empty">{loading ? "Loading..." : ENGLISH.no_hackathons_match}</li>}
                  </ul>
                </div>
              </div> :
              null}
          </>,
          document.body
        ) :
        null}
      <Batch_Modal
        open={Boolean(batch_edit)}
        hackathon_id={chosen?.hackathon_id}
        batch={batch_edit}
        busy={batch_busy}
        on_close={() => {
          if (!batch_busy) set_batch_edit(null);
        }}
        on_save={save_batch} />
    </div>
  );
}
