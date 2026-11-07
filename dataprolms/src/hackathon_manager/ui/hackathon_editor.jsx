import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Modal } from "@datapromr/modal";
import { Select } from "@datapromr/select";
import { EMPTY_CODING, EMPTY_QUIZ } from "../../course_content_manager/constants.js";
import { Coding_Form } from "../../course_content_manager/ui/coding_form.jsx";
import { Quiz_Form } from "../../course_content_manager/ui/quiz_form.jsx";
import { get_coding_errors, get_quiz_errors, has_errors } from "../../course_content_manager/utils.js";
import { TYPES } from "../constants.js";
import { DURATION_OPTIONS, PROJECT_DELIVERABLES, duration_id, duration_label, empty_deliverables, empty_item, end_from_duration, join_types, later_slot, parse_types, schedule_problem, today_stamp } from "../utils.js";
import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/hackathon_manager_constants_english.js";
import { live_items } from "../../constants/live_text.js";


function item_name(item, hackathon_type) {
  if (hackathon_type === "mcq") return item.question_text || ENGLISH.untitled_question;
  return item.title || (hackathon_type === "project" ? ENGLISH.untitled_task : ENGLISH.untitled_question);
}

function item_ready(item, hackathon_type) {
  if (hackathon_type === "mcq") {
    const options = (item.options || []).map((option) => String(option || "").trim()).filter(Boolean);
    return Boolean(String(item.question_text || "").trim()) && options.length >= 2 && options.includes(String(item.correct_answer || "").trim());
  }
  if (hackathon_type === "coding") {
    return Boolean(String(item.title || "").trim()) && Boolean(String(item.prompt || item.description || "").trim());
  }
  const overview = String(item.overview || item.description || "").trim();
  const objectives = (item.objectives || []).some((line) => String(line || "").trim());
  const features = (item.features || []).some((line) => String(line || "").trim());
  return Boolean(String(item.title || "").trim()) && Boolean(overview) && objectives && features &&
    Boolean(String(item.team_size || "").trim()) && Boolean(String(item.technology || "").trim()) &&
    Boolean(String(item.project_duration || "").trim()) && Boolean(String(item.submission_type || "").trim());
}

function Type_Mark({ type }) {
  if (type === "coding") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m8 8-4 4 4 4M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "project") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 8.5h6l2 2h8v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const SCOPES = [
  { id: "program", get title() { return ENGLISH.program_specific_2; }, get hint() { return ENGLISH.one_program_in_a_cohort; } },
  { id: "open", get title() { return ENGLISH.open_hackathon_2; }, get hint() { return ENGLISH.any_student_can_join; } }
];

const TYPE_COPY = {
  mcq: live_items([() => ENGLISH.mcq_quiz_2, () => ENGLISH.multiple_choice_questions]),
  coding: live_items([() => ENGLISH.coding_challenge_2, () => ENGLISH.coding_questions_with_online_editor]),
  project: live_items([() => ENGLISH.project, () => ENGLISH.team_individual_project_submission])
};


function form_description(values) {
  return String(values?.description || "");
}

function fresh_quiz() {
  return {
    ...EMPTY_QUIZ,
    difficulty_mix: { ...EMPTY_QUIZ.difficulty_mix },
    bloom_mix: { ...EMPTY_QUIZ.bloom_mix }
  };
}

function date_of(value) {
  return String(value || "").slice(0, 10);
}

