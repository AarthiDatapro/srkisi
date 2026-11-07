import { useState } from "react";
import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Drawer_Close } from "../../admin_ui/drawer_stage.jsx";
import { ITEM_TYPES, TEXT_TYPES } from "../constants.js";
import {
  Announcement_Icon,
  Link_Icon,
  Notes_Icon,
  Overview_Icon,
  Pdf_Icon,
  Upload_Icon,
  Video_Icon
} from "./icons.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

const TYPE_CARDS = {
  Video: {
    tone: "video",
    icon: Video_Icon,
    get kicker() { return ENGLISH.lesson_video; },
    get hint() { return ENGLISH.a_youtube_or_drive_link_or_a_video; },
    get link_label() { return ENGLISH.video_link; },
    get link_note() { return ENGLISH.youtube_vimeo_drive_or_any_public_url_for; },
    get file_title() { return ENGLISH.upload_a_video; },
    get file_note() { return ENGLISH.mp4_webm_or_another_video_file; },
    get empty() { return ENGLISH.choose_a_video; },
    accept: "video/*"
  },
  Material: {
    tone: "material",
    icon: Pdf_Icon,
    get kicker() { return ENGLISH.lesson_material; },
    get hint() { return ENGLISH.a_public_file_link_or_a_pdf_office; },
    get link_label() { return ENGLISH.file_link; },
    get link_note() { return ENGLISH.drive_dropbox_onedrive_or_any_public_url_pdf; },
    get file_title() { return ENGLISH.upload_a_file; },
    get file_note() { return ENGLISH.pdf_word_powerpoint_or_a_zip_of_html; },
    get empty() { return ENGLISH.choose_a_file; },
    accept: ".pdf,.doc,.docx,.ppt,.pptx,.zip,application/pdf,application/zip"
  },
  Notes: {
    tone: "notes",
    icon: Notes_Icon,
    get kicker() { return ENGLISH.html_notes; },
    get hint() { return ENGLISH.a_zip_of_html_files_only_images_may; },
    get file_title() { return ENGLISH.upload_the_notes_zip; },
    get file_note() { return ENGLISH.name_pages_01_loops_html_02_arrays_html; },
    get empty() { return ENGLISH.choose_a_zip; },
    accept: ".zip,application/zip,application/x-zip-compressed"
  },
  Overview: {
    tone: "overview",
    icon: Overview_Icon,
    get kicker() { return ENGLISH.lesson_overview; },
    get hint() { return ENGLISH.one_paragraph_students_read_this_before_the_lesson; },
    get body_label() { return ENGLISH.body; },
    get body_placeholder() { return ENGLISH.what_this_lesson_covers_in_a_few_lines; }
  },
  Announcement: {
    tone: "announcement",
    icon: Announcement_Icon,
    get kicker() { return ENGLISH.announcement; },
    get hint() { return ENGLISH.one_message_for_the_students_in_this_lesson; },
    get body_label() { return ENGLISH.message; },
    get body_placeholder() { return ENGLISH.what_students_should_know; }
  }
};

const WAYS = [
  { id: "link", get label() { return ENGLISH.online_link; }, get note() { return ENGLISH.paste_a_public_url; }, icon: Link_Icon },
  { id: "file", get label() { return ENGLISH.this_device; }, get note() { return ENGLISH.upload_from_here; }, icon: Upload_Icon }
];

