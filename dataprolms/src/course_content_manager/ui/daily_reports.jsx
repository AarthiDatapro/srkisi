import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { useToast } from "@datapromr/toast";
import { get_course_analytics } from "../../course_manager/api.js";
import { format_date } from "../utils.js";
import {
  add_daily_report_photos,
  create_daily_report,
  delete_daily_report,
  download_daily_report_pdf,
  list_daily_reports,
  update_daily_report,
  upload_daily_report_pdf } from
"../api.js";
import { empty_daily_report } from "../constants.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

function Field({ label, children, error }) {
  return (
    <label className="ui-field ui-field--outlined">
      <span className="ui-field__label">{label}</span>
      {children}
      {error ? <span className="ui-field__error">{error}</span> : null}
    </label>);

}

function Choice({ value, on_change }) {
  return (
    <div className="ccm_report_choice">
      <button type="button" className={value ? "is_on" : undefined} onClick={() => on_change(true)}>{ENGLISH.yes}</button>
      <button type="button" className={!value ? "is_on" : undefined} onClick={() => on_change(false)}>{ENGLISH.no}</button>
    </div>);

}

function Pending_Photo({ file, on_remove }) {
  const [url, set_url] = useState("");

  useEffect(() => {
    const next = URL.createObjectURL(file);
    set_url(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <li>
      {url ? <img src={url} alt={file.name} /> : null}
      <button type="button" onClick={on_remove}>{ENGLISH.remove}</button>
    </li>);

}

function attendance_share(enrolled, present) {
  const total = Number(enrolled) || 0;
  const here = Number(present) || 0;
  return total ? Math.round(here / total * 10000) / 100 : 0;
}

export function Daily_Reports({
  course_id,
  course,
  programs = [],
  program_id = "",
  can_edit = true
}) {
  const toast = useToast();
  const [items, set_items] = useState([]);
  const [loading, set_loading] = useState(false);
  const [saving, set_saving] = useState(false);
  const [view, set_view] = useState("list");
  const [form, set_form] = useState(() => empty_daily_report(course));
  const [pending_files, set_pending_files] = useState([]);
  const [photo_input_key, set_photo_input_key] = useState(0);
  const [uploading, set_uploading] = useState(false);
  const [upload_date, set_upload_date] = useState(() => new Date().toISOString().slice(0, 10));
  const pdf_input = useRef(null);

  const load = useCallback(async () => {
    if (!course_id) return;
    set_loading(true);
    try {
      const payload = await list_daily_reports(course_id);
      set_items(payload.items || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }, [course_id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(next) {
    set_form((current) => ({ ...current, ...next }));
  }

  function update_field(event) {
    const { name, value } = event.target;
    set_form((current) => {
      const next = { ...current, [name]: value };
      if (name === "enrolled" || name === "present_today") {
        const enrolled = name === "enrolled" ? value : next.enrolled;
        const present = name === "present_today" ? value : next.present_today;
        next.absent_today = Math.max(0, Number(enrolled || 0) - Number(present || 0));
        next.attendance_percent = attendance_share(enrolled, present);
      }
      return next;
    });
  }

  async function open_new() {
    if (programs.length && !program_id) {
      toast.error(ENGLISH.select_a_program_first_2);
      return;
    }
    let analytics = {};
    try {
      analytics = program_id ? await get_course_analytics(course_id, program_id) : {};
    } catch {
      analytics = {};
    }
    const selected = programs.find((item) => String(item.program_id) === String(program_id || ""));
    set_form({
      ...empty_daily_report(course, analytics),
      program_title: selected?.program_name || ""
    });
    set_pending_files([]);
    set_view("form");
  }

  function open_edit(item) {
    set_form({
      ...empty_daily_report(course),
      ...item,
      sessions: item.sessions?.length ? item.sessions : empty_daily_report().sessions
    });
    set_pending_files([]);
    set_view("form");
  }

  function update_session(index, name, value) {
    set_form((current) => ({
      ...current,
      sessions: current.sessions.map((row, row_index) =>
      row_index === index ? { ...row, [name]: value } : row
      )
    }));
  }

  function add_session() {
    set_form((current) => ({
      ...current,
      sessions: [...current.sessions, { time: "", session: "", topic: "", remarks: "" }]
    }));
  }

  function remove_session(index) {
    set_form((current) => ({
      ...current,
      sessions: current.sessions.filter((_, row_index) => row_index !== index)
    }));
  }

  function drop_photo(path) {
    set_form((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.file_path !== path)
    }));
  }

  function add_pending_photos(event) {
    const next = Array.from(event.target.files || []);
    if (!next.length) return;
    set_pending_files((current) => [...current, ...next]);
    set_photo_input_key((key) => key + 1);
  }

  function drop_pending_photo(index) {
    set_pending_files((current) => current.filter((_, item_index) => item_index !== index));
  }

  async function save(and_download) {
    set_saving(true);
    try {
      const payload = form.report_id ?
      await update_daily_report(course_id, form.report_id, form) :
      await create_daily_report(course_id, form);
      let saved = payload;
      if (pending_files.length) {
        saved = await add_daily_report_photos(course_id, payload.report_id, pending_files);
        set_pending_files([]);
      }
      set_form(saved);
      await load();
      toast.success(ENGLISH.daily_report_saved);
      if (and_download) {
        await download_daily_report_pdf(course_id, saved.report_id);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(ENGLISH.delete_the_report_for(item.report_date))) return;
    try {
      await delete_daily_report(course_id, item.report_id);
      toast.success(ENGLISH.daily_report_deleted);
      if (form.report_id === item.report_id) {
        set_view("list");
      }
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function download(item) {
    try {
      await download_daily_report_pdf(course_id, item.report_id);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function open_pdf(item) {
    if (item.pdf_file_path) {
      window.open(item.pdf_file_path, "_blank", "noopener");
      return;
    }
    download(item);
  }

  async function upload_pdf(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const is_pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!is_pdf) {
      toast.error(ENGLISH.choose_a_pdf);
      return;
    }
    set_uploading(true);
    try {
      await upload_daily_report_pdf(course_id, file, upload_date);
      toast.success(ENGLISH.pdf_uploaded);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_uploading(false);
    }
  }

  if (view === "list") {
    return (
      <section className="ccm_pane ccm_report">
        <div className="ccm_report_bar">
          <div>
            <h2>{ENGLISH.daily_reports}</h2>
            <p>{ENGLISH.create_a_report_and_download_the_pdf_or}</p>
          </div>
          <div className="ccm_report_tools">
            {can_edit ?
            <>
              <input
                className="ccm_report_date"
                type="date"
                aria-label={ENGLISH.report_date}
                value={upload_date}
                onChange={(event) => set_upload_date(event.target.value)} />
              <input
                ref={pdf_input}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={upload_pdf} />
              <Button type="button" loading={uploading} onClick={() => pdf_input.current?.click()}>{ENGLISH.upload_pdf}</Button>
              <Button type="button" onClick={open_new}>{ENGLISH.new_report}</Button>
            </> :
          null}
          </div>
        </div>
        {items.length ?
        <ul className="ccm_report_list">
            {items.map((item) =>
          <li key={item.report_id}>
                <button type="button" onClick={() => item.pdf_file_path ? open_pdf(item) : open_edit(item)}>
                  <strong>{format_date(item.report_date)}</strong>
                  <span>
                    {item.pdf_file_name || ENGLISH.day_week(item.day_no || "—", item.week_no || "—", item.trainer_name || ENGLISH.no_trainer)}
                  </span>
                </button>
                {item.pdf_file_path ? null : <b>{item.attendance_percent || 0}%</b>}
                <div className="ccm_report_actions">
                  <button type="button" onClick={() => open_pdf(item)}>{ENGLISH.pdf}</button>
                  {can_edit ?
              <button type="button" onClick={() => remove(item)}>{ENGLISH.label_delete}</button> :
              null}
                </div>
              </li>
          )}
          </ul> :

        <p className="ccm_empty">
            {loading ? ENGLISH.loading_daily_reports : ENGLISH.no_daily_reports_yet}
            <small>{loading ? "" : ENGLISH.create_a_report_or_upload_a_pdf_you}</small>
          </p>
        }
      </section>);

  }

  return (
    <section className="ccm_pane ccm_report">
      <div className="ccm_report_bar">
        <div>
          <h2>{!can_edit ? ENGLISH.daily_report : form.report_id ? ENGLISH.edit_daily_report : ENGLISH.new_daily_report}</h2>
          <p>{can_edit ? ENGLISH.these_fields_print_into_the_daily_training_report : ENGLISH.read_only_view_of_this_daily_training_report}</p>
        </div>
        <div className="ccm_report_actions">
          <button type="button" className="ccm_ghost ccm_ghost_sm" onClick={() => set_view("list")}>{ENGLISH.back_to_list}</button>
          {can_edit ?
          <>
              <Button type="button" loading={saving} onClick={() => save(false)}>{ENGLISH.save}</Button>
              <Button type="button" loading={saving} onClick={() => save(true)}>{ENGLISH.save_pdf}</Button>
            </> :
          null}
        </div>
      </div>

      <form
        className={can_edit ? "ccm_report_form" : "ccm_report_form is_locked"}
        onSubmit={(event) => {
          event.preventDefault();
          if (can_edit) save(false);
        }}>
        
        <fieldset>
          <legend>{ENGLISH.header}</legend>
          <div className="ccm_report_grid">
            <Input id="program_title" name="program_title" label={ENGLISH.program_title} variant="outlined" value={form.program_title} onChange={update_field} />
            <Input id="venue" name="venue" label={ENGLISH.venue_location} variant="outlined" value={form.venue} onChange={update_field} />
            <Input id="association_line" name="association_line" label={ENGLISH.in_association_with} variant="outlined" value={form.association_line} onChange={update_field} />
            <Input id="course_track" name="course_track" label={ENGLISH.course_track} variant="outlined" value={form.course_track} onChange={update_field} />
          </div>
        </fieldset>

        <fieldset>
          <legend>{ENGLISH.label_1_report_details}</legend>
          <div className="ccm_report_grid">
            <Input id="report_date" name="report_date" type="date" label={ENGLISH.date} variant="outlined" value={form.report_date} onChange={update_field} />
            <Input id="day_no" name="day_no" label={ENGLISH.day_no} variant="outlined" value={form.day_no} onChange={update_field} />
            <Input id="week_no" name="week_no" label={ENGLISH.week_no} variant="outlined" value={form.week_no} onChange={update_field} />
            <Input id="session_timings" name="session_timings" label={ENGLISH.session_timings} variant="outlined" value={form.session_timings} onChange={update_field} />
            <Input id="trainer_name" name="trainer_name" label={ENGLISH.trainer_name} variant="outlined" value={form.trainer_name} onChange={update_field} />
            <Input id="teaching_assistant" name="teaching_assistant" label={ENGLISH.teaching_assistant} variant="outlined" value={form.teaching_assistant} onChange={update_field} />
            <Input id="module_course" name="module_course" label={ENGLISH.module_course} variant="outlined" value={form.module_course} onChange={update_field} />
          </div>
        </fieldset>

        <fieldset>
          <legend>{ENGLISH.label_2_attendance_summary}</legend>
          <div className="ccm_report_grid ccm_report_grid_six">
            <Input id="enrolled" name="enrolled" label={ENGLISH.total_enrolled} variant="outlined" value={form.enrolled} onChange={update_field} />
            <Input id="present_today" name="present_today" label={ENGLISH.present_today} variant="outlined" value={form.present_today} onChange={update_field} />
            <Input id="absent_today" name="absent_today" label={ENGLISH.absent_today} variant="outlined" value={form.absent_today} onChange={update_field} />
            <Input id="attendance_percent" name="attendance_percent" label={ENGLISH.attendance_3} variant="outlined" value={form.attendance_percent} onChange={update_field} />
            <Input id="morning_count" name="morning_count" label={ENGLISH.morning_count} variant="outlined" value={form.morning_count} onChange={update_field} />
            <Input id="afternoon_count" name="afternoon_count" label={ENGLISH.afternoon_count} variant="outlined" value={form.afternoon_count} onChange={update_field} />
          </div>
        </fieldset>

        <fieldset>
          <legend>{ENGLISH.label_3_daily_weekly_assignments}</legend>
          <div className="ccm_report_assign">
            <div>
              <span>{ENGLISH.daily_assignment_conducted}</span>
              <Choice value={form.daily_assignment} on_change={(value) => patch({ daily_assignment: value })} />
            </div>
            <Input id="daily_attempts" name="daily_attempts" label={ENGLISH.students_attempted_daily} variant="outlined" value={form.daily_attempts} onChange={update_field} />
          </div>
          <Field label={ENGLISH.reason_if_daily_assignment_was_not_conducted}>
            <textarea className="ui-input ui-input--outlined ccm_form_area" name="daily_reason" value={form.daily_reason} onChange={update_field} />
          </Field>
          <div className="ccm_report_assign">
            <div>
              <span>{ENGLISH.weekly_assignment_conducted}</span>
              <Choice value={form.weekly_assignment} on_change={(value) => patch({ weekly_assignment: value })} />
            </div>
            <Input id="weekly_attempts" name="weekly_attempts" label={ENGLISH.students_attempted_weekly} variant="outlined" value={form.weekly_attempts} onChange={update_field} />
          </div>
          <Field label={ENGLISH.reason_if_weekly_assignment_was_not_conducted}>
            <textarea className="ui-input ui-input--outlined ccm_form_area" name="weekly_reason" value={form.weekly_reason} onChange={update_field} />
          </Field>
        </fieldset>

        <fieldset>
          <legend>{ENGLISH.label_4_hour_wise_topics_covered}</legend>
          <div className="ccm_report_sessions">
            <div className="ccm_report_sessions_head">
              <span>{ENGLISH.time}</span>
              <span>{ENGLISH.session}</span>
              <span>{ENGLISH.topic_activity}</span>
              <span>{ENGLISH.remarks}</span>
              <span />
            </div>
            {form.sessions.map((row, index) =>
            <div key={`session-${index}`} className="ccm_report_session">
                <input aria-label={ENGLISH.time} value={row.time} onChange={(event) => update_session(index, "time", event.target.value)} />
                <input aria-label={ENGLISH.session} value={row.session} onChange={(event) => update_session(index, "session", event.target.value)} />
                <input aria-label={ENGLISH.topic} value={row.topic} onChange={(event) => update_session(index, "topic", event.target.value)} />
                <input aria-label={ENGLISH.remarks} value={row.remarks} onChange={(event) => update_session(index, "remarks", event.target.value)} />
                <button type="button" onClick={() => remove_session(index)}>{ENGLISH.remove}</button>
              </div>
            )}
          </div>
          <button type="button" className="ccm_textbtn" onClick={add_session}>{ENGLISH.add_session_row}</button>
        </fieldset>

        <fieldset>
          <legend>{ENGLISH.label_5_lab_hands_on_work}</legend>
          <Field label={ENGLISH.lab_exercise_task_topics}>
            <textarea className="ui-input ui-input--outlined ccm_form_area ccm_form_area_tall" name="lab_work" value={form.lab_work} onChange={update_field} />
          </Field>
          <Field label={ENGLISH.comments}>
            <textarea className="ui-input ui-input--outlined ccm_form_area" name="lab_comments" value={form.lab_comments} onChange={update_field} />
          </Field>
        </fieldset>

        <fieldset>
          <legend>{ENGLISH.label_6_other_activities_special_events}</legend>
          <Field label={ENGLISH.additional_activities}>
            <textarea className="ui-input ui-input--outlined ccm_form_area" name="other_activities" value={form.other_activities} onChange={update_field} />
          </Field>
        </fieldset>

        <fieldset>
          <legend>{ENGLISH.label_7_geo_tagged_attendance_photos}</legend>
          <label className="ccm_form_file">
            <span>{ENGLISH.upload_jpg_or_png_photos}</span>
            <span className={pending_files.length ? "ccm_form_pick is_on" : "ccm_form_pick"}>
              <input
                key={photo_input_key}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={add_pending_photos} />
              
              {pending_files.length ? ENGLISH.file_s_selected(pending_files.length) : ENGLISH.choose_files}
            </span>
          </label>
          {pending_files.length ?
          <ul className="ccm_report_photos">
              {pending_files.map((file, index) =>
            <Pending_Photo
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              on_remove={() => drop_pending_photo(index)} />
            )}
            </ul> :
          null}
          {form.photos?.length ?
          <ul className="ccm_report_photos">
              {form.photos.map((photo) =>
            <li key={photo.file_path}>
                  <img src={photo.file_path} alt={photo.file_name || ENGLISH.attendance_photo} />
                  <button type="button" onClick={() => drop_photo(photo.file_path)}>{ENGLISH.remove}</button>
                </li>
            )}
            </ul> :
          null}
        </fieldset>

        <fieldset>
          <legend>{ENGLISH.label_8_reports_submitted_by}</legend>
          <div className="ccm_report_grid">
            <Input id="submitted_by" name="submitted_by" label={ENGLISH.trainer_teaching_assistant} variant="outlined" value={form.submitted_by} onChange={update_field} />
            <Input id="submitted_date" name="submitted_date" type="date" label={ENGLISH.submitted_date} variant="outlined" value={form.submitted_date} onChange={update_field} />
            <Input id="reviewed_by" name="reviewed_by" label={ENGLISH.reviewed_verified_by} variant="outlined" value={form.reviewed_by} onChange={update_field} />
            <Input id="reviewed_date" name="reviewed_date" type="date" label={ENGLISH.reviewed_date} variant="outlined" value={form.reviewed_date} onChange={update_field} />
          </div>
        </fieldset>
      </form>
    </section>);

}
