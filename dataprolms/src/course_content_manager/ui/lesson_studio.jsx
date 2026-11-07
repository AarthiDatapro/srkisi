import { useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import { createPortal } from "react-dom";
import { ActionButton, TrashIcon, ViewIcon } from "@datapromr/action-button";
import { format_minutes, item_hint } from "../utils.js";
import { Coding_Exercise } from "./coding_card.jsx";
import {
  Announcement_Icon,
  Cap_Icon,
  Clock_Icon,
  Code_Icon,
  File_Icon,
  Notes_Icon,
  Overview_Icon,
  Pdf_Icon,
  Pencil_Icon,
  People_Icon,
  Plus_Icon,
  Question_Icon,
  Quiz_Icon,
  Settings_Icon,
  Trash_Icon,
  Video_Icon
} from "./icons.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";
const PANES = [
  { id: "board", get label() { return ENGLISH.overview; }, get short() { return ENGLISH.overview; }, icon: Overview_Icon, tone: "overview" },
  { id: "video", get label() { return ENGLISH.video; }, get short() { return ENGLISH.video; }, icon: Video_Icon, tone: "video" },
  { id: "notes", get label() { return ENGLISH.notes; }, get short() { return ENGLISH.notes; }, icon: Notes_Icon, tone: "notes" },
  { id: "material", get label() { return ENGLISH.materials; }, get short() { return ENGLISH.files; }, icon: Pdf_Icon, tone: "material" },
  { id: "quiz", get label() { return ENGLISH.quiz; }, get short() { return ENGLISH.quiz; }, icon: Quiz_Icon, tone: "quiz" },
  { id: "coding", get label() { return ENGLISH.coding_questions; }, get short() { return ENGLISH.code; }, icon: Code_Icon, tone: "coding" },
  { id: "settings", get label() { return ENGLISH.settings; }, get short() { return ENGLISH.settings; }, icon: Settings_Icon, tone: "settings" }
];

function of_type(items, type) {
  return (items || []).filter((item) => String(item.content_type || "").toLowerCase() === type);
}

function count_label(total, one, many) {
  return `${total} ${total === 1 ? one : many}`;
}

function plain_label(value) {
  return String(value || "").replace(/[A-Za-z][A-Za-z']*/g, (word) => {
    if (word !== word.toUpperCase()) return word;
    return word.charAt(0) + word.slice(1).toLowerCase();
  });
}

function code_file_name(set) {
  const title = String(set?.set_title || "exercise").trim() || "exercise";
  const language = String(set?.language || "").toLowerCase();
  const ext = language === "python" ? ".py" : /^(node|javascript|js)$/.test(language) ? ".js" : "";
  if (ext && title.toLowerCase().endsWith(ext)) return title;
  return `${title}${ext}`;
}

function quiz_meta(quiz) {
  const generated = Number(quiz?.question_count || 0);
  const shown = Number(quiz?.questions_shown || 0);
  if (generated && shown && shown !== generated) return ENGLISH.shown_of(shown, generated);
  if (generated) return count_label(generated, "question", "questions");
  return ENGLISH.quiz;
}

function unit_word(count, unit) {
  if (count === 1) return unit;
  if (unit === "quiz") return "quizzes";
  return `${unit}s`;
}

function Studio_Tile({ tone, icon, title, count, unit, on_open }) {
  const ready = count > 0;
  return (
    <button type="button" className={ready ? `ccm_lane is_${tone} is_ready` : `ccm_lane is_${tone}`} onClick={on_open}>
      <span className="ccm_lane_icon">{icon}</span>
      <span className="ccm_lane_copy">
        <strong>{title}</strong>
        <small>{ready ? `${count} ${unit_word(count, unit)}` : ENGLISH.nothing_here_yet}</small>
      </span>
      <b>{count}</b>
      <span className="ccm_lane_go" aria-hidden="true">›</span>
    </button>
  );
}

export function Lesson_Studio({
  lesson,
  items = [],
  quizzes = [],
  coding_sets = [],
  can_edit = true,
  reordering = false,
  is_done = false,
  on_add_item,
  on_edit_overview,
  on_preview,
  on_delete_item,
  on_edit_quiz,
  on_delete_quiz,
  on_add_quiz,
  on_add_coding,
  on_delete_coding,
  on_mark_done,
  on_edit_lesson,
  on_delete_lesson,
  module_title = "",
  lesson_no = 0,
  class_label = ""
}) {
  const [pane, set_pane] = useState("board");
  const [ask_delete, set_ask_delete] = useState(false);
  const videos = of_type(items, "video");
  const notes = of_type(items, "notes");
  const materials = of_type(items, "material");
  const overviews = of_type(items, "overview");
  const announcements = of_type(items, "announcement");
  const overview = overviews[0] || null;
  const editable = can_edit && !reordering;
  const exercise_total = coding_sets.reduce(
    (sum, set) => sum + ((set.exercises || []).length || Number(set.exercise_count || 0)),
    0
  );

  function add_type(type, notes_language) {
    on_add_item?.(lesson, type, notes_language);
  }

  return (
    <div className="ccm_studio">
      <div className="ccm_studio_tabs" role="tablist">
        {PANES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={pane === item.id ? `is_on is_${item.tone}` : `is_${item.tone}`}
              aria-label={item.label}
              aria-selected={pane === item.id}
              onClick={() => set_pane(item.id)}>
              <span className="ccm_studio_tab_icon"><Icon /></span>
              <span className="ccm_studio_tab_full">{item.label}</span>
              <span className="ccm_studio_tab_short">{item.short}</span>
            </button>
          );
        })}
      </div>

      {pane === "board" ?
        <div className="ccm_studio_board">
          <article className={overview ? "ccm_board_hero is_set" : "ccm_board_hero"}>
            <p className="ccm_board_body">
              <Link_Text text={overview?.content_description || ENGLISH.no_overview_yet} />
            </p>
            <div className="ccm_board_tools">
              {on_mark_done ?
                <button
                  type="button"
                  className={is_done ? "ccm_switch is_on" : "ccm_switch"}
                  aria-pressed={is_done}
                  title={class_label || ENGLISH.mark_taught}
                  disabled={!can_edit}
                  onClick={() => on_mark_done(lesson)}>
                  <span>{is_done ? ENGLISH.taught : ENGLISH.not_taught}</span>
                  <i />
                </button> :
                null}
              {editable ?
                <button
                  type="button"
                  className="ccm_board_edit"
                  aria-label={overview ? ENGLISH.edit_overview : ENGLISH.add_overview}
                  onClick={() => overview ? on_edit_overview?.(lesson, overview) : add_type(ENGLISH.overview)}>
                  {overview ? <Pencil_Icon /> : <Plus_Icon />}
                </button> :
                null}
            </div>
          </article>

          <ul className="ccm_stage_metrics" aria-label={ENGLISH.lesson_summary}>
            <li className="is_time">
              <span className="ccm_stage_metric_icon" aria-hidden="true">
                <Clock_Icon />
              </span>
              <div className="ccm_stage_metric_copy">
                <b>{lesson.duration_minutes ? format_minutes(lesson.duration_minutes) : "–"}</b>
                <span>{ENGLISH.time}</span>
              </div>
              <i className="ccm_stage_metric_accent" aria-hidden="true" />
            </li>
            <li className="is_items">
              <span className="ccm_stage_metric_icon" aria-hidden="true">
                <File_Icon />
              </span>
              <div className="ccm_stage_metric_copy">
                <b>{items.length}</b>
                <span>{ENGLISH.items_2}</span>
              </div>
              <i className="ccm_stage_metric_accent" aria-hidden="true" />
            </li>
            <li className="is_quiz">
              <span className="ccm_stage_metric_icon" aria-hidden="true">
                <Quiz_Icon />
              </span>
              <div className="ccm_stage_metric_copy">
                <b>{quizzes.length}</b>
                <span>{ENGLISH.quizzes}</span>
              </div>
              <i className="ccm_stage_metric_accent" aria-hidden="true" />
            </li>
            <li className="is_coding">
              <span className="ccm_stage_metric_icon" aria-hidden="true">
                <Code_Icon />
              </span>
              <div className="ccm_stage_metric_copy">
                <b>{exercise_total}</b>
                <span>{ENGLISH.coding_2}</span>
              </div>
              <i className="ccm_stage_metric_accent" aria-hidden="true" />
            </li>
          </ul>

          <div className="ccm_stage_lane">
            <Studio_Tile
              tone="video"
              icon={<Video_Icon />}
              title={ENGLISH.lecture_video}
              count={videos.length}
              unit="video"
              on_open={() => set_pane("video")} />
            <Studio_Tile
              tone="notes"
              icon={<Notes_Icon />}
              title={ENGLISH.notes}
              count={notes.length}
              unit="note"
              on_open={() => set_pane("notes")} />
            <Studio_Tile
              tone="material"
              icon={<Pdf_Icon />}
              title={ENGLISH.study_materials}
              count={materials.length}
              unit="file"
              on_open={() => set_pane("material")} />
            <Studio_Tile
              tone="quiz"
              icon={<Quiz_Icon />}
              title={ENGLISH.quiz}
              count={quizzes.length}
              unit="quiz"
              on_open={() => set_pane("quiz")} />
            <Studio_Tile
              tone="coding"
              icon={<Code_Icon />}
              title={ENGLISH.coding_questions_2}
              count={exercise_total}
              unit="question"
              on_open={() => set_pane("coding")} />
          </div>
        </div> :
        null}

      {pane === "video" ?
        <Media_Board
          videos={videos}
          announcements={announcements}
          editable={editable}
          on_add_video={() => add_type(ENGLISH.video)}
          on_add_announcement={() => add_type(ENGLISH.announcement)}
          on_preview={on_preview}
          on_delete={on_delete_item} /> :
        null}
      {pane === "notes" ?
        <div className="ccm_media">
          <Media_Card
            tone="notes"
            icon={<Notes_Icon />}
            title={ENGLISH.english_notes}
            count={notes.filter(has_english_notes).length}
            one="pack"
            many="packs"
            add_label={notes.some(has_english_notes) ? ENGLISH.replace_english : ENGLISH.add_english}
            empty={ENGLISH.no_english_notes_yet}
            items={notes.filter(has_english_notes)}
            detail_of={(item) => item.file_name || ENGLISH.english_zip}
            editable={editable}
            on_add={() => add_type(ENGLISH.notes, "english")}
            on_preview={on_preview}
            on_delete={on_delete_item} />
          <Media_Card
            tone="notes"
            icon={<Notes_Icon />}
            title={ENGLISH.telugu_notes}
            count={notes.filter(has_telugu_notes).length}
            one="pack"
            many="packs"
            add_label={ENGLISH.add_telugu}
            empty={ENGLISH.no_telugu_notes_yet}
            items={notes.filter(has_telugu_notes)}
            detail_of={(item) => item.telugu_file_name || ENGLISH.telugu_zip}
            editable={editable}
            on_add={() => add_type(ENGLISH.notes, "telugu")}
            on_preview={on_preview}
            on_delete={on_delete_item} />
        </div> :
        null}
      {pane === "material" ?
        <div className="ccm_media is_one">
          <Media_Card
            tone="material"
            icon={<Pdf_Icon />}
            title={ENGLISH.study_materials}
            count={materials.length}
            one="file"
            many="files"
            add_label={ENGLISH.add_material}
            empty={ENGLISH.no_materials_yet}
            items={materials}
            editable={editable}
            on_add={() => add_type(ENGLISH.material)}
            on_preview={on_preview}
            on_delete={on_delete_item} />
        </div> :
        null}
      {pane === "quiz" ?
        <section className="ccm_media_card is_quiz">
          <header className="ccm_media_head">
            <span className="ccm_media_mark"><Quiz_Icon /></span>
            <div>
              <h3>{ENGLISH.quiz}</h3>
              <p>{quizzes.length ? count_label(quizzes.length, "quiz", "quizzes") : ENGLISH.nothing_here_yet}</p>
            </div>
            {editable && on_add_quiz ?
              <button type="button" className="ccm_media_add" onClick={on_add_quiz}>
                <Plus_Icon />{ENGLISH.add_quiz_2}</button> :
              null}
          </header>
          {quizzes.length ?
            <ul className="ccm_media_list">
              {quizzes.map((quiz) =>
                <li key={quiz.quiz_id} className="ccm_media_clip">
                  <span className="ccm_media_play"><Quiz_Icon /></span>
                  <button type="button" className="ccm_media_copy" onClick={() => on_edit_quiz?.(quiz)}>
                    <b>{quiz.quiz_title || ENGLISH.quiz}</b>
                    <small>{quiz_meta(quiz)}</small>
                  </button>
                  <span className={quiz.is_published !== false ? "ccm_media_state is_on" : "ccm_media_state"}>
                    {quiz.is_published !== false ? ENGLISH.published : ENGLISH.draft}
                  </span>
                  {editable ?
                    <span className="ccm_media_tools">
                      <button type="button" className="ccm_media_edit" onClick={() => on_edit_quiz?.(quiz)}>{ENGLISH.edit}</button>
                      <ActionButton label={ENGLISH.delete_quiz} tone="danger" onClick={() => on_delete_quiz?.(quiz)}>
                        <TrashIcon />
                      </ActionButton>
                    </span> :
                    null}
                </li>
              )}
            </ul> :
            <p className="ccm_media_empty">{ENGLISH.no_quizzes_on_this_lesson_yet}</p>}
        </section> :
        null}

      {pane === "coding" ?
        <section className="ccm_media_card is_coding">
          <header className="ccm_media_head">
            <span className="ccm_media_mark"><Code_Icon /></span>
            <div>
              <h3>{ENGLISH.coding_questions_2}</h3>
              <p>{coding_sets.length ? count_label(coding_sets.length, "set", "sets") : ENGLISH.nothing_here_yet}</p>
            </div>
            {editable && on_add_coding ?
              <button type="button" className="ccm_media_add" onClick={on_add_coding}>
                <Plus_Icon />{ENGLISH.add_coding}</button> :
              null}
          </header>
          {coding_sets.length ?
            coding_sets.map((set, set_index) => {
              const exercises = set.exercises || [];
              const earlier = coding_sets.
                slice(0, set_index).
                reduce((total, item) => total + (item.exercises || []).length, 0);
              return (
                <article key={set.coding_set_id} className="ccm_editor">
                  <header className="ccm_editor_top">
                    <span className="ccm_editor_lights" aria-hidden="true"><i /><i /><i /></span>
                    <b>{code_file_name(set)}</b>
                    {set.language ? <em>{set.language}</em> : null}
                    {editable ?
                      <ActionButton label={ENGLISH.delete_coding_exercises} tone="danger" onClick={() => on_delete_coding?.(set)}>
                        <TrashIcon />
                      </ActionButton> :
                      null}
                  </header>
                  <div className="ccm_editor_sheet">
                    {exercises.length ?
                      exercises.map((exercise, exercise_index) =>
                        <Coding_Exercise
                          key={exercise.exercise_id}
                          exercise={exercise}
                          look="line"
                          number={earlier + exercise_index + 1} />
                      ) :
                      <p className="ccm_editor_wait">{ENGLISH.no_exercises_in_this_file_yet}</p>}
                  </div>
                </article>
              );
            }) :
            <p className="ccm_media_empty">{ENGLISH.no_coding_questions_on_this_lesson_yet}</p>}
        </section> :
        null}

      {pane === "settings" ?
        <section className="ccm_set">
          <header className="ccm_set_head">
            <div className="ccm_set_head_copy">
              <p className="ccm_set_crumb">
                <span>{module_title || ENGLISH.module}</span>
                <i aria-hidden="true" />
                <span>{lesson_no ? ENGLISH.lesson_4(lesson_no) : ENGLISH.lesson}</span>
              </p>
              <div className="ccm_set_title">
                <h3>{lesson.lesson_title}</h3>
                <em className={lesson.is_active ? "is_live" : ""}>
                  <i />
                  {lesson.is_active ? ENGLISH.published : ENGLISH.draft}
                </em>
              </div>
            </div>
            {editable ?
              <div className="ccm_set_bar">
                <button type="button" className="is_edit" onClick={() => on_edit_lesson?.(lesson)}>
                  <Pencil_Icon />{ENGLISH.edit_lesson_3}</button>
                <button type="button" className="is_danger" onClick={() => set_ask_delete(true)}>
                  <Trash_Icon />{ENGLISH.delete_lesson_2}</button>
              </div> :
              null}
          </header>
          <ul className="ccm_set_stats" aria-label={ENGLISH.lesson_summary}>
            <li className="is_time">
              <span className="ccm_set_stat_icon" aria-hidden="true"><Clock_Icon /></span>
              <div>
                <b>{lesson.duration_minutes ? format_minutes(lesson.duration_minutes) : "—"}</b>
                <small>{ENGLISH.time}</small>
              </div>
            </li>
            <li className="is_files">
              <span className="ccm_set_stat_icon" aria-hidden="true"><File_Icon /></span>
              <div>
                <b>{items.length}</b>
                <small>{ENGLISH.files}</small>
              </div>
            </li>
            <li className="is_quiz">
              <span className="ccm_set_stat_icon" aria-hidden="true"><Question_Icon /></span>
              <div>
                <b>{quizzes.length}</b>
                <small>{ENGLISH.quizzes}</small>
              </div>
            </li>
            <li className="is_code">
              <span className="ccm_set_stat_icon" aria-hidden="true"><Code_Icon /></span>
              <div>
                <b>{exercise_total}</b>
                <small>{ENGLISH.coding_2}</small>
              </div>
            </li>
            {on_mark_done ?
              <li className={is_done ? "is_taught" : "is_taught is_off"}>
                <span className="ccm_set_stat_icon" aria-hidden="true"><Cap_Icon /></span>
                <div>
                  <b>{is_done ? ENGLISH.yes : ENGLISH.no}</b>
                  <small>{ENGLISH.taught}</small>
                </div>
              </li> :
              null}
          </ul>
          {class_label ?
            <div className="ccm_set_class">
              <span className="ccm_set_class_icon" aria-hidden="true"><People_Icon /></span>
              <dl>
                {(() => {
                  const [batch, ...rest] = plain_label(class_label).split(" · ");
                  const program = rest.join(" · ");
                  return (
                    <>
                      <div>
                        <dt>{ENGLISH.batch}</dt>
                        <dd>{batch}</dd>
                      </div>
                      {program ?
                        <div>
                          <dt>{ENGLISH.program}</dt>
                          <dd>{program}</dd>
                        </div> :
                        null}
                    </>
                  );
                })()}
              </dl>
            </div> :
            null}
        </section> :
        null}
      {ask_delete ? createPortal(
        <div
          className="ccm_confirm_scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ccm_confirm_title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) set_ask_delete(false);
          }}>
          <div className="ccm_confirm">
            <h2 id="ccm_confirm_title">{ENGLISH.delete_this_lesson}</h2>
            <p>{ENGLISH.the_lesson_its_files_quizzes_and_coding_questions}</p>
            <div>
              <button type="button" onClick={() => set_ask_delete(false)}>{ENGLISH.not_now}</button>
              <button
                type="button"
                className="is_delete"
                onClick={() => {
                  set_ask_delete(false);
                  on_delete_lesson?.(lesson);
                }}>{ENGLISH.delete_lesson_3}</button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

