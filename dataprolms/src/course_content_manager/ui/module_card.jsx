import { ActionButton, MoreIcon, TrashIcon } from "@datapromr/action-button";
import { COPY } from "../constants.js";
import { Chevron_Icon, Grip_Icon, Plus_Icon, Reorder_Controls } from "./icons.jsx";
import { Lesson_Card } from "./lesson_card.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

export function Module_Card({
  module,
  index,
  order_index = 0,
  module_count = 0,
  start_index,
  lesson_start = 0,
  expanded,
  expanded_lessons,
  selected_id,
  menu_id,
  reordering = false,
  dragging = false,
  on_toggle,
  on_toggle_lesson,
  on_select,
  on_menu,
  on_edit,
  on_delete,
  on_add_lesson,
  on_add_quiz,
  on_add_coding,
  on_delete_coding,
  on_add_item,
  on_preview,
  on_delete_lesson,
  on_delete_item,
  on_edit_quiz,
  on_delete_quiz,
  expanded_quizzes,
  on_toggle_quiz,
  on_move_module,
  on_move_block,
  on_module_drag_start,
  on_module_drop,
  on_block_drag_start,
  on_block_drop,
  can_edit = true,
  compact = false,
  done_ids = [],
  on_mark_done
}) {
  const blocks = module.blocks || [];
  const count = blocks.length;
  const key = ENGLISH.module_4(module.module_id);
  const lesson_ids = new Set(
    blocks.filter((block) => block.lesson?.lesson_id).map((block) => Number(block.lesson.lesson_id))
  );
  const taught_count = blocks.filter((block) =>
    block.lesson && done_ids.includes(Number(block.lesson.lesson_id))
  ).length;
  const lesson_count = blocks.filter((block) => block.lesson).length;
  const quizzes_by_lesson = new Map();
  const coding_by_lesson = new Map();
  for (const block of blocks) {
    const quiz_lesson_id = Number(block.quiz?.lesson_id);
    if (block.quiz && quiz_lesson_id && lesson_ids.has(quiz_lesson_id)) {
      const list = quizzes_by_lesson.get(quiz_lesson_id) || [];
      list.push(block.quiz);
      quizzes_by_lesson.set(quiz_lesson_id, list);
    }
    const coding_lesson_id = Number(block.coding?.lesson_id);
    if (block.coding && coding_lesson_id && lesson_ids.has(coding_lesson_id)) {
      const list = coding_by_lesson.get(coding_lesson_id) || [];
      list.push(block.coding);
      coding_by_lesson.set(coding_lesson_id, list);
    }
  }

  function is_nested(block) {
    if (block.content_type === "quiz" && lesson_ids.has(Number(block.quiz?.lesson_id))) return true;
    if (block.content_type === "coding" && lesson_ids.has(Number(block.coding?.lesson_id))) return true;
    return false;
  }

  return (
    <section
      className={["ccm_module", dragging ? "is_dragging" : "", reordering ? "is_reorder" : ""].
      filter(Boolean).
      join(" ")}
      onDragOver={(event) => {
        if (!reordering) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!reordering) return;
        event.preventDefault();
        on_module_drop?.(order_index);
      }}>
      
      <header className="ccm_module_head">
        {reordering ?
        <span
          className="ccm_grip"
          draggable
          title={ENGLISH.drag_to_reorder}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", key);
            on_module_drag_start?.(order_index);
          }}>
          
            <Grip_Icon />
          </span> :
        null}
        <button type="button" className="ccm_block_toggle" onClick={() => on_toggle(module.module_id)}>
          <Chevron_Icon down={expanded} />
        </button>
        <span className="ccm_module_index">{index}</span>
        <div className="ccm_block_copy">
          <h3>{compact ? module.module_title : ENGLISH.module_2(index, module.module_title)}</h3>
          <p>
            {count} {count === 1 ? "item" : "items"}
            {on_mark_done && lesson_count ? ENGLISH.of_taught(taught_count, lesson_count) : ""}
          </p>
        </div>
        {reordering ?
        <Reorder_Controls
          disable_up={order_index <= 0}
          disable_down={order_index >= module_count - 1}
          on_up={() => on_move_module?.(order_index, order_index - 1)}
          on_down={() => on_move_module?.(order_index, order_index + 1)} /> :

        null}
        <span className={module.is_active ? "ccm_pill is_on" : "ccm_pill"}>
          {module.is_active ? ENGLISH.published : ENGLISH.draft}
        </span>
        {can_edit && !reordering ?
        <div className="ccm_more">
          <ActionButton label={ENGLISH.more_actions} onClick={() => on_menu(menu_id === key ? null : key)}>
            <MoreIcon />
          </ActionButton>
          {menu_id === key ?
          <div className="ccm_more_menu">
              <button type="button" onClick={() => on_edit(module)}>{ENGLISH.edit_module}</button>
              <button type="button" onClick={() => on_add_lesson(module.module_id)}>{ENGLISH.add_lesson}</button>
              <button type="button" className="is_danger" onClick={() => on_delete(module)}>
                <TrashIcon />
                {COPY.deleteModule}
              </button>
            </div> :
          null}
        </div> :
        null}
      </header>

      {expanded ?
      <div className="ccm_module_body">
          {blocks.map((block, offset) => {
          if (is_nested(block)) return null;
          const skipped = blocks.slice(0, offset).filter(is_nested).length;
          const lesson_no = lesson_start + blocks.
          slice(0, offset + 1).
          filter((item) => item.content_type === "lesson" && item.lesson).
          length;
          return (
            <Lesson_Card
              key={block.content_id}
              index={start_index + offset - skipped}
              lesson_no={block.lesson ? lesson_no : 0}
              order_index={offset}
              block_count={count}
              block={block}
              quizzes={
              block.lesson ?
              quizzes_by_lesson.get(Number(block.lesson.lesson_id)) || [] :
              []
              }
              coding_sets={
              block.lesson ?
              coding_by_lesson.get(Number(block.lesson.lesson_id)) || [] :
              []
              }
              expanded={
              block.lesson ?
              expanded_lessons.has(block.lesson.lesson_id) :
              expanded_quizzes?.has(block.quiz?.quiz_id)
              }
              selected={block.lesson?.lesson_id === selected_id}
              menu_id={menu_id}
              reordering={reordering}
              on_toggle={on_toggle_lesson}
              on_select={on_select}
              on_menu={on_menu}
              on_add_item={on_add_item}
              on_preview={on_preview}
              on_delete={on_delete_lesson}
              on_delete_item={on_delete_item}
              on_edit_quiz={on_edit_quiz}
              on_delete_quiz={on_delete_quiz}
              on_toggle_quiz={on_toggle_quiz}
              on_add_quiz={
              block.lesson ?
              () => on_add_quiz?.(module.module_id, block.lesson.lesson_id) :
              undefined
              }
              on_add_coding={
              block.lesson ?
              () => on_add_coding?.(module.module_id, block.lesson.lesson_id) :
              undefined
              }
              on_delete_coding={on_delete_coding}
              on_move={(from, to) => on_move_block?.(module.module_id, from, module.module_id, to)}
              on_drag_start={() => on_block_drag_start?.(module.module_id, offset)}
              on_drop={() => on_block_drop?.(module.module_id, offset)}
              can_edit={can_edit}
              compact={compact}
              is_done={Boolean(block.lesson && done_ids.includes(Number(block.lesson.lesson_id)))}
              on_mark_done={on_mark_done} />);


        })}
          {can_edit && !reordering ?
        <div className="ccm_module_adds">
              <button type="button" className="ccm_add_item" onClick={() => on_add_lesson(module.module_id)}>
                <Plus_Icon />
                {COPY.addLesson}
              </button>
            </div> :
        null}
        </div> :
      null}
    </section>);

}