export function Item_Form({ values, errors, file, loading, lock_type = false, on_change, on_file, on_submit }) {
  const [file_key, set_file_key] = useState(0);
  const type = values.content_type;
  const card = TYPE_CARDS[type] || TYPE_CARDS.Video;
  const Type_Icon = card.icon;
  const is_notes = type === ENGLISH.notes;
  const is_overview = type === ENGLISH.overview;
  const is_announcement = type === ENGLISH.announcement;
  const is_text = TEXT_TYPES.includes(type);
  const mode = is_notes || values.source_mode === "file" ? "file" : "link";
  const notes_language = values.notes_language === "telugu" ? "telugu" : "english";

  function update(event) {
    const { name, value } = event.target;
    on_change({ ...values, [name]: value });
  }

  function set_type(next) {
    on_change({
      ...values,
      content_type: next,
      source_mode: next === ENGLISH.notes ? "file" : "link",
      content_url: next === ENGLISH.notes || next === ENGLISH.overview || next === ENGLISH.announcement ? "" : values.content_url
    });
    on_file(null);
  }

  function set_mode(next) {
    on_change({ ...values, source_mode: next });
    if (next === "link") on_file(null);
  }

  function set_notes_language(next) {
    on_change({ ...values, notes_language: next === "telugu" ? "telugu" : "english" });
  }

  function pick_file(event) {
    on_file(event.target.files?.[0] || null);
  }

  function clear_file() {
    on_file(null);
    set_file_key((key) => key + 1);
  }

  return (
    <form
      className={`ccm_form ccm_item_form is_${card.tone}`}
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>

      <section className="ccm_item_stage">
        <span className="ccm_item_mark"><Type_Icon /></span>
        <div>
          <strong>{card.kicker}</strong>
          <p>{card.hint}</p>
        </div>
        <Drawer_Close />
      </section>

      {lock_type ? null :
      <div className="ccm_item_kinds" role="radiogroup" aria-label={ENGLISH.content_type}>
        {ITEM_TYPES.map((item) => {
          const kind = TYPE_CARDS[item];
          const Kind_Icon = kind.icon;
          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={type === item}
              className={type === item ? `is_on is_${kind.tone}` : `is_${kind.tone}`}
              onClick={() => set_type(item)}>
              <span><Kind_Icon /></span>
              {item}
            </button>
          );
        })}
      </div>}

      {is_announcement || is_overview ? null :
      <div className="ccm_item_card">
        <Input
          id="content_title"
          name="content_title"
          label={ENGLISH.title}
          required
          variant="outlined"
          value={values.content_title}
          error={errors.content_title}
          onChange={update} />
      </div>}

      {is_notes || is_overview || is_announcement ? null :
      <div className="ccm_item_ways" role="radiogroup" aria-label={ENGLISH.how_to_add_the_file}>
        {WAYS.map((way) => {
          const Way_Icon = way.icon;
          return (
            <button
              key={way.id}
              type="button"
              role="radio"
              aria-checked={mode === way.id}
              className={mode === way.id ? "is_on" : undefined}
              onClick={() => set_mode(way.id)}>
              <span><Way_Icon /></span>
              <strong>{way.label}</strong>
              <small>{way.note}</small>
            </button>
          );
        })}
      </div>}

      {is_overview || is_announcement ? null : is_notes ?
      <>
        <div className="ccm_item_langs" role="radiogroup" aria-label={ENGLISH.notes_language}>
          <button
            type="button"
            role="radio"
            aria-checked={notes_language === "english"}
            className={notes_language === "english" ? "is_on" : undefined}
            onClick={() => set_notes_language("english")}>
            <strong>{ENGLISH.english}</strong>
            <small>{ENGLISH.students_open_the_english_notes}</small>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={notes_language === "telugu"}
            className={notes_language === "telugu" ? "is_on" : undefined}
            onClick={() => set_notes_language("telugu")}>
            <strong>{ENGLISH.telugu}</strong>
            <small>{ENGLISH.students_open_the_telugu_notes}</small>
          </button>
        </div>
        <File_Drop
          file={file}
          file_key={file_key}
          title={card.file_title}
          note={notes_language === "telugu" ?
            ENGLISH.this_zip_is_saved_as_the_telugu_notes :
            ENGLISH.this_zip_is_saved_as_the_english_notes}
          empty={card.empty}
          accept={card.accept}
          error={errors.file}
          on_pick={pick_file}
          on_clear={clear_file} />
      </> :
      mode === "link" ?
      <div className="ccm_item_card">
        <Input
          id="content_url"
          name="content_url"
          label={card.link_label}
          variant="outlined"
          value={values.content_url}
          error={errors.content_url}
          onChange={update} />
        <p className="ccm_item_note">{card.link_note}</p>
      </div> :

      <File_Drop
        file={file}
        file_key={file_key}
        title={card.file_title}
        note={card.file_note}
        empty={card.empty}
        accept={card.accept}
        error={errors.file}
        on_pick={pick_file}
        on_clear={clear_file} />}

      {is_text || type === ENGLISH.material ?
      <label className="ccm_item_write">
        <span>{card.body_label || ENGLISH.description}</span>
        <textarea
          name="content_description"
          required={is_overview || is_announcement}
          placeholder={card.body_placeholder || ENGLISH.a_short_note_about_this_file}
          value={values.content_description}
          onChange={update} />
        {errors.content_description ? <em>{errors.content_description}</em> : null}
      </label> :
      null}

      <div className="ccm_item_go">
        <Button type="submit" loading={loading}>
          {lock_type ? ENGLISH.save_changes : ENGLISH.add(type.toLowerCase())}
        </Button>
      </div>
    </form>);
}

function File_Drop({ file, file_key, title, note, empty, accept, error, on_pick, on_clear }) {
  return (
    <div className={file ? "ccm_item_drop is_on" : "ccm_item_drop"}>
      <label>
        <input key={file_key} type="file" accept={accept} onChange={on_pick} />
        <span className="ccm_item_drop_mark"><Upload_Icon /></span>
        <strong>{file ? file.name : title}</strong>
        <small>{file ? ENGLISH.click_to_replace_this_file : empty}</small>
      </label>
      <p>{note}</p>
      {file ?
      <button type="button" onClick={on_clear}>{ENGLISH.remove_file}</button> :
      null}
      {error ? <em>{error}</em> : null}
    </div>
  );
}
