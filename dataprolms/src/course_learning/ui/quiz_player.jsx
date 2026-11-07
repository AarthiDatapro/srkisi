import { useMemo, useRef, useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import { Button } from "@datapromr/button";
import robot_src from "../../assets/mock_interview_robot.svg";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../../constants/english/course_learning_constants_english.js";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function pretty_title(value) {
  const text = String(value || "").trim();
  if (!text) return ENGLISH.quiz;
  return text.replace(/\b\w+/g, (word) => {
    if (word.length <= 3 && word === word.toLowerCase()) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}

function pretty_word(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function format_duration(seconds) {
  if (seconds == null || seconds < 0) return null;
  if (seconds === 0) return "< 1s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function Marks_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>);

}

function Trophy_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 6H5.5A2.5 2.5 0 0 0 5.5 11H8M16 6h2.5A2.5 2.5 0 0 1 18.5 11H16" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 12v3M9 19h6M10 15h4v4h-4v-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>);

}

function Target_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>);

}

function Clock_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>);

}

function Check_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

function Fail_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>);

}

function Interview_Fab({ on_open }) {
  if (!on_open) return null;
  return (
    <button type="button" className="lrn_interview_fab" onClick={on_open} aria-label={ENGLISH.mock_interview}>
      <img src={robot_src} alt="" />
    </button>
  );
}

