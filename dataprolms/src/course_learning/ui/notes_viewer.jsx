import { useEffect, useRef, useState } from "react";
import { COPY } from "../constants.js";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../../constants/english/course_learning_constants_english.js";

function notes_srcdoc(html) {
  const fit = `<style>
    html, body { margin: 0; background: #ffffff; }
    img, video, canvas, svg, table { max-width: 100%; }
    img, video { height: auto; }
  </style>`;
  return ENGLISH.doctype_html_html_head_meta_charset_utf_8(html || "", fit);
}

function Notes_Frame({ html }) {
  const frame_ref = useRef(null);
  const fitting = useRef(false);

  function fit() {
    const frame = frame_ref.current;
    const doc = frame?.contentDocument;
    const body = doc?.body;
    if (!frame || !body || fitting.current) return;
    fitting.current = true;
    body.style.zoom = "1";
    const available = frame.clientWidth;
    const needed = doc.documentElement.scrollWidth;
    const scale = available > 0 && needed > available + 2 ? Math.max(available / needed, 0.45) : 1;
    body.style.zoom = String(scale);
    const height = Math.max(body.scrollHeight, doc.documentElement.scrollHeight);
    frame.style.height = `${Math.max(Math.ceil(height), 80)}px`;
    fitting.current = false;
  }

  function on_load() {
    const frame = frame_ref.current;
    const doc = frame?.contentDocument;
    frame?._lrn_fit?.disconnect();
    if (!frame || !doc?.documentElement) return;
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(doc.documentElement);
    if (frame.parentElement) observer.observe(frame.parentElement);
    frame._lrn_fit = observer;
    doc.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", fit, { once: true });
    });
  }

  useEffect(() => () => frame_ref.current?._lrn_fit?.disconnect(), []);

  return (
    <div className="lrn_notes_stage">
      <iframe
        ref={frame_ref}
        className="lrn_notes_frame"
        title={ENGLISH.notes}
        sandbox="allow-same-origin"
        srcDoc={notes_srcdoc(html)}
        onLoad={on_load} />
    </div>
  );
}

export function Notes_Viewer({ english_pages = [], telugu_pages = [], loading = false }) {
  const wrap_ref = useRef(null);
  const [language, set_language] = useState("english");
  const [index, set_index] = useState(0);
  const pages = language === "telugu" ? telugu_pages : english_pages;
  const stamp = (list) => list.map((page) => `${page.fileName || ""}:${page.title || ""}:${String(page.html || "").length}`).join("|");
  const lesson_key = `${stamp(english_pages)}::${stamp(telugu_pages)}`;

  useEffect(() => {
    set_index(0);
  }, [lesson_key]);

  const last = Math.max(pages.length - 1, 0);
  const safe = Math.min(Math.max(index, 0), last);

  useEffect(() => {
    if (!pages.length) return;
    wrap_ref.current?.scrollIntoView({ block: "start" });
  }, [pages.length, safe]);

  function language_switch() {
    return (
      <div className="lrn_notes_lang" role="tablist" aria-label={ENGLISH.notes_language}>
        <button
          type="button"
          role="tab"
          aria-selected={language === "english"}
          className={language === "english" ? "is_on" : undefined}
          onClick={() => set_language("english")}>
          {COPY.notesEnglish}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={language === "telugu"}
          className={language === "telugu" ? "is_on" : undefined}
          onClick={() => set_language("telugu")}>
          {COPY.notesTelugu}
        </button>
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="lrn_notes" ref={wrap_ref}>
        <div className="lrn_notes_bar">
          <div className="lrn_notes_where">{language_switch()}</div>
        </div>
        <p className="lrn_notes_empty">
          {loading ? COPY.notesLoading : language === "telugu" ? COPY.notesEmptyTelugu : COPY.notesEmpty}
        </p>
      </div>
    );
  }

  const page = pages[safe];

  function bar() {
    return (
      <div className="lrn_notes_bar">
        <button
          type="button"
          className="lrn_notes_step"
          disabled={safe <= 0}
          aria-label={COPY.previousPage}
          onClick={() => set_index(safe - 1)}>
          <span aria-hidden="true">←</span>
          <span className="lrn_notes_step_word">{COPY.previous}</span>
        </button>
        <div className="lrn_notes_where">
          {language_switch()}
          <p
            className="lrn_notes_mark"
            aria-label={`${COPY.topicOf} ${safe + 1} ${COPY.of} ${pages.length}`}>
            {safe + 1}/{pages.length}
          </p>
        </div>
        <button
          type="button"
          className="lrn_notes_step is_next"
          disabled={safe >= last}
          aria-label={COPY.nextPage}
          onClick={() => set_index(safe + 1)}>
          <span className="lrn_notes_step_word">{COPY.next}</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="lrn_notes" ref={wrap_ref}>
      {bar()}
      <Notes_Frame html={page.html || ""} />
    </div>
  );
}
