import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@datapromr/toast";
import { access_my_course, list_my_courses } from "../my_courses/api.js";
import { get_student_profile } from "../student_profile/api.js";
import { list_open_jobs } from "../jobs_manager/api.js";
import { display_name, first_name } from "./utils.js";
import {
  Award_Icon,
  Book_Icon,
  Check_Icon,
  Python_Icon,
  React_Icon,
  Sql_Icon,
  Target_Icon,
  Question_Circle_Icon,
  Play_Icon,
  Trophy_Icon } from
"./ui/icons.jsx";
import { list_student_hackathons } from "../hackathon_manager/api.js";
import "./theme/home.css";
import { STUDENT_HOME_ENGLISH as ENGLISH } from "../constants/english/student_home_constants_english.js";

function format_day(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function program_dates(course) {
  return [format_day(course.program_start), format_day(course.program_end)].filter(Boolean).join(" – ");
}

function course_key(item) {
  if (item?.registration_id != null && item.registration_id !== "") return `r${item.registration_id}`;
  if (item?.course_id != null && item.course_id !== "") return String(item.course_id);
  return String(item?.course_name || "");
}

function quiz_percent(quiz) {
  const direct = Number(quiz?.percent);
  if (Number.isFinite(direct)) return direct;
  const match = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(String(quiz?.score || ""));
  if (!match || Number(match[2]) === 0) return null;
  return Number(match[1]) / Number(match[2]) * 100;
}

function read_stamp(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function short_stamp(date) {
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function hackathon_view(item, now) {
  const starts = read_stamp(item.starts_at);
  const ends = read_stamp(item.ends_at);
  const phase = starts && now < starts ? "upcoming" : ends && now > ends ? "ended" : "live";
  const total = Number(item.goal_count ?? item.item_count) || 0;
  const answered = Number(item.done_count ?? item.answered_count) || 0;
  let badge = { get label() { return ENGLISH.join_now; }, tone: "shd_quiz_pending" };
  if (phase === "upcoming") badge = { get label() { return ENGLISH.upcoming; }, tone: "shd_hack_upcoming" };
  else if (total && answered >= total) badge = { get label() { return ENGLISH.submitted; }, tone: "shd_quiz_score" };
  else if (answered) badge = { label: `${answered}/${total} done`, tone: "shd_hack_progress" };
  const when = phase === "upcoming" ? ENGLISH.starts(short_stamp(starts)) : ends ? ENGLISH.ends(short_stamp(ends)) : ENGLISH.open_now;
  const where = item.audience === "open" ? ENGLISH.open_to_all : item.program_name || item.cohort_name || ENGLISH.your_program;
  return { ...item, phase, badge, meta: [where, when].join(" · "), done: Boolean(total && answered >= total) };
}

function hackathon_window(items) {
  const now = new Date();
  const rank = { live: 0, upcoming: 1 };
  return (items || [])
    .map((item) => hackathon_view(item, now))
    .filter((item) => item.phase !== "ended")
    .sort((a, b) =>
      rank[a.phase] - rank[b.phase] ||
      Number(a.done) - Number(b.done) ||
      String(a.phase === "upcoming" ? a.starts_at : a.ends_at || "9999").localeCompare(String(b.phase === "upcoming" ? b.starts_at : b.ends_at || "9999")))
    .slice(0, 3);
}

function average_percent(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

const JOB_MATCH_STOP_WORDS = new Set([
  "and", "are", "for", "from", "have", "into", "job", "our", "role", "the", "their", "with", "you",
  "your", "years", "work", "working", "experience", "skills", "knowledge", "ability", "team", "must", "will"
]);

function profile_match_terms(profile) {
  const student = profile?.student || {};
  const details = [
    student.headline,
    student.professional_summary,
    student.degree,
    student.higher_study,
    ...(profile?.skills || []).flatMap((item) => [item.skill_category, item.skill_items]),
    ...(profile?.experiences || []).flatMap((item) => [item.role_title, item.description]),
    ...(profile?.projects || []).flatMap((item) => [item.project_name, item.role_title, item.tech_stack, item.description]),
    ...(profile?.achievements || []).map((item) => item.achievement_text)
  ];
  return new Set(details
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .match(/[a-z0-9+#.]+/g)?.filter((term) => term.length > 1 && !JOB_MATCH_STOP_WORDS.has(term)) || []);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function active_jobs(payload) {
  return (payload?.items || []).filter((job) => job?.job_id && job.is_active !== false && Number(job.is_active) !== 0);
}

let job_input_snapshot = null;
const job_input_listeners = new Set();

function publish_job_inputs(profile, open_jobs) {
  const has_profile = Boolean(profile?.data);
  const has_jobs = Boolean(open_jobs?.data);
  if (!has_profile && !has_jobs && (job_input_snapshot?.profile || job_input_snapshot?.jobs)) return;

  job_input_snapshot = {
    profile: has_profile ? profile.data : null,
    jobs: has_jobs ? active_jobs(open_jobs.data) : null,
    profile_error: has_profile ? "" : profile?.error?.message || "Unable to load your profile for job recommendations.",
    jobs_error: has_jobs ? "" : open_jobs?.error?.message || "Unable to load job recommendations."
  };
  job_input_listeners.forEach((listener) => listener(job_input_snapshot));
}

function subscribe_job_inputs(listener) {
  job_input_listeners.add(listener);
  if (job_input_snapshot) listener(job_input_snapshot);
  return () => {
    job_input_listeners.delete(listener);
    if (!job_input_listeners.size) job_input_snapshot = null;
  };
}

async function load_job_inputs(is_alive) {
  let profile = { error: new Error("Unable to load your profile for job recommendations.") };
  let open_jobs = { error: new Error("Unable to load job recommendations.") };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!is_alive()) return { profile, open_jobs };
    [profile, open_jobs] = await Promise.all([
      get_student_profile().then((data) => ({ data })).catch((error) => ({ error })),
      list_open_jobs().then((data) => ({ data })).catch((error) => ({ error }))
    ]);
    publish_job_inputs(profile, open_jobs);
    const profile_ready = Boolean(profile.data);
    const jobs_ready = Boolean(open_jobs.data);
    const open_count = (open_jobs.data?.items || []).length;
    const has_terms = profile_match_terms(profile.data).size > 0;
    const failed = !profile_ready || !jobs_ready;
    const empty_on_first = profile_ready && jobs_ready && !has_terms && open_count > 0 && attempt === 0;
    if (!failed && !empty_on_first) break;
    if (attempt === 2) break;
    await wait(500);
  }

  return { profile, open_jobs };
}

function recommend_jobs(jobs, profile) {
  const terms = profile_match_terms(profile);
  if (!terms.size) return [];

  return (jobs || []).map((job, index) => {
    const title_terms = new Set(String(job.job_title || "").toLowerCase().match(/[a-z0-9+#.]+/g) || []);
    const job_terms = new Set([
      job.job_title,
      job.job_description,
      job.location
    ].filter(Boolean).join(" ").toLowerCase().match(/[a-z0-9+#.]+/g) || []);
    const score = [...terms].reduce((total, term) =>
      total + (title_terms.has(term) ? 3 : job_terms.has(term) ? 1 : 0), 0);
    return { job, score, index };
  }).filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 3)
    .map((item) => item.job);
}

function quiz_window(quizzes, courses) {
  const pending = (quizzes || []).filter((quiz) => quiz.status !== "completed");
  const course_keys = [];
  const seen_courses = new Set();
  for (const course of courses || []) {
    const key = course_key(course);
    if (!key || seen_courses.has(key)) continue;
    seen_courses.add(key);
    course_keys.push(key);
  }
  if (course_keys.length <= 1) return pending.slice(0, 3);

  const pending_by_course = new Map();
  for (const quiz of pending) {
    const key = course_key(quiz);
    if (!pending_by_course.has(key)) pending_by_course.set(key, []);
    pending_by_course.get(key).push(quiz);
  }
  for (const key of pending_by_course.keys()) {
    if (!seen_courses.has(key)) course_keys.push(key);
  }

  const picked = [];
  const seen_quizzes = new Set();
  let added = true;
  while (picked.length < 3 && added) {
    added = false;
    for (const key of course_keys) {
      const next = pending_by_course.get(key)?.shift();
      if (!next || seen_quizzes.has(`${next.registration_id || ""}:${next.quiz_id}`)) continue;
      picked.push(next);
      seen_quizzes.add(`${next.registration_id || ""}:${next.quiz_id}`);
      added = true;
      if (picked.length === 3) break;
    }
  }
  return picked;
}

const COURSE_TONES = ["lilac", "peach", "mint", "sky"];

function course_tone(index) {
  return COURSE_TONES[index % COURSE_TONES.length];
}

function taught_stamp(mark) {
  const key = mark_day(mark);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return {
    day: date.toLocaleDateString("en-IN", { day: "numeric" }),
    month: date.toLocaleDateString("en-IN", { month: "short" })
  };
}

function today_key() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function mark_day(mark) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(mark?.marked_on || ""))) return mark.marked_on;
  const date = new Date(mark?.marked_at);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function class_tickets(marks) {
  const marked = (marks || []).filter((mark) => mark.lesson_title && mark.lesson_id && mark_day(mark));
  const today = today_key();
  const todays = marked.filter((mark) => mark_day(mark) === today);
  if (todays.length) {
    return {
      items: todays,
      label: todays.length === 1 ? ENGLISH.label_1_today : ENGLISH.today(todays.length)
    };
  }
  return { items: marked[0] ? [marked[0]] : [], label: marked[0] ? ENGLISH.last_class : "" };
}

export function Student_Home({ active = true, on_open_learn, on_open_courses, on_profile, on_open_hackathon, on_open_hackathons }) {
  const toast = useToast();
  const [student, set_student] = useState(null);
  const [profile_data, set_profile_data] = useState(null);
  const [courses, set_courses] = useState([]);
  const [lesson_marks, set_lesson_marks] = useState([]);
  const [quizzes, set_quizzes] = useState([]);
  const [hackathons, set_hackathons] = useState([]);
  const [jobs, set_jobs] = useState([]);
  const [jobs_error, set_jobs_error] = useState("");
  const [profile_error, set_profile_error] = useState("");
  const [stats, set_stats] = useState({ enrolled: 0, completed: 0, in_progress: 0, certificates: 0 });
  const [busy_id, set_busy_id] = useState(null);
  const [loading, set_loading] = useState(true);
  const [picked_id, set_picked_id] = useState(null);
  const loaded = useRef(false);
  const profile_cache = useRef(null);
  const jobs_cache = useRef([]);
  const toast_ref = useRef(toast);
  toast_ref.current = toast;

  useEffect(() => subscribe_job_inputs((snapshot) => {
    if (snapshot.profile) {
      profile_cache.current = snapshot.profile;
      set_profile_data(snapshot.profile);
      set_profile_error("");
    } else if (!profile_cache.current && snapshot.profile_error) {
      set_profile_error(snapshot.profile_error);
    }
    if (snapshot.jobs) {
      jobs_cache.current = snapshot.jobs;
      set_jobs(snapshot.jobs);
      set_jobs_error("");
    } else if (!jobs_cache.current.length && snapshot.jobs_error) {
      set_jobs_error(snapshot.jobs_error);
    }
  }), []);

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    if (!loaded.current) set_loading(true);
    (async () => {
      try {
        const [mine, open_hackathons, matches] = await Promise.all([
          list_my_courses({ sort: "recent" }).catch(() => ({ items: [], stats: null })),
          list_student_hackathons().catch(() => []),
          load_job_inputs(() => alive)
        ]);
        if (!alive) return;
        const { profile, open_jobs } = matches;
        set_hackathons(Array.isArray(open_hackathons) ? open_hackathons : open_hackathons?.items || []);
        if (open_jobs.data) {
          const current_jobs = active_jobs(open_jobs.data);
          jobs_cache.current = current_jobs;
          set_jobs(current_jobs);
          set_jobs_error("");
        } else if (!jobs_cache.current.length) {
          set_jobs_error(open_jobs.error?.message || "Unable to load job recommendations.");
        }
        if (profile.data) {
          profile_cache.current = profile.data;
          set_profile_data(profile.data);
          set_profile_error("");
        } else if (!profile_cache.current) {
          set_profile_error(profile.error?.message || "Unable to load your profile for job recommendations.");
        }

        const next_student = {
          ...(mine.student || {}),
          ...(profile.data?.student || profile_cache.current?.student || {})
        };
        set_student(next_student);

        const real_items = mine.items || [];
        set_courses(real_items);
        set_lesson_marks(mine.lesson_marks || []);
        set_quizzes(mine.quizzes || []);

        const enrolled = mine.stats?.enrolled ?? real_items.length;
        const completed = mine.stats?.completed ?? real_items.filter((c) => c.learning_status === "completed").length;
        const in_progress = mine.stats?.in_progress ?? enrolled - completed;
        const certificates = mine.stats?.certificates ?? 0;
        set_stats({ enrolled, completed, in_progress, certificates });
        loaded.current = true;
      } catch (err) {
        toast_ref.current.error(err.message);
      } finally {
        if (alive) set_loading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  const class_board = useMemo(() => class_tickets(lesson_marks), [lesson_marks]);
  const hackathon_cards = useMemo(() => hackathon_window(hackathons), [hackathons]);
  const recommended_jobs = useMemo(() => recommend_jobs(jobs, profile_data), [jobs, profile_data]);
  const overall_progress = useMemo(() => {
    if (!courses || courses.length === 0) return 0;
    const total = courses.reduce((sum, c) => sum + (Number(c.progress_percent) || 0), 0);
    return Math.round(total / courses.length);
  }, [courses]);

  const picked_course = courses.find((course) => String(course.registration_id || course.course_id) === String(picked_id)) || courses[0] || null;
  const picked_index = Math.max(0, courses.findIndex((course) => course.course_id === picked_course?.course_id));
  const picked_tone = course_tone(picked_index);
  const picked_done = useMemo(() => {
    if (!picked_course) return { count: 0, total: 0, average: null, quizzes: [] };
    const key = course_key(picked_course);
    const mine = (quizzes || []).filter((quiz) => course_key(quiz) === key);
    const done = mine.filter((quiz) => quiz.status === "completed");
    const waiting = mine.filter((quiz) => quiz.status !== "completed");
    const percents = done.map(quiz_percent).filter((value) => value != null);
    return {
      count: done.length,
      total: mine.length,
      average: average_percent(percents),
      quizzes: [...waiting, ...done]
    };
  }, [picked_course, quizzes]);

  async function open_course(course, lesson_id = null) {
    if (!course.course_id) return;
    set_busy_id(course.course_id);
    try {
      await access_my_course(course.course_id, course.registration_id).catch(() => null);
      if (lesson_id) {
        sessionStorage.setItem(
          `lrn_open_${course.course_id}`,
          JSON.stringify({ kind: "lesson", id: lesson_id })
        );
      }
      on_open_learn?.(course.course_id, course.registration_id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy_id(null);
    }
  }

  async function open_quiz(quiz) {
    if (!quiz?.course_id || !quiz?.quiz_id) return;
    set_busy_id(`quiz_${quiz.quiz_id}`);
    try {
      await access_my_course(quiz.course_id, quiz.registration_id).catch(() => null);
      sessionStorage.setItem(
        `lrn_open_${quiz.course_id}`,
        JSON.stringify({ kind: "quiz", id: quiz.quiz_id })
      );
      on_open_learn?.(quiz.course_id, quiz.registration_id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy_id(null);
    }
  }

  function render_course_icon(name) {
    const lname = String(name || "").toLowerCase();
    if (lname.includes("python")) return <Python_Icon />;
    if (lname.includes("react")) return <React_Icon />;
    if (lname.includes("sql") || lname.includes("database")) return <Sql_Icon />;
    return <Book_Icon />;
  }

  const user_first_name = first_name(student) || display_name(student) || ENGLISH.student;

  return (
    <div className="shd_container">
      {/* Welcome Header */}
      <header className="shd_header">
        <h1 className="shd_welcome">{ENGLISH.welcome_back}{user_first_name}</h1>
        <p className="shd_subtitle">{ENGLISH.keep_learning_keep_growing}</p>
      </header>

      <div className="shd_stats_grid">
        <div className="shd_stat_card shd_stat_purple">
          <button type="button" className="shd_stat_icon_wrapper shd_icon_purple" aria-label={ENGLISH.open_enrolled_courses} onClick={() => on_open_courses?.()}>
            <Book_Icon />
          </button>
          <div className="shd_stat_content">
            <span className="shd_stat_label">{ENGLISH.enrolled_courses}</span>
            <span className="shd_stat_value">
              {stats.enrolled} {stats.enrolled === 1 ? "course" : "courses"}
            </span>
          </div>
        </div>

        <div className="shd_stat_card shd_stat_green">
          <button
            type="button"
            className="shd_stat_icon_wrapper shd_icon_green"
            aria-label={ENGLISH.open_a_course_in_progress}
            onClick={() => {
              const match = courses.find((course) => course.learning_status === "in_progress");
              if (match) open_course(match);
              else on_open_courses?.();
            }}>
            <Play_Icon />
          </button>
          <div className="shd_stat_content">
            <span className="shd_stat_label">{ENGLISH.in_progress}</span>
            <span className="shd_stat_value">
              {stats.in_progress} {stats.in_progress === 1 ? "course" : "courses"}
            </span>
          </div>
        </div>

        <div className="shd_stat_card shd_stat_orange">
          <button
            type="button"
            className="shd_stat_icon_wrapper shd_icon_orange"
            aria-label={ENGLISH.open_a_completed_course}
            onClick={() => {
              const match = courses.find((course) => course.learning_status === "completed");
              if (match) open_course(match);
              else on_open_courses?.();
            }}>
            <Check_Icon />
          </button>
          <div className="shd_stat_content">
            <span className="shd_stat_label">{ENGLISH.completed}</span>
            <span className="shd_stat_value">
              {stats.completed} {stats.completed === 1 ? "course" : "courses"}
            </span>
          </div>
        </div>

        <div className="shd_stat_card shd_stat_purple">
          <button type="button" className="shd_stat_icon_wrapper shd_icon_purple" aria-label={ENGLISH.open_certificates} onClick={() => on_profile?.()}>
            <Award_Icon />
          </button>
          <div className="shd_stat_content">
            <span className="shd_stat_label">{ENGLISH.certificates_earned}</span>
            <span className="shd_stat_value">
              {stats.certificates} {stats.certificates === 1 ? "certificate" : "certificates"}
            </span>
          </div>
        </div>

        <div className="shd_stat_card shd_stat_blue">
          <button type="button" className="shd_stat_icon_wrapper shd_icon_blue" aria-label={ENGLISH.open_performance} onClick={() => on_profile?.()}>
            <Target_Icon />
          </button>
          <div className="shd_stat_content">
            <span className="shd_stat_label">{ENGLISH.average_performance}</span>
            <span className="shd_stat_value">{overall_progress}%</span>
          </div>
        </div>
      </div>

      {/* Middle Grid (My Courses + Continue Learning & Quizzes) */}
      <div className="shd_middle_grid">
        {/* Left Column: My Courses */}
        <div className="shd_card shd_my_courses_card">
          <div className="shd_card_header">
            <h2>{ENGLISH.my_courses}</h2>
            <button
              type="button"
              className="shd_link_btn"
              onClick={() => on_open_courses?.()}>{ENGLISH.view_all}</button>
          </div>

          <div className="shd_courses_list">
            {courses && courses.length > 0 ?
            courses.slice(0, 4).map((c, index) => {
              const is_completed = c.learning_status === "completed" || Number(c.progress_percent) === 100;
              const not_started = c.learning_status === "not_started";
              const progress = Math.max(0, Math.min(100, Number(c.progress_percent) || 0));
              const tone = course_tone(index);
              return (
                <div key={c.registration_id || c.course_id} className={`shd_course_item is_${tone}`}>
                    <div className="shd_course_top">
                      <div className="shd_course_brand">
                        {render_course_icon(c.course_name)}
                      </div>

                      <div className="shd_course_info">
                        <h3 className="shd_course_title">{c.course_name}</h3>
                        <p className="shd_course_trainer">{ENGLISH.trainer}{c.instructor || c.trainer_name || c.instructor_name || ENGLISH.assigned_trainer}
                        </p>
                      </div>

                      <div className="shd_course_action">
                        {is_completed ?
                      <button type="button" className="shd_btn_completed" disabled>{ENGLISH.completed}</button> :

                      <button
                        type="button"
                        className={not_started ? "shd_btn_continue_learning is_start" : "shd_btn_continue_learning"}
                        disabled={busy_id === c.course_id}
                        onClick={() => open_course(c)}>
                        
                            {not_started ? ENGLISH.start_learning : ENGLISH.continue_learning}
                          </button>
                      }
                      </div>
                    </div>

                    {c.cohort_name || c.program_name || program_dates(c) ?
                    <div className="shd_course_facts">
                      {c.cohort_name ? <span className="shd_pill">{c.cohort_name}</span> : null}
                      {c.program_name ? <span className="shd_pill is_soft">{c.program_name}</span> : null}
                      {program_dates(c) ? <span className="shd_pill is_date">{program_dates(c)}</span> : null}
                    </div> :
                    null}

                    <div className="shd_course_bar_wrap">
                      <div className="shd_course_bar">
                        <div
                        className="shd_course_bar_fill"
                        style={{ width: `${progress}%` }} />
                      
                      </div>
                      <span className="shd_course_pct">{progress}%</span>
                    </div>
                  </div>);

            }) :

            <div className="shd_empty_box">
                <p>{loading ? ENGLISH.loading_courses : ENGLISH.no_enrolled_courses_yet}</p>
                {loading ? null :
              <button type="button" className="shd_btn_continue_learning" onClick={() => on_open_courses?.()}>{ENGLISH.my_courses}</button>
              }
              </div>
            }
          </div>
        </div>

        <div className="shd_right_stack">
          <div className="shd_card shd_taught_card">
            <div className="shd_taught_head">
              <span className="shd_taught_pulse" aria-hidden="true" />
              <h2>{ENGLISH.latest_in_class}</h2>
              {class_board.label ? <em>{class_board.label}</em> : null}
            </div>
            {class_board.items.length ?
            <div className="shd_taught_list">
                {class_board.items.map((mark) => {
                  const stamp = taught_stamp(mark);
                  if (!stamp) return null;
                  return (
                    <button
                      key={`${mark.registration_id || mark.program_id || ""}:${mark.course_id}:${mark.lesson_id}`}
                      type="button"
                      className="shd_ticket is_taught"
                      disabled={busy_id === mark.course_id}
                      onClick={() => open_course(mark, mark.lesson_id)}>
                      <span className="shd_ticket_stub">
                        <b>{stamp.day}</b>
                        <small>{stamp.month}</small>
                      </span>
                      <span className="shd_ticket_cut" aria-hidden="true" />
                      <span className="shd_ticket_body">
                        <strong>{mark.lesson_title}</strong>
                        <span>{mark.course_name}</span>
                      </span>
                      <span className="shd_ticket_go" aria-hidden="true">
                        <Play_Icon />
                      </span>
                    </button>
                  );
                })}
              </div> :

            <p className="shd_empty_text">{loading ? "Loading..." : ENGLISH.no_lesson_taught_yet}</p>
            }
          </div>

          {/* Quizzes Box */}
          <div className="shd_card shd_quizzes_card">
            <div className="shd_card_header">
              <h2>{ENGLISH.quizzes}</h2>
            </div>

            <div className="shd_quizzes_list">
              {quizzes && quizzes.length > 0 ?
              quiz_window(quizzes, courses).map((q) => {
                return (
                  <button
                    key={q.id || q.quiz_id}
                    type="button"
                    className="shd_quiz_item"
                    disabled={busy_id === `quiz_${q.quiz_id}`}
                    onClick={() => open_quiz(q)}>
                      <span className="shd_quiz_icon">
                        <Question_Circle_Icon />
                      </span>
                      <div className="shd_quiz_copy">
                        <strong className="shd_quiz_title">{q.title || q.quiz_title}</strong>
                        <small>{q.course_name || ENGLISH.course_quiz}</small>
                      </div>
                      <span className="shd_quiz_badge shd_quiz_pending">{ENGLISH.pending}</span>
                    </button>);

              }) :

              <p className="shd_empty_text">{loading ? "Loading..." : ENGLISH.no_quizzes_available_yet}</p>
              }
            </div>
          </div>

          <div className="shd_card shd_quizzes_card shd_hack_card">
            <div className="shd_card_header">
              <h2>{ENGLISH.hackathons}</h2>
              <button type="button" className="shd_link_btn" onClick={() => on_open_hackathons?.()}>{ENGLISH.view_all}</button>
            </div>

            <div className="shd_quizzes_list">
              {hackathon_cards.length ?
              hackathon_cards.map((item) =>
              <button
                key={item.hackathon_id}
                type="button"
                className={`shd_quiz_item shd_hack_item is_${item.phase}`}
                onClick={() => on_open_hackathon?.(item.hackathon_id)}>
                    <span className="shd_quiz_icon shd_hack_icon">
                      <Trophy_Icon />
                      {item.phase === "live" ? <i className="shd_hack_live" aria-hidden="true" /> : null}
                    </span>
                    <div className="shd_quiz_copy">
                      <strong className="shd_quiz_title">{item.title}</strong>
                      <small>{item.meta}</small>
                    </div>
                    <span className={`shd_quiz_badge ${item.badge.tone}`}>{item.badge.label}</span>
                  </button>
              ) :

              <p className="shd_empty_text">{loading ? "Loading..." : ENGLISH.no_open_hackathons_right_now}</p>
              }
            </div>
          </div>
        </div>
      </div>

      <section className="shd_card shd_jobs_card">
        <div className="shd_card_header">
          <h2>Recommended jobs</h2>
          <a className="shd_link_btn" href="#/dashboard/jobs">View all</a>
        </div>
        {jobs_error ?
          <p className="shd_empty_text">{jobs_error}</p> :
          profile_error ?
            <p className="shd_empty_text">{profile_error}</p> :
          recommended_jobs.length ?
            <div className="shd_jobs_list">
              {recommended_jobs.map((job) =>
                <a className="shd_job_link" href={`#/dashboard/jobs?job_id=${encodeURIComponent(job.job_id)}`} key={job.job_id}>
                  <strong>{job.job_title}</strong>
                  <span>{[job.company_name, job.location].filter(Boolean).join(" · ") || "Company details unavailable"}</span>
                  <small>Matched to your profile</small>
                </a>
              )}
            </div> :
            <p className="shd_empty_text">
              {loading ? "Loading job recommendations..." : profile_match_terms(profile_data).size ?
                "No open jobs currently match your profile." :
                "Add skills or career details to your profile to get tailored matches."}
            </p>
        }
      </section>

      {/* Bottom Section */}
      <div className="shd_bottom_grid">
        {/* Column 1: Performance Overview */}
        <div className="shd_card shd_perf_card">
          <div className="shd_card_header">
            <h2>{ENGLISH.performance_overview}</h2>
            <button type="button" className="shd_link_btn" onClick={() => on_profile?.()}>{ENGLISH.view_detailed}</button>
          </div>

          <div className="shd_perf_body">
            <div className="shd_perf_banner">
              <b>{overall_progress}%</b>
              <span>{ENGLISH.average_across_your_courses_pick_one_to_see}</span>
            </div>
            {courses.length ?
            <div className="shd_pick_list" role="listbox" aria-label={ENGLISH.courses}>
              {courses.map((course, index) => {
                const pct = Math.max(0, Math.min(100, Number(course.progress_percent) || 0));
                const tone = course_tone(index);
                const on = String(picked_course?.registration_id || picked_course?.course_id) === String(course.registration_id || course.course_id);
                return (
                  <button
                    key={course.registration_id || course.course_id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={on ? `shd_pick is_on is_${tone}` : `shd_pick is_${tone}`}
                    onClick={() => set_picked_id(course.registration_id || course.course_id)}>
                    <span className="shd_pick_mark">{render_course_icon(course.course_name)}</span>
                    <span className="shd_pick_copy">
                      <strong>{course.course_name}</strong>
                      <small>{pct}{ENGLISH.of_the_course}</small>
                    </span>
                    <em>{pct}%</em>
                  </button>
                );
              })}
            </div> :

            <p className="shd_empty_text">{ENGLISH.no_performance_data_yet}</p>
            }
          </div>
        </div>

        <div className={`shd_card shd_story is_${picked_tone}`}>
          <div className="shd_story_top">
            <div
              className="shd_story_medal"
              style={{ "--score": `${picked_done.average || 0}%` }}
              aria-hidden="true">
              <strong>{picked_done.average == null ? "—" : `${picked_done.average}%`}</strong>
              <small>{ENGLISH.avg}</small>
            </div>
            <div className="shd_story_copy">
              <p>{ENGLISH.quiz_story}</p>
              <h2>{picked_course?.course_name || ENGLISH.completed_quizzes}</h2>
              <em>
                {picked_done.total ?
                  ENGLISH.tucked_in_among(picked_done.count, picked_done.total) :
                  ENGLISH.waiting_for_the_first_quiz}
              </em>
            </div>
          </div>
          {picked_course && picked_done.total ?
          <div className="shd_story_stickers">
            {picked_done.quizzes.map((quiz) => {
              const pending = quiz.status !== "completed";
              const percent = pending ? null : quiz_percent(quiz);
              const rounded = percent == null ? null : Math.round(percent);
              const mood = pending ? "wait" : rounded == null ? "good" : rounded >= 90 ? "great" : rounded >= 70 ? "good" : "try";
              return (
                <button
                  key={quiz.id || quiz.quiz_id}
                  type="button"
                  className={`shd_sticker is_${mood}`}
                  disabled={busy_id === `quiz_${quiz.quiz_id}`}
                  onClick={() => open_quiz(quiz)}>
                  <b>{pending ? ENGLISH.yet : rounded == null ? ENGLISH.done : `${rounded}%`}</b>
                  <span>{quiz.title || quiz.quiz_title}</span>
                </button>
              );
            })}
          </div> :

          <p className="shd_story_empty">
            {loading ? "Loading..." : ENGLISH.no_quizzes_in_this_course_yet}
          </p>
          }
        </div>
      </div>
    </div>);

}
