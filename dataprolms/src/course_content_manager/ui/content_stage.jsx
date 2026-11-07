import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LMS_MEDIA_PHONE } from "../../design_system/breakpoints.js";
import { format_minutes, lesson_item_count } from "../utils.js";
import { Lesson_Studio } from "./lesson_studio.jsx";
import { Chevron_Icon, Close_Icon, Grip_Icon, Layers_Icon, Pencil_Icon, Plus_Icon, Trash_Icon } from "./icons.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

function lesson_rows(module) {
  return (module?.blocks || []).filter((block) => block.lesson?.lesson_id);
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

function Lesson_Sheet({
  open,
  on_close,
  modules,
  active_module,
  lesson,
  can_edit,
  on_pick_module,
  on_pick_lesson,
  on_edit_module,
  on_delete_module,
  on_add_lesson
}) {
  useEffect(() => {
    if (!open) return undefined;
    function on_key(event) {
      if (event.key === ENGLISH.escape) on_close();
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [open, on_close]);

  if (!open || !active_module) return null;

  const rows = lesson_rows(active_module);
  const module_index = modules.findIndex((item) => item.module_id === active_module.module_id);

  return (
    <div className="ccm_lesson_sheet" role="presentation">
      <button type="button" className="ccm_lesson_sheet_scrim" aria-label={ENGLISH.close_module_and_lesson_list} onClick={on_close} />
      <div
        className="ccm_lesson_sheet_panel"
        role="dialog"
        aria-modal="true"
        aria-label={ENGLISH.choose_a_module_and_lesson}>
        <div className="ccm_lesson_sheet_handle" aria-hidden="true" />
        <header className="ccm_lesson_sheet_head">
          <div>
            <strong>{ENGLISH.module_3}{module_index + 1}</strong>
            <small>{rows.length} {rows.length === 1 ? "lesson" : "lessons"}</small>
          </div>
          {can_edit ?
            <span className="ccm_stage_head_actions">
              <button type="button" title={ENGLISH.edit_module} onClick={() => { on_close(); on_edit_module(active_module); }}>
                <Pencil_Icon />
              </button>
              <button type="button" title={ENGLISH.delete_module_2} onClick={() => { on_close(); on_delete_module(active_module); }}>
                <Trash_Icon />
              </button>
            </span> :
            null}
          <button type="button" className="ccm_lesson_sheet_close" aria-label={ENGLISH.close} onClick={on_close}>
            <Close_Icon />
          </button>
        </header>
        <div className="ccm_lesson_mods" role="tablist" aria-label={ENGLISH.modules}>
          {modules.map((item, index) => {
            const on = item.module_id === active_module.module_id;
            return (
              <button
                key={item.module_id}
                type="button"
                role="tab"
                aria-selected={on}
                className={on ? "is_on" : undefined}
                onClick={() => on_pick_module(item.module_id)}>
                <em>{index + 1}</em>
                <span>{item.module_title}</span>
              </button>
            );
          })}
        </div>
        {rows.length ?
          <ul className="ccm_lesson_sheet_list">
            {rows.map((row, index) => {
              const item = row.lesson;
              const on = item.lesson_id === lesson?.lesson_id;
              return (
                <li key={item.lesson_id}>
                  <button
                    type="button"
                    className={on ? "is_on" : undefined}
                    onClick={() => on_pick_lesson(item.lesson_id)}>
                    <span>{index + 1}</span>
                    <b>{item.lesson_title}</b>
                  </button>
                </li>
              );
            })}
          </ul> :
          <p className="ccm_stage_none">{ENGLISH.no_lessons_in_this_module_yet}</p>}
        {can_edit ?
          <button type="button" className="ccm_lesson_sheet_add" onClick={() => { on_close(); on_add_lesson(active_module.module_id); }}>
            <Plus_Icon />{ENGLISH.add_lesson_2}</button> :
          null}
      </div>
    </div>
  );
}

function extras_for(module, lesson_id) {
  const id = Number(lesson_id);
  const quizzes = [];
  const coding_sets = [];
  for (const block of module?.blocks || []) {
    if (Number(block.quiz?.lesson_id) === id) quizzes.push(block.quiz);
    if (Number(block.coding?.lesson_id) === id) coding_sets.push(block.coding);
  }
  return { quizzes, coding_sets };
}

export function Content_Stage({
  modules = [],
  can_edit,
  class_scopes = [],
  class_key = "",
  set_class_key,
  done_ids = [],
  on_mark_done,
  on_place_lesson,
  on_add_module,
  on_edit_module,
  on_delete_module,
  on_add_lesson,
  on_edit_lesson,
  on_delete_lesson,
  on_add_item,
  on_edit_overview,
  on_preview,
  on_delete_item,
  on_add_quiz,
  on_edit_quiz,
  on_delete_quiz,
  on_add_coding,
  on_delete_coding
}) {
  const [picked_module, set_picked_module] = useState(null);
  const [picked_lesson, set_picked_lesson] = useState(null);
  const [sheet_open, set_sheet_open] = useState(false);
  const [drag_id, set_drag_id] = useState(null);
  const [over_id, set_over_id] = useState(null);
  const phone = use_phone();
  const drag_ref = useRef(null);
  const active_module = modules.find((item) => String(item.module_id) === String(picked_module)) || modules[0] || null;
  const module_index = active_module ? modules.findIndex((item) => item.module_id === active_module.module_id) : -1;
  const rows = lesson_rows(active_module);
  const active_row = rows.find((row) => String(row.lesson.lesson_id) === String(picked_lesson)) || rows[0] || null;
  const lesson = active_row?.lesson || null;
  const lesson_no = lesson ? rows.findIndex((row) => row.lesson.lesson_id === lesson.lesson_id) + 1 : 0;
  const extras = lesson ? extras_for(active_module, lesson.lesson_id) : { quizzes: [], coding_sets: [] };
  const class_scope = class_scopes.find((item) => item.key === class_key) || class_scopes[0] || null;
  const class_label = class_scope ? `${class_scope.cohort_name} · ${class_scope.program_name}` : "";
  const lesson_label = ENGLISH.here(rows.length, rows.length === 1 ? "lesson" : "lessons");

  useEffect(() => {
    if (!phone) set_sheet_open(false);
  }, [phone]);

  function pick_module(module_id) {
    set_picked_module(module_id);
    set_picked_lesson(null);
    set_drag_id(null);
    set_over_id(null);
  }

  if (!modules.length) {
    return (
      <div className="ccm_stage_empty">
        <p>{ENGLISH.create_a_module_then_add_lessons_to_it}</p>
        {can_edit ?
          <button type="button" className="ccm_stage_add" onClick={on_add_module}>
            <Plus_Icon />{ENGLISH.create_module_2}</button> :
          null}
      </div>
    );
  }

  const dock_title = lesson?.lesson_title || ENGLISH.choose_a_lesson;
  const dock_module = active_module ? ENGLISH.module_2(module_index + 1, active_module.module_title) : ENGLISH.module;

  return (
    <div className={phone ? "ccm_stage is_phone" : "ccm_stage"}>
      {phone ? null : (
      <aside className="ccm_stage_rail">
        <header className="ccm_stage_rail_head">
          <span className="ccm_stage_rail_mark"><Layers_Icon /></span>
          <div>
            <strong>{ENGLISH.module}</strong>
            <small>{lesson_label}</small>
          </div>
          {can_edit ?
            <span className="ccm_stage_head_actions">
              <button type="button" title={ENGLISH.edit_module} onClick={() => on_edit_module(active_module)}>
                <Pencil_Icon />
              </button>
              <button type="button" title={ENGLISH.delete_module_2} onClick={() => on_delete_module(active_module)}>
                <Trash_Icon />
              </button>
            </span> :
            null}
        </header>
        <div className="ccm_stage_module">
          <Layers_Icon />
          <select
            aria-label={ENGLISH.module}
            value={active_module.module_id}
            onChange={(event) => pick_module(event.target.value)}>
            {modules.map((item, index) =>
              <option key={item.module_id} value={item.module_id}>
                {`${index + 1} · ${item.module_title}`}
              </option>
            )}
          </select>
        </div>
        {rows.length ?
          <ul>
            {rows.map((row, index) => {
              const item = row.lesson;
              const on = item.lesson_id === lesson?.lesson_id;
              const dragging = String(drag_id) === String(item.lesson_id);
              const over = drag_ref.current && String(over_id) === String(item.lesson_id) && !dragging;
              return (
                <li
                  key={item.lesson_id}
                  className={[on ? "is_on" : "", dragging ? "is_dragging" : "", over ? "is_over" : ""].filter(Boolean).join(" ") || undefined}
                  onDragOver={(event) => {
                    if (!can_edit || !drag_ref.current) return;
                    event.preventDefault();
                    if (String(over_id) !== String(item.lesson_id)) set_over_id(item.lesson_id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from_id = drag_ref.current || event.dataTransfer.getData("text/plain");
                    drag_ref.current = null;
                    set_drag_id(null);
                    set_over_id(null);
                    if (!from_id || String(from_id) === String(item.lesson_id)) return;
                    on_place_lesson?.(active_module.module_id, from_id, index);
                  }}>
                  <div
                    className="ccm_stage_lesson"
                    role="button"
                    tabIndex={0}
                    onClick={() => set_picked_lesson(item.lesson_id)}
                    onKeyDown={(event) => {
                      if (event.key === ENGLISH.enter || event.key === " ") {
                        event.preventDefault();
                        set_picked_lesson(item.lesson_id);
                      }
                    }}>
                    <span>{index + 1}</span>
                    <b>{item.lesson_title}</b>
                  </div>
                  {can_edit ?
                    <span
                      className="ccm_stage_grip"
                      draggable
                      title={ENGLISH.drag_to_reorder}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(item.lesson_id));
                        drag_ref.current = item.lesson_id;
                        set_drag_id(item.lesson_id);
                      }}
                      onDragEnd={() => {
                        drag_ref.current = null;
                        set_drag_id(null);
                        set_over_id(null);
                      }}>
                      <Grip_Icon />
                    </span> :
                    null}
                </li>
              );
            })}
          </ul> :
          <p className="ccm_stage_none">{ENGLISH.no_lessons_in_this_module_yet}</p>}
      </aside>
      )}

      <div className="ccm_stage_main">
        {lesson ?
          <>
            <header className="ccm_stage_hero">
              <span>{lesson_no}</span>
              <div>
                <div>
                  <h2>{lesson.lesson_title}</h2>
                  <em className={lesson.is_active ? "is_on" : undefined}>
                    {lesson.is_active ? ENGLISH.published : ENGLISH.draft}
                  </em>
                </div>
                <ul className="ccm_stage_stats">
                  <li className="is_time">
                    {lesson.duration_minutes ? format_minutes(lesson.duration_minutes) : ENGLISH.time_not_set}
                  </li>
                  <li className="is_items">
                    {`${lesson_item_count(lesson)} ${lesson_item_count(lesson) === 1 ? "item" : "items"}`}
                  </li>
                  <li className="is_quiz">
                    {`${extras.quizzes.length} ${extras.quizzes.length === 1 ? "quiz" : "quizzes"}`}
                  </li>
                  <li className="is_coding">
                    {ENGLISH.coding(extras.coding_sets.length)}
                  </li>
                </ul>
              </div>
            </header>
            {class_scopes.length > 1 ?
              <label className="ccm_stage_class">{ENGLISH.class_for_taught}<select value={class_scope?.key || ""} onChange={(event) => set_class_key?.(event.target.value)}>
                  {class_scopes.map((scope) =>
                    <option key={scope.key} value={scope.key}>
                      {`${scope.cohort_name} · ${scope.program_name}`}
                    </option>
                  )}
                </select>
              </label> :
              null}
            <Lesson_Studio
              key={lesson.lesson_id}
              lesson={lesson}
              items={lesson.items || []}
              quizzes={extras.quizzes}
              coding_sets={extras.coding_sets}
              can_edit={can_edit}
              is_done={done_ids.includes(Number(lesson.lesson_id))}
              module_title={ENGLISH.module_2(module_index + 1, active_module.module_title)}
              lesson_no={lesson_no}
              class_label={class_label}
              on_add_item={on_add_item}
              on_edit_overview={on_edit_overview}
              on_preview={on_preview}
              on_delete_item={on_delete_item}
              on_edit_quiz={on_edit_quiz}
              on_delete_quiz={on_delete_quiz}
              on_add_quiz={() => on_add_quiz(active_module.module_id, lesson.lesson_id)}
              on_add_coding={() => on_add_coding(active_module.module_id, lesson.lesson_id)}
              on_delete_coding={on_delete_coding}
              on_mark_done={class_scope ? on_mark_done : undefined}
              on_edit_lesson={on_edit_lesson}
              on_delete_lesson={on_delete_lesson} />
          </> :
          <div className="ccm_stage_empty">
            <p>{ENGLISH.add_a_lesson_to_start_filling_overview_video}</p>
            {can_edit ?
              <button type="button" className="ccm_stage_add" onClick={() => on_add_lesson(active_module.module_id)}>
                <Plus_Icon />{ENGLISH.add_lesson_2}</button> :
              null}
          </div>}
      </div>
      {phone && typeof document !== "undefined" ?
        createPortal(
          <>
            {sheet_open ? null :
            <button
              type="button"
              className="ccm_lesson_dock"
              aria-haspopup="dialog"
              aria-expanded={false}
              onClick={() => set_sheet_open(true)}>
              <span className="ccm_lesson_dock_no">{lesson_no || module_index + 1}</span>
              <span className="ccm_lesson_dock_copy">
                <small>{dock_module}</small>
                <b>{dock_title}</b>
              </span>
              <Chevron_Icon up />
            </button>}
            <Lesson_Sheet
              open={sheet_open}
              on_close={() => set_sheet_open(false)}
              modules={modules}
              active_module={active_module}
              lesson={lesson}
              can_edit={can_edit}
              on_pick_module={pick_module}
              on_pick_lesson={(lesson_id) => {
                set_picked_lesson(lesson_id);
                set_sheet_open(false);
              }}
              on_edit_module={on_edit_module}
              on_delete_module={on_delete_module}
              on_add_lesson={on_add_lesson} />
          </>,
          document.body
        ) :
        null}
    </div>
  );
}
