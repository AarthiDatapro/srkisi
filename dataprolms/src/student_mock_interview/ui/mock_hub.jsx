import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import robot_src from "../../assets/mock_interview_robot.svg";
import { delete_mock_interview, list_mock_interviews, retry_mock_interview } from "../api.js";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../../constants/english/student_mock_interview_constants_english.js";
import { Certificate_Download } from "./certificate_download.jsx";
import { Fresher_Quiz_Board } from "./fresher_quiz_board.jsx";
import { Mock_Question_Board } from "./mock_question_board.jsx";
import "../theme/fresher_round.css";
import "../theme/mock_hub.css";

const LANGUAGE_LABELS = {
  "en-IN": "English (India)",
  "hi-IN": "Hindi",
  "te-IN": "Telugu",
  "ta-IN": "Tamil",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "bn-IN": "Bengali",
  "gu-IN": "Gujarati",
  "pa-IN": "Punjabi"
};

function format_date(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" });
}

function level_label(value) {
  const level = String(value || "").trim().toLowerCase();
  if (level === "fresher") return ENGLISH.fresher_mode;
  if (level === "mid") return ENGLISH.mid_level_professional;
  if (level === "senior") return ENGLISH.senior_level_professional;
  return ENGLISH.not_selected;
}

function language_label(value) {
  const code = String(value || "").trim();
  if (!code) return ENGLISH.not_selected;
  return LANGUAGE_LABELS[code] || code;
}

function Progress_Dots({ answered, total, current }) {
  const count = Math.max(Number(total) || 0, Number(answered) || 0, 1);
  const dots = Array.from({ length: count }, (_, index) => index + 1);
  return (
    <div className="smi_hub_progress" aria-label={ENGLISH.answered_of(answered || 0, total || 0)}>
      {dots.map((number) => {
        const done = number <= (answered || 0);
        const on = number === (current || answered + 1);
        return (
          <i key={number} className="smi_hub_step">
            <span className={on ? "is_on" : done ? "is_done" : ""}>{number}</span>
          </i>
        );
      })}
    </div>
  );
}

function verdict_label(verdict) {
  if (verdict === "strong") return ENGLISH.strong_result;
  if (verdict === "fair") return ENGLISH.fair_result;
  if (verdict === "needs_practice") return ENGLISH.needs_practice;
  return "";
}

function timeline_mood(node) {
  if (node?.status !== "answered") return "lock";
  const sentiment = String(node.sentiment || "").toLowerCase();
  if (sentiment === "positive" || sentiment === "negative" || sentiment === "neutral" || sentiment === "mixed") {
    return sentiment;
  }
  const score = Number(node.score);
  if (Number.isFinite(score)) {
    if (score >= 7) return "positive";
    if (score < 4) return "negative";
  }
  return "neutral";
}

function Result_Timeline({ timeline }) {
  if (!timeline.length) return null;
  return (
    <div className="smi_hub_progress is_result" aria-label={ENGLISH.question}>
      {timeline.map((node) => {
        const mood = timeline_mood(node);
        return (
          <i key={node.question_number} className="smi_hub_step">
            <span className={`is_${mood}`}>{mood === "lock" ? "" : node.question_number}</span>
          </i>
        );
      })}
    </div>
  );
}

function score_percent(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value * 10));
}

function Score_Mark({ score, verdict, tone }) {
  return (
    <article className={`smi_hub_mark${tone ? ` is_${tone}` : ""}`}>
      <small>{ENGLISH.overall_score}</small>
      <div
        className="smi_hub_ring"
        style={{ "--smi-score": `${score_percent(score)}%` }}
        aria-label={`${ENGLISH.overall_score} ${score != null ? score : "—"}/10`}>
        <div>
          <b>{score != null ? score : "—"}</b>
          <span>/10</span>
        </div>
      </div>
      {verdict ? <em>{verdict}</em> : null}
    </article>
  );
}

