import { useEffect, useMemo, useRef, useState } from "react";
import { get_my_course_outline, get_my_course_quiz } from "../api.js";
import { COPY } from "../constants.js";
import {
  collect_outline_quiz_ids,
  format_access_date,
  quiz_is_completed,
  quiz_needs_attention,
  status_label } from
"../utils.js";
import { MY_COURSES_ENGLISH as ENGLISH } from "../../constants/english/my_courses_constants_english.js";

function format_hours(value) {
  if (value !== 0 && !value) return "";
  const hours = Number(value);
  if (!Number.isFinite(hours)) return "";
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function Progress_Ring({ value = 0, size = 28 }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - pct / 100 * circ;
  return (
    <span className="myc_rail_ring" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <b>{Math.round(pct)}%</b>
    </span>
  );
}

function Info_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function Lesson_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6.5h11.5A2.5 2.5 0 0 1 19 9v10.5H7.5A2.5 2.5 0 0 1 5 17V6.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 10h6M9 13.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Quiz_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 9h6M9 13h6M9 17h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Done_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Warn_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4.5 21 20H3L12 4.5Z" fill="currentColor" />
      <path d="M12 10v4.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1" fill="#fff" />
    </svg>
  );
}

const EMPTY_QUIZ_DONE = new Set();

function minutes_label(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return "";
  return ENGLISH.min(minutes);
}

function module_progress(module) {
  const lessons = module?.lessons || [];
  if (!lessons.length) return 0;
  const done = lessons.filter((lesson) => lesson.is_completed).length;
  return Math.round(done / lessons.length * 100);
}

function module_rows(module, completed_quiz_ids, lesson_start = 0) {
  const lessons = module?.lessons || [];
  const lesson_rows = lessons.flatMap((lesson, lesson_index) => [
    {
      key: `lesson-${lesson.lesson_id}`,
      kind: "lesson",
      id: lesson.lesson_id,
      title: ENGLISH.lesson_2(lesson_start + lesson_index + 1, lesson.lesson_title),
      meta: [ENGLISH.lesson, minutes_label(lesson.duration_minutes)].filter(Boolean).join(" · "),
      done: Boolean(lesson.is_completed),
      needs_attention: false
    },
    ...(lesson.quizzes || []).map((quiz) => ({
      key: `quiz-${quiz.quiz_id}`,
      kind: "quiz",
      id: quiz.quiz_id,
      title: quiz.quiz_title || ENGLISH.quiz,
      meta: [ENGLISH.quiz, quiz.question_count ? ENGLISH.questions(quiz.question_count) : ""].filter(Boolean).join(" · "),
      done: quiz_is_completed(quiz, completed_quiz_ids),
      needs_attention: quiz_needs_attention(quiz, completed_quiz_ids)
    }))
  ]);

  const module_quizzes = (module?.quizzes || [])
    .filter(
      (quiz) =>
        !quiz.lesson_id ||
        !lessons.some((lesson) => Number(lesson.lesson_id) === Number(quiz.lesson_id))
    )
    .map((quiz) => ({
      key: `quiz-${quiz.quiz_id}`,
      kind: "quiz",
      id: quiz.quiz_id,
      title: quiz.quiz_title || ENGLISH.quiz,
      meta: [ENGLISH.quiz, quiz.question_count ? ENGLISH.questions(quiz.question_count) : ""].filter(Boolean).join(" · "),
      done: quiz_is_completed(quiz, completed_quiz_ids),
      needs_attention: quiz_needs_attention(quiz, completed_quiz_ids)
    }));

  return [...lesson_rows, ...module_quizzes];
}

