import { useEffect, useMemo, useRef, useState } from "react";
import { Grid } from "@designdaddy/datagrid";
import { Modal } from "@datapromr/modal";
import { useToast } from "@datapromr/toast";
import { ActionButton, TrashIcon, ViewIcon } from "@datapromr/action-button";
import { Edit_Icon } from "../../admin_ui/row_actions.jsx";
import {
  generate_course_student_ids,
  import_course_students,
  list_course_students,
  remove_course_student,
  reset_course_student_password,
  update_course_student,
  update_course_student_id } from
"../../course_manager/api.js";
import { COURSE_STUDENT_COLUMNS, GRID_THEME } from "../constants.js";
import { face_tone, format_date, initials_from_name } from "../utils.js";
import { Close_Icon } from "./icons.jsx";
import { content_paths, use_slug_mirror } from "../../url_slugs.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";
import { live_items } from "../../constants/live_text.js";


function dash(value) {
  if (value == null || value === "") return "—";
  return value;
}

function learning_label(value) {
  if (value === "in_progress") return ENGLISH.in_progress;
  if (value === "completed") return ENGLISH.completed;
  if (value === "not_started") return ENGLISH.not_started;
  return value || "—";
}

function Fact({ label, value }) {
  return (
    <div className="ccm_student_view_row">
      <dt>{label}</dt>
      <dd>{dash(value)}</dd>
    </div>);

}

function place_part(value) {
  const text = String(value || "").trim();
  if (!text || text.includes("@")) return "";
  return text;
}

function Student_Details({ student }) {
  const percent = Math.round(Number(student.progress_value ?? student.progress_percent) || 0);
  const status_code = student.learning_code || student.learning_status || "not_started";
  const address = [place_part(student.address_line), place_part(student.district), place_part(student.state), place_part(student.pincode)].
  filter(Boolean).
  join(", ");

  return (
    <div className="ccm_student_view">
      <header className="ccm_student_view_hero">
        {student.profile_photo_url ?
        <span className="ccm_student_view_face">
            <img src={student.profile_photo_url} alt="" />
          </span> :

        <span className="ccm_student_view_face" style={{ background: face_tone(student.full_name) }}>
            {initials_from_name(student.full_name)}
          </span>
        }
        <div className="ccm_student_view_who">
          <h3>{student.full_name || ENGLISH.student}</h3>
          <div className="ccm_student_view_ids">
            <code>{student.student_id || "—"}</code>
            {student.course_student_id ? <code>{student.course_student_id}</code> : null}
          </div>
          <div className="ccm_student_view_meta">
            <span className={`ccm_student_view_tag is_${status_code}`}>
              {learning_label(status_code)}
            </span>
            <span className="ccm_student_view_bar" aria-label={ENGLISH.progress_2(percent)}>
              <i style={{ width: `${percent}%` }} />
              <b>{percent}%</b>
            </span>
          </div>
        </div>
      </header>

      <div className="ccm_student_view_body">
        <section className="ccm_student_view_card">
          <small>{ENGLISH.contact}</small>
          <dl>
            <Fact label={ENGLISH.email} value={student.email} />
            <Fact label={ENGLISH.mobile} value={student.mobile_number} />
          </dl>
        </section>

        <section className="ccm_student_view_card">
          <small>{ENGLISH.about}</small>
          <dl>
            <Fact label={ENGLISH.college} value={student.college} />
            <Fact label={ENGLISH.study} value={student.higher_study} />
            <Fact label={ENGLISH.blood_group} value={student.blood_group} />
          </dl>
        </section>

        <section className="ccm_student_view_card">
          <small>{ENGLISH.address}</small>
          <p>{address || "—"}</p>
        </section>

        <section className="ccm_student_view_card">
          <small>{ENGLISH.course}</small>
          <dl>
            <Fact label={ENGLISH.program} value={student.program_name} />
            <Fact label={ENGLISH.cohort} value={student.cohort_name} />
            <Fact label={ENGLISH.enrolled} value={student.enrolled_at} />
            <Fact label={ENGLISH.last_seen} value={format_date(student.last_accessed_at)} />
          </dl>
        </section>
      </div>
    </div>);

}

