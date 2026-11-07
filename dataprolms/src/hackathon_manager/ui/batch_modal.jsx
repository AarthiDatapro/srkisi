import { useEffect, useState } from "react";
import { Button } from "@datapromr/button";
import { Modal } from "@datapromr/modal";
import { search_hackathon_students } from "../api.js";
import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/hackathon_manager_constants_english.js";

function matches_query(student, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return student.full_name.toLowerCase().includes(q) ||
    String(student.student_id).includes(q) ||
    String(student.course_student_id || "").toLowerCase().includes(q);
}

export function Batch_Modal({ open, hackathon_id, batch, busy, on_close, on_save }) {
  const [batch_name, set_batch_name] = useState("");
  const [picked, set_picked] = useState([]);
  const [query, set_query] = useState("");
  const [pool, set_pool] = useState([]);
  const [searching, set_searching] = useState(false);
  const [error, set_error] = useState("");

  useEffect(() => {
    if (!open) return;
    set_batch_name(batch?.batch_name || "");
    set_picked(batch?.students || []);
    set_query("");
    set_pool([]);
    set_error("");
  }, [open, batch]);

  useEffect(() => {
    if (!open || !hackathon_id) return;
    let alive = true;
    const handle = setTimeout(() => {
      set_searching(true);
      search_hackathon_students(hackathon_id, {
        q: query,
        batch_id: batch?.batch_id || ""
      }).then((payload) => {
        if (alive) set_pool(payload.items || []);
      }).catch((err) => {
        if (alive) set_error(err.message);
      }).finally(() => {
        if (alive) set_searching(false);
      });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [open, hackathon_id, batch?.batch_id, query]);

  const picked_ids = new Set(picked.map((student) => String(student.student_id)));
  const available = pool.filter((student) => !picked_ids.has(String(student.student_id)) && matches_query(student, query));

  function add_student(student) {
    set_picked((current) => current.some((item) => String(item.student_id) === String(student.student_id)) ? current : [...current, student]);
  }

  function remove_student(student_id) {
    set_picked((current) => current.filter((student) => String(student.student_id) !== String(student_id)));
  }

  return (
    <Modal open={open} size="sheet" title={batch?.batch_id ? ENGLISH.edit_batch : ENGLISH.create_batch} onClose={on_close}>
      <form
        className="hkm_batch_form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!batch_name.trim()) {
            set_error(ENGLISH.enter_a_batch_name);
            return;
          }
          set_error("");
          on_save({
            batch_id: batch?.batch_id || null,
            batch_name: batch_name.trim(),
            student_ids: picked.map((student) => student.student_id)
          });
        }}>
        <label className="hkm_page_field">
          <span className="is_required">{ENGLISH.batch_name}</span>
          <input
            required
            value={batch_name}
            placeholder={ENGLISH.team_alpha}
            onChange={(event) => set_batch_name(event.target.value)} />
        </label>
        <section className="hkm_batch_card">
          <header>
            <span>{ENGLISH.in_this_batch}</span>
            <b>{picked.length}</b>
          </header>
          {picked.length ?
            <ul className="hkm_batch_chips">
              {picked.map((student) =>
                <li key={student.student_id}>
                  <b>{student.initials}</b>
                  <em>{student.full_name}</em>
                  <button type="button" aria-label={ENGLISH.remove(student.full_name)} onClick={() => remove_student(student.student_id)}>×</button>
                </li>
              )}
            </ul> :
            <p>{ENGLISH.no_students_in_this_batch_yet}</p>}
        </section>
        <section className="hkm_batch_card is_grow">
          <header>
            <span>{ENGLISH.add_students}</span>
          </header>
          <label className="hkm_page_field">
            <input
              value={query}
              aria-label={ENGLISH.search_students}
              placeholder={ENGLISH.search_name_student_id_or_course_student_id}
              onChange={(event) => set_query(event.target.value)} />
          </label>
        <ul className="hkm_batch_pool">
          {searching ? <li className="hkm_batch_empty">{ENGLISH.searching}</li> : null}
          {!searching && !available.length ?
            <li className="hkm_batch_empty">{ENGLISH.no_unselected_students_match}</li> :
            null}
          {available.map((student) =>
            <li key={student.student_id}>
              <b>{student.initials}</b>
              <em>
                <span>{student.full_name}</span>
                <small>{student.course_student_id || student.student_id}</small>
              </em>
              <button type="button" onClick={() => add_student(student)}>{ENGLISH.add}</button>
            </li>
          )}
        </ul>
        </section>
        {error ? <p className="hkm_page_error">{error}</p> : null}
        <div className="hkm_batch_actions">
          <Button type="button" variant="ghost" onClick={on_close}>{ENGLISH.cancel}</Button>
          <Button type="submit" loading={busy} disabled={busy}>{ENGLISH.save_batch}</Button>
        </div>
      </form>
    </Modal>
  );
}
