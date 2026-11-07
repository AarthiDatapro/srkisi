import { useEffect, useRef, useState } from "react";
import { get_mock_interview } from "../api.js";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../../constants/english/student_mock_interview_constants_english.js";
import { Certificate_Download } from "./certificate_download.jsx";
import "../theme/mock_hub.css";

function question_text(entry) {
  const question = entry?.question;
  if (!question) return "";
  if (typeof question === "string") return question;
  return String(question.question || "");
}

function mood_of(entry) {
  if (entry.status === "pending") return "lock";
  if (entry.status === "current") return "current";
  const sentiment = String(entry.sentiment || "").toLowerCase();
  if (sentiment === "positive" || sentiment === "negative" || sentiment === "neutral" || sentiment === "mixed") {
    return sentiment;
  }
  const score = Number(entry.score ?? entry.evaluation?.score);
  if (Number.isFinite(score)) {
    if (score >= 7) return "positive";
    if (score < 4) return "negative";
  }
  return "neutral";
}

function sentiment_label(mood) {
  if (mood === "positive") return ENGLISH.positive;
  if (mood === "negative") return ENGLISH.negative;
  if (mood === "mixed") return ENGLISH.mixed;
  if (mood === "neutral") return ENGLISH.neutral;
  return "";
}

function verdict_label(verdict) {
  if (verdict === "strong") return ENGLISH.strong_result;
  if (verdict === "fair") return ENGLISH.fair_result;
  if (verdict === "needs_practice") return ENGLISH.needs_practice;
  return "";
}

function score_percent(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value * 10));
}