const PROFILE_FIELDS = [
  live_items([() => ("first_name"), () => (ENGLISH.first_name)]),
  live_items([() => ("last_name"), () => (ENGLISH.last_name)]),
  live_items([() => ("email"), () => (ENGLISH.email)]),
  live_items([() => ("mobile_number"), () => (ENGLISH.mobile)]),
  live_items([() => ("date_of_birth"), () => (ENGLISH.date_of_birth)]),
  live_items([() => ("blood_group"), () => (ENGLISH.blood_group)]),
  live_items([() => ("college"), () => (ENGLISH.college), () => ("wide")]),
  live_items([() => ("higher_study"), () => (ENGLISH.higher_study), () => ("wide")]),
  live_items([() => ("address_line"), () => (ENGLISH.address), () => ("wide")]),
  live_items([() => ("pincode"), () => (ENGLISH.pincode)]),
  live_items([() => ("state"), () => (ENGLISH.state)]),
  live_items([() => ("district"), () => (ENGLISH.district)])
];

function profile_form(student) {
  return Object.fromEntries(PROFILE_FIELDS.map(([key]) => [key, student?.[key] || ""]));
}

function Key_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.5 12H20l-1.6 1.8 1.6 1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Student_Form({ values, busy, error, on_change, on_save, on_reset }) {
  return (
    <form
      className="ccm_student_form"
      onSubmit={(event) => {
        event.preventDefault();
        on_save();
      }}>
      <div className="ccm_student_form_grid">
        {PROFILE_FIELDS.map(([key, label, span]) =>
          <label key={key} className={span === "wide" ? "is_wide" : undefined}>
            <span>{label}</span>
            <input
              type={key === "date_of_birth" ? "date" : key === "email" ? "email" : "text"}
              value={values[key] || ""}
              onChange={(event) => on_change({ ...values, [key]: event.target.value })} />
          </label>
        )}
      </div>
      {error ? <p className="ccm_student_form_error">{error}</p> : null}
      <div className="ccm_student_form_foot">
        <button type="button" className="ccm_students_reset" disabled={busy} onClick={on_reset}>
          <Key_Icon />{ENGLISH.reset_password}</button>
        <button type="submit" className="ccm_students_generate" disabled={busy}>
          {busy ? "Saving…" : ENGLISH.save_details}
        </button>
      </div>
    </form>
  );
}

function Person_Cell({ name, photo, sub, student_id, program_id }) {
  return (
    <div
      className="ccm_students_who"
      data-student-id={student_id || undefined}
      data-program-id={program_id || undefined}>
      {photo ?
      <span className="ccm_students_face">
          <img src={photo} alt="" />
        </span> :

      <span className="ccm_students_face" style={{ background: face_tone(name) }}>
          {initials_from_name(name)}
        </span>
      }
      <div>
        <strong>{name || "—"}</strong>
        {sub ? <small>{sub}</small> : null}
      </div>
    </div>);

}

