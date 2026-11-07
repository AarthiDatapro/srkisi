import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@datapromr/button";
import { useToast } from "@datapromr/toast";
import { get_course_attendance, save_course_attendance } from "../../course_manager/api.js";
import { face_tone, initials_from_name } from "../utils.js";
import { content_paths, use_slug_mirror } from "../../url_slugs.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";
const STATUSES = [
{ id: "present", get label() { return ENGLISH.present; }, get short() { return ENGLISH.p; } },
{ id: "absent", get label() { return ENGLISH.absent; }, get short() { return ENGLISH.a; } },
{ id: "late", get label() { return ENGLISH.late; }, get short() { return ENGLISH.l; } }];


function today_stamp() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function pretty_date(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function Person_Cell({ name, photo, sub }) {
  return (
    <div className="ccm_attend_who">
      {photo ?
      <span className="ccm_attend_face">
          <img src={photo} alt="" />
        </span> :

      <span className="ccm_attend_face" style={{ background: face_tone(name) }}>
          {initials_from_name(name)}
        </span>
      }
      <div>
        <strong>{name || "—"}</strong>
        {sub ? <small>{sub}</small> : null}
      </div>
    </div>);

}

export function Course_Attendance({
  course_id,
  program_id = "",
  can_edit = true,
  compact = false
}) {
  const toast = useToast();
  const [date, set_date] = useState(today_stamp);
  const [items, set_items] = useState([]);
  const [saved, set_saved] = useState([]);
  const [search, set_search] = useState("");

  use_slug_mirror(
    course_id ? content_paths(course_id) : "/__wait",
    { attendance_q: search, attendance_day: date },
    { attendance_q: "", attendance_day: today_stamp() },
    (from_url) => {
      set_search(from_url.attendance_q || "");
      if (from_url.attendance_day) set_date(from_url.attendance_day);
    }
  );
  const [loading, set_loading] = useState(false);
  const [saving, set_saving] = useState(false);

  const load = useCallback(
    async (next_date) => {
      if (!course_id || !program_id) {
        set_items([]);
        set_saved([]);
        set_loading(false);
        return;
      }
      set_loading(true);
      try {
        const data = await get_course_attendance(course_id, next_date, program_id);
        const next = data.items || [];
        set_items(next);
        set_saved(next.map((item) => ({ student_id: item.student_id, status: item.status, remarks: item.remarks || "" })));
      } catch (err) {
        toast.error(err.message);
      } finally {
        set_loading(false);
      }
    },
    [course_id, program_id, toast]
  );

  useEffect(() => {
    load(date);
  }, [date, load]);

  const dirty = useMemo(() => {
    const by_id = new Map(saved.map((item) => [item.student_id, item]));
    return items.some((item) => {
      const previous = by_id.get(item.student_id);
      return !previous || previous.status !== item.status || previous.remarks !== (item.remarks || "");
    });
  }, [items, saved]);

  const counts = useMemo(() => {
    const next = { present: 0, absent: 0, late: 0, unmarked: 0 };
    for (const item of items) {
      if (item.status === "present") next.present += 1;else
      if (item.status === "absent") next.absent += 1;else
      if (item.status === "late") next.late += 1;else
      next.unmarked += 1;
    }
    return next;
  }, [items]);

  const marked = counts.present + counts.absent + counts.late;
  const rate = items.length ? Math.round((counts.present + counts.late) / items.length * 100) : 0;

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
    `${item.full_name} ${item.student_id} ${item.email}`.toLowerCase().includes(query)
    );
  }, [items, search]);

  function set_status(student_id, status) {
    if (!can_edit) return;
    set_items((current) => current.map((item) => item.student_id === student_id ? { ...item, status } : item));
  }

  function set_remarks(student_id, remarks) {
    if (!can_edit) return;
    set_items((current) => current.map((item) => item.student_id === student_id ? { ...item, remarks } : item));
  }

  function mark_all(status) {
    if (!can_edit) return;
    set_items((current) => current.map((item) => ({ ...item, status })));
  }

  async function save() {
    const marks = items.
    filter((item) => item.status).
    map((item) => ({
      student_id: item.student_id,
      status: item.status,
      remarks: item.remarks || ""
    }));
    if (!marks.length) {
      toast.error(ENGLISH.mark_at_least_one_student_before_saving);
      return;
    }
    set_saving(true);
    try {
      const data = await save_course_attendance(course_id, {
        attendance_date: date,
        program_id,
        marks
      });
      const next = data.items || [];
      set_items(next);
      set_saved(next.map((item) => ({ student_id: item.student_id, status: item.status, remarks: item.remarks || "" })));
      toast.success(ENGLISH.attendance_saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  return (
    <section className="ccm_pane ccm_attend">
      <header className="ccm_attend_hero">
        <div>
          <h2>{ENGLISH.attendance}</h2>
          <p>{pretty_date(date)}</p>
        </div>
        <div className="ccm_attend_hero_side">
          <div className="ccm_attend_rate">
            <b>{rate}%</b>
            <small>{ENGLISH.in_class}</small>
          </div>
          <label className="ccm_attend_date">
            <input
              type="date"
              max={today_stamp()}
              value={date}
              onChange={(event) => set_date(event.target.value || today_stamp())} />
            
          </label>
        </div>
      </header>

      <div className="ccm_attend_stats">
        <article className="is_present">
          <small>{ENGLISH.present}</small>
          <b>{counts.present}</b>
        </article>
        <article className="is_absent">
          <small>{ENGLISH.absent}</small>
          <b>{counts.absent}</b>
        </article>
        <article className="is_late">
          <small>{ENGLISH.late}</small>
          <b>{counts.late}</b>
        </article>
        <article className="is_open">
          <small>{ENGLISH.unmarked}</small>
          <b>{counts.unmarked}</b>
        </article>
      </div>

      <div className="ccm_attend_bar">
        <label className="ccm_attend_search">
          <input
            value={search}
            onChange={(event) => set_search(event.target.value)}
            placeholder={compact ? ENGLISH.search_students : ENGLISH.search_by_name_or_student_id} />
          
        </label>
        <div className="ccm_attend_tools">
          <p>
            {marked}/{items.length}
            {loading ? ENGLISH.loading : ""}
            {dirty ? ENGLISH.unsaved : ""}
          </p>
          {can_edit ?
          <div className="ccm_attend_actions">
              <button type="button" onClick={() => mark_all("present")}>
                {compact ? ENGLISH.present : ENGLISH.all_present}
              </button>
              <button type="button" onClick={() => mark_all("absent")}>
                {compact ? ENGLISH.absent : ENGLISH.all_absent}
              </button>
              <Button type="button" loading={saving} disabled={!dirty || loading} onClick={save}>{ENGLISH.save}</Button>
            </div> :
          null}
        </div>
      </div>

      {visible.length ?
      <div className="ccm_attend_sheet">
          <div className="ccm_attend_cols">
            <span>{ENGLISH.student}</span>
            <span>{compact ? ENGLISH.mark : ENGLISH.status}</span>
            {compact ? null : <span>{ENGLISH.remarks}</span>}
          </div>
          <ul className="ccm_attend_list">
            {visible.map((item) =>
          <li key={item.student_id} className={item.status ? `is_${item.status}` : "is_open"}>
                <Person_Cell
              name={item.full_name}
              photo={item.profile_photo_url}
              sub={compact ? item.student_id : `${item.student_id}${item.email ? ` · ${item.email}` : ""}`} />
            
                <div className="ccm_attend_marks" role="group" aria-label={ENGLISH.attendance_2(item.full_name)}>
                  {STATUSES.map((option) =>
              <button
                key={option.id}
                type="button"
                className={item.status === option.id ? `is_on is_${option.id}` : `is_${option.id}`}
                disabled={!can_edit}
                title={option.label}
                aria-label={option.label}
                onClick={() => set_status(item.student_id, option.id)}>
                
                      {compact ? option.short : option.label}
                    </button>
              )}
                </div>
                {compact ? null :
            <input
              className="ccm_attend_note"
              value={item.remarks || ""}
              disabled={!can_edit}
              maxLength={500}
              placeholder={ENGLISH.add_a_note}
              onChange={(event) => set_remarks(item.student_id, event.target.value)} />

            }
              </li>
          )}
          </ul>
        </div> :

      <p className="ccm_empty">
          {loading ? ENGLISH.loading_attendance : !program_id ? ENGLISH.select_a_program : ENGLISH.no_students_enrolled_yet}
          <small>
            {loading ? "" : !program_id ?
            ENGLISH.choose_a_program_above_attendance_includes_students_registered :
            ENGLISH.students_who_enroll_in_this_program_will_appear}
          </small>
        </p>
      }
    </section>);

}
