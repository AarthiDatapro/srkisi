import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EmptyState } from "@datapromr/empty-state";
import { useToast } from "@datapromr/toast";
import {
  complete_lesson,
  get_learn_course,
  get_learn_lesson,
  get_learn_quiz,
  save_lesson_feedback,
  submit_learn_quiz } from
"./api.js";
import { COPY } from "./constants.js";
import { course_interview_context, default_lesson_tab, file_kind, initials, item_href, lesson_ai_context, material_items, package_pages } from "./utils.js";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../constants/english/course_learning_constants_english.js";

function merge_lesson_items(payload, lesson_id, items) {
  if (!payload) return payload;
  const id = Number(lesson_id);
  const paint = (lesson) => Number(lesson.lesson_id) === id ? { ...lesson, items: items || [] } : lesson;
  return {
    ...payload,
    lessons: (payload.lessons || []).map(paint),
    modules: (payload.modules || []).map((module) => ({
      ...module,
      lessons: (module.lessons || []).map(paint)
    }))
  };
}

function with_lesson_html(payload, cache) {
  if (!payload || !cache?.size) return payload;
  let next = payload;
  for (const [lesson_id, items] of cache) {
    next = merge_lesson_items(next, lesson_id, items);
  }
  return next;
}

function take_open_target(course_id) {
  try {
    const raw = sessionStorage.getItem(`lrn_open_${course_id}`);
    if (!raw) return null;
    sessionStorage.removeItem(`lrn_open_${course_id}`);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function focus_open_target(payload, target, set_active_kind, set_active_id, set_tab) {
  if (target?.kind === "lesson" && target.id != null) {
    const lesson = (payload.lessons || []).find((item) => Number(item.lesson_id) === Number(target.id));
    if (!lesson) return false;
    set_active_kind("lesson");
    set_active_id(lesson.lesson_id);
    set_tab(default_lesson_tab(lesson));
    return true;
  }
  if (target?.kind === "quiz" && target.id != null) {
    const quiz = (payload.quizzes || []).find((item) => Number(item.quiz_id) === Number(target.id));
    if (!quiz) return false;
    set_active_kind("quiz");
    set_active_id(quiz.quiz_id);
    return true;
  }
  return false;
}
import robot_src from "../assets/mock_interview_robot.svg";
import { Content_Sidebar } from "./ui/content_sidebar.jsx";
import { Feedback_Pane } from "./ui/feedback_pane.jsx";
import { Help_Chat } from "./ui/help_chat.jsx";
import { Lesson_Stage } from "./ui/lesson_stage.jsx";
import { Quiz_Player } from "./ui/quiz_player.jsx";
import { Search_Icon } from "./ui/icons.jsx";
import "./theme/learn.css";
import "./theme/learn_stage.css";
import "./theme/learn_quiz.css";
import "./theme/learn_chat.css";
import { use_slug_mirror } from "../url_slugs.js";

export function Course_Learning({ course_id, registration_id = null, on_back, on_mock_interview }) {
  const toast = useToast();
  const [data, set_data] = useState(null);
  const [active_kind, set_active_kind] = useState("lesson");
  const [active_id, set_active_id] = useState(null);
  const [tab, set_tab] = useState("overview");
  const [topic_index] = useState(0);
  const [search, set_search] = useState("");

  use_slug_mirror(
    course_id ? `/dashboard/learn/${course_id}` : "/__wait",
    { q: search },
    { q: "" },
    (from_url) => set_search(from_url.q || "")
  );
  const [loading, set_loading] = useState(true);
  const [saving_feedback, set_saving_feedback] = useState(false);
  const [quiz_data, set_quiz_data] = useState(null);
  const [quiz_loading, set_quiz_loading] = useState(false);
  const [quiz_submitting, set_quiz_submitting] = useState(false);
  const [help_open, set_help_open] = useState(false);
  const [pending_feedback_lesson_id, set_pending_feedback_lesson_id] = useState(null);
  const [pending_quiz_submit, set_pending_quiz_submit] = useState(null);
  const [quiz_round, set_quiz_round] = useState(0);
  const [content_open, set_content_open] = useState(false);
  const [lesson_loading_id, set_lesson_loading_id] = useState(null);
  const lesson_html = useRef(new Map());
  const lesson_pending = useRef(new Set());
  const lesson_applied = useRef(new Set());
  const mounted = useRef(false);

  function put_course(payload) {
    set_data(with_lesson_html(payload, lesson_html.current));
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!course_id || typeof window === "undefined") return undefined;
    try {
      sessionStorage.removeItem(`lrn_pending_feedback_${course_id}`);
      sessionStorage.removeItem(`lrn_pending_quiz_${course_id}`);
    } catch {
      /* ignore */
    }
    return undefined;
  }, [course_id]);

  useEffect(() => {
    let alive = true;
    if (!course_id) {
      set_loading(false);
      set_data(null);
      return undefined;
    }
    set_loading(true);
    get_learn_course(course_id, registration_id).
    then((payload) => {
      if (!alive) return;
      put_course(payload);
      const open_target = take_open_target(course_id);
      if (focus_open_target(payload, open_target, set_active_kind, set_active_id, set_tab)) return;

      const first_open =
      payload.lessons.find((lesson) => !lesson.is_completed) || payload.lessons[0] || null;
      if (first_open) {
        set_active_kind("lesson");
        set_active_id(first_open.lesson_id);
        set_tab(default_lesson_tab(first_open));
      } else if (payload.quizzes?.[0]) {
        set_active_kind("quiz");
        set_active_id(payload.quizzes[0].quiz_id);
      } else {
        set_active_id(null);
      }
    }).
    catch((err) => {
      toast.error(err.message);
    }).
    finally(() => {
      if (alive) set_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [course_id, registration_id, toast]);

  useEffect(() => {
    if (!course_id || !data || active_kind !== "lesson" || active_id == null) return undefined;
    const lesson_id = Number(active_id);
    if (!Number.isInteger(lesson_id) || lesson_id < 1) return undefined;
    if (lesson_applied.current.has(lesson_id)) return undefined;

    const cached = lesson_html.current.get(lesson_id);
    if (cached) {
      lesson_applied.current.add(lesson_id);
      set_data((current) => merge_lesson_items(current, lesson_id, cached));
      return undefined;
    }
    if (lesson_pending.current.has(lesson_id)) return undefined;

    lesson_pending.current.add(lesson_id);
    set_lesson_loading_id(lesson_id);
    get_learn_lesson(course_id, lesson_id, registration_id).
    then((payload) => {
      const items = payload.items || [];
      lesson_html.current.set(lesson_id, items);
      lesson_pending.current.delete(lesson_id);
      if (!mounted.current) return;
      lesson_applied.current.add(lesson_id);
      set_data((current) => merge_lesson_items(current, lesson_id, items));
    }).
    catch((err) => {
      lesson_pending.current.delete(lesson_id);
      if (mounted.current) toast.error(err.message);
    }).
    finally(() => {
      if (mounted.current) {
        set_lesson_loading_id((current) => current === lesson_id ? null : current);
      }
    });
    return undefined;
  }, [course_id, registration_id, active_kind, active_id, Boolean(data), toast]);

  useEffect(() => {
    function jump() {
      if (!data || !course_id) return;
      const target = take_open_target(course_id);
      if (!target) return;
      focus_open_target(data, target, set_active_kind, set_active_id, set_tab);
    }
    window.addEventListener("lms-navigate", jump);
    return () => window.removeEventListener("lms-navigate", jump);
  }, [course_id, data]);

  const modules = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data?.modules || [];
    if (!q) return list;
    return list.
    map((module) => ({
      ...module,
      lessons: (module.lessons || []).filter(
        (lesson) =>
        lesson.lesson_title.toLowerCase().includes(q) ||
        package_pages(lesson).some((page) => page.title.toLowerCase().includes(q)) ||
        (lesson.quizzes || []).some((quiz) => (quiz.quiz_title || "quiz").toLowerCase().includes(q))
      ),
      quizzes: (module.quizzes || []).filter((quiz) =>
      (quiz.quiz_title || "quiz").toLowerCase().includes(q)
      )
    })).
    filter((module) => module.lessons.length || module.quizzes?.length);
  }, [data, search]);

  const lessons = useMemo(
    () => modules.flatMap((module) => module.lessons || []),
    [modules]
  );
  const quizzes = useMemo(
    () => modules.flatMap((module) => module.quizzes || []),
    [modules]
  );

  const lesson = lessons.find((item) => item.lesson_id === active_id) || null;
  const index = lessons.findIndex((item) => item.lesson_id === lesson?.lesson_id);
  const student = data?.student;
  const name = student ? `${student.first_name} ${student.last_name}`.trim() : ENGLISH.student;
  const progress = Number(data?.enrollment?.progress_percent) || 0;

  const active_module = useMemo(() => {
    if (!modules.length || active_id == null) return null;
    for (let module_index = 0; module_index < modules.length; module_index += 1) {
      const module = modules[module_index];
      const in_lessons =
      active_kind === "lesson" &&
      (module.lessons || []).some((item) => item.lesson_id === active_id);
      const in_quizzes =
      active_kind === "quiz" &&
      ((module.quizzes || []).some((item) => item.quiz_id === active_id) ||
      (module.lessons || []).some((lesson_item) =>
      (lesson_item.quizzes || []).some((item) => item.quiz_id === active_id)
      ));
      if (in_lessons || in_quizzes) {
        return {
          number: module_index + 1,
          title: module.module_title || ENGLISH.module
        };
      }
    }
    return null;
  }, [modules, active_id, active_kind]);

  const quiz_home = useMemo(() => {
    if (active_kind !== "quiz" || active_id == null) return null;
    let lesson_no = 0;
    for (let module_index = 0; module_index < modules.length; module_index += 1) {
      const module = modules[module_index];
      for (const item of module.lessons || []) {
        lesson_no += 1;
        const hit = (item.quizzes || []).some((quiz) => Number(quiz.quiz_id) === Number(active_id));
        if (!hit) continue;
        return {
          module_no: module_index + 1,
          module_name: module.module_title || ENGLISH.module,
          lesson_no,
          lesson_id: item.lesson_id,
          lesson_name: item.lesson_title || ENGLISH.lesson
        };
      }
    }
    for (let module_index = 0; module_index < modules.length; module_index += 1) {
      const module = modules[module_index];
      const hit = (module.quizzes || []).some((quiz) => Number(quiz.quiz_id) === Number(active_id));
      if (!hit) continue;
      return {
        module_no: module_index + 1,
        module_name: module.module_title || ENGLISH.module,
        lesson_no: 0,
        lesson_name: ""
      };
    }
    return null;
  }, [modules, active_id, active_kind]);

  const feedback_locked =
    pending_feedback_lesson_id != null &&
    Number(pending_feedback_lesson_id) === Number(lesson?.lesson_id);

  function release_held_quiz() {
    set_pending_feedback_lesson_id(null);
    set_pending_quiz_submit(null);
    set_quiz_round((round) => round + 1);
  }

  function open_lesson(id, next_tab) {
    if (!id) return;
    if (pending_quiz_submit || pending_feedback_lesson_id != null) release_held_quiz();
    const picked =
      lessons.find((item) => item.lesson_id === id) ||
      data?.lessons?.find((item) => item.lesson_id === id) ||
      null;
    set_active_kind("lesson");
    set_active_id(id);
    set_tab(next_tab || default_lesson_tab(picked));
    set_quiz_data(null);
  }

  function open_quiz(id) {
    if (pending_quiz_submit && Number(pending_quiz_submit.quiz_id) !== Number(id)) release_held_quiz();
    else if (!pending_quiz_submit && pending_feedback_lesson_id != null) release_held_quiz();
    set_active_kind("quiz");
    set_active_id(id);
  }

  function change_tab(next_tab) {
    if (feedback_locked && next_tab !== "feedback") release_held_quiz();
    set_tab(next_tab);
  }

  useEffect(() => {
    let alive = true;
    if (active_kind !== "quiz" || !active_id || !course_id) {
      set_quiz_data(null);
      return undefined;
    }
    set_quiz_loading(true);
    get_learn_quiz(course_id, active_id, registration_id).
    then((payload) => {
      if (alive) set_quiz_data(payload);
    }).
    catch((err) => {
      toast.error(err.message);
    }).
    finally(() => {
      if (alive) set_quiz_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [active_kind, active_id, course_id, registration_id, toast]);

  async function mark_complete() {
    if (!lesson || lesson.is_completed) return;
    try {
      const payload = await complete_lesson(course_id, lesson.lesson_id, registration_id);
      put_course(payload);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function finalize_quiz_submit({ quiz_id, answers, duration_seconds, show_toast = true }) {
    const payload = await submit_learn_quiz(course_id, quiz_id, answers, duration_seconds, registration_id);
    const score = payload.attempt?.percent ?? 0;
    set_quiz_data(payload);
    if (show_toast) toast.success(ENGLISH.scored(score));
    return payload;
  }

  function locate_quiz(quiz_id) {
    const source = data?.modules || [];
    for (let module_index = 0; module_index < source.length; module_index += 1) {
      const module = source[module_index];
      for (const item of module.lessons || []) {
        const hit = (item.quizzes || []).some((quiz) => Number(quiz.quiz_id) === Number(quiz_id));
        if (!hit) continue;
        return {
          module_name: module.module_title || ENGLISH.module,
          lesson_id: item.lesson_id,
          lesson_name: item.lesson_title || ENGLISH.lesson
        };
      }
    }
    return quiz_home && Number(quiz_home.lesson_id) > 0 ? quiz_home : null;
  }

  async function submit_feedback({ rating, remarks }) {
    const held_quiz = pending_quiz_submit || null;
    const lesson_id = held_quiz?.lesson_id || lesson?.lesson_id;
    if (!lesson_id) return;
    set_saving_feedback(true);
    try {
      const payload = await save_lesson_feedback(course_id, lesson_id, {
        rating,
        remarks,
        quiz_id: held_quiz?.quiz_id || null
      }, registration_id);
      put_course(payload);
      set_pending_feedback_lesson_id(null);

      if (held_quiz) {
        set_quiz_submitting(true);
        try {
          const quiz_payload = await finalize_quiz_submit({
            quiz_id: held_quiz.quiz_id,
            answers: held_quiz.answers,
            duration_seconds: held_quiz.duration_seconds,
            show_toast: false
          });
          const score = quiz_payload.attempt?.percent ?? 0;
          set_pending_quiz_submit(null);
          set_active_kind("quiz");
          set_active_id(Number(held_quiz.quiz_id));
          toast.success(`${COPY.quizSubmittedAfterFeedback} ${score}%.`);
        } catch (quiz_err) {
          toast.error(
            ENGLISH.quiz_not_submitted_yet(COPY.feedbackSaved, quiz_err.message)
          );
          return;
        } finally {
          set_quiz_submitting(false);
        }
      } else {
        toast.success(COPY.feedbackSaved);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving_feedback(false);
    }
  }

  async function submit_quiz({ answers, duration_seconds }) {
    if (!active_id) return;
    const place = locate_quiz(active_id);
    const feedback_lesson_id =
      quiz_data?.quiz?.lesson_id ||
      place?.lesson_id ||
      quizzes.find((item) => Number(item.quiz_id) === Number(active_id))?.lesson_id ||
      null;
    if (!feedback_lesson_id) {
      set_quiz_submitting(true);
      try {
        await finalize_quiz_submit({
          quiz_id: active_id,
          answers,
          duration_seconds
        });
      } catch (err) {
        toast.error(err.message);
      } finally {
        set_quiz_submitting(false);
      }
      return;
    }

    set_pending_quiz_submit({
      quiz_id: Number(active_id),
      lesson_id: Number(feedback_lesson_id),
      module_name: place?.module_name || quiz_home?.module_name || "",
      lesson_name: place?.lesson_name || quiz_home?.lesson_name || "",
      answers,
      duration_seconds
    });
  }

  const has_content = lessons.length || quizzes.length;
  const topic =
  active_kind === "quiz" ?
  quizzes.find((item) => item.quiz_id === active_id)?.quiz_title :
  lesson?.lesson_title;
  const materials = material_items(lesson).
  map((item) => {
    const href = item_href(item);
    const file_name = item.file_name || "";
    const name = item.content_title || file_name || "";
    return {
      href,
      name,
      file_name,
      kind: file_kind(`${file_name} ${name}`, href)
    };
  }).
  filter((item) => item.href);

  return (
    <section className="lrn_desk">
      <header className="lrn_top">
        <button
          type="button"
          className="lrn_back"
          onClick={() => {
            release_held_quiz();
            on_back?.();
          }}
          aria-label={ENGLISH.back_to_my_courses}>
          <span className="lrn_back_full">{ENGLISH.my_courses}</span>
          <span className="lrn_back_short">{ENGLISH.back}</span>
        </button>
        <label className="lrn_search">
          <Search_Icon />
          <input
            value={search}
            onChange={(event) => set_search(event.target.value)}
            placeholder={ENGLISH.search_lessons} />
          
        </label>
        <div className="lrn_user">
          <div className="lrn_user_avatar">{initials(student?.first_name, student?.last_name)}</div>
          <div>
            <strong>{name}</strong>
            <span>{ENGLISH.student}</span>
          </div>
        </div>
      </header>

      {loading ?
      <EmptyState>{ENGLISH.loading_course}</EmptyState> :
      !has_content ?
      <EmptyState>{COPY.empty}</EmptyState> :

      <div className="lrn is_side_off">
          <Content_Sidebar
          modules={modules}
          lessons={lessons}
          quizzes={quizzes}
          active_id={active_id}
          active_kind={active_kind}
          progress={progress}
          open={content_open}
          on_close={() => set_content_open(false)}
          on_select_lesson={(id) => {
            open_lesson(id);
            set_content_open(false);
          }}
          on_select_quiz={(id) => {
            open_quiz(id);
            set_content_open(false);
          }} />
        
          {active_kind === "quiz" ?
        quiz_loading || !quiz_data ?
        <EmptyState>{ENGLISH.loading_quiz}</EmptyState> :

        <Quiz_Player
          key={`${active_id}-${quiz_round}`}
          quiz={quiz_data.quiz}
          module_name={quiz_home?.module_name || ""}
          module_no={quiz_home?.module_no || 0}
          lesson_name={quiz_home?.lesson_name || ""}
          lesson_no={quiz_home?.lesson_no || 0}
          questions={quiz_data.questions}
          attempt={quiz_data.attempt}
          submitting={quiz_submitting}
          on_submit={submit_quiz}
          on_open_content={() => set_content_open((open) => !open)}
          on_mock_interview={() => on_mock_interview?.(course_interview_context({
            course: data?.course,
            modules,
            quiz: quiz_data.quiz
          }))} /> :


        lesson ?
        <Lesson_Stage
          key={lesson.lesson_id}
          course={data.course}
          registration_id={registration_id}
          module_title={
          active_module ?
          ENGLISH.module_2(active_module.number, active_module.title) :
          modules.find((module) => (module.lessons || []).some((item) => item.lesson_id === lesson.lesson_id))?.module_title
          }
          lesson_no={(() => {
            let count = 0;
            for (const module of modules) {
              for (const item of module.lessons || []) {
                count += 1;
                if (item.lesson_id === lesson.lesson_id) return count;
              }
            }
            return 0;
          })()}
          lesson={lesson}
          content_loading={Number(lesson_loading_id) === Number(lesson.lesson_id)}
          tab={tab}
          feedback_required={feedback_locked}
          can_prev={index > 0}
          can_next={index >= 0 && index < lessons.length - 1}
          materials={materials}
          on_tab={change_tab}
          on_open_content={() => set_content_open((open) => !open)}
          on_prev={(next_tab) => {
            const prev = lessons[index - 1];
            open_lesson(prev?.lesson_id, next_tab);
          }}
          on_next={(next_tab) => {
            open_lesson(lessons[index + 1]?.lesson_id, next_tab);
          }}
          on_complete={() => {
            if (feedback_locked) release_held_quiz();
            mark_complete();
          }}
          on_feedback={submit_feedback}
          on_ask={() => set_help_open(true)}
          on_interview={() => on_mock_interview?.(course_interview_context({
            course: data?.course,
            modules,
            quiz: { lesson_id: lesson.lesson_id, module_id: lesson.module_id }
          }))}
          saving_feedback={saving_feedback}
          feedback_questions={data?.feedback_questions || []} /> :


        <EmptyState>{COPY.empty}</EmptyState>
        }
        </div>
      }
      {pending_quiz_submit ? createPortal(
        <div
          className="lrn_fb_scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lrn_fb_title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving_feedback && !quiz_submitting) {
              release_held_quiz();
            }
          }}>
          <div className="lrn_fb_card">
            <img src={robot_src} alt="" />
            <h2 id="lrn_fb_title">{ENGLISH.how_was_this_lesson}</h2>
            {pending_quiz_submit.module_name || pending_quiz_submit.lesson_name ?
              <p className="lrn_fb_where">
                {[pending_quiz_submit.module_name, pending_quiz_submit.lesson_name].filter(Boolean).join("  ·  ")}
              </p> :
              null}
            <div className="lrn_fb_body">
              <Feedback_Pane
                lesson={{ lesson_id: pending_quiz_submit.lesson_id }}
                questions={data?.feedback_questions || []}
                saving={saving_feedback || quiz_submitting}
                required
                in_modal
                on_save={submit_feedback} />
            </div>
          </div>
        </div>,
        document.body
      ) : null}
      <Help_Chat
        open={help_open}
        topic={package_pages(lesson)[topic_index]?.title || topic}
        course_name={data?.course?.course_name}
        lesson_title={lesson?.lesson_title}
        lesson_content={lesson_ai_context(lesson, topic_index)}
        student_name={name}
        on_close={() => set_help_open(false)} />
      
    </section>);

}