export function Quiz_Player({
  quiz,
  module_name = "",
  module_no = 0,
  lesson_name = "",
  lesson_no = 0,
  questions = [],
  attempt,
  submitting,
  on_submit,
  on_open_content,
  on_mock_interview
}) {
  const [answers, set_answers] = useState({});
  const started_at = useRef(Date.now());
  const done = Boolean(attempt);
  const answered = questions.filter((question) => answers[question.question_id]).length;
  const missing = questions.length - answered;
  const progress = questions.length ? Math.round(answered / questions.length * 100) : 0;

  const total_marks = Number(quiz?.total_marks) || questions.length || 0;
  const passing_marks = Number(quiz?.passing_marks) || Math.ceil(total_marks * 0.5) || 0;
  const passing_percent = total_marks ? Math.round(passing_marks / total_marks * 100) : 50;

  const is_passed = done && Number(attempt?.percent || 0) >= passing_percent;
  const quiz_title = pretty_title(quiz?.quiz_title);
  const duration_label = done ? format_duration(attempt?.duration_seconds) : null;
  const score_percent = Math.max(0, Math.min(100, Number(attempt?.percent) || 0));

  const by_id = useMemo(() => {
    const map = new Map();
    (attempt?.answers || []).forEach((item) => map.set(item.question_id, item));
    return map;
  }, [attempt]);

  function pick(question_id, option) {
    if (done) return;
    set_answers((current) => ({ ...current, [question_id]: option }));
  }

  return (
    <section className="lrn_quiz">
      <header className="lrn_quiz_head">
        <div className="lrn_quiz_head_row">
          <div className="lrn_quiz_rail">
            {module_name || lesson_name ?
              <div className="lrn_quiz_place">
                {module_name ?
                  <span className="lrn_quiz_place_mod">
                    <i>{module_no ? `M${module_no}` : "M"}</i>
                    <b>{module_name}</b>
                  </span> :
                  null}
                {module_name && lesson_name ?
                  <span className="lrn_quiz_place_line" aria-hidden="true">›</span> :
                  null}
                {lesson_name ?
                  <span className="lrn_quiz_place_les">
                    <i>{lesson_no ? `L${lesson_no}` : "L"}</i>
                    <b>{lesson_name}</b>
                  </span> :
                  null}
              </div> :
              null}
            {on_open_content ?
              <button
                type="button"
                className="lrn_crumb_toggle lrn_quiz_title_toggle"
                onClick={on_open_content}
                aria-haspopup="dialog"
                aria-label={ENGLISH.course_content_current_quiz(module_name || ENGLISH.module, lesson_name ? `, ${lesson_name}` : "", quiz_title)}>
                <h2>{quiz_title}</h2>
              </button> :
              <h2>{quiz_title}</h2>}
          </div>
          <div className="lrn_quiz_chips">
            <span>{questions.length}{ENGLISH.q}</span>
            <span>{total_marks}{ENGLISH.marks}</span>
            <span>{ENGLISH.pass}{passing_percent}%</span>
            {quiz?.difficulty ? <span className="is_diff">{pretty_word(quiz.difficulty)}</span> : null}
            {quiz?.bloom_level ? <span>{pretty_word(quiz.bloom_level)}</span> : null}
          </div>
        </div>
        {done ? null :
        <div className="lrn_quiz_track" aria-label={ENGLISH.of_answered(answered, questions.length)}>
            <b>{answered}</b>
            <span>{ENGLISH.label_of}{questions.length}{ENGLISH.answered}</span>
            <i style={{ width: `${progress}%` }} />
          </div>
        }
      </header>

      {!done &&
      <div className="lrn_quiz_info_bar">
          <div className="lrn_quiz_info_item">
            <span className="lrn_quiz_info_label">{ENGLISH.total_questions}</span>
            <strong className="lrn_quiz_info_val">{questions.length}</strong>
          </div>
          <div className="lrn_quiz_info_item">
            <span className="lrn_quiz_info_label">{ENGLISH.total_marks}</span>
            <strong className="lrn_quiz_info_val">{total_marks}{ENGLISH.marks_2}</strong>
          </div>
          <div className="lrn_quiz_info_item">
            <span className="lrn_quiz_info_label">{ENGLISH.passing_marks}</span>
            <strong className="lrn_quiz_info_val">{passing_marks}{ENGLISH.marks_3}{passing_percent}%)</strong>
          </div>
          <div className="lrn_quiz_info_item">
            <span className="lrn_quiz_info_label">{ENGLISH.marks_question}</span>
            <strong className="lrn_quiz_info_val">{ENGLISH.label_1_mark_each}</strong>
          </div>
        </div>
      }

      {!done && quiz?.quiz_description &&
      <div className="lrn_quiz_desc">
          <p><strong>{ENGLISH.instructions}</strong> <Link_Text text={quiz.quiz_description} /></p>
        </div>
      }

      {done ?
      <div className={`lrn_quiz_result_box ${is_passed ? "is_pass" : "is_fail"}`}>
          <div className="lrn_quiz_result_header">
            <div
              className="lrn_quiz_score_circle"
              style={{ "--lrn_quiz_pct": score_percent }}>
              <strong>{attempt.percent}%</strong>
              <span>{is_passed ? "PASSED" : "FAILED"}</span>
            </div>
            <div className="lrn_quiz_result_details">
              <div className={`lrn_quiz_status_badge ${is_passed ? "pass" : "fail"}`}>
                {is_passed ? ENGLISH.passed : ENGLISH.needs_improvement}
              </div>
              <h2>{is_passed ? ENGLISH.assessment_passed : ENGLISH.assessment_complete}</h2>
              <p className="lrn_quiz_result_sub">
                {attempt.correct_count}/{attempt.total_questions || questions.length}{ENGLISH.correct}{duration_label ? <> · {duration_label}</> : null}
              </p>
            </div>
            <div className="lrn_quiz_result_highlight">
              <i className="lrn_quiz_trophy" aria-hidden="true"><Trophy_Icon /></i>
              <span>{ENGLISH.score}</span>
              <b>{attempt.percent}%</b>
            </div>
          </div>

          <div className="lrn_quiz_metrics_grid">
            <div className="lrn_quiz_metric">
              <span className="lrn_quiz_metric_icon is_marks"><Marks_Icon /></span>
              <span>{ENGLISH.marks_4}</span>
              <strong>{attempt.correct_count}/{total_marks}</strong>
            </div>
            <div className="lrn_quiz_metric">
              <span className="lrn_quiz_metric_icon is_total"><Trophy_Icon /></span>
              <span>{ENGLISH.total_marks}</span>
              <strong>{total_marks}</strong>
            </div>
            <div className="lrn_quiz_metric">
              <span className="lrn_quiz_metric_icon is_passmark"><Target_Icon /></span>
              <span>{ENGLISH.pass_mark}</span>
              <strong>{passing_marks} ({passing_percent}%)</strong>
            </div>
            <div className="lrn_quiz_metric">
              <span className="lrn_quiz_metric_icon is_time"><Clock_Icon /></span>
              <span>{ENGLISH.time}</span>
              <strong>{duration_label || "—"}</strong>
            </div>
            <div className="lrn_quiz_metric lrn_quiz_metric_status">
              <span className={`lrn_quiz_metric_icon ${is_passed ? "is_status_pass" : "is_status_fail"}`}>
                {is_passed ? <Check_Icon /> : <Fail_Icon />}
              </span>
              <span>{ENGLISH.status}</span>
              <strong className={is_passed ? "text_pass" : "text_fail"}>
                {is_passed ? "PASSED" : "FAILED"}
              </strong>
            </div>
          </div>
        </div> :
      null}

      <ol className="lrn_quiz_list">
        {questions.map((question, index) => {
          const result = by_id.get(question.question_id);
          const selected = done ? result?.selected_answer : answers[question.question_id];
          return (
            <li key={question.question_id} className="lrn_q">
              <span className="lrn_q_num">{String(index + 1).padStart(2, "0")}</span>
              <div className="lrn_q_body">
                <div className="lrn_q_head_bar">
                  <h3>{question.question_text}</h3>
                  <div className="lrn_q_tags">
                    <span className="lrn_q_mark_tag">{ENGLISH.label_1_mark}</span>
                    {done && result ?
                    <span className={`lrn_q_result_tag ${result.is_correct ? "is_correct" : "is_wrong"}`}>
                        {result.is_correct ? ENGLISH.label_1_mark_2 : ENGLISH.label_0_marks}
                      </span> :
                    null}
                  </div>
                </div>
                <div className="lrn_quiz_options">
                  {(Array.isArray(question.options) ? question.options : []).map((option, offset) => {
                    const on = selected === option;
                    const correct = done && option === result?.correct_answer;
                    const wrong = done && on && !result?.is_correct;
                    return (
                      <button
                        key={option}
                        type="button"
                        className={
                        correct ? "is_correct" : wrong ? "is_wrong" : on ? "is_on" : undefined
                        }
                        disabled={done}
                        onClick={() => pick(question.question_id, option)}>
                        
                        <em>{LETTERS[offset] || offset + 1}</em>
                        <span>{option}</span>
                      </button>);

                  })}
                </div>
                {done && result && !result.is_correct ?
                <aside className="lrn_q_explain">
                    <p>
                      <strong>{ENGLISH.correct_answer}</strong> {result.correct_answer || question.correct_answer}
                    </p>
                    {result.explanation || question.explanation ?
                  <p>{result.explanation || question.explanation}</p> :
                  null}
                  </aside> :
                null}
              </div>
            </li>);

        })}
      </ol>

      {done ? null :
      <div className="lrn_quiz_foot">
          <p>{missing ? ENGLISH.left_to_answer(missing) : ENGLISH.ready_to_submit}</p>
          <Button
          type="button"
          loading={submitting}
          disabled={missing > 0 || submitting}
          onClick={() =>
          on_submit({
            answers: questions.map((question) => ({
              question_id: question.question_id,
              selected_answer: answers[question.question_id] || ""
            })),
            duration_seconds: Math.round((Date.now() - started_at.current) / 1000)
          })
          }>{ENGLISH.submit_quiz}</Button>
        </div>
      }
      <Interview_Fab on_open={on_mock_interview} />
    </section>);

}
