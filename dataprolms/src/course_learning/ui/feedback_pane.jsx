import { useEffect, useState } from "react";
import { COPY } from "../constants.js";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../../constants/english/course_learning_constants_english.js";

function remarks_from_answers(questions, answers) {
  return (questions || []).
  map((question) => {
    const pick = answers[question.question_id];
    if (!pick) return "";
    return `${question.question_text}: ${pick}`;
  }).
  filter(Boolean).
  join(" | ");
}

function answers_from_remarks(questions, remarks) {
  const text = String(remarks || "");
  const next = {};
  for (const question of questions || []) {
    const matched = (question.options || []).find((option) => {
      const labeled = `${question.question_text}: ${option}`;
      return text === option || text.includes(labeled) || text.split(" | ").includes(labeled);
    });
    if (matched) next[question.question_id] = matched;
  }
  return next;
}

export function Feedback_Pane({
  lesson,
  questions = [],
  saving,
  required = false,
  in_modal = false,
  on_save
}) {
  const has_questions = questions.length > 0;
  const saved = lesson?.feedback || {};
  const [rating, set_rating] = useState(Number(saved.rating) || 0);
  const [answers, set_answers] = useState(() => answers_from_remarks(questions, saved.remarks));
  const [remarks, set_remarks] = useState(() => saved.remarks || "");

  useEffect(() => {
    if (required) {
      set_rating(0);
      set_answers({});
      set_remarks("");
      return;
    }
    const next_answers = answers_from_remarks(questions, lesson?.feedback?.remarks);
    set_rating(Number(lesson?.feedback?.rating) || 0);
    set_answers(next_answers);
    set_remarks(lesson?.feedback?.remarks || "");
  }, [lesson?.lesson_id, lesson?.feedback?.rating, lesson?.feedback?.remarks, questions, required]);

  function toggle_option(question_id, option) {
    set_answers((current) => {
      const next = { ...current };
      if (next[question_id] === option) delete next[question_id];
      else next[question_id] = option;
      set_remarks(remarks_from_answers(questions, next));
      return next;
    });
  }

  const answered = questions.filter((question) => answers[question.question_id]).length;
  const all_answered = !has_questions || answered === questions.length;
  const remarks_text = remarks.trim();
  const can_submit =
    Boolean(rating) && all_answered && (!required || Boolean(remarks_text));

  const fields = (
    <>
      <div className="lrn_stars" role="radiogroup" aria-label={COPY.feedback}>
        {[1, 2, 3, 4, 5].map((value) =>
          <button
            key={value}
            type="button"
            className={value <= rating ? "is_on" : undefined}
            aria-label={COPY.starLabels[value - 1]}
            aria-checked={value === rating}
            role="radio"
            onClick={() => set_rating(value)}>
            ★
          </button>
        )}
        {in_modal && !rating ? null :
        <span className="lrn_stars_label">{rating ? COPY.starLabels[rating - 1] : COPY.starPrompt}</span>}
      </div>

      {has_questions ?
        <div className="lrn_feedback_qs">
          {questions.map((question, index) =>
            <fieldset
              key={question.question_id}
              className={answers[question.question_id] ? "lrn_feedback_q is_done" : "lrn_feedback_q"}>
              <legend>
                <span>{index + 1}</span>
                {question.question_text}
              </legend>
              <div className="lrn_feedback_opts" role="group" aria-label={question.question_text}>
                {(question.options || []).map((option) => {
                  const on = answers[question.question_id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={on ? "is_on" : undefined}
                      aria-pressed={on}
                      onClick={() => toggle_option(question.question_id, option)}>
                      {option}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div> :
        null}

      <label className="lrn_feedback_preview">
        {in_modal ? null : <span>{COPY.remarks}</span>}
        <textarea
          value={remarks}
          onChange={(event) => set_remarks(event.target.value)}
          placeholder={in_modal ? ENGLISH.a_note_if_you_like : COPY.remarksHint}
          rows={in_modal ? 2 : 3}
          required={required} />
      </label>
    </>
  );

  return (
    <form
      className={in_modal ? "lrn_feedback is_modal" : required ? "lrn_feedback is_required" : "lrn_feedback"}
      onSubmit={(event) => {
        event.preventDefault();
        if (!can_submit) return;
        on_save?.({ rating, remarks: remarks_text });
      }}>
      {in_modal ? null :
      <header className="lrn_feedback_head">
        <span className="lrn_feedback_badge" aria-hidden="true">★</span>
        <div>
          <h3>{required ? COPY.feedbackRequiredTitle : COPY.feedback}</h3>
          <p>{required ? COPY.feedbackRequiredHint : COPY.feedbackHint}</p>
        </div>
        {has_questions ?
          <em className={all_answered ? "lrn_feedback_count is_done" : "lrn_feedback_count"}>
            {answered}/{questions.length}
          </em> :
          null}
      </header>}
      {required && !in_modal ? <p className="lrn_feedback_banner">{COPY.feedbackRequiredBlock}</p> : null}

      {in_modal ? <div className="lrn_fb_scroll">{fields}</div> : fields}

      <div className="lrn_feedback_foot">
        {in_modal ? null : <p>{can_submit ? COPY.feedbackReady : COPY.feedbackNeed}</p>}
        <button type="submit" className="lrn_ask" disabled={!can_submit || saving}>
          {in_modal ? ENGLISH.send : required ? COPY.feedbackRequiredSubmit : COPY.submitFeedback}
        </button>
      </div>
    </form>
  );
}