function has_english_notes(item) {
  return Boolean(item.file_name || item.file_path || item.learning_json);
}

function has_telugu_notes(item) {
  return Boolean(item.telugu_file_name || item.telugu_file_path || item.telugu_learning_json);
}

function clip_line(item) {
  const type = String(item.content_type || "").toLowerCase();
  const text = String(item.content_description || "").replace(/\s+/g, " ").trim();
  if (type === "announcement" && text) return text.length > 110 ? `${text.slice(0, 110)}…` : text;
  return item_hint(item);
}

function Media_Board({
  videos,
  announcements,
  editable,
  on_add_video,
  on_add_announcement,
  on_preview,
  on_delete
}) {
  return (
    <div className="ccm_media">
      <Media_Card
        tone="video"
        icon={<Video_Icon />}
        title={ENGLISH.lecture_video}
        count={videos.length}
        one="video"
        many="videos"
        add_label={ENGLISH.add_video}
        empty={ENGLISH.no_lecture_video_yet}
        items={videos}
        editable={editable}
        on_add={on_add_video}
        on_preview={on_preview}
        on_delete={on_delete} />
      <Media_Card
        tone="announce"
        icon={<Announcement_Icon />}
        title={ENGLISH.announcements}
        count={announcements.length}
        one="note"
        many="notes"
        add_label={ENGLISH.add_announcement}
        empty={ENGLISH.no_announcements_yet}
        items={announcements}
        editable={editable}
        on_add={on_add_announcement}
        on_preview={on_preview}
        on_delete={on_delete} />
    </div>
  );
}

