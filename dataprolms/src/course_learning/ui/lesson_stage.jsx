import { Tabs } from "@datapromr/tabs";
import { Link_Text } from "../../design_system/link_text.jsx";
import { COPY, TABS } from "../constants.js";
import {
  announcement_items,
  default_lesson_tab,
  file_kind,
  has_playable_video,
  note_html_pages,
  overview_items,
  video_source
} from "../utils.js";
import { Coding_Workspace } from "./coding_workspace.jsx";
import { Feedback_Pane } from "./feedback_pane.jsx";
import { File_Type_Mark } from "./file_marks.jsx";
import { Check_Icon, Download_Icon } from "./icons.jsx";
import { Help_Fab, Interview_Fab } from "./lesson_aside.jsx";
import { Notes_Viewer } from "./notes_viewer.jsx";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../../constants/english/course_learning_constants_english.js";

function Player_Frame({ title, children, page }) {
  return (
    <div className="lrn_player">
      <div className={page ? "lrn_player_frame is_page" : "lrn_player_frame"} aria-label={title}>
        {children}
      </div>
    </div>
  );
}

function Player({ source }) {
  if (source.kind === "youtube") {
    return (
      <Player_Frame title={source.title}>
        <iframe
          title={source.title}
          src={`https://www.youtube.com/embed/${source.src}`}
          allow={ENGLISH.accelerometer_autoplay_clipboard_write_encrypted_media_gyroscope_pictu}
          allowFullScreen />
      </Player_Frame>
    );
  }
  if (source.kind === "embed") {
    return (
      <Player_Frame title={source.title} page={source.page}>
        <iframe
          title={source.title}
          src={source.src}
          allow={ENGLISH.autoplay_encrypted_media_fullscreen}
          allowFullScreen />
      </Player_Frame>
    );
  }
  if (source.kind === "file" || source.kind === "url") {
    return (
      <Player_Frame title={source.title}>
        <video controls src={source.src} />
      </Player_Frame>
    );
  }
  return null;
}

function Note_Body({ text }) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const blocks = [];
  let bullets = [];

  function flush() {
    if (!bullets.length) return;
    blocks.push({ type: "ul", items: bullets });
    bullets = [];
  }

  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
    } else {
      flush();
      blocks.push({ type: "p", text: line });
    }
  }
  flush();

  return blocks.map((block, index) =>
    block.type === "ul" ? (
      <ul key={index}>
        {block.items.map((item, item_index) => (
          <li key={item_index}><Link_Text text={item} /></li>
        ))}
      </ul>
    ) : (
      <p key={index}><Link_Text text={block.text} /></p>
    )
  );
}

function file_face(kind) {
  return {
    pdf: "PDF",
    get doc() { return ENGLISH.document; },
    get ppt() { return ENGLISH.slides; },
    get xls() { return ENGLISH.sheet; },
    get zip() { return ENGLISH.archive; },
    get img() { return ENGLISH.image; },
    get vid() { return ENGLISH.video; },
    file: ENGLISH.file
  }[kind] || ENGLISH.file;
}

function Content_Blocks({ items, empty, download_label }) {
  if (!items.length) return empty ? <p>{empty}</p> : null;
  return items.map((item) => {
    const href = item.file_path || item.content_url;
    const label = download_label || item.file_name || (item.content_url ? ENGLISH.open_link : ENGLISH.download);
    return (
      <article key={item.content_id} className="lrn_note">
        {["announcement", "overview"].includes(String(item.content_type || "").toLowerCase()) ? null :
        item.content_title ? <h4>{item.content_title}</h4> : null}
        <Note_Body text={item.content_description} />
        {href ? (
          <a className="lrn_download" href={href} target="_blank" rel="noreferrer">
            <Download_Icon /> {label}
          </a>
        ) : null}
      </article>
    );
  });
}

function announcement_rows(items) {
  return (items || [])
    .map((item) => ({
      id: item.content_id,
      message: String(item.content_description || item.content_title || "").trim()
    }))
    .filter((row) => row.message);
}