function Result_Brief({ item }) {
  const result = item.result || {};
  const score = result.overall_score ?? item.overall_score;
  const topics = Array.isArray(result.topics) ? result.topics : [];
  const strengths = Array.isArray(result.strengths) ? result.strengths : [];
  const gaps = Array.isArray(result.gaps) ? result.gaps : [];
  const timeline = Array.isArray(result.timeline) ? result.timeline : [];
  const sentiment = result.sentiment || {};
  const verdict = verdict_label(result.verdict);
  return (
    <div className="smi_hub_result">
      <div className="smi_hub_stats">
        <Score_Mark score={score} verdict={verdict} tone={result.verdict} />
        <article className="smi_hub_stat">
          <small>{ENGLISH.topic_wise_performance}</small>
          {topics.length ?
            <ul className="smi_hub_meters">
              {topics.slice(0, 4).map((topic) =>
                <li key={topic.topic}>
                  <span>{topic.topic}</span>
                  <i><b style={{ width: `${Math.min(100, Math.round((Number(topic.average_score) || 0) * 10))}%` }} /></i>
                  <em>{topic.average_score != null ? topic.average_score : "—"}</em>
                </li>
              )}
            </ul> :
            <p className="smi_hub_result_empty">{ENGLISH.no_analysis_saved}</p>}
        </article>
        <article className="smi_hub_stat">
          <small>{ENGLISH.sentiment_analysis}</small>
          {sentiment.available ?
            <>
              <em className={`smi_hub_verdict is_${sentiment.overall_sentiment === "positive" ? "strong" : sentiment.overall_sentiment === "negative" ? "needs_practice" : "fair"}`}>
                {sentiment.overall_sentiment || ENGLISH.mixed}
              </em>
              <p className="smi_hub_stat_line">
                {sentiment.communication_score != null ? `${ENGLISH.communication} ${sentiment.communication_score}` : null}
                {sentiment.vocabulary_score != null ? ` · ${ENGLISH.vocabulary} ${sentiment.vocabulary_score}` : null}
              </p>
            </> :
            <p className="smi_hub_result_empty">{ENGLISH.sentiment_analysis_is_not_available_for_this_interview}</p>}
        </article>
      </div>
      <div className="smi_hub_result_split">
        <section className="is_good">
          <h4>{ENGLISH.strengths}</h4>
          <p>{strengths[0] || ENGLISH.no_strengths_captured_yet}</p>
        </section>
        <section className="is_gap">
          <h4>{ENGLISH.gaps}</h4>
          <p>{gaps[0] || ENGLISH.no_gaps_captured_yet}</p>
        </section>
      </div>
      <Result_Timeline timeline={timeline} />
    </div>
  );
}

