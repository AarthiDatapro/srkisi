import { useEffect, useMemo, useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import { Modal } from "@datapromr/modal";
import { list_courses } from "../../course_manager/api.js";
import { list_programs } from "../../programs_control/api.js";
import { COPY, TABS } from "../constants.js";
import { Lesson_Form } from "./lesson_form.jsx";
import { Item_Form } from "./item_form.jsx";
import { Feedback_Questions_Editor } from "./feedback_questions_editor.jsx";
import { Course_Students } from "./course_students.jsx";
import { Course_Attendance } from "./course_attendance.jsx";
import { Daily_Reports } from "./daily_reports.jsx";
import { Content_Stage } from "./content_stage.jsx";
import { Quiz_Form } from "./quiz_form.jsx";
import { Coding_Form } from "./coding_form.jsx";
import { Module_Form } from "./module_form.jsx";
import { Code_Icon, Plus_Icon } from "./icons.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

export function Content_Workspace({
  desk_ref,
  selected,
  compact,
  section_edit = {},
  on_pick_scope,
  error,
  course,
  set_add_open,
  add_open,
  open_create_module,
  open_create_lesson,
  open_quiz,
  open_coding,
  tab,
  reordering,
  set_reordering,
  set_drag,
  toggle_all,
  modules,
  expanded_modules,
  expanded,
  selected_id,
  menu_id,
  drag,
  toggle_module,
  toggle_lesson,
  set_selected_id,
  set_peek_tab,
  set_menu_id,
  open_edit_module,
  remove_module,
  open_add_item,
  open_edit_overview,
  preview_item,
  remove_lesson,
  remove_item,
  open_edit_quiz,
  remove_quiz,
  remove_coding,
  expanded_quizzes,
  toggle_quiz,
  move_module,
  move_block,
  place_lesson,
  handle_module_drag_start,
  handle_module_drop,
  handle_block_drag_start,
  handle_block_drop,
  loading,
  stats,
  course_id,
  class_scopes = [],
  class_key = "",
  set_class_key,
  done_ids = [],
  mark_lesson_done,
  scope_program_id,
  peek_tab,
  open_edit_lesson,
  rename_lesson,
  feedback,
  feedback_loading,
  panel,
  set_panel,
  module_form,
  module_errors,
  set_module_form,
  save_module,
  lesson_form,
  lesson_errors,
  set_lesson_form,
  save_lesson,
  item_form,
  item_errors,
  file,
  set_item_form,
  set_file,
  save_item,
  quiz_form,
  quiz_errors,
  set_quiz_form,
  save_quiz,
  coding_form,
  coding_errors,
  programming_languages,
  set_coding_form,
  save_coding,
  preview,
  set_preview
}) {
  const [opened, set_opened] = useState(() => ({ [tab]: true }));
  const [catalog, set_catalog] = useState([]);
  const [programs, set_programs] = useState([]);
  const screen = TABS.find((item) => item.id === tab) || TABS[0];
  const can_edit = Boolean(section_edit[tab]);
  const program_required = tab === "attendance" || tab === "reports";
  const program_value = programs.some((item) => String(item.program_id) === String(scope_program_id))
    ? String(scope_program_id)
    : (programs.length || !(Number(scope_program_id) > 0) ? "" : String(scope_program_id));
  const course_options = useMemo(() => {
    if (!program_value) return program_required ? [] : catalog;
    return catalog.filter((item) => (item.program_ids || []).map(Number).includes(Number(program_value)));
  }, [catalog, program_required, program_value]);
  const course_listed = course_options.some((item) => String(item.course_id) === String(course_id));
  const course_value = course_listed || (!catalog.length && course_id && (!program_required || program_value))
    ? String(course_id)
    : "";
  const screen_ready = program_required
    ? Boolean(program_value && course_value)
    : Boolean(course_value || (!catalog.length && course_id));

  useEffect(() => {
    let alive = true;
    list_programs({ pageSize: "500", sort: "name", dir: "asc" }).then((payload) => {
      if (alive) set_programs(payload.items || []);
    }).catch(() => {});
    list_courses({ pageSize: "500", sort: "name", dir: "asc" }).then((payload) => {
      if (alive) set_catalog(payload.items || []);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function course_in_program(next_course, next_program) {
    return catalog.some((item) =>
      String(item.course_id) === String(next_course) &&
      (item.program_ids || []).map(Number).includes(Number(next_program))
    );
  }

  function pick_program(next) {
    if (!next) {
      on_pick_scope?.({ program_id: "", course_id: course_id || "" });
      return;
    }
    const keep = !catalog.length || course_in_program(course_id, next);
    on_pick_scope?.({ program_id: next, course_id: keep ? course_id || "" : "" });
  }

  function pick_course(next_course) {
    if (!next_course) return;
    const program_id = program_value && course_in_program(next_course, program_value) ? program_value : "";
    on_pick_scope?.({ program_id: program_required ? program_value : program_id, course_id: next_course });
  }

  useEffect(() => {
    set_selected_id(null);
    set_panel(null);
    set_preview(null);
    set_add_open(false);
    set_menu_id(null);
  }, [tab, set_selected_id, set_panel, set_preview, set_add_open, set_menu_id]);
  if (tab && !opened[tab]) {
    set_opened((current) => ({ ...current, [tab]: true }));
  }

  function panel_class(id) {
    return tab === id ? undefined : "adm_panel_parked";
  }

  return (
    <section
      ref={desk_ref}
      className={["ccm", selected ? "is_open" : "", compact ? "is_compact" : "", can_edit ? "" : "is_readonly"].
      filter(Boolean).
      join(" ")}>
      
      <div className="ccm_body">
        {error ? <p className="ccm_error">{error}</p> : null}

        <header className="ccm_screen_head">
          <div className="ccm_screen_title">
            <span className="ccm_screen_mark" aria-hidden="true">
              <Code_Icon />
            </span>
            <div>
              <h1>{screen.label}</h1>
              <p>
                {screen_ready && course?.course_name
                  ? course.course_name
                  : program_required && !program_value
                    ? ENGLISH.select_a_program_then_a_course
                    : ENGLISH.select_a_course_you_can_switch_it_here}
              </p>
            </div>
          </div>
          <div className="ccm_screen_tools">
            <select
              aria-label={ENGLISH.program}
              className={program_required && !program_value ? "is_ready" : ""}
              value={program_value}
              onChange={(event) => pick_program(event.target.value)}>
              <option value="">{program_required ? ENGLISH.select_a_program : ENGLISH.all_programs}</option>
              {programs.map((item) =>
                <option key={item.program_id} value={item.program_id}>{item.program_name}</option>
              )}
            </select>
            <select
              aria-label={ENGLISH.course}
              className={!program_required || program_value ? "is_ready" : ""}
              value={course_value}
              disabled={program_required && !program_value}
              onChange={(event) => pick_course(event.target.value)}>
              <option value="">{program_required && !program_value ? ENGLISH.select_a_program_first : ENGLISH.select_a_course}</option>
              {course_options.map((item) =>
                <option key={item.course_id} value={item.course_id}>
                  {item.is_open ? ENGLISH.open(item.course_name) : item.course_name}
                </option>
              )}
            </select>
            {can_edit && tab === "content" && course_id ?
            <div className="ccm_add">
              <button type="button" className="ccm_add_btn" onClick={() => set_add_open((value) => !value)}>
                <Plus_Icon />
                {compact ? ENGLISH.add_2 : COPY.addContent}
              </button>
              {add_open ?
                <div className="ccm_add_menu">
                  <button type="button" onClick={open_create_module}>
                    {COPY.createModule}
                  </button>
                  <button type="button" onClick={() => open_create_lesson()}>{ENGLISH.create_lesson}</button>
                  <button type="button" onClick={open_quiz}>{ENGLISH.create_quiz}</button>
                  <button type="button" onClick={open_coding}>{ENGLISH.create_coding_exercises}</button>
                </div> :
                null}
            </div> :
            null}
          </div>
        </header>

        {screen_ready ? null : (
          <p className="ccm_pick_note">
            {program_required && !program_value
              ? ENGLISH.select_a_program_the_course_list_opens_after
              : ENGLISH.select_a_course_to_open_this_screen}
          </p>
        )}

        {screen_ready && opened.content ?
        <div className={panel_class("content")}>
        <section className="ccm_board is_stage">
            <Content_Stage
              modules={modules}
              can_edit={Boolean(section_edit.content)}
              class_scopes={class_scopes}
              class_key={class_key}
              set_class_key={set_class_key}
              done_ids={done_ids}
              on_mark_done={mark_lesson_done}
              on_place_lesson={place_lesson}
              on_add_module={open_create_module}
              on_edit_module={open_edit_module}
              on_delete_module={remove_module}
              on_add_lesson={open_create_lesson}
              on_edit_lesson={open_edit_lesson}
              on_delete_lesson={remove_lesson}
              on_add_item={open_add_item}
              on_edit_overview={open_edit_overview}
              on_preview={preview_item}
              on_delete_item={remove_item}
              on_add_quiz={open_quiz}
              on_edit_quiz={open_edit_quiz}
              on_delete_quiz={remove_quiz}
              on_add_coding={open_coding}
              on_delete_coding={remove_coding} />
          </section>
        </div> :
        null}

        {screen_ready && opened.feedback ?
        <div className={panel_class("feedback")}>
          <Feedback_Questions_Editor course_id={course_id} can_edit={Boolean(section_edit.feedback)} />
        </div> :
        null}

        {screen_ready && opened.students ?
        <div className={panel_class("students")}>
          <Course_Students
            course_id={course_id}
            programs={course?.programs || []}
            program_id={scope_program_id}
            can_edit={Boolean(section_edit.students)}
            compact={compact} />
        </div> :
        null}

        {screen_ready && opened.attendance ?
        <div className={panel_class("attendance")}>
          <Course_Attendance
            course_id={course_id}
            program_id={scope_program_id}
            can_edit={Boolean(section_edit.attendance)}
            compact={compact} />
        </div> :
        null}

        {screen_ready && opened.reports ?
        <div className={panel_class("reports")}>
          <Daily_Reports
            course_id={course_id}
            course={course}
            programs={course?.programs || []}
            program_id={scope_program_id}
            can_edit={Boolean(section_edit.reports)} />
        </div> :
        null}
      </div>

      <Modal
        open={panel === "module" || panel === "module_edit"}
        title={panel === "module_edit" ? ENGLISH.edit_module_2 : COPY.createModule}
        size="wide"
        onClose={() => set_panel(null)}>
        
        <Module_Form
          values={module_form}
          errors={module_errors}
          submit_label={panel === "module_edit" ? ENGLISH.save_module : ENGLISH.create_module_3}
          loading={loading}
          on_change={set_module_form}
          on_submit={save_module} />
        
      </Modal>

      <Modal
        open={panel === "lesson" || panel === "lesson_edit"}
        title={panel === "lesson_edit" ? ENGLISH.edit_lesson : COPY.createLesson}
        size="wide"
        onClose={() => set_panel(null)}>
        
        <Lesson_Form
          values={lesson_form}
          errors={lesson_errors}
          modules={modules}
          submit_label={panel === "lesson_edit" ? ENGLISH.save_lesson : ENGLISH.create_lesson_2}
          loading={loading}
          on_change={set_lesson_form}
          on_submit={save_lesson} />
        
      </Modal>

      <Modal
        open={panel === "item" || panel === "item_edit"}
        title={`${panel === "item_edit" ? ENGLISH.edit : ENGLISH.add_2} ${item_form.content_type}`}
        size="wide"
        onClose={() => set_panel(null)}>
        <Item_Form
          values={item_form}
          errors={item_errors}
          file={file}
          loading={loading}
          lock_type={panel === "item_edit"}
          on_change={set_item_form}
          on_file={set_file}
          on_submit={save_item} />
        
      </Modal>

      <Modal
        open={panel === "quiz" || panel === "quiz_edit"}
        title={panel === "quiz_edit" ? ENGLISH.edit_quiz_2 : ENGLISH.create_quiz}
        size="sheet"
        onClose={() => !loading && set_panel(null)}>
        
        <Quiz_Form
          values={quiz_form}
          errors={quiz_errors}
          modules={modules}
          loading={loading}
          editing={panel === "quiz_edit"}
          on_change={set_quiz_form}
          on_submit={save_quiz} />
        
      </Modal>

      <Modal
        open={panel === "coding"}
        title={ENGLISH.create_coding_exercise}
        size="sheet"
        onClose={() => !loading && set_panel(null)}>

        <Coding_Form
          values={coding_form}
          errors={coding_errors}
          modules={modules}
          languages={programming_languages}
          loading={loading}
          on_change={set_coding_form}
          on_submit={save_coding} />

      </Modal>

      <Modal
        open={Boolean(preview)}
        title={preview ? `${preview.content_type}: ${preview.content_title}` : ENGLISH.preview}
        onClose={() => set_preview(null)}>
        
        <p className="ccm_preview"><Link_Text text={preview?.content_description} /></p>
      </Modal>
    </section>);

}