function Announcement_Rows({ items }) {
  const rows = announcement_rows(items);
  if (!rows.length) return <p className="lrn_board_empty">{COPY.announcementsEmpty}</p>;

  return (
    <ul className="lrn_board">
      {rows.map((row, index) => (
        <li key={row.id || index} className={`is_${index % 3}`}>
          <File_Type_Mark kind="announcements" />
          <p><Link_Text text={row.message} /></p>
        </li>
      ))}
    </ul>
  );
}

function Horn_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 10v4h2.2L14 18V6L7.2 10H5Z" fill="currentColor" />
      <path d="M16.2 9.2a3.2 3.2 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Person_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 18.2c1.2-2.2 3.1-3.3 5.5-3.3s4.3 1.1 5.5 3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function announcement_when(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day = date.toDateString() === now.toDateString() ?
    ENGLISH.today :
    date.toDateString() === yesterday.toDateString() ?
      ENGLISH.yesterday :
      date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

function Watch_Announcements({ items }) {
  const rows = (items || [])
    .map((item) => ({
      id: item.content_id,
      message: String(item.content_description || item.content_title || "").trim(),
      when: announcement_when(item.created_at),
      at: new Date(item.created_at).getTime()
    }))
    .filter((row) => row.message);
  const newest = rows.reduce((best, row) => {
    if (!best) return row;
    if (!Number.isFinite(row.at)) return best;
    if (!Number.isFinite(best.at) || row.at > best.at) return row;
    return best;
  }, null);

  return (
    <aside className="lrn_announce" aria-label={ENGLISH.announcements}>
      <header className="lrn_announce_head">
        <span className="lrn_announce_horn"><Horn_Icon /></span>
        <strong>{ENGLISH.announcements}</strong>
        <em>{rows.length}</em>
      </header>
      <div className="lrn_announce_roll">
        {rows.length ?
          rows.map((row) => (
            <article key={row.id} className="lrn_announce_card">
              <header>
                <File_Type_Mark kind="announcements" />
                <div>
                  <b>{ENGLISH.class_update}</b>
                  {row.when ? <small>{row.when}</small> : null}
                </div>
                {row.id === newest?.id ? <i>{ENGLISH.label_new}</i> : null}
              </header>
              <p><Link_Text text={row.message} /></p>
              <footer>
                <Person_Icon />{ENGLISH.posted_by_instructor}</footer>
            </article>
          )) :
          <p className="lrn_announce_empty">{ENGLISH.no_announcements_yet}</p>}
      </div>
    </aside>
  );
}

