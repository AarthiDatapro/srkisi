import { useState } from "react";
import { ProgressBar } from "@datapromr/progress-bar";
import { COPY } from "../constants.js";
import { lesson_duration } from "../utils.js";
import { Check_Icon, Chevron_Icon, Play_Icon, Quiz_Icon } from "./icons.jsx";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../../constants/english/course_learning_constants_english.js";

function Content_Outline({
  modules,
  lessons,
  quizzes = [],
  active_id,
  active_kind = "lesson",
  progress,
  on_select_lesson,
  on_select_quiz
}) {
  const groups =
    modules?.length ?
      modules :
      [{ module_id: 0, get module_title() { return ENGLISH.course; }, lessons: lessons || [], quizzes }];
  const [closed, set_closed] = useState({});
  const percent = Number(progress) || 0;

  function quiz_button(quiz) {
    const quiz_on = active_kind === "quiz" && quiz.quiz_id === active_id;
    const count = quiz.questions_shown || quiz.question_count;
    return (
      <button
        type="button"
        className={`lrn_mod_quiz${quiz_on ? " is_on" : ""}`}
        aria-label={ENGLISH.quiz_2(quiz.quiz_title || ENGLISH.quiz, count ? ENGLISH.questions(count) : "")}
        onClick={() => on_select_quiz(quiz.quiz_id)}>
        <span className="lrn_mod_quiz_mark">
          <Quiz_Icon />
        </span>
        <span className="lrn_mod_copy">
          <span className="lrn_mod_quiz_kicker">{ENGLISH.quiz}</span>
          <span className="lrn_mod_name">{quiz.quiz_title || ENGLISH.quiz}</span>
        </span>
        {count ? <em className="lrn_mod_quiz_count">{count}</em> : null}
      </button>
    );
  }

  function toggle(module_id) {
    set_closed((current) => ({ ...current, [module_id]: !current[module_id] }));
  }

  return (
    <>
      <div className="lrn_side_head is_progress_only">
        <ProgressBar value={percent} label={ENGLISH.complete(percent)} showValue={false} />
      </div>
      <div className="lrn_side_list">
        {groups.map((module, module_index) => {
          const module_id = module.module_id || module_index;
          const is_closed = Boolean(closed[module_id]);
          const lesson_start = groups.
          slice(0, module_index).
          reduce((sum, item) => sum + (item.lessons?.length || 0), 0);
          return (
            <section key={module_id} className="lrn_mod">
              <button type="button" className="lrn_mod_head" onClick={() => toggle(module_id)}>
                <h3>{ENGLISH.module_3}{module_index + 1}: {module.module_title}
                </h3>
                <span>{is_closed ? "+" : "–"}</span>
              </button>
              {is_closed ? null : (
                <ol>
                  {(module.lessons || []).map((lesson, lesson_index) => {
                    const number = lesson_start + lesson_index + 1;
                    const active = active_kind === "lesson" && lesson.lesson_id === active_id;
                    const mins = lesson_duration(lesson);
                    const lesson_quizzes = lesson.quizzes || [];
                    return (
                      <li key={`lesson-${lesson.lesson_id}`}>
                        <button
                          type="button"
                          className={active ? "is_on" : undefined}
                          onClick={() => on_select_lesson(lesson.lesson_id)}>
                          <span className={lesson.is_completed ? "is_done" : active ? "is_play" : "is_wait"}>
                            {lesson.is_completed ? <Check_Icon /> : active ? <Play_Icon /> : number}
                          </span>
                          <span className="lrn_mod_copy">
                            <span className="lrn_mod_name">
                              {ENGLISH.lesson_2(number, lesson.lesson_title)}
                            </span>
                            {mins ? <small>{mins}</small> : null}
                          </span>
                        </button>
                        {lesson_quizzes.length ? (
                          <ol className="lrn_mod_quizzes">
                            {lesson_quizzes.map((quiz) => (
                              <li key={`quiz-${quiz.quiz_id}`}>{quiz_button(quiz)}</li>
                            ))}
                          </ol>
                        ) : null}
                      </li>
                    );
                  })}
                  {(module.quizzes || [])
                    .filter(
                      (quiz) =>
                        !quiz.lesson_id ||
                        !(module.lessons || []).some(
                          (lesson) => Number(lesson.lesson_id) === Number(quiz.lesson_id)
                        )
                    )
                    .map((quiz) => (
                      <li key={`quiz-${quiz.quiz_id}`}>{quiz_button(quiz)}</li>
                    ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

/** Course content opens only as a modal — never as a persistent side rail. */
export function Content_Sidebar({
  modules,
  lessons,
  quizzes = [],
  active_id,
  active_kind = "lesson",
  progress,
  open = false,
  on_close,
  on_select_lesson,
  on_select_quiz
}) {
  if (!open) return null;

  return (
    <div className="lrn_content_modal" role="presentation">
      <button type="button" className="lrn_content_modal_scrim" aria-label={ENGLISH.close_course_content} onClick={on_close} />
      <div
        className="lrn_content_modal_panel"
        role="dialog"
        aria-modal="true"
        aria-label={COPY.content}>
        <div className="lrn_content_modal_head">
          <div className="lrn_content_modal_brand">
            <span className="lrn_content_modal_kicker">{ENGLISH.learning_path}</span>
            <h2>{COPY.content}</h2>
          </div>
          <button type="button" className="lrn_content_modal_close" aria-label={ENGLISH.close_course_content} onClick={on_close}>
            <Chevron_Icon dir="left" />
            <span>{ENGLISH.back_2}</span>
          </button>
        </div>
        <div className="lrn_content_modal_body">
          <Content_Outline
            modules={modules}
            lessons={lessons}
            quizzes={quizzes}
            active_id={active_id}
            active_kind={active_kind}
            progress={progress}
            on_select_lesson={on_select_lesson}
            on_select_quiz={on_select_quiz} />
        </div>
      </div>
    </div>
  );
}
