import { useEffect, useRef, useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import { Action_Button, Trash_Icon } from "../../admin_ui/row_actions.jsx";
import { COPY } from "../constants.js";
import { format_date, format_minutes, item_hint, lesson_item_count } from "../utils.js";
import { Add_Type_Bar } from "./add_type_bar.jsx";
import { item_icon } from "./icons.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

function Stars({ value }) {
  const rating = Number(value) || 0;
  return (
    <span className="ccm_stars" aria-label={ENGLISH.out_of_5(rating)}>
      {[1, 2, 3, 4, 5].map((n) =>
      <span key={n} className={n <= rating ? "is_on" : undefined}>
          ★
        </span>
      )}
    </span>);

}

export function Lesson_Peek({
  lesson,
  tab,
  on_tab,
  on_close,
  on_rename,
  on_edit,
  on_add_item,
  on_delete,
  on_preview,
  on_delete_item,
  feedback,
  feedback_loading,
  can_edit = true
}) {
  const items = lesson.items || [];
  const count = lesson_item_count(lesson);
  const summary = feedback?.summary || { count: 0, average: 0 };
  const rows = feedback?.items || [];
  const title_ref = useRef(null);
  const [title, set_title] = useState(lesson.lesson_title || "");
  const [editing, set_editing] = useState(false);

  useEffect(() => {
    set_title(lesson.lesson_title || "");
    set_editing(false);
  }, [lesson.lesson_id, lesson.lesson_title]);

  function start_edit() {
    set_editing(true);
    window.setTimeout(() => title_ref.current?.focus(), 0);
  }

  function commit_title() {
    set_editing(false);
    const next = title.trim();
    if (!next) {
      set_title(lesson.lesson_title || "");
      return;
    }
    if (next !== lesson.lesson_title) on_rename(next);
  }

  return (
    <aside className="ccm_peek">
      <header className="ccm_peek_head">
        <button type="button" className="ccm_peek_close" aria-label={ENGLISH.close} onClick={on_close}>
          ×
        </button>
        <div className="ccm_peek_identity">
          <p>{ENGLISH.lesson}</p>
          <div className="ccm_peek_title_row">
            {can_edit && editing ?
              <textarea
                ref={title_ref}
                className="ccm_peek_title"
                rows={2}
                value={title}
                aria-label={ENGLISH.lesson_name}
                onChange={(event) => set_title(event.target.value)}
                onBlur={commit_title}
                onKeyDown={(event) => {
                  if (event.key === ENGLISH.enter && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }} /> :
              <h2>{lesson.lesson_title}</h2>}
          </div>
          <div className="ccm_peek_kicker">
            <span className="ccm_peek_chip">{format_minutes(lesson.duration_minutes) || ENGLISH.no_duration}</span>
            <span className={lesson.is_active ? "ccm_pill is_on" : "ccm_pill"}>
              {lesson.is_active ? ENGLISH.published : ENGLISH.draft}
            </span>
          </div>
        </div>
        {can_edit ?
          <button
            type="button"
            className="ccm_peek_edit"
            title={ENGLISH.edit_lesson_name}
            aria-label={ENGLISH.edit_lesson_name}
            onMouseDown={(event) => event.preventDefault()}
            onClick={start_edit}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20h4.2L19.4 8.8a1.8 1.8 0 0 0 0-2.5l-1.7-1.7a1.8 1.8 0 0 0-2.5 0L4 15.8V20Z" />
              <path d="M13.8 6.2 17.8 10.2" />
            </svg>
          </button> :
          null}
      </header>

      <div className="ccm_peek_tabs" role="tablist">
        {[
        { id: "overview", label: ENGLISH.overview },
        { id: "items", label: ENGLISH.items(count) },
        { id: "feedback", label: ENGLISH.feedback_2(summary.count) }].
        map((item) =>
        <button
          key={item.id}
          type="button"
          role="tab"
          className={tab === item.id ? "is_on" : undefined}
          onClick={() => on_tab(item.id)}>
          
            {item.label}
          </button>
        )}
      </div>

      <div className="ccm_peek_body">
        {tab === "overview" ?
        <>
            <section className="ccm_peek_block">
              <div className="ccm_peek_label">
                <h3>{ENGLISH.description}</h3>
                {can_edit ?
              <button type="button" className="ccm_textbtn" onClick={on_edit}>{ENGLISH.edit}</button> :
              null}
              </div>
              <p><Link_Text text={lesson.lesson_description || ENGLISH.no_description_yet} /></p>
            </section>
            <div className="ccm_peek_facts">
              <div>
                <div className="ccm_peek_label">
                  <span>{ENGLISH.duration}</span>
                  {can_edit ?
                <button type="button" className="ccm_textbtn" onClick={on_edit}>{ENGLISH.edit}</button> :
                null}
                </div>
                <b>{format_minutes(lesson.duration_minutes) || "—"}</b>
              </div>
              <div>
                <span>{ENGLISH.status}</span>
                <b>
                  <span className={lesson.is_active ? "ccm_pill is_on" : "ccm_pill"}>
                    {lesson.is_active ? ENGLISH.published : ENGLISH.draft}
                  </span>
                </b>
              </div>
              <div>
                <span>{ENGLISH.created_on}</span>
                <b>{format_date(lesson.created_at)}</b>
              </div>
            </div>
          </> :
        null}

        {tab === "overview" || tab === "items" ?
        <section className="ccm_peek_items">
            <div className="ccm_peek_label">
              <h3>{ENGLISH.items_in_this_lesson}</h3>
            </div>
            {items.length ?
          items.map((item) =>
          <div key={item.content_id} className="ccm_peek_item">
                  <button type="button" className="ccm_peek_open" onClick={() => on_preview(item)}>
                    <span className={`ccm_item_mark ccm_item_mark_${item.content_type.toLowerCase()}`}>
                      {item_icon(item.content_type)}
                    </span>
                    <span>
                      <b>{String(item.content_type || "") === ENGLISH.overview ?
                        <Link_Text text={String(item.content_description || ENGLISH.overview).trim() || ENGLISH.overview} /> :
                        item.content_title || ENGLISH.untitled}</b>
                      <small>{item_hint(item)}</small>
                    </span>
                  </button>
                  {can_edit ?
            <Action_Button label={ENGLISH.delete_item} tone="danger" onClick={() => on_delete_item(item)}>
                      <Trash_Icon />
                    </Action_Button> :
            null}
                </div>
          ) :

          <p>{ENGLISH.no_items_yet}</p>
          }
            {can_edit ? <Add_Type_Bar on_pick={on_add_item} /> : null}
          </section> :
        null}

        {tab === "feedback" ?
        <section className="ccm_fb">
            <div className="ccm_fb_summary">
              <div>
                <span>{ENGLISH.average}</span>
                <b>
                  <Stars value={Math.round(summary.average)} />
                  {summary.count ? ` ${summary.average}/5` : " —"}
                </b>
              </div>
              <div>
                <span>{ENGLISH.responses}</span>
                <b>{summary.count}</b>
              </div>
            </div>
            {feedback_loading ?
          <p>{ENGLISH.loading_feedback}</p> :
          rows.length ?
          rows.map((row) =>
          <article key={row.feedback_id} className="ccm_fb_row">
                  <header>
                    <strong>{row.email || "—"}</strong>
                    <Stars value={row.rating} />
                  </header>
                  {row.quiz_title ? <small>{row.quiz_title}</small> : null}
                  <p>{row.remarks || ENGLISH.no_remarks}</p>
                </article>
          ) :

          <p>{ENGLISH.no_student_feedback_for_this_lesson_yet}</p>
          }
          </section> :
        null}
      </div>

      {can_edit ?
      <footer className="ccm_peek_foot">
          <button type="button" className="ccm_danger" onClick={on_delete}>
            {COPY.deleteLesson}
          </button>
        </footer> :
      null}
    </aside>);

}