function Resources_Kit({ description, overview, materials, has_overview_copy }) {
  const files = materials || [];
  const show_line = Boolean(String(description || "").trim());
  const show_card = show_line || overview.length > 0;

  if (!has_overview_copy && !files.length) {
    return <p className="lrn_kit_empty">{COPY.resourcesEmpty}</p>;
  }

  return (
    <section className="lrn_kit">
      {show_card ? (
        <article className="lrn_kit_card">
          {show_line ? (
            <div className="lrn_kit_line">
              <Note_Body text={description} />
            </div>
          ) : null}
          {overview.length ? (
            <div className="lrn_kit_extra">
              <Content_Blocks items={overview} />
            </div>
          ) : null}
        </article>
      ) : null}
      {files.length ? (
        <ul className="lrn_kit_files">
          {files.map((file, index) => {
            const kind = file.kind || file_kind(file.fileName || file.name, file.href);
            const title = file.name || COPY.downloadMaterial;
            const face = file_face(kind);
            return (
              <li key={`${file.href}-${index}`}>
                <a
                  className={`lrn_slip is_${kind}`}
                  href={file.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={ENGLISH.open(face, title)}>
                  <File_Type_Mark kind={kind} />
                  <span className="lrn_slip_copy">
                    <small>{face}</small>
                    <b>{title}</b>
                  </span>
                  <span className="lrn_slip_go" aria-hidden="true">
                    <svg viewBox="0 0 16 16">
                      <path d="M3.5 8h9M8.5 4.2 12.3 8 8.5 11.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export function Lesson_Stage({
  course,
  registration_id = null,
  module_title,
  lesson_no = 0,
  lesson,
  content_loading = false,
  tab,
  feedback_required = false,
  can_prev,
  can_next,
  materials,
  on_tab,
  on_prev,
  on_next,
  on_complete,
  on_feedback,
  on_ask,
  on_interview,
  on_open_content,
  saving_feedback,
  feedback_questions = []
}) {
  const overview = overview_items(lesson);
  const has_practice = (lesson.coding_sets || []).some((set) => (set.exercises || []).length);
  const has_overview_copy = Boolean(lesson.lesson_description) || overview.length > 0;
  const announcements = announcement_items(lesson);
  const media = video_source(lesson);
  const show_video = has_playable_video(media);
  const active_tab = feedback_required
    ? "feedback"
    : TABS.some((item) => item.id === tab)
      ? tab
      : default_lesson_tab(lesson);
  const topic_title = lesson_no ?
  ENGLISH.lesson_2(lesson_no, lesson.lesson_title) :
  lesson.lesson_title;

  return (
    <div className={feedback_required ? "lrn_stage is_feedback_lock" : "lrn_stage"}>
      <div className="lrn_stage_main">
        <div className="lrn_crumb">
          <div className="lrn_crumb_lead">
            <button
              type="button"
              className="lrn_crumb_toggle"
              onClick={on_open_content}
              aria-haspopup="dialog"
              aria-expanded={false}
              aria-label={ENGLISH.course_content_2(course?.course_name || "", module_title ? ` > ${module_title}` : "", topic_title)}>
              <span className="lrn_crumb_path">
                {course?.course_name}
                {module_title ? (
                  <>
                    <span>&gt;</span> {module_title}
                  </>
                ) : null}
                <span>&gt;</span>{" "}
              </span>
              <b className="lrn_crumb_now">
                {module_title ? <span className="lrn_crumb_mod">{module_title}</span> : null}
                {module_title ? <span className="lrn_crumb_sep">·</span> : null}
                {topic_title}
              </b>
            </button>
          </div>
          <div className="lrn_crumb_actions">
            <button type="button" className="lrn_ghost" disabled={!can_prev} onClick={() => on_prev()}>
              {COPY.previous}
            </button>
            <button type="button" className="lrn_ghost lrn_ghost_next" disabled={!can_next} onClick={() => on_next()}>
              {COPY.next}
            </button>
            <button
              type="button"
              className={lesson.is_completed ? "lrn_mark is_done" : "lrn_mark"}
              disabled={lesson.is_completed}
              onClick={on_complete}>
              <Check_Icon />
              <span className="lrn_mark_full">{lesson.is_completed ? COPY.completed : COPY.complete}</span>
              <span className="lrn_mark_short">{lesson.is_completed ? COPY.completed : ENGLISH.done}</span>
            </button>
          </div>
        </div>

        {show_video && !feedback_required ?
          <div className="lrn_watch">
            <Player source={media} />
            <Watch_Announcements items={announcements} />
          </div> :
          null}

        <Tabs
          className="lrn_tabs"
          items={TABS}
          value={active_tab}
          onChange={on_tab}
          aria-label={ENGLISH.lesson_sections} />

        <div className="lrn_stage_body">
          <section className="lrn_pane">
            {active_tab === "overview" ? (
              has_practice ?
                <Coding_Workspace
                  course_id={course?.course_id}
                  registration_id={registration_id}
                  sets={lesson.coding_sets} /> :
                <p>{COPY.practiceEmpty}</p>
            ) : null}
            {active_tab === "resources" ? (
              <Resources_Kit
                description={lesson.lesson_description}
                overview={overview}
                materials={materials}
                has_overview_copy={has_overview_copy} />
            ) : null}
            {active_tab === "notes" ?
            <Notes_Viewer
              loading={content_loading}
              english_pages={note_html_pages(lesson, "english")}
              telugu_pages={note_html_pages(lesson, "telugu")} /> :
            null}
            {active_tab === "announcements" ? (
              <Announcement_Rows items={announcements} />
            ) : null}
            {active_tab === "feedback" ? (
              <Feedback_Pane
                lesson={lesson}
                questions={feedback_questions}
                saving={saving_feedback}
                required={feedback_required}
                on_save={on_feedback} />
            ) : null}
          </section>
        </div>
      </div>
      {feedback_required ? null : active_tab === "overview" ?
        <Interview_Fab on_open={on_interview} /> :
        <Help_Fab on_ask={on_ask} />}
    </div>
  );
}
