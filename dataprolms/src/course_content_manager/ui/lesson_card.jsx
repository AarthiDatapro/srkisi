import { ActionButton, MoreIcon, TrashIcon } from "@datapromr/action-button";
import { EmptyState } from "@datapromr/empty-state";
import { format_minutes, lesson_item_count } from "../utils.js";
import { Add_Type_Bar } from "./add_type_bar.jsx";
import { Coding_Exercise } from "./coding_card.jsx";
import { Chevron_Icon, Code_Icon, Grip_Icon, Plus_Icon, Quiz_Icon, Reorder_Controls } from "./icons.jsx";
import { Item_Row } from "./item_row.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

function pretty(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function quiz_meta(quiz) {
  const generated = Number(quiz?.question_count || 0);
  const shown = Number(quiz?.questions_shown || 0);
  let count_label = generated ? ENGLISH.questions(generated) : ENGLISH.quiz;
  if (generated && shown && shown !== generated) {
    count_label = ENGLISH.shown_of(shown, generated);
  }
  return [
  count_label,
  pretty(quiz?.difficulty),
  pretty(quiz?.bloom_level)].

  filter(Boolean).
  join(" · ");
}

function Quiz_Card({
  index,
  quiz,
  expanded,
  menu_id,
  reordering = false,
  order_index = 0,
  block_count = 0,
  on_toggle,
  on_menu,
  on_edit,
  on_delete,
  on_move,
  on_drag_start,
  on_drop,
  can_edit = true
}) {
  if (!quiz) {
    return (
      <article className="ccm_block ccm_block_is_quiz">
        <header className="ccm_block_head">
          <span className="ccm_block_index">{index}</span>
          <span className="ccm_block_copy">
            <h3>{ENGLISH.quiz}</h3>
          </span>
        </header>
      </article>);

  }
  const key = ENGLISH.quiz_2(quiz?.quiz_id);
  const questions = quiz?.questions || [];

  return (
    <article
      className="ccm_block ccm_block_is_quiz"
      onDragOver={(event) => {
        if (!reordering) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => {
        if (!reordering) return;
        event.preventDefault();
        event.stopPropagation();
        on_drop?.();
      }}>
      
      <header className="ccm_block_head">
        {reordering ?
        <span
          className="ccm_grip"
          draggable
          title={ENGLISH.drag_to_reorder}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", key);
            on_drag_start?.();
          }}>
          
            <Grip_Icon />
          </span> :
        null}
        <button
          type="button"
          className="ccm_block_toggle"
          onClick={() => on_toggle?.(quiz.quiz_id)}
          aria-expanded={expanded}>
          
          <Chevron_Icon down={expanded} />
        </button>
        <span className="ccm_block_index">{index}</span>
        <button type="button" className="ccm_block_main" onClick={() => on_toggle?.(quiz.quiz_id)}>
          <span className="ccm_block_quiz">
            <Quiz_Icon />
          </span>
          <span className="ccm_block_copy">
            <h3>{quiz?.quiz_title || ENGLISH.quiz}</h3>
            <p>{quiz_meta(quiz)}</p>
          </span>
        </button>
        {reordering ?
        <Reorder_Controls
          disable_up={order_index <= 0}
          disable_down={order_index >= block_count - 1}
          on_up={() => on_move?.(order_index, order_index - 1)}
          on_down={() => on_move?.(order_index, order_index + 1)} /> :

        null}
        <span className={quiz?.is_published !== false ? "ccm_pill is_on" : "ccm_pill"}>
          {quiz?.is_published !== false ? ENGLISH.published : ENGLISH.draft}
        </span>
        {can_edit && !reordering ?
        <div className="ccm_more">
            <ActionButton label={ENGLISH.more_actions} onClick={() => on_menu(menu_id === key ? null : key)}>
              <MoreIcon />
            </ActionButton>
            {menu_id === key ?
          <div className="ccm_more_menu">
                <button type="button" onClick={() => on_edit?.(quiz)}>{ENGLISH.edit_quiz}</button>
                <button type="button" className="is_danger" onClick={() => on_delete?.(quiz)}>
                  <TrashIcon />{ENGLISH.delete_quiz_2}</button>
              </div> :
          null}
          </div> :
        null}
      </header>

      {expanded ?
      <div className="ccm_block_body">
          {questions.length ?
        questions.map((question) =>
        <article key={question.question_id} className="ccm_item">
                <span className="ccm_item_mark ccm_item_mark_quiz">{question.question_number}</span>
                <div className="ccm_item_copy">
                  <b>{question.question_text}</b>
                  <small>
                    {(question.options || []).join(" · ")}
                    {question.correct_answer ? ENGLISH.correct(question.correct_answer) : ""}
                    {question.explanation ? ` · ${question.explanation}` : ""}
                  </small>
                </div>
              </article>
        ) :

        <EmptyState>{ENGLISH.no_questions_on_this_quiz_yet}</EmptyState>
        }
          {can_edit && !reordering ?
        <button type="button" className="ccm_add_item" onClick={() => on_edit?.(quiz)}>{ENGLISH.edit_questions}</button> :
        null}
        </div> :
      null}
    </article>);

}