function time_of(value) {
  const match = String(value || "").match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function join_when(date, time) {
  if (!date) return "";
  if (!time) return `${date}T`;
  return `${date}T${time}`;
}

function When_Fields({ label, value, disabled, min_date, min_time, on_change }) {
  const date = date_of(value);
  const time = time_of(value);
  const time_floor = date && min_date && date === min_date ? min_time : "";
  const starting = String(label).startsWith(ENGLISH.start);
  return (
    <div className="hkm_clock_side">
      <i className={starting ? "hkm_node" : "hkm_node is_end"} aria-hidden="true" />
      <div className="hkm_when_row">
        <input
          type="date"
          required
          aria-label={starting ? ENGLISH.start_date : ENGLISH.end_date}
          min={min_date || undefined}
          value={date}
          disabled={disabled}
          onChange={(event) => {
            const next_date = event.target.value;
            if (min_date && next_date && next_date < min_date) return;
            const floor = next_date && min_date && next_date === min_date ? min_time : "";
            const next_time = time && floor && time < floor ? "" : time;
            on_change(join_when(next_date, next_time));
          }} />
        <input
          type="time"
          required
          aria-label={starting ? ENGLISH.start_time : ENGLISH.end_time}
          min={time_floor || undefined}
          value={time}
          disabled={disabled || !date}
          onChange={(event) => {
            const next_time = event.target.value;
            if (time_floor && next_time && next_time < time_floor) return;
            on_change(join_when(date, next_time));
          }} />
      </div>
    </div>
  );
}

function Item_Rows({ rows, kind, empty, locked, can_edit, on_edit, on_remove }) {
  return (
    <ul className="hkm_rows">
      {rows.length ?
        rows.map(({ item, index }, position) =>
          <li key={item.item_id || `${kind}-${index}`} className={`hkm_item is_${kind}`}>
            <span className="hkm_item_mark">{position + 1}</span>
            <p>{item_name(item, kind)}</p>
            <em className="hkm_marks">{item.marks || (kind === "mcq" ? 1 : 10)}</em>
            <span className="hkm_page_row_actions">
              <button type="button" className="hkm_icon_btn" aria-label={ENGLISH.edit} disabled={locked} onClick={() => on_edit(index)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4.2L19 9.2 14.8 5 4 15.8V20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="m13.2 6.6 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
              {can_edit ?
                <button type="button" className="hkm_icon_btn is_remove" aria-label={ENGLISH.remove_2} disabled={locked} onClick={() => on_remove(index)}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button> :
                null}
            </span>
          </li>
        ) :
        <li className="hkm_page_blank">{empty}</li>}
    </ul>
  );
}

function sheet_title(hackathon_type, editing, mode) {
  if (mode === "quiz") return ENGLISH.create_quiz;
  if (mode === "coding") return ENGLISH.create_coding_exercise;
  const noun = hackathon_type === "project" ? "task" : "question";
  return editing ? ENGLISH.edit_2(noun) : ENGLISH.label_new(noun);
}

export function Hackathon_Editor({
  open,
  values,
  cohorts,
  certificates = [],
  languages,
  can_edit,
  busy,
  on_change,
  on_close,
  on_save,
  on_generate_mcq,
  on_generate_coding
}) {
  const [item_edit, set_item_edit] = useState(null);
  const [quiz_form, set_quiz_form] = useState(fresh_quiz);
  const [quiz_errors, set_quiz_errors] = useState({});
  const [coding_form, set_coding_form] = useState(EMPTY_CODING);
  const [coding_errors, set_coding_errors] = useState({});
  const [duration_pick, set_duration_pick] = useState("");
  const [detail_error, set_detail_error] = useState("");
  const [type_error, set_type_error] = useState("");
  const [certificate_error, set_certificate_error] = useState("");
  const description_ref = useRef(null);
  useEffect(() => {
    if (!open) set_item_edit(null);
  }, [open]);
  useLayoutEffect(() => {
    if (description_ref.current) description_ref.current.innerText = form_description(values);
  }, [values?.hackathon_id]);
  const source = values || {
    title: "",
    description: "",
    hackathon_type: "",
    audience: "program",
    cohort_id: "",
    program_ids: [],
    starts_at: "",
    ends_at: "",
    rules: "",
    certificate_id: "",
    items: []
  };
  const form = {
    ...source,
    audience: source.audience === "open" ? "open" : "program"
  };
  const cohort = cohorts.find((item) => String(item.cohort_id) === String(form.cohort_id));
  const programs = cohort?.programs || [];
  const today = today_stamp();
  const start_date = date_of(form.starts_at);
  const start_time = time_of(form.starts_at);
  const end_floor = later_slot(start_date, start_time);
  const schedule_error = schedule_problem(form.starts_at, form.ends_at);
  const locked = !can_edit || Boolean(busy);
  const fields_locked = locked;
  const selected = parse_types(form.hackathon_type);
  const chosen_program = (form.program_ids || [])[0] ? String(form.program_ids[0]) : "";

  function kind_of(item) {
    if (item?.item_type === "mcq" || item?.item_type === "coding" || item?.item_type === "project") return item.item_type;
    return selected.length === 1 ? selected[0] : "";
  }

  function rows_of(type) {
    return form.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => kind_of(item) === type);
  }

  function update(event) {
    const { name, value } = event.target;
    if (name === "audience") {
      on_change({
        ...form,
        audience: value,
        cohort_id: value === "open" ? "" : form.cohort_id,
        program_ids: value === "open" ? [] : form.program_ids
      });
      return;
    }
    if (name === "cohort_id") {
      on_change({ ...form, cohort_id: value, program_ids: [] });
      return;
    }
    if (name === "program_id") {
      on_change({ ...form, program_ids: value ? [Number(value)] : [] });
      return;
    }
    on_change({ ...form, [name]: value });
  }

  function toggle_type(type_id) {
    const stamped = form.items.map((item) => item.item_type ? item : { ...item, item_type: kind_of(item) || "mcq" });
    const next = selected.includes(type_id) ? selected.filter((id) => id !== type_id) : [...selected, type_id];
    set_type_error("");
    on_change({ ...form, hackathon_type: join_types(next), items: stamped });
  }

  function apply_format(command) {
    const node = description_ref.current;
    if (!node || fields_locked) return;
    node.focus();
    if (command === "createLink") {
      const url = window.prompt(ENGLISH.link_address);
      if (!url) return;
      document.execCommand(command, false, url);
    } else {
      document.execCommand(command, false, null);
    }
    on_change({ ...form, description: node.innerText });
  }

  function set_start(next) {
    if (!duration_pick) {
      on_change({ ...form, starts_at: next });
      return;
    }
    const ends_at = end_from_duration(next, Number(duration_pick));
    on_change({ ...form, starts_at: next, ends_at: ends_at || form.ends_at });
  }

  function set_end(next) {
    set_duration_pick("");
    on_change({ ...form, ends_at: next });
  }

  function pick_duration(hours) {
    set_duration_pick(hours);
    if (!hours) return;
    const ends_at = end_from_duration(form.starts_at, Number(hours));
    if (ends_at) on_change({ ...form, ends_at });
  }

  async function submit_quiz() {
    const next_errors = get_quiz_errors(quiz_form, { require_module: false, require_lesson: false });
    set_quiz_errors(next_errors);
    if (has_errors(next_errors)) return;
    const ok = await on_generate_mcq({
      text: quiz_form.text,
      count: Number(quiz_form.count),
      difficulty: quiz_form.difficulty_mix,
      bloom: quiz_form.bloom_mix
    });
    if (ok) set_item_edit(null);
  }

  async function submit_coding() {
    const next_errors = get_coding_errors(coding_form, { require_module: false, require_lesson: false });
    set_coding_errors(next_errors);
    if (has_errors(next_errors)) return;
    const item = await on_generate_coding({
      title: coding_form.set_title,
      prompt: coding_form.prompt,
      programming_language_id: coding_form.programming_language_id,
      marks: 10
    });
    if (!item) return;
    on_change({ ...form, items: [...form.items, { ...item, item_type: "coding" }] });
    set_item_edit(null);
  }

  function open_item(index) {
    const current = form.items[index];
    set_item_edit({
      index,
      mode: "edit",
      item: { ...current, item_type: kind_of(current), options: [...(current.options || [])] }
    });
  }

  function add_mcq() {
    set_quiz_form(fresh_quiz());
    set_quiz_errors({});
    set_item_edit({ mode: "quiz" });
  }

  function add_coding() {
    set_coding_form({ ...EMPTY_CODING });
    set_coding_errors({});
    set_item_edit({ mode: "coding" });
  }

  function add_project() {
    set_item_edit({ index: null, mode: "edit", item: empty_item("project") });
  }

  function commit_item(item) {
    const next = { ...item, item_type: item.item_type || item_edit?.item?.item_type || "project" };
    const items = item_edit.index == null ?
      [...form.items, next] :
      form.items.map((current, index) => index === item_edit.index ? next : current);
    on_change({ ...form, items });
    set_item_edit(null);
  }

  function remove_item(index) {
    on_change({ ...form, items: form.items.filter((_, offset) => offset !== index) });
  }

  const sheet_type = item_edit?.mode === "quiz" ? "mcq" : item_edit?.mode === "coding" ? "coding" : (item_edit?.item?.item_type || "project");

  return (
    <>
      <div className="hkm_page">
        <header className="hkm_head">
          <div>
            <h1>{ENGLISH.hackathon_management}</h1>
            <p>
              <button type="button" className="hkm_page_back" onClick={on_close}>{ENGLISH.back_to_hackathons}</button>
            </p>
          </div>
          {can_edit ?
            <Button type="submit" form="hkm_hackathon" disabled={locked} loading={busy === "published"}>
              <svg className="hkm_rocket" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.48 2.4a.75.75 0 0 0-.93.94l2.43 7.91H13.5a.75.75 0 0 1 0 1.5H4.98l-2.43 7.9a.75.75 0 0 0 .93.94 60.5 60.5 0 0 0 18.44-8.99.75.75 0 0 0 0-1.21A60.5 60.5 0 0 0 3.48 2.4Z" /></svg>{ENGLISH.publish_hackathon}</Button> :
            null}
        </header>
        <form
          id="hkm_hackathon"
          className="hkm_page_form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.certificate_id) {
              set_certificate_error(ENGLISH.choose_a_certificate_template_2);
              document.getElementById("hkm_certificate")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            if (!String(form.description || "").trim()) {
              set_detail_error(ENGLISH.enter_a_description);
              description_ref.current?.focus();
              return;
            }
            if (schedule_problem(form.starts_at, form.ends_at)) return;
            if (!selected.length) {
              set_type_error(ENGLISH.choose_at_least_one_type);
              document.getElementById("hkm_types")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            if (!form.items.some((item) => selected.includes(kind_of(item)))) {
              set_type_error(ENGLISH.add_at_least_one_question_or_task);
              document.getElementById("hkm_types")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            if (selected.includes("project")) {
              const needed = Number(form.required_submissions);
              const projects = rows_of("project").length;
              if (!Number.isInteger(needed) || needed < 1 || needed > projects) {
                set_type_error(ENGLISH.submissions_required_must_be_between_1_and(projects));
                document.getElementById("hkm_types")?.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
              }
            }
            set_detail_error("");
            set_type_error("");
            on_save("published");
          }}>
          <div className="hkm_page_grid" id="hkm_details">
            <section className={`hkm_page_card hkm_basic${schedule_error ? " is_bad" : ""}`}>
              <header className="hkm_page_card_head">
                <span className="hkm_page_mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M7 4h10v16H7V4Z" stroke="currentColor" strokeWidth="1.6" /><path d="M10 8h4M10 12h4M10 16h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </span>
                <h2>{ENGLISH.basic_information}</h2>
              </header>
              <label className="hkm_page_field">
                <span>{ENGLISH.hackathon_title}</span>
                <input name="title" required value={form.title} disabled={fields_locked} onChange={update} placeholder={ENGLISH.hackathon_title_2} />
              </label>
              <label className={`hkm_page_field${certificate_error ? " is_bad" : ""}`} id="hkm_certificate">
                <span className="is_required">{ENGLISH.certificate_template}</span>
                <select
                  name="certificate_id"
                  required
                  value={form.certificate_id ? String(form.certificate_id) : ""}
                  disabled={fields_locked}
                  onChange={(event) => {
                    set_certificate_error("");
                    update(event);
                  }}>
                  <option value="">{certificates.length ? ENGLISH.choose_a_certificate_template : ENGLISH.create_a_certificate_template_first}</option>
                  {certificates.map((item) =>
                    <option key={item.certificate_id} value={item.certificate_id}>{item.certificate_name}</option>
                  )}
                </select>
                {certificate_error ? <p className="hkm_page_error">{certificate_error}</p> : null}
              </label>
              <div className="hkm_page_field">
                <span className="is_required">{ENGLISH.description}</span>
                <div className="hkm_page_editor">
                <div className="hkm_page_toolbar" role="toolbar" aria-label={ENGLISH.description_formatting}>
                  <button type="button" disabled={fields_locked} onMouseDown={(event) => event.preventDefault()} onClick={() => apply_format("bold")}>{ENGLISH.b}</button>
                  <button type="button" disabled={fields_locked} onMouseDown={(event) => event.preventDefault()} onClick={() => apply_format("italic")}><em>{ENGLISH.i}</em></button>
                  <button type="button" disabled={fields_locked} onMouseDown={(event) => event.preventDefault()} onClick={() => apply_format("underline")}><u>{ENGLISH.u}</u></button>
                  <button type="button" disabled={fields_locked} onMouseDown={(event) => event.preventDefault()} onClick={() => apply_format("insertUnorderedList")}>{ENGLISH.list}</button>
                  <button type="button" disabled={fields_locked} onMouseDown={(event) => event.preventDefault()} onClick={() => apply_format("createLink")}>{ENGLISH.link}</button>
                </div>
                <div
                  ref={description_ref}
                  className={`hkm_page_rich${detail_error ? " is_bad" : ""}`}
                  contentEditable={!fields_locked}
                  role="textbox"
                  aria-multiline="true"
                  aria-label={ENGLISH.description}
                  data-placeholder={ENGLISH.describe_the_hackathon}
                  onInput={(event) => {
                    set_detail_error("");
                    on_change({ ...form, description: event.currentTarget.innerText });
                  }} />
                </div>
                {detail_error ? <p className="hkm_page_error">{detail_error}</p> : null}
              </div>
              <div className="hkm_span">
                <When_Fields
                  label={ENGLISH.start}
                  value={form.starts_at}
                  disabled={fields_locked}
                  min_date={today.date}
                  min_time={today.time}
                  on_change={set_start} />
                <label className="hkm_span_dur">
                  <i className="hkm_span_line" aria-hidden="true" />
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8.5V12l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <select
                    aria-label={ENGLISH.duration}
                    value={duration_pick || duration_id(form.starts_at, form.ends_at)}
                    disabled={fields_locked}
                    onChange={(event) => pick_duration(event.target.value)}>
                    <option value="">{duration_id(form.starts_at, form.ends_at) ? duration_label(form.starts_at, form.ends_at) : ENGLISH.choose_duration}</option>
                    {DURATION_OPTIONS.map((item) =>
                      <option key={item.id} value={item.id}>{item.label}</option>
                    )}
                  </select>
                  <i className="hkm_span_line" aria-hidden="true" />
                </label>
                <When_Fields
                  label={ENGLISH.end}
                  value={form.ends_at}
                  disabled={fields_locked}
                  min_date={end_floor.date || start_date || today.date}
                  min_time={end_floor.date === start_date ? end_floor.time : ""}
                  on_change={set_end} />
              </div>
              {schedule_error ? <p className="hkm_page_error">{schedule_error}</p> : null}
            </section>
            <div className="hkm_page_side">
              <section className="hkm_page_card" id="hkm_audience">
                <header className="hkm_page_card_head">
                  <span className="hkm_page_mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M16 19v-1.2A3.8 3.8 0 0 0 12.2 14H7.8A3.8 3.8 0 0 0 4 17.8V19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="10" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.6" /><path d="M20 19v-1.1A3.2 3.2 0 0 0 17.2 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="16.5" cy="8.2" r="2.1" stroke="currentColor" strokeWidth="1.6" /></svg>
                  </span>
                  <h2>{ENGLISH.target_audience}</h2>
                </header>
                <div className="hkm_page_audience">
                  <div className="hkm_scope_picks" role="radiogroup" aria-label={ENGLISH.hackathon_scope}>
                    {SCOPES.map((scope) =>
                      <button
                        key={scope.id}
                        type="button"
                        className={form.audience === scope.id ? "is_on" : ""}
                        aria-pressed={form.audience === scope.id}
                        disabled={fields_locked}
                        onClick={() => update({ target: { name: "audience", value: scope.id } })}>
                        <span className="hkm_scope_mark" aria-hidden="true">
                          {scope.id === "open" ?
                            <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" /><path d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8S14.2 17.6 12 20c-2.2-2.4-3.3-5.1-3.3-8S9.8 6.4 12 4Z" stroke="currentColor" strokeWidth="1.6" /></svg> :
                            <svg viewBox="0 0 24 24" fill="none"><path d="M16 19v-1.2A3.8 3.8 0 0 0 12.2 14H7.8A3.8 3.8 0 0 0 4 17.8V19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="10" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.6" /></svg>}
                        </span>
                        <strong>{scope.title}</strong>
                        <em>{scope.hint}</em>
                      </button>
                    )}
                  </div>
                  {form.audience === "open" ?
                    <p className="hkm_scope_open">{ENGLISH.open_to_every_student_including_people_outside_a}</p> :
                    <div className="hkm_scope_place">
                      <label className="hkm_page_field">
                        <span>{ENGLISH.cohort}</span>
                        <select
                          name="cohort_id"
                          required
                          value={form.cohort_id ? String(form.cohort_id) : ""}
                          disabled={fields_locked}
                          onChange={update}>
                          <option value="">{ENGLISH.choose_a_cohort}</option>
                          {cohorts.map((item) =>
                            <option key={item.cohort_id} value={item.cohort_id}>{item.cohort_name}</option>
                          )}
                        </select>
                      </label>
                      <label className="hkm_page_field">
                        <span>{ENGLISH.program}</span>
                        <select
                          name="program_id"
                          required
                          value={chosen_program}
                          disabled={fields_locked || !form.cohort_id}
                          onChange={update}>
                          <option value="">{form.cohort_id ? ENGLISH.choose_a_program : ENGLISH.choose_a_cohort_first}</option>
                          {programs.map((program) =>
                            <option key={program.program_id} value={program.program_id}>{program.program_name}</option>
                          )}
                        </select>
                      </label>
                    </div>}
                </div>
              </section>
              <section className="hkm_page_card">
                <header className="hkm_page_card_head">
                  <span className="hkm_page_mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M8 4h8v3H8V4ZM6 7h12v13H6V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </span>
                  <h2>{ENGLISH.rules}</h2>
                </header>
                <label className="hkm_page_field">
                  <textarea
                    aria-label={ENGLISH.rules}
                    className="hkm_rules"
                    name="rules"
                    rows="4"
                    value={form.rules}
                    disabled={fields_locked}
                    placeholder={ENGLISH.work_individually_or_in_teams_as_assigned_use}
                    onChange={update} />
                </label>
              </section>
            </div>
          </div>
          <div className="hkm_page_types" id="hkm_types" role="group" aria-label={ENGLISH.hackathon_types}>
            {TYPES.map((type) =>
              <button
                key={type.id}
                type="button"
                className={`is_${type.id}${selected.includes(type.id) ? " is_on" : ""}`}
                aria-pressed={selected.includes(type.id)}
                disabled={fields_locked}
                onClick={() => toggle_type(type.id)}>
                <span className="hkm_page_type_icon"><Type_Mark type={type.id} /></span>
                <strong>{TYPE_COPY[type.id][0]}</strong>
                <em>{TYPE_COPY[type.id][1]}</em>
              </button>
            )}
          </div>
          {type_error ? <p className="hkm_page_error">{type_error}</p> : null}
          {selected.length ?
          <div className={`hkm_page_boards${selected.length === 1 ? " is_solo" : ""}${selected.length === 2 ? " is_pair" : ""}`}>
            {selected.includes("mcq") ?
            <section className="hkm_page_card" id="hkm_questions">
              <header className="hkm_page_card_head">
                <span className="hkm_page_mark" aria-hidden="true"><Type_Mark type="mcq" /></span>
                <h2>{ENGLISH.mcq_questions}</h2>
                {can_edit ?
                  <button type="button" className="hkm_page_add" disabled={fields_locked} onClick={add_mcq}>{ENGLISH.add_question}</button> :
                  null}
              </header>
              <Item_Rows rows={rows_of("mcq")} kind="mcq" empty={ENGLISH.no_questions_yet} locked={fields_locked} can_edit={can_edit} on_edit={open_item} on_remove={remove_item} />
            </section> : null}
            {selected.includes("coding") ?
            <section className="hkm_page_card" id="hkm_coding">
              <header className="hkm_page_card_head">
                <span className="hkm_page_mark" aria-hidden="true"><Type_Mark type="coding" /></span>
                <h2>{ENGLISH.coding_questions}</h2>
                {can_edit ?
                  <button type="button" className="hkm_page_add" disabled={fields_locked} onClick={add_coding}>{ENGLISH.add_question}</button> :
                  null}
              </header>
              <Item_Rows rows={rows_of("coding")} kind="coding" empty={ENGLISH.no_coding_questions_yet} locked={fields_locked} can_edit={can_edit} on_edit={open_item} on_remove={remove_item} />
            </section> : null}
            {selected.includes("project") ?
            <section className="hkm_page_card" id="hkm_tasks">
              <header className="hkm_page_card_head">
                <span className="hkm_page_mark" aria-hidden="true"><Type_Mark type="project" /></span>
                <h2>{ENGLISH.project_tasks}</h2>
                <label className="hkm_page_field hkm_required_subs" title={ENGLISH.how_many_of_the_projects_a_student_must(rows_of(ENGLISH.project_2).length)}>
                  <span>{ENGLISH.submissions_required}</span>
                  <input
                    name="required_submissions"
                    required
                    inputMode="numeric"
                    maxLength={3}
                    disabled={fields_locked}
                    value={form.required_submissions ?? ""}
                    placeholder="1"
                    onChange={(event) => on_change({ ...form, required_submissions: digits_only(event.target.value, 3) })} />
                  <small>{ENGLISH.label_of}{rows_of("project").length}</small>
                </label>
                {can_edit ?
                  <button type="button" className="hkm_page_add" disabled={fields_locked} onClick={add_project}>{ENGLISH.add_project}</button> :
                  null}
              </header>
              <Item_Rows rows={rows_of("project")} kind="project" empty={ENGLISH.no_project_tasks_yet} locked={fields_locked} can_edit={can_edit} on_edit={open_item} on_remove={remove_item} />
            </section> : null}
          </div> : null}
        </form>
      </div>
      <Modal
        open={open && Boolean(item_edit)}
        title={sheet_title(sheet_type, item_edit?.index != null, item_edit?.mode)}
        size="sheet"
        onClose={() => {
          if (busy !== "mcq" && busy !== "coding") set_item_edit(null);
        }}>
        {item_edit?.mode === "quiz" ?
          <Quiz_Form
            values={quiz_form}
            errors={quiz_errors}
            loading={busy === "mcq"}
            show_place={false}
            on_change={set_quiz_form}
            on_submit={submit_quiz} /> :
          item_edit?.mode === "coding" ?
            <Coding_Form
              values={coding_form}
              errors={coding_errors}
              languages={languages}
              loading={busy === "coding"}
              show_place={false}
              on_change={set_coding_form}
              on_submit={submit_coding} /> :
          item_edit ?
            <Item_Sheet
              hackathon_type={sheet_type}
              item={item_edit.item}
              languages={languages}
              locked={locked}
              busy={busy === "coding"}
              editing={item_edit.index != null}
              on_generate={on_generate_coding}
              on_save={commit_item} /> :
            null}
      </Modal>
    </>
  );
}

function digits_only(value, max) {
  return String(value || "").replace(/\D/g, "").slice(0, max);
}

function project_missing(draft) {
  const filled = (lines) => (lines || []).some((line) => String(line || "").trim());
  return {
    title: !String(draft.title || "").trim(),
    overview: !String(draft.overview || draft.description || "").trim(),
    team_size: !/^[1-9]\d*$/.test(String(draft.team_size || "")),
    technology: !String(draft.technology || "").trim(),
    project_duration: !/^[1-9]\d*$/.test(String(draft.project_duration || "")),
    submission_type: !String(draft.submission_type || "").trim(),
    marks: !/^[1-9]\d*$/.test(String(draft.marks || ""))
  };
}

function Item_Sheet({ hackathon_type, item, languages, locked, busy, editing, on_generate, on_save }) {
  const [draft, set_draft] = useState(item);
  const [missing, set_missing] = useState({});
  function set_field(name, value) {
    set_draft((current) => ({ ...current, [name]: value }));
    set_missing((current) => ({ ...current, [name]: false }));
  }
  return (
    <form
      className={`prg_form hkm_form is_${hackathon_type}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (hackathon_type === "project") {
          const gaps = project_missing(draft);
          if (Object.values(gaps).some(Boolean)) {
            set_missing(gaps);
            return;
          }
        }
        on_save(draft);
      }}>
      <div className="prg_form_fields">
        {hackathon_type === "mcq" ?
          <Mcq_Fields draft={draft} locked={locked} on_change={set_draft} /> :
          null}
        {hackathon_type === "coding" ?
          <Coding_Fields
            draft={draft}
            languages={languages}
            locked={locked}
            busy={busy}
            on_change={set_draft}
            on_generate={async () => {
              const next = await on_generate(draft);
              if (next) set_draft(next);
            }} /> :
          null}
        {hackathon_type === "project" ?
          <Task_Fields draft={draft} locked={locked} missing={missing} on_field={set_field} /> :
          null}
      </div>
      <div className="prg_form_foot">
        <Button type="submit" disabled={locked}>
          {editing ? ENGLISH.save : hackathon_type === "project" ? ENGLISH.add_task : ENGLISH.add_question_2}
        </Button>
      </div>
    </form>
  );
}

function Mcq_Fields({ draft, locked, on_change }) {
  return (
    <>
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.question}</span>
        <textarea
          className="ui-input ui-input--outlined prg_textarea"
          placeholder=" "
          value={draft.question_text}
          disabled={locked}
          onChange={(event) => on_change({ ...draft, question_text: event.target.value, title: event.target.value })} />
      </label>
      <div className="hkm_options">
        {(draft.options || []).map((option, option_index) =>
          <label key={option_index} className="hkm_option">
            <input
              type="radio"
              name="correct_option"
              checked={option !== "" && draft.correct_answer === option}
              disabled={locked || !option}
              onChange={() => on_change({ ...draft, correct_answer: option })} />
            <input
              value={option}
              disabled={locked}
              placeholder={ENGLISH.option(option_index + 1)}
              onChange={(event) => {
                const options = draft.options.map((current, offset) => offset === option_index ? event.target.value : current);
                const correct_answer = draft.correct_answer === option ? event.target.value : draft.correct_answer;
                on_change({ ...draft, options, correct_answer });
              }} />
          </label>
        )}
      </div>
      <Input
        id="mcq_marks"
        name="marks"
        label={ENGLISH.marks}
        type="number"
        min="1"
        variant="outlined"
        value={draft.marks}
        disabled={locked}
        onChange={(event) => on_change({ ...draft, marks: event.target.value })} />
    </>
  );
}

function Coding_Fields({ draft, languages, locked, busy, on_change, on_generate }) {
  return (
    <>
      <Input
        id="coding_title"
        name="title"
        label={ENGLISH.question_name}
        variant="outlined"
        value={draft.title}
        disabled={locked}
        onChange={(event) => on_change({ ...draft, title: event.target.value })} />
      <Select
        name="programming_language_id"
        label={ENGLISH.programming_language}
        placeholder={ENGLISH.select_a_language}
        value={draft.programming_language_id ? String(draft.programming_language_id) : ""}
        disabled={locked}
        options={languages.map((language) => ({ value: language.id, label: language.name }))}
        onChange={(event) => {
          const language = languages.find((row) => String(row.id) === event.target.value);
          on_change({
            ...draft,
            programming_language_id: event.target.value,
            language: language?.name || ""
          });
        }} />
      {languages.length ? null : <p className="hkm_note">{ENGLISH.add_a_programming_language_in_dropdowns_before_generating}</p>}
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.prompt}</span>
        <textarea
          className="ui-input ui-input--outlined prg_textarea"
          placeholder=" "
          value={draft.prompt}
          disabled={locked}
          onChange={(event) => on_change({ ...draft, prompt: event.target.value })} />
      </label>
      <Input
        id="coding_marks"
        name="marks"
        label={ENGLISH.marks}
        type="number"
        min="1"
        variant="outlined"
        value={draft.marks}
        disabled={locked}
        onChange={(event) => on_change({ ...draft, marks: event.target.value })} />
      <Button type="button" variant="ghost" disabled={locked || !languages.length} loading={busy} onClick={on_generate}>
        {busy ? "Generating…" : ENGLISH.generate_question}
      </Button>
      {draft.description ? <p className="hkm_result">{draft.description}</p> : null}
      {draft.function_name ? <p className="hkm_note">{ENGLISH.label_function}{draft.function_name}</p> : null}
    </>
  );
}

function Line_List({ label, lines, locked, required, empty, on_change }) {
  const rows = lines?.length ? lines : [""];
  return (
    <fieldset className="hkm_lines" data-required-group={required ? "" : undefined} data-empty={empty ? "1" : undefined}>
      <legend>{label}</legend>
      {rows.map((line, index) =>
        <div key={index}>
          <input
            value={line}
            disabled={locked}
            placeholder={`${label} ${index + 1}`}
            onChange={(event) => on_change(rows.map((item, item_index) => item_index === index ? event.target.value : item))} />
          {rows.length > 1 ?
            <button type="button" disabled={locked} onClick={() => on_change(rows.filter((_, item_index) => item_index !== index))}>{ENGLISH.remove_2}</button> :
            null}
        </div>
      )}
      <button type="button" disabled={locked} onClick={() => on_change([...rows, ""])}>{ENGLISH.add}</button>
    </fieldset>
  );
}

function Task_Fields({ draft, locked, missing = {}, on_field }) {
  const deliverables = { ...empty_deliverables(), ...(draft.deliverables || {}) };
  function set_line(name, lines) {
    on_field(name, lines);
  }
  return (
    <>
      <Input
        id="task_title"
        name="title"
        label={ENGLISH.project_title}
        required
        data-empty={missing.title ? "1" : undefined}
        variant="outlined"
        value={draft.title}
        disabled={locked}
        onChange={(event) => on_field("title", event.target.value)} />
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.overview}</span>
        <textarea
          className="ui-input ui-input--outlined prg_textarea"
          required
          data-empty={missing.overview ? "1" : undefined}
          placeholder=" "
          value={draft.overview || draft.description || ""}
          disabled={locked}
          onChange={(event) => {
            on_field("overview", event.target.value);
            on_field("description", event.target.value);
          }} />
      </label>
      <div className="hkm_project_meta">
        <Input id="task_team" name="team_size" label={ENGLISH.team_size} required inputMode="numeric" data-empty={missing.team_size ? "1" : undefined} variant="outlined" value={draft.team_size || ""} disabled={locked} onChange={(event) => on_field("team_size", digits_only(event.target.value, 3))} />
        <Input id="task_tech" name="technology" label={ENGLISH.technology} required data-empty={missing.technology ? "1" : undefined} variant="outlined" value={draft.technology || ""} disabled={locked} onChange={(event) => on_field("technology", event.target.value)} />
        <Input id="task_span" name="project_duration" label={ENGLISH.duration_mins} required inputMode="numeric" data-empty={missing.project_duration ? "1" : undefined} variant="outlined" value={draft.project_duration || ""} disabled={locked} onChange={(event) => on_field("project_duration", digits_only(event.target.value, 5))} />
        <Input id="task_submit" name="submission_type" label={ENGLISH.submission_type} required data-empty={missing.submission_type ? "1" : undefined} variant="outlined" value={draft.submission_type || ""} disabled={locked} onChange={(event) => on_field("submission_type", event.target.value)} />
      </div>
      {Object.values(missing).some(Boolean) ? <p className="hkm_page_error">{ENGLISH.fill_every_required_field_team_size_and_duration}</p> : null}
      <Line_List label={ENGLISH.objectives} lines={draft.objectives} locked={locked}  on_change={(lines) => set_line("objectives", lines)} />
      <Line_List label={ENGLISH.expected_features} lines={draft.features} locked={locked} on_change={(lines) => set_line("features", lines)} />
      <fieldset className="hkm_deliverables">
        <legend>{ENGLISH.deliverables}</legend>
        {PROJECT_DELIVERABLES.map((item) =>
          <div key={item.id}>
            <div>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </div>
            <button
              type="button"
              className={deliverables[item.id] ? "hkm_switch is_on" : "hkm_switch"}
              aria-pressed={deliverables[item.id]}
              disabled={locked}
              onClick={() => on_field("deliverables", { ...deliverables, [item.id]: !deliverables[item.id] })}>
              <i />
            </button>
            <span>{deliverables[item.id] ? ENGLISH.required : ENGLISH.optional}</span>
          </div>
        )}
      </fieldset>
      <Input
        id="task_marks"
        name="marks"
        label={ENGLISH.marks}
        required
        inputMode="numeric"
        data-empty={missing.marks ? "1" : undefined}
        variant="outlined"
        value={draft.marks}
        disabled={locked}
        onChange={(event) => on_field("marks", digits_only(event.target.value, 4))} />
    </>
  );
}