function Media_Card({
  tone,
  icon,
  title,
  count,
  one,
  many,
  add_label,
  empty,
  items,
  detail_of,
  editable,
  on_add,
  on_preview,
  on_delete
}) {
  return (
    <section className={`ccm_media_card is_${tone}`}>
      <header className="ccm_media_head">
        <span className="ccm_media_mark">{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{count ? count_label(count, one, many) : ENGLISH.nothing_here_yet}</p>
        </div>
        {editable ?
          <button type="button" className="ccm_media_add" onClick={on_add}>
            <Plus_Icon />
            {add_label}
          </button> :
          null}
      </header>
      {items.length ?
        <ul className="ccm_media_list">
          {items.map((item) => {
            const type = String(item.content_type || "").toLowerCase();
            const can_preview = type !== "announcement" && type !== "notes" && Boolean(
              item.content_url || item.file_path || item.content_description
            );
            return (
              <li key={item.content_id} className="ccm_media_clip">
                <span className="ccm_media_play">{icon}</span>
                <div className="ccm_media_copy">
                  {tone === "announce" ?
                    <b><Link_Text text={String(item.content_description || item.content_title || ENGLISH.untitled).trim()} /></b> :
                    <>
                      <b>{item.content_title || ENGLISH.untitled}</b>
                      <small>{detail_of ? detail_of(item) : clip_line(item)}</small>
                    </>}
                </div>
                <span className="ccm_media_tools">
                  {can_preview ?
                    <ActionButton label={ENGLISH.preview} onClick={() => on_preview?.(item)}>
                      <ViewIcon />
                    </ActionButton> :
                    null}
                  {editable ?
                    <ActionButton label={ENGLISH.label_delete} tone="danger" onClick={() => on_delete?.(item)}>
                      <TrashIcon />
                    </ActionButton> :
                    null}
                </span>
              </li>
            );
          })}
        </ul> :
        <p className="ccm_media_empty">{empty}</p>}
    </section>
  );
}