function Interview_Card({ item, mode, menu_id, on_menu, on_resume, on_retry, on_delete, busy_id }) {
  const card_id = item.mock_interview_id;
  const [expanded, set_expanded] = useState(mode !== "completed");
  const open = menu_id === card_id;
  const fresher = item.kind === "fresher_quiz";
  const this_busy = busy_id === card_id;
  const any_busy = Boolean(busy_id);
  const completed = mode === "completed";
  const level = fresher ? (item.experience_level || "fresher") : item.experience_level;
  return (
    <article className={`smi_hub_card${fresher ? " is_quiz" : ""}${completed && !expanded ? " is_closed" : ""}`}>
      <div className="smi_hub_top">
        <div className="smi_hub_who">
          <strong>{item.target_role || ENGLISH.interview}</strong>
          <div className="smi_hub_chips">
            {fresher ? <span className="smi_hub_date">{ENGLISH.fresher_quiz_round}</span> : null}
            <span className="smi_hub_meta">{level_label(level)}</span>
            <span className="smi_hub_meta">{language_label(item.interview_language)}</span>
            {item.created_at ? <span className="smi_hub_date">{format_date(item.created_at)}</span> : null}
          </div>
        </div>
        <div className="smi_hub_actions">
          {mode === "ongoing" ?
            <button type="button" className="smi_hub_resume" disabled={any_busy} onClick={() => on_resume(item)}>
              {ENGLISH.resume_interview}
            </button> :
            <>
              {!fresher ?
                <Certificate_Download
                  mock_interview_id={item.mock_interview_id}
                  ready={item.certificate_ready}
                  locked={item.certificate_locked}
                  file_stem={item.target_role}
                  class_name="smi_hub_cert"
                  always /> :
                null}
              <button type="button" className="smi_hub_resume" disabled={any_busy} onClick={() => on_resume(item)}>
                {ENGLISH.view_report}
              </button>
              <button type="button" className="smi_hub_retry" disabled={any_busy} onClick={() => on_retry(item)}>
                {this_busy ? ENGLISH.starting_again : ENGLISH.try_for_this_again}
              </button>
            </>}
          {mode === "ongoing" ?
            <div className="smi_hub_menu">
              <button
                type="button"
                aria-label={ENGLISH.delete}
                aria-expanded={open}
                disabled={any_busy}
                onClick={() => on_menu(open ? null : card_id)}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
              {open ?
                <div className="smi_hub_menu_panel">
                  <button type="button" onClick={() => on_delete(item)}>{ENGLISH.delete}</button>
                </div> :
                null}
            </div> :
            null}
          {completed ?
            <button
              type="button"
              className={`smi_hub_fold${expanded ? " is_on" : ""}`}
              aria-expanded={expanded}
              aria-label={expanded ? ENGLISH.hide_details : ENGLISH.show_details}
              onClick={() => set_expanded((value) => !value)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button> :
            null}
        </div>
      </div>
      {mode === "ongoing" ?
        <Progress_Dots
          answered={item.answered}
          total={item.total_questions}
          current={item.question_number} /> :
        expanded ?
          <Result_Brief item={item} /> :
          null}
    </article>
  );
}

export function Mock_Hub({
  on_continue_fresher,
  on_continue_interview,
  on_reattempt,
  on_started,
  on_start_new,
  open_id,
  on_open_consumed
}) {
  const [tab, set_tab] = useState("ongoing");
  const [ongoing, set_ongoing] = useState([]);
  const [completed, set_completed] = useState([]);
  const [busy_id, set_busy_id] = useState(null);
  const [menu_id, set_menu_id] = useState(null);
  const [confirm, set_confirm] = useState(null);
  const [selected, set_selected] = useState(open_id ? { mock_interview_id: open_id } : null);
  const [error, set_error] = useState("");
  const [loading, set_loading] = useState(true);

  async function load() {
    set_loading(true);
    try {
      const payload = await list_mock_interviews();
      set_ongoing(payload.ongoing || []);
      set_completed(payload.completed || []);
      set_error("");
    } catch (err) {
      set_error(err.message);
    } finally {
      set_loading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open_id) return;
    set_selected({ mock_interview_id: open_id });
    on_open_consumed?.();
  }, [open_id, on_open_consumed]);

  async function retry(item) {
    const id = item.mock_interview_id;
    set_busy_id(id);
    set_error("");
    try {
      const payload = await retry_mock_interview(id);
      await on_started?.(payload.item);
      await load();
    } catch (err) {
      set_error(err.message);
    } finally {
      set_busy_id(null);
    }
  }

  async function remove() {
    if (!confirm) return;
    const id = confirm.mock_interview_id || confirm.attempt_id;
    set_busy_id(id);
    set_error("");
    try {
      await delete_mock_interview(id);
      set_confirm(null);
      set_menu_id(null);
      if (selected && (
        selected.mock_interview_id === confirm.mock_interview_id ||
        selected.attempt_id === confirm.attempt_id
      )) set_selected(null);
      await load();
    } catch (err) {
      set_error(err.message);
    } finally {
      set_busy_id(null);
    }
  }

  if (selected?.kind === "fresher_quiz") {
    return (
      <Fresher_Quiz_Board
        item={selected}
        on_back={() => set_selected(null)}
        on_continue={(item) => on_continue_fresher?.(item)} />
    );
  }

  if (selected) {
    return (
      <Mock_Question_Board
        mock_interview_id={selected.mock_interview_id}
        on_back={() => set_selected(null)}
        on_start_current={(item) => on_continue_interview?.(item?.mock_interview_id || selected.mock_interview_id)}
        on_reattempt={(item, question_number) => on_reattempt?.(item?.mock_interview_id || selected.mock_interview_id, question_number)} />
    );
  }

  const items = tab === "ongoing" ? ongoing : completed;

  return (
    <section className="smi_hub">
      <header className="smi_hub_head">
        <div className="smi_hub_brand">
          <h1>{ENGLISH.mock_interview_hub}</h1>
          <p>{ENGLISH.hub_subtitle}</p>
        </div>
        <nav className="smi_hub_tabs" aria-label={ENGLISH.mock_interview_hub}>
          <button type="button" className={tab === "ongoing" ? "is_on" : ""} onClick={() => set_tab("ongoing")}>
            {ENGLISH.ongoing}
            <em>{ongoing.length}</em>
          </button>
          <button type="button" className={tab === "completed" ? "is_on" : ""} onClick={() => set_tab("completed")}>
            {ENGLISH.completed}
            <em>{completed.length}</em>
          </button>
        </nav>
        {on_start_new ?
          <button type="button" className="smi_hub_new" onClick={on_start_new}>
            {ENGLISH.start_new_interview}
          </button> :
          null}
      </header>

      {loading ? <p className="smi_hub_empty">{ENGLISH.loading_interviews}</p> : null}
      {!loading && error ? <p className="smi_error">{error}</p> : null}
      {!loading && !items.length ?
        <div className="smi_hub_empty_card">
          <img src={robot_src} alt="" />
          <p>
            {tab === "ongoing" ? ENGLISH.no_ongoing_interviews : ENGLISH.no_completed_interviews}
          </p>
          {on_start_new ?
            <button type="button" className="smi_hub_new" onClick={on_start_new}>
              {ENGLISH.start_new_interview}
            </button> :
            null}
        </div> :
        null}

      <div className="smi_hub_list">
        {items.map((item) =>
          <Interview_Card
            key={item.mock_interview_id}
            item={item}
            mode={tab}
            menu_id={menu_id}
            busy_id={busy_id}
            on_menu={set_menu_id}
            on_resume={set_selected}
            on_retry={retry}
            on_delete={(next) => {
              set_menu_id(null);
              set_confirm(next);
            }} />
        )}
      </div>

      {confirm ? createPortal(
        <div
          className="smi_confirm_scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="smi_delete_title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy_id) set_confirm(null);
          }}>
          <div className="smi_confirm">
            <img src={robot_src} alt="" />
            <h2 id="smi_delete_title">{ENGLISH.delete_this_interview}</h2>
            <p>{ENGLISH.delete_interview_copy}</p>
            <div>
              <button type="button" disabled={Boolean(busy_id)} onClick={() => set_confirm(null)}>{ENGLISH.close}</button>
              <button type="button" className="is_save" disabled={Boolean(busy_id)} onClick={remove}>
                {busy_id ? ENGLISH.deleting : ENGLISH.delete}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