export function Course_Switcher({ courses = [], active_id, active_registration = null, busy_id, on_select, on_open }) {
  const active =
    courses.find((item) => active_registration && item.registration_id === active_registration) ||
    courses.find((item) => item.course_id === active_id) ||
    courses[0] ||
    null;
  const [outlines, set_outlines] = useState({});
  const [completed_quiz_ids, set_completed_quiz_ids] = useState({});
  const [outline_error, set_outline_error] = useState("");
  const [outline_loading, set_outline_loading] = useState(false);
  const [module_id, set_module_id] = useState(null);
  const [body_open, set_body_open] = useState(true);
  const head_ref = useRef(null);

  function choose_module(next_id) {
    set_module_id(next_id);
    requestAnimationFrame(() => {
      const head = head_ref.current;
      if (!head) return;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      const page_top = head.getBoundingClientRect().top + (window.scrollY || document.documentElement.scrollTop || 0);
      let node = head.parentElement;
      while (node && node !== document.documentElement) {
        const overflow_y = window.getComputedStyle(node).overflowY;
        if ((overflow_y === "auto" || overflow_y === "scroll") && node.scrollHeight > node.clientHeight + 1) {
          const top = head.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop;
          node.scrollTo({ top: Math.max(0, top - 12), behavior });
        }
        node = node.parentElement;
      }
      window.scrollTo({ top: Math.max(0, page_top - 12), behavior });
    });
  }

  useEffect(() => {
    if (!active?.course_id) return undefined;
    const scope = active.registration_id || active.course_id;
    if (outlines[scope]) return undefined;

    let cancelled = false;
    set_outline_loading(true);
    set_outline_error("");
    get_my_course_outline(active.course_id, active.registration_id)
      .then(async (payload) => {
        if (cancelled) return;
        set_outlines((current) => ({ ...current, [scope]: payload }));

        const quiz_ids = collect_outline_quiz_ids(payload);
        if (!quiz_ids.length) {
          set_completed_quiz_ids((current) => ({ ...current, [scope]: new Set() }));
          return;
        }

        const done = new Set();
        await Promise.all(
          quiz_ids.map(async (quiz_id) => {
            try {
              const data = await get_my_course_quiz(active.course_id, quiz_id, active.registration_id);
              if (data?.attempt) done.add(Number(quiz_id));
            } catch {
              /* ignore per-quiz load errors */
            }
          })
        );
        if (!cancelled) {
          set_completed_quiz_ids((current) => ({ ...current, [scope]: done }));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        set_outline_error(err.message || ENGLISH.could_not_load_course_outline);
      })
      .finally(() => {
        if (!cancelled) set_outline_loading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active?.course_id, active?.registration_id]);

  useEffect(() => {
    set_module_id(null);
    set_body_open(true);
  }, [active?.course_id, active?.registration_id]);

  const outline_scope = active?.registration_id || active?.course_id;
  const outline = active ? outlines[outline_scope] || null : null;
  const modules = outline?.modules || [];
  const module_key = modules.map((item) => item.module_id).join(",");

  useEffect(() => {
    if (!module_key) {
      set_module_id(null);
      return;
    }
    const first_id = modules[0]?.module_id ?? null;
    set_module_id((current) => {
      if (current != null && modules.some((item) => item.module_id === current)) return current;
      return first_id;
    });
  }, [module_key]);

  const selected_index = useMemo(
    () => modules.findIndex((item) => item.module_id === module_id),
    [modules, module_id]
  );
  const selected_module = selected_index >= 0 ? modules[selected_index] : modules[0] || null;
  const quiz_done = useMemo(() => {
    if (!active?.course_id) return EMPTY_QUIZ_DONE;
    return completed_quiz_ids[active.registration_id || active.course_id] || EMPTY_QUIZ_DONE;
  }, [active?.course_id, completed_quiz_ids]);
  const lesson_start = modules.
  slice(0, Math.max(selected_index, 0)).
  reduce((sum, item) => sum + (item.lessons?.length || 0), 0);
  const selected_rows = useMemo(
    () => module_rows(selected_module, quiz_done, selected_index < 0 ? 0 : lesson_start),
    [selected_module, quiz_done, selected_index, lesson_start]
  );
  const module_pct = module_progress(selected_module);
  const lesson_count = selected_module?.lessons?.length || 0;
  const quiz_count = selected_module?.quizzes?.length || 0;
  const course_pct = Math.max(0, Math.min(100, Number(active?.progress_percent) || 0));
  const hours = format_hours(active?.duration_hours);
  const started = active?.learning_status !== "not_started";
  const accessed = format_access_date(active?.last_accessed_at);
  const module_meta = [
    lesson_count ? `${lesson_count} ${lesson_count === 1 ? ENGLISH.lesson : ENGLISH.lessons}` : "",
    quiz_count ? `${quiz_count} ${quiz_count === 1 ? ENGLISH.quiz : ENGLISH.quizzes}` : "",
    hours || "",
    status_label(active?.learning_status)
  ].filter(Boolean);

  if (!active) return null;

  return (
    <div className="myc_rail">
      <div className="myc_rail_tabs" role="tablist" aria-label={ENGLISH.my_courses_2}>
        {courses.map((course) => {
          const on = course.registration_id === active.registration_id;
          const ring = Math.max(0, Math.min(100, Number(course.progress_percent) || 0));
          return (
            <button
              key={course.registration_id || course.course_id}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? "myc_rail_tab is_on" : "myc_rail_tab"}
              onClick={() => on_select(course.course_id, course.registration_id)}>
              <span className="myc_rail_tab_name">{course.course_name}</span>
              <Progress_Ring value={ring} />
            </button>
          );
        })}
      </div>

      <div className="myc_rail_panel">
        <header className="myc_switch_head" ref={head_ref}>
          <div className="myc_switch_head_copy">
            <p className="myc_mod_label">
              {selected_module ? ENGLISH.module_2(selected_index + 1) : ENGLISH.course}
            </p>
            <h3>{selected_module?.module_title || active.course_name}</h3>
            <p className="myc_mod_meta">{module_meta.join(" · ") || active.course_code}</p>
          </div>
          <div className="myc_mod_progress">
            <span className="myc_mod_progress_label">{ENGLISH.progress}<Info_Icon />
            </span>
            <div className="myc_mod_progress_row">
              <b>{Math.round(selected_module ? module_pct : course_pct)}%</b>
              <span className="myc_mod_bar" aria-hidden="true">
                <i style={{ width: `${selected_module ? module_pct : course_pct}%` }} />
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`myc_switch_toggle${body_open ? " is_open" : ""}`}
            aria-expanded={body_open}
            aria-label={body_open ? ENGLISH.collapse_module : ENGLISH.expand_module}
            onClick={() => set_body_open((open) => !open)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        {body_open ?
          <div className="myc_switch_body">
            {outline_loading && !outline ?
              <p className="myc_outline_wait">{ENGLISH.loading_modules}</p> :
              null}

            {!outline_loading && outline_error ?
              <p className="myc_outline_wait">{outline_error}</p> :
              null}

            {!outline_loading && !outline_error && !modules.length ?
              <p className="myc_outline_wait">{ENGLISH.no_modules_have_been_published_for_this_course}</p> :
              null}

            {modules.length ?
              <div className="myc_switch_split">
                <aside className="myc_chapters" aria-label={ENGLISH.modules}>
                  {modules.map((module, index) => {
                    const on = module.module_id === selected_module?.module_id;
                    return (
                      <button
                        key={module.module_id || index}
                        type="button"
                        className={on ? "myc_chapter is_on" : "myc_chapter"}
                        onClick={() => choose_module(module.module_id)}>
                        <span className="myc_chapter_copy">
                          <small>{ENGLISH.module}{index + 1}</small>
                          <strong>{module.module_title}</strong>
                        </span>
                        <span className="myc_chapter_chev" aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </aside>

                <div className="myc_lessons">
                  <h4>{ENGLISH.lessons}</h4>
                  {selected_rows.length ?
                    <ul>
                      {selected_rows.map((row) =>
                        <li key={row.key}>
                          <button
                            type="button"
                            className={`myc_lesson is_${row.kind}`}
                            disabled={busy_id === active.course_id}
                            onClick={() => on_open(active, { kind: row.kind, id: row.id })}>
                            <span className="myc_lesson_icon" aria-hidden="true">
                              {row.kind === "quiz" ? <Quiz_Icon /> : <Lesson_Icon />}
                            </span>
                            <span className="myc_lesson_copy">
                              <b>{row.title}</b>
                              {row.meta ? <small>{row.meta}</small> : null}
                            </span>
                            <span
                              className={`myc_lesson_status${row.done ? " is_done" : row.needs_attention ? " is_warn" : ""}`}
                              aria-hidden="true">
                              
                              {row.done ? <Done_Icon /> : row.needs_attention ? <Warn_Icon /> : null}
                            </span>
                          </button>
                        </li>
                      )}
                    </ul> :
                    <p className="myc_lessons_empty">{ENGLISH.no_published_lessons_in_this_module_yet}</p>}
                </div>
              </div> :
              null}
          </div> :
          null}

        <footer className="myc_course_foot">
          <p>
            {COPY.lastAccessed}: {accessed || COPY.never}
          </p>
          <button
            type="button"
            className={started ? "myc_btn myc_btn_ghost" : "myc_btn"}
            disabled={busy_id === active.course_id}
            onClick={() => on_open(active)}>
            {started ? COPY.continue : COPY.start}
          </button>
        </footer>
      </div>
    </div>
  );
}