function Course_Id_Cell({ row, can_edit, busy, on_save }) {
  const input_ref = useRef(null);
  const skip_save = useRef(false);
  const [editing, set_editing] = useState(false);
  const [value, set_value] = useState(row.course_student_id || "");
  const original = String(row.course_student_id || "").trim();

  useEffect(() => {
    set_value(row.course_student_id || "");
    set_editing(false);
  }, [row.course_student_id]);

  useEffect(() => {
    if (editing) input_ref.current?.focus();
  }, [editing]);

  function start_edit() {
    if (!can_edit || busy) return;
    skip_save.current = false;
    set_value(row.course_student_id || "");
    set_editing(true);
  }

  function cancel_edit() {
    skip_save.current = true;
    set_value(row.course_student_id || "");
    set_editing(false);
  }

  function commit_edit() {
    if (skip_save.current) {
      skip_save.current = false;
      return;
    }
    const next = value.trim();
    if (!next || next === original) {
      set_value(original);
      set_editing(false);
      return;
    }
    on_save(row, next);
    set_editing(false);
  }

  if (!can_edit) {
    return row.course_student_id ? <code className="ccm_students_code">{row.course_student_id}</code> : "—";
  }

  if (!editing) {
    return (
      <code
        className="ccm_students_code is_edit"
        title={ENGLISH.double_click_to_edit}
        onDoubleClick={start_edit}>
        
        {row.course_student_id || "—"}
      </code>);

  }

  return (
    <div className="ccm_students_id_edit">
      <input
        ref={input_ref}
        value={value}
        aria-label={ENGLISH.course_id}
        disabled={busy}
        onChange={(event) => set_value(event.target.value)}
        onBlur={commit_edit}
        onKeyDown={(event) => {
          if (event.key === ENGLISH.enter) {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === ENGLISH.escape) cancel_edit();
        }} />
      
      <button
        type="button"
        className="ccm_students_id_cancel"
        aria-label={ENGLISH.cancel}
        disabled={busy}
        onMouseDown={(event) => {
          event.preventDefault();
          cancel_edit();
        }}>
        
        <Close_Icon />
      </button>
    </div>);

}