export function Lesson_Card({
  index,
  lesson_no = 0,
  order_index = 0,
  block_count = 0,
  block,
  expanded,
  selected,
  menu_id,
  reordering = false,
  on_toggle,
  on_select,
  on_menu,
  on_add_item,
  on_preview,
  on_delete,
  on_delete_item,
  on_edit_quiz,
  on_delete_quiz,
  on_toggle_quiz,
  on_add_quiz,
  on_add_coding,
  on_delete_coding,
  quizzes = [],
  coding_sets = [],
  on_move,
  on_drag_start,
  on_drop,
  can_edit = true,
  compact = false,
  is_done = false,
  on_mark_done
}) {
  if (block.content_type !== "lesson" || !block.lesson) {
    return (
      <Quiz_Card
        index={index}
        quiz={block.quiz}
        expanded={expanded}
        menu_id={menu_id}
        reordering={reordering}
        order_index={order_index}
        block_count={block_count}
        on_toggle={on_toggle_quiz}
        on_menu={on_menu}
        on_edit={on_edit_quiz}
        on_delete={on_delete_quiz}
        on_move={on_move}
        on_drag_start={on_drag_start}
        on_drop={on_drop}
        can_edit={can_edit} />);


  }

  const lesson = block.lesson;
  const items = lesson.items || [];
  const can_remove = can_edit && !reordering ? on_delete_item : undefined;
  const count = lesson_item_count(lesson);
  const quiz_count = quizzes.length;
  const coding_count = coding_sets.length;
  const key = ENGLISH.lesson_3(lesson.lesson_id);

  return (
    <article
      className={["ccm_block", selected ? "is_on" : "", is_done ? "is_taught" : ""].filter(Boolean).join(" ")}
      onDragOver={(event) => {
        if (!reordering) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => {
        if (!reordering) return;
        event.preventDefault();
        event.stopPropagation();
        on_drop?.();
      }}>
      
      <header className="ccm_block_head">
        {reordering ?
        <span
          className="ccm_grip"
          draggable
          title={ENGLISH.drag_to_reorder}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", key);
            on_drag_start?.();
          }}>
          
            <Grip_Icon />
          </span> :
        null}
        <button type="button" className="ccm_block_toggle" onClick={() => on_toggle(lesson.lesson_id)}>
          <Chevron_Icon down={expanded} />
        </button>
        <span className="ccm_block_index">{index}</span>
        <button type="button" className="ccm_block_main" onClick={() => on_select(lesson)}>
          <span className="ccm_block_copy">
            <h3>
              {compact || !lesson_no ?
              lesson.lesson_title :
              ENGLISH.lesson_2(lesson_no, lesson.lesson_title)}
            </h3>
            <p>
              {count} {count === 1 ? "item" : "items"}
              {quiz_count ?
              ` · ${quiz_count} ${quiz_count === 1 ? "quiz" : "quizzes"}` :
              ""}
              {coding_count ?
              ` · ${coding_count} ${coding_count === 1 ? ENGLISH.coding_set : ENGLISH.coding_sets}` :
              ""}
              {lesson.duration_minutes ? ` · ${format_minutes(lesson.duration_minutes)}` : ""}
            </p>
          </span>
        </button>
        {reordering ?
        <Reorder_Controls
          disable_up={order_index <= 0}
          disable_down={order_index >= block_count - 1}
          on_up={() => on_move?.(order_index, order_index - 1)}
          on_down={() => on_move?.(order_index, order_index + 1)} /> :

        null}
        {on_mark_done && !reordering ?
        <button
          type="button"
          className={is_done ? "ccm_taught is_on" : "ccm_taught"}
          aria-pressed={is_done}
          disabled={!can_edit}
          onClick={() => on_mark_done(lesson)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.2 8.2 6.4 11.4 12.8 4.6" />
          </svg>
          <span>{is_done ? ENGLISH.taught : ENGLISH.mark_taught}</span>
        </button> :
        null}
        <span className={lesson.is_active ? "ccm_pill is_on" : "ccm_pill"}>
          {lesson.is_active ? ENGLISH.published : ENGLISH.draft}
        </span>
        {can_edit && !reordering ?
        <div className="ccm_more">
            <ActionButton
            label={ENGLISH.more_actions}
            onClick={() => on_menu(menu_id === key ? null : key)}>
            
              <MoreIcon />
            </ActionButton>
            {menu_id === key ?
          <div className="ccm_more_menu">
                {compact ? null :
            <button type="button" onClick={() => on_select(lesson)}>{ENGLISH.view_details}</button>}
                {on_add_quiz ?
            <button type="button" onClick={() => on_add_quiz(lesson)}>{ENGLISH.add_quiz_to_this_lesson}</button> :
            null}
                {on_add_coding ?
            <button type="button" onClick={() => on_add_coding(lesson)}>{ENGLISH.add_coding_exercises}</button> :
            null}
                <button type="button" className="is_danger" onClick={() => on_delete(lesson)}>
                  <TrashIcon />{ENGLISH.delete_lesson_2}</button>
              </div> :
          null}
          </div> :
        null}
      </header>

      {expanded ?
      <div className="ccm_block_body">
          {items.length ?
          <div className="ccm_files">
              {items.map((item) =>
            <Item_Row
              key={item.content_id}
              item={item}
              on_preview={on_preview}
              on_delete={can_remove} />
            )}
            </div> :
          null}
          {quizzes.map((quiz) =>
        <article key={quiz.quiz_id} className="ccm_lesson_quiz">
              <span className="ccm_lesson_quiz_mark">
                <Quiz_Icon />
              </span>
              <button
            type="button"
            className="ccm_lesson_quiz_main"
            onClick={() => on_edit_quiz?.(quiz)}>
            
                <b>{quiz.quiz_title || ENGLISH.quiz}</b>
                <small>{quiz_meta(quiz)}</small>
              </button>
              <span className={quiz.is_published !== false ? "ccm_pill is_on" : "ccm_pill"}>
                {quiz.is_published !== false ? ENGLISH.published : ENGLISH.draft}
              </span>
              {can_edit && !reordering ?
          <div className="ccm_lesson_quiz_tools">
                  <button type="button" onClick={() => on_edit_quiz?.(quiz)}>{ENGLISH.edit}</button>
                  <ActionButton label={ENGLISH.delete_quiz} tone="danger" onClick={() => on_delete_quiz?.(quiz)}>
                    <TrashIcon />
                  </ActionButton>
                </div> :
          null}
            </article>
        )}
          {coding_sets.map((set) => {
          const exercise_total = (set.exercises || []).length || Number(set.exercise_count || 0);
          return (
        <article key={set.coding_set_id} className="ccm_lesson_code">
              <div className="ccm_lesson_code_bar">
                <span className="ccm_lesson_quiz_mark">
                  <Code_Icon />
                </span>
                <div className="ccm_lesson_quiz_main">
                  <b>{set.set_title || ENGLISH.coding_exercise}</b>
                  <small>
                    {exercise_total} {exercise_total === 1 ? "exercise" : "exercises"}
                    {set.language ? ` · ${set.language}` : ""}
                  </small>
                </div>
                {can_edit && !reordering ?
            <div className="ccm_lesson_quiz_tools">
                    <ActionButton label={ENGLISH.delete_coding_exercises} tone="danger" onClick={() => on_delete_coding?.(set)}>
                      <TrashIcon />
                    </ActionButton>
                  </div> :
            null}
              </div>
              <div className="ccm_code_list">
                {(set.exercises || []).map((exercise) =>
              <Coding_Exercise key={exercise.exercise_id} exercise={exercise} />
            )}
              </div>
            </article>
          );
        })}
          {can_edit && !reordering ?
        <div className="ccm_lesson_actions">
              {on_add_quiz ?
          <button type="button" className="ccm_lesson_quiz_add" onClick={() => on_add_quiz(lesson)}>
                  <Plus_Icon />{ENGLISH.add_quiz_2}</button> :
          null}
              {on_add_coding ?
          <button type="button" className="ccm_lesson_quiz_add" onClick={() => on_add_coding(lesson)}>
                  <Plus_Icon />{ENGLISH.add_coding}</button> :
          null}
              <Add_Type_Bar compact={compact} on_pick={(type) => on_add_item(lesson, type)} />
            </div> :
        null}
        </div> :
      null}
    </article>);

}