function format_clip_time(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function Answer_Clip({ src }) {
  const audio_ref = useRef(null);
  const [playing, set_playing] = useState(false);
  const [current, set_current] = useState(0);
  const [duration, set_duration] = useState(0);

  function toggle() {
    const node = audio_ref.current;
    if (!node) return;
    if (playing) node.pause();
    else node.play().catch(() => set_playing(false));
  }

  function seek(event) {
    const node = audio_ref.current;
    const bar = event.currentTarget;
    if (!node || !duration) return;
    const box = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    node.currentTime = ratio * duration;
    set_current(node.currentTime);
  }

  return (
    <div className="smi_q_clip">
      <audio
        ref={audio_ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => set_duration(event.currentTarget.duration || 0)}
        onDurationChange={(event) => set_duration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => set_current(event.currentTarget.currentTime || 0)}
        onPlay={() => set_playing(true)}
        onPause={() => set_playing(false)}
        onEnded={() => {
          set_playing(false);
          set_current(0);
        }} />
      <button
        type="button"
        className={playing ? "is_on" : ""}
        aria-label={playing ? ENGLISH.pause_recording : ENGLISH.play_recording}
        onClick={toggle}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {playing ?
            <path d="M7 6h3.5v12H7V6Zm6.5 0H17v12h-3.5V6Z" /> :
            <path d="M8 5.8v12.4L18.5 12 8 5.8Z" />}
        </svg>
      </button>
      <button type="button" className="smi_q_clip_bar" onClick={seek} aria-label={ENGLISH.your_recording}>
        <i><b style={{ width: `${duration ? Math.min(100, (current / duration) * 100) : 0}%` }} /></i>
      </button>
      <em>{format_clip_time(current)} / {format_clip_time(duration)}</em>
    </div>
  );
}

function Answer_Reply({ answer, audio_url }) {
  const text = String(answer || "").trim();
  const clip = String(audio_url || "").trim();
  if (!text && !clip) return null;
  return (
    <article className="smi_q_reply">
      <header>
        <span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
            <path d="M6 11a6 6 0 0 0 12 0M12 17v3M8.5 20h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          {ENGLISH.your_answer}
        </span>
        {clip ? <em>{ENGLISH.your_recording}</em> : null}
      </header>
      <p>{text || ENGLISH.no_answer_recorded}</p>
      {clip ? <Answer_Clip src={clip} /> : null}
    </article>
  );
}

function Score_Ring({ score, tone, label, verdict }) {
  return (
    <article className={`smi_hub_mark${tone ? ` is_${tone}` : ""}`}>
      {label ? <small>{label}</small> : null}
      <div
        className="smi_hub_ring"
        style={{ "--smi-score": `${score_percent(score)}%` }}
        aria-label={`${label || ENGLISH.overall_score} ${score != null ? score : "—"}/10`}>
        <div>
          <b>{score != null ? score : "—"}</b>
          <span>/10</span>
        </div>
      </div>
      {verdict ? <em>{verdict}</em> : null}
    </article>
  );
}

function Node_Icon({ mood, number }) {
  if (mood === "lock") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="6" y="11" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 11V8.4a3.5 3.5 0 0 1 7 0V11" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (mood === "current") return <span>{number}</span>;
  const mouth = mood === "positive" ? "M8 14.5c1.2 1.6 2.6 2.4 4 2.4s2.8-.8 4-2.4" :
    mood === "negative" ? "M8 16.5c1.2-1.4 2.6-2.1 4-2.1s2.8.7 4 2.1" :
    "M8.5 15.5h7";
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <circle cx="9" cy="10" r="1.1" fill="#fff" />
      <circle cx="15" cy="10" r="1.1" fill="#fff" />
      <path d={mouth} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Question_Analysis({ entry, opened }) {
  if (!opened) return null;
  const score = entry.score ?? entry.evaluation?.score;
  const strengths = Array.isArray(entry.strengths) && entry.strengths.length ?
    entry.strengths :
    entry.evaluation?.strengths || [];
  const gaps = Array.isArray(entry.gaps) && entry.gaps.length ?
    entry.gaps :
    entry.evaluation?.gaps || [];
  const mood = mood_of(entry);
  const tone = mood === "positive" ? "strong" : mood === "negative" ? "needs_practice" : "fair";
  const audio_url = String(entry.audio_url || "").trim();
  return (
    <div className="smi_q_sheet">
      <div className="smi_q_sheet_top">
        <Score_Ring score={score} tone={tone} label={ENGLISH.overall_score} verdict={sentiment_label(mood) || ENGLISH.neutral} />
        <div className="smi_q_sheet_read">
          <p className="smi_q_sheet_mood">
            <b className={`smi_hub_verdict is_${tone}`}>{sentiment_label(mood) || ENGLISH.none_noted}</b>
            <span>{entry.sentiment_note || ENGLISH.tone_communication_and_vocabulary}</span>
          </p>
          <div className="smi_hub_result_split">
            <section className="is_good">
              <h4>{ENGLISH.strengths}</h4>
              {strengths.length ?
                <ul>{strengths.map((line) => <li key={line}>{line}</li>)}</ul> :
                <p>{ENGLISH.no_strengths_captured_yet}</p>}
            </section>
            <section className="is_gap">
              <h4>{ENGLISH.gaps}</h4>
              {gaps.length ?
                <ul>{gaps.map((line) => <li key={line}>{line}</li>)}</ul> :
                <p>{ENGLISH.no_gaps_captured_yet}</p>}
            </section>
          </div>
        </div>
      </div>
      <Answer_Reply answer={entry.answer} audio_url={audio_url} />
      {entry.evaluation?.feedback ?
        <section className="smi_q_coach">
          <small>{ENGLISH.coach_notes}</small>
          <p>{entry.evaluation.feedback}</p>
        </section> :
        null}
    </div>
  );
}

function Completed_Review({ board, questions, open_id, set_open_id, on_back, error }) {
  const result = board.result || {};
  const sentiment = result.sentiment || {};
  const topics = Array.isArray(result.topics) ? result.topics : [];
  const score = result.overall_score ?? board.overall_score;
  const verdict = verdict_label(result.verdict);
  const entry = questions.find((row) => row.question_number === open_id) || questions[0] || null;
  const mood = entry ? mood_of(entry) : "neutral";
  const entry_score = entry?.score ?? entry?.evaluation?.score;
  const strengths = Array.isArray(entry?.strengths) && entry.strengths.length ?
    entry.strengths :
    entry?.evaluation?.strengths || [];
  const gaps = Array.isArray(entry?.gaps) && entry.gaps.length ?
    entry.gaps :
    entry?.evaluation?.gaps || [];
  const comm = sentiment.communication_score;
  const vocab = sentiment.vocabulary_score;

  return (
    <section className="smi_review">
      <header className="smi_review_head">
        <button type="button" className="smi_review_back" onClick={on_back}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {ENGLISH.back_to_list}
        </button>
        <div className="smi_review_brand">
          <small>{ENGLISH.interview_review}</small>
          <h1>{board.target_role || ENGLISH.interview}</h1>
        </div>
        <span className="smi_review_count">{ENGLISH.answered_of(board.answered || questions.length, board.total_questions || questions.length)}</span>
        <Certificate_Download
          mock_interview_id={board.mock_interview_id}
          ready={board.certificate_ready}
          locked={board.certificate_locked}
          file_stem={board.target_role} />
      </header>

      <div className="smi_review_hero">
        <Score_Ring score={score} tone={result.verdict} label={ENGLISH.overall_score} verdict={verdict} />
        <article className="smi_hub_stat">
          <small>{ENGLISH.sentiment_analysis}</small>
          {sentiment.available ?
            <>
              <em className={`smi_hub_verdict is_${sentiment.overall_sentiment === "positive" ? "strong" : sentiment.overall_sentiment === "negative" ? "needs_practice" : "fair"}`}>
                {sentiment_label(sentiment.overall_sentiment) || ENGLISH.mixed}
              </em>
              <ul className="smi_review_meters">
                {comm != null ?
                  <li>
                    <span>{ENGLISH.communication}</span>
                    <i><b style={{ width: `${score_percent(comm)}%` }} /></i>
                    <em>{comm}/10</em>
                  </li> :
                  null}
                {vocab != null ?
                  <li>
                    <span>{ENGLISH.vocabulary}</span>
                    <i><b style={{ width: `${score_percent(vocab)}%` }} /></i>
                    <em>{vocab}/10</em>
                  </li> :
                  null}
              </ul>
            </> :
            <p className="smi_hub_result_empty">{ENGLISH.sentiment_analysis_is_not_available_for_this_interview}</p>}
        </article>
        <article className="smi_hub_stat">
          <small>{ENGLISH.topic_wise_performance}</small>
          {topics.length ?
            <ul className="smi_hub_meters">
              {topics.slice(0, 4).map((topic) =>
                <li key={topic.topic}>
                  <span>{topic.topic}</span>
                  <i><b style={{ width: `${score_percent(topic.average_score)}%` }} /></i>
                  <em>{topic.average_score != null ? topic.average_score : "—"}</em>
                </li>
              )}
            </ul> :
            <p className="smi_hub_result_empty">{ENGLISH.no_analysis_saved}</p>}
        </article>
      </div>

      {error ? <p className="smi_error">{error}</p> : null}

      {questions.length ?
        <nav className="smi_review_nav" aria-label={ENGLISH.question}>
          {questions.map((row) => {
            const row_mood = mood_of(row);
            const on = entry?.question_number === row.question_number;
            return (
              <button
                key={row.question_number}
                type="button"
                className={`is_${row_mood}${on ? " is_on" : ""}`}
                aria-current={on ? "true" : undefined}
                onClick={() => set_open_id(row.question_number)}>
                {row.question_number}
              </button>
            );
          })}
        </nav> :
        null}

      {entry ?
        <article className="smi_review_card">
          <header className="smi_review_card_head">
            <div>
              <div className="smi_q_meta">
                <b>{ENGLISH.question}{entry.question_number}</b>
                {entry.topic ? <em>{entry.topic}</em> : null}
                {entry.question?.difficulty ? <em>{entry.question.difficulty}</em> : null}
                <em className={`smi_hub_verdict is_${mood === "positive" ? "strong" : mood === "negative" ? "needs_practice" : "fair"}`}>
                  {sentiment_label(mood) || ENGLISH.neutral}
                </em>
              </div>
              <p className="smi_review_prompt">{question_text(entry)}</p>
            </div>
            <Score_Ring score={entry_score} tone={mood === "positive" ? "strong" : mood === "negative" ? "needs_practice" : "fair"} />
          </header>

          <Answer_Reply answer={entry.answer} audio_url={entry.audio_url} />

          {entry.evaluation?.feedback ?
            <section className="smi_review_coach">
              <small>{ENGLISH.coach_notes}</small>
              <p>{entry.evaluation.feedback}</p>
            </section> :
            null}

          <div className="smi_hub_result_split">
            <section className="is_good">
              <h4>{ENGLISH.strengths}</h4>
              {strengths.length ?
                <ul>{strengths.map((line) => <li key={line}>{line}</li>)}</ul> :
                <p>{ENGLISH.no_strengths_captured_yet}</p>}
            </section>
            <section className="is_gap">
              <h4>{ENGLISH.gaps}</h4>
              {gaps.length ?
                <ul>{gaps.map((line) => <li key={line}>{line}</li>)}</ul> :
                <p>{ENGLISH.no_gaps_captured_yet}</p>}
            </section>
          </div>

          {entry.sentiment_note ?
            <p className="smi_review_note">{entry.sentiment_note}</p> :
            null}
        </article> :
        null}
    </section>
  );
}

export function Mock_Question_Board({ mock_interview_id, on_back, on_start_current, on_reattempt, on_loaded }) {
  const [board, set_board] = useState(null);
  const [item, set_item] = useState(null);
  const [open_id, set_open_id] = useState(null);
  const [feedback_id, set_feedback_id] = useState(null);
  const [error, set_error] = useState("");
  const [loading, set_loading] = useState(true);

  async function load() {
    set_loading(true);
    try {
      const payload = await get_mock_interview(mock_interview_id);
      const next_board = payload.board || null;
      set_item(payload.item || null);
      set_board(next_board);
      on_loaded?.(payload.item || null);
      const first = (next_board?.questions || []).find((entry) => entry.status === "answered") ||
        (next_board?.questions || []).find((entry) => entry.status === "current");
      set_open_id(first?.question_number ?? null);
      set_error("");
    } catch (err) {
      set_error(err.message);
    } finally {
      set_loading(false);
    }
  }

  useEffect(() => {
    load();
  }, [mock_interview_id]);

  if (loading) return <p className="smi_hub_empty">{ENGLISH.loading_interviews}</p>;
  if (!board) return <p className="smi_hub_empty">{error || ENGLISH.unable_to_load_the_interview}</p>;

  const questions = board.questions || [];
  const completed = board.status === "completed";

  if (completed) {
    return (
      <Completed_Review
        board={board}
        questions={questions}
        open_id={open_id}
        set_open_id={set_open_id}
        on_back={on_back}
        error={error} />
    );
  }

  return (
    <section className="smi_board_wrap">
      <header className="smi_board_head">
      <button type="button" className="smi_board_back" onClick={on_back}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ENGLISH.back_to_list}
      </button>
        <h1>{board.target_role || ENGLISH.interview}</h1>
        <span className="smi_board_count">{ENGLISH.answered_of(board.answered || 0, board.total_questions || 0)}</span>
      </header>

      {error ? <p className="smi_error">{error}</p> : null}

      {!completed && questions.some((entry) => entry.status === "current" || entry.status === "pending") ?
        <div className="smi_pending_banner">
          <div>
            <b>{ENGLISH.continue_interview}</b>
            <p>{ENGLISH.continue_interview_copy}</p>
          </div>
          <button type="button" className="smi_q_start" onClick={() => on_start_current?.(item)}>
            {ENGLISH.continue_interview} →
          </button>
        </div> :
        null}

      <ol className="smi_q_timeline">
        {questions.map((entry) => {
          const current = entry.status === "current";
          const pending = entry.status === "pending";
          const answered = entry.status === "answered";
          const mood = mood_of(entry);
          return (
            <li key={entry.question_number} className={current ? "is_current" : pending ? "is_pending" : "is_done"}>
              <span className={`smi_q_node is_${mood}`} aria-hidden="true">
                <Node_Icon mood={mood} number={entry.question_number} />
              </span>
              <article className={`smi_q_card${current ? " is_current" : ""}${answered && feedback_id === entry.question_number ? " is_open" : ""}`}>
                <div className="smi_q_main">
              <div className="smi_q_body">
                <div className="smi_q_meta">
                  {current ? <span className="smi_q_next">{ENGLISH.up_next}</span> : null}
                      {pending ? <span className="smi_q_next is_pending">{ENGLISH.locked}</span> : null}
                  <b>{ENGLISH.question}{entry.question_number}</b>
                      {entry.topic ? <em>{entry.topic}</em> : null}
                  {entry.question?.difficulty ? <em>{entry.question.difficulty}</em> : null}
                      {answered && entry.score != null && feedback_id !== entry.question_number ?
                        <em className={`smi_q_score is_${mood === "positive" ? "strong" : mood === "negative" ? "needs_practice" : "fair"}`}>
                          {entry.score}/10
                        </em> :
                        null}
                    </div>
                    <p>{question_text(entry) || (pending || current ? ENGLISH.question_waiting : "")}</p>
                </div>
                  <div className="smi_q_actions">
                    {answered ?
                      <>
                        <button
                          type="button"
                          className="smi_q_attempt"
                          onClick={() => on_reattempt?.(item, entry.question_number)}>
                          {ENGLISH.attempt_again}
                        </button>
                    <button
                      type="button"
                          className={`smi_q_view${feedback_id === entry.question_number ? " is_on" : ""}`}
                          aria-expanded={feedback_id === entry.question_number}
                          onClick={() => set_feedback_id((current_id) => current_id === entry.question_number ? null : entry.question_number)}>
                          {feedback_id === entry.question_number ? ENGLISH.hide_feedback : ENGLISH.view_feedback}
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            {feedback_id === entry.question_number ?
                              <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> :
                              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                          </svg>
                    </button>
                      </> :
                  null}
                {current ?
                  <button
                    type="button"
                    className="smi_q_start"
                    onClick={() => on_start_current?.(item)}>
                        {ENGLISH.continue_interview} →
                  </button> :
                      null}
                  </div>
              </div>
                <Question_Analysis entry={entry} opened={answered && feedback_id === entry.question_number} />
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