export function Course_Students({
  course_id,
  programs = [],
  program_id = "",
  can_edit = true,
  compact = false
}) {
  const toast = useToast();
  const active_program_id = String(program_id || "");
  const [items, set_items] = useState([]);
  const [loading, set_loading] = useState(false);
  const [busy_id, set_busy_id] = useState("");
  const [query, set_query] = useState("");

  use_slug_mirror(
    course_id ? content_paths(course_id) : "/__wait",
    { students_q: query },
    { students_q: "" },
    (from_url) => set_query(from_url.students_q || "")
  );
  const [viewing, set_viewing] = useState(null);
  const [editing, set_editing] = useState(null);
  const [form, set_form] = useState(profile_form);
  const [form_error, set_form_error] = useState("");
  const [resetting, set_resetting] = useState(null);
  const [import_result, set_import_result] = useState(null);
  const import_ref = useRef(null);
  const selected_program = programs.find((item) => String(item.program_id) === active_program_id);

  useEffect(() => {
    if (!course_id) {
      set_items([]);
      set_loading(false);
      return undefined;
    }
    let alive = true;
    set_loading(true);
    list_course_students(course_id, active_program_id).
    then((payload) => {
      if (alive) set_items(payload.items || []);
    }).
    catch((err) => {
      if (alive) toast.error(err.message);
    }).
    finally(() => {
      if (alive) set_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [course_id, active_program_id, toast]);

  useEffect(() => {
    set_viewing(null);
    set_editing(null);
    set_resetting(null);
    set_query("");
  }, [active_program_id]);

  const rows = useMemo(
    () =>
    items.map((student) => {
      const progress_value = Math.round(Number(student.progress_percent) || 0);
      return {
        ...student,
        id: `${student.student_id}:${student.program_id || ""}`,
        learning_code: student.learning_status || "not_started",
        learning_status: learning_label(student.learning_status),
        progress_value,
        progress_percent: `${progress_value}%`,
        enrolled_at: format_date(student.enrolled_at),
        program_name: student.program_name || "",
        cohort_name: student.cohort_name || ""
      };
    }),
    [items]
  );

  const visible_rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
    [
      row.student_id,
      row.course_student_id,
      row.full_name,
      row.first_name,
      row.last_name,
      row.email,
      row.mobile_number,
      row.college,
      row.higher_study,
      row.blood_group,
      row.address_line,
      row.pincode,
      row.state,
      row.district,
      row.program_name,
      row.cohort_name,
      row.learning_status,
      row.progress_percent,
      row.enrolled_at
    ].join(" ").toLowerCase().includes(needle)
    );
  }, [query, rows]);

  async function handle_remove(row) {
    const name = row.full_name || row.student_id;
    if (!window.confirm(ENGLISH.remove_from_this_course(name))) return;
    set_busy_id(row.student_id);
    try {
      await remove_course_student(course_id, row.student_id, row.program_id || active_program_id);
      const fresh = await list_course_students(course_id, active_program_id);
      set_items(fresh.items || []);
      toast.success(ENGLISH.was_removed_from_the_course(name));
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy_id("");
    }
  }

  async function handle_import(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !course_id || !active_program_id) return;
    set_busy_id("import");
    try {
      const payload = await import_course_students(course_id, active_program_id, file);
      set_items(payload.items || []);
      set_import_result(payload);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy_id("");
    }
  }

  async function handle_generate() {
    set_busy_id("generate");
    try {
      const payload = await generate_course_student_ids(course_id, active_program_id);
      set_items(payload.items || []);
      const count = Number(payload.generated) || 0;
      toast.success(count ? ENGLISH.generated_course_id(count, count === 1 ? "" : "s") : ENGLISH.every_student_already_has_a_course_id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy_id("");
    }
  }

  async function handle_save_id(row, value) {
    set_busy_id(row.student_id);
    try {
      await update_course_student_id(course_id, row.student_id, value, row.program_id || active_program_id);
      const fresh = await list_course_students(course_id, active_program_id);
      set_items(fresh.items || []);
      toast.success(ENGLISH.course_id_saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy_id("");
    }
  }

  function open_view(row) {
    set_viewing(row);
  }

  function handle_grid_click(event) {
    if (event.target.closest(ENGLISH.button_a_input_textarea_ccm_students_id_edit)) return;
    const row_el = event.target.closest(ENGLISH.tbody_tr);
    if (!row_el) return;
    const id = row_el.querySelector("[data-student-id]")?.getAttribute("data-student-id");
    const program = row_el.querySelector("[data-program-id]")?.getAttribute("data-program-id");
    const row = rows.find((item) =>
    String(item.student_id) === String(id || "") &&
    String(item.program_id || "") === String(program || "")
    );
    if (row) open_view(row);
  }

  function render_cell(column_id, row) {
    if (column_id === "student_id") {
      return <span data-student-id={row.student_id}>{dash(row.student_id)}</span>;
    }
    if (column_id === "full_name") {
      return (
        <Person_Cell
          name={row.full_name}
          photo={row.profile_photo_url}
          sub={row.email}
          student_id={row.student_id}
          program_id={row.program_id} />
      );
    }
    if (column_id === "learning_status") {
      return (
        <span className={`ccm_students_status is_${row.learning_code || "not_started"}`}>
          {row.learning_status}
        </span>);

    }
    if (column_id === "progress_percent") {
      return row.progress_percent;
    }
    if (column_id === "course_student_id") {
      return (
        <Course_Id_Cell
          row={row}
          can_edit={can_edit}
          busy={busy_id === row.student_id}
          on_save={handle_save_id} />);


    }
    return dash(row[column_id]);
  }

  function open_edit(row) {
    set_form(profile_form(row));
    set_form_error("");
    set_editing(row);
  }

  async function save_profile() {
    if (!editing || !course_id) return;
    set_busy_id(editing.student_id);
    set_form_error("");
    try {
      const payload = await update_course_student(course_id, editing.student_id, {
        ...form,
        program_id: active_program_id
      });
      const saved = payload.student;
      if (saved) {
        set_items((current) => current.map((item) => item.student_id === saved.student_id ? { ...item, ...saved } : item));
      }
      toast.success(ENGLISH.student_details_saved);
      set_editing(null);
    } catch (err) {
      set_form_error(err.message);
    } finally {
      set_busy_id("");
    }
  }

  async function confirm_reset() {
    if (!resetting || !course_id) return;
    set_busy_id(resetting.student_id);
    try {
      await reset_course_student_password(course_id, resetting.student_id, active_program_id);
      toast.success(ENGLISH.password_reset_the_student_can_sign_in_with);
      set_resetting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy_id("");
    }
  }

  function render_actions(row) {
    return (
      <div className="ccm_students_actions" onClick={(event) => event.stopPropagation()}>
        <ActionButton label={ENGLISH.view_student} onClick={() => open_view(row)}>
          <ViewIcon />
        </ActionButton>
        {can_edit ?
        <>
          <ActionButton label={ENGLISH.edit_student} onClick={() => open_edit(row)}>
            <Edit_Icon />
          </ActionButton>
          <ActionButton label={ENGLISH.reset_password_2} onClick={() => set_resetting(row)}>
            <Key_Icon />
          </ActionButton>
          <ActionButton label={ENGLISH.remove_from_course} tone="danger" onClick={() => handle_remove(row)}>
            <TrashIcon />
          </ActionButton>
        </> :
        null}
      </div>);

  }

  return (
    <section className="ccm_pane ccm_students">
      <header className="ccm_students_head">
        <div className="ccm_students_title">
          <h2>{ENGLISH.student_list}</h2>
          <p>
            <b className="ccm_students_count">{items.length}</b>
            <span>
              {items.length === 1 ? "student" : "students"}
              {selected_program ? ` in ${selected_program.program_name}` : ENGLISH.enrolled_2}
              {loading ? ENGLISH.refreshing : ""}
              {busy_id ? ENGLISH.updating : ""}
            </span>
          </p>
        </div>
        <div className="ccm_students_tools">
          {can_edit ?
            <>
              <input
                ref={import_ref}
                type="file"
                accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                hidden
                onChange={handle_import} />
              <button
                type="button"
                className="ccm_students_import"
                disabled={!active_program_id || Boolean(busy_id)}
                title={active_program_id ? undefined : ENGLISH.select_a_program_to_import}
                onClick={() => import_ref.current?.click()}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="m8.5 8.5 3.5-3.5 3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 15.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {busy_id === "import" ? ENGLISH.importing : ENGLISH.import_students}
              </button>
              <button
                type="button"
                className="ccm_students_generate"
                disabled={!active_program_id || Boolean(busy_id) || !items.length}
                title={active_program_id ? undefined : ENGLISH.select_a_program_to_generate_ids}
                onClick={handle_generate}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 7h8M8 12h8M8 17h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <rect x="4" y="3.5" width="16" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                {busy_id === "generate" ? "Generating…" : ENGLISH.generate_ids}
              </button>
            </> :
            null}
        </div>
      </header>
      {compact ?
      <div className="ccm_students_cards_wrap">
          <input
          className="ccm_students_search"
          value={query}
          placeholder={ENGLISH.search_students_2}
          onChange={(event) => set_query(event.target.value)} />
        
          {visible_rows.length ?
        <ul className="ccm_students_cards">
              {visible_rows.map((row) =>
          <li key={row.id} className="ccm_students_card">
                  <button type="button" className="ccm_students_card_open" onClick={() => open_view(row)}>
                    <Person_Cell
                name={row.full_name}
                photo={row.profile_photo_url}
                sub={row.student_id}
                student_id={row.student_id} />
              
                  </button>
                  <Course_Id_Cell
              row={row}
              can_edit={can_edit}
              busy={busy_id === row.student_id}
              on_save={handle_save_id} />
            
                  {render_actions(row)}
                </li>
          )}
            </ul> :

        <p className="ccm_students_empty">
              {loading ? ENGLISH.loading_students : ENGLISH.no_students_enrolled_yet}
            </p>
        }
        </div> :

      <div className="ccm_students_grid" onClick={handle_grid_click}>
          <Grid
          className="ccm_students_grid"
          theme={GRID_THEME}
          columns={COURSE_STUDENT_COLUMNS}
          rows={rows}
          rowKey="id"
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          showFreeze
          searchPlaceholder={ENGLISH.search_students_2}
          emptyMessage={loading ? ENGLISH.loading_students : ENGLISH.no_students_enrolled_yet}
          emptyHint={loading ? ENGLISH.fetching_this_roster : ENGLISH.students_who_enroll_in_this_course_will_appear}
          tableAriaLabel={ENGLISH.course_students}
          renderCell={render_cell}
          renderActions={render_actions} />
        
        </div>
      }
      <Modal
        open={Boolean(viewing)}
        title={ENGLISH.student_profile}
        size="sheet"
        onClose={() => set_viewing(null)}>
        
        {viewing ? <Student_Details student={viewing} /> : null}
      </Modal>
      <Modal
        open={Boolean(editing)}
        title={editing ? ENGLISH.edit_2(editing.full_name || ENGLISH.student_2) : ENGLISH.edit_student}
        size="sheet"
        onClose={() => {
          if (!busy_id) set_editing(null);
        }}>
        {editing ?
          <Student_Form
            values={form}
            busy={Boolean(busy_id)}
            error={form_error}
            on_change={set_form}
            on_save={save_profile}
            on_reset={() => set_resetting(editing)} /> :
          null}
      </Modal>
      <Modal
        open={Boolean(import_result)}
        title={ENGLISH.import_result}
        onClose={() => set_import_result(null)}>
        {import_result ?
          <div className="ccm_student_reset">
            <dl className="ccm_import_counts">
              <div><dt>{ENGLISH.new_students_added_and_registered}</dt><dd>{import_result.created || 0}</dd></div>
              <div><dt>{ENGLISH.already_in_lms_registered}</dt><dd>{import_result.registered || 0}</dd></div>
              <div><dt>{ENGLISH.already_registered_skipped}</dt><dd>{import_result.skipped || 0}</dd></div>
              <div><dt>{ENGLISH.missing_both_email_and_phone}</dt><dd>{import_result.missing_both || 0}</dd></div>
              <div><dt>{ENGLISH.missing_email_or_phone}</dt><dd>{import_result.missing_one || 0}</dd></div>
              <div><dt>{ENGLISH.could_not_import}</dt><dd>{import_result.failed || 0}</dd></div>
            </dl>
            {import_result.issues?.length ?
              <ul className="ccm_import_issues">
                {import_result.issues.map((issue) =>
                  <li key={`${issue.row}-${issue.reason}`}>Row {issue.row}: {issue.reason}</li>
                )}
              </ul> :
              null}
            <div className="ccm_student_form_foot">
              <button type="button" className="ccm_students_generate" onClick={() => set_import_result(null)}>{ENGLISH.close}</button>
            </div>
          </div> :
          null}
      </Modal>
      <Modal
        open={Boolean(resetting)}
        title={ENGLISH.reset_password_2}
        onClose={() => {
          if (!busy_id) set_resetting(null);
        }}>
        <div className="ccm_student_reset">
          <p>{ENGLISH.reset_the_password_for}<b>{resetting?.full_name || ENGLISH.this_student}</b>{ENGLISH.they_will_sign_in_with}<b>{ENGLISH.datapro_123}</b>.
          </p>
          <div className="ccm_student_form_foot">
            <button type="button" className="ccm_students_reset" disabled={Boolean(busy_id)} onClick={() => set_resetting(null)}>{ENGLISH.cancel}</button>
            <button type="button" className="ccm_students_generate" disabled={Boolean(busy_id)} onClick={confirm_reset}>
              {busy_id ? "Resetting…" : ENGLISH.reset_password_2}
            </button>
          </div>
        </div>
      </Modal>
    </section>);

}
