import { AppShell } from "@datapromr/app-shell";
import { logout } from "@datapromr/auth/client";
import { useState } from "react";
import { Course_Learning } from "../course_learning/index.js";
import { My_Courses } from "../my_courses/index.js";
import { Student_Home } from "../student_home/student_home.jsx";
import { Student_Profile } from "../student_profile/index.js";
import { Student_Resume_Analyser } from "../student_resume_analyser/index.js";
import { Student_Jobs } from "../jobs_manager/index.js";
import { Student_Mock_Interview } from "../student_mock_interview/index.js";
import { Mock_Hub } from "../student_mock_interview/ui/mock_hub.jsx";
import { Student_Hackathon } from "../hackathon_manager/ui/student_hackathon.jsx";
import { Student_History } from "../student_history/index.js";
import {
  set_course_handoff,
  set_fresh_interview_handoff,
  set_fresher_quiz_handoff,
  set_job_handoff,
  set_open_interview_handoff,
  set_resume_handoff
} from "../student_mock_interview/handoff.js";
import { current_mock_interview, finish_mock_interview } from "../student_mock_interview/api.js";
import { Interview_Switch_Modal } from "../student_mock_interview/ui/interview_switch_modal.jsx";
import "./theme/index.js";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/student_authentication_constants_english.js";

function Home_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20H4V10.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Courses_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6.5h11.5A2.5 2.5 0 0 1 19 9v10.5H7.5A2.5 2.5 0 0 1 5 17V6.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 9.5h7M8.5 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Resume_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.5h7l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 3.8V8.5h4.2M8.5 12.5h7M8.5 16h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Jobs_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3.5 12h17" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Interview_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 19h6M12 16v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Hackathon_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5 4.5 4.5 0 0 0 8.5 11M16 5h2.5A1.5 1.5 0 0 1 20 6.5 4.5 4.5 0 0 1 15.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 11v3M9 20h6M10 14h4v6h-4v-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>);

}

function Report_Card_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 8h8M8 11.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15" cy="16" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Profile_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 19.2c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Logout_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

function apply_handoff(kind, payload) {
  if (kind === "course") set_course_handoff({ course_context: payload });
  else if (kind === "resume") set_resume_handoff(payload);
  else if (kind === "job") set_job_handoff(payload);
}

export function Student_Dashboard({ view = "home", course_id, hackathon_id = null, registration_id = null, on_navigate, on_logout }) {
  const [choice, set_choice] = useState(null);
  const [choice_busy, set_choice_busy] = useState(false);
  const [choice_error, set_choice_error] = useState("");
  const [mock_play, set_mock_play] = useState(false);
  const [mock_play_key, set_mock_play_key] = useState(0);
  const [mock_board_id, set_mock_board_id] = useState(null);
  const [mock_start_fresh, set_mock_start_fresh] = useState(false);

  function open_mock(kind, payload) {
    apply_handoff(kind, payload);
    set_mock_start_fresh(false);
    set_mock_board_id(null);
    set_mock_play(true);
    set_mock_play_key((value) => value + 1);
    on_navigate?.("/dashboard/mock_interview");
  }

  function open_mock_session(mock_interview_id) {
    set_open_interview_handoff(mock_interview_id);
    set_mock_start_fresh(false);
    set_mock_board_id(null);
    set_mock_play(true);
    set_mock_play_key((value) => value + 1);
    on_navigate?.("/dashboard/mock_interview");
  }

  function open_mock_reattempt(mock_interview_id, question_number) {
    set_open_interview_handoff(mock_interview_id, { reattempt_question: question_number });
    set_mock_start_fresh(false);
    set_mock_board_id(null);
    set_mock_play(true);
    set_mock_play_key((value) => value + 1);
    on_navigate?.("/dashboard/mock_interview");
  }

  function return_to_mock_board(mock_interview_id) {
    set_mock_play(false);
    set_mock_start_fresh(false);
    set_mock_board_id(mock_interview_id || null);
  }

  function open_fresher_quiz(item) {
    set_fresher_quiz_handoff({
      job_id: item.job_id,
      job_title: item.job_title || item.target_role || "",
      company_name: item.company_name || ""
    });
    set_mock_start_fresh(false);
    set_mock_play(true);
    set_mock_play_key((value) => value + 1);
    on_navigate?.("/dashboard/mock_interview");
  }

  async function ask_or_open(kind, payload) {
    try {
      const current = await current_mock_interview();
      const item = current?.item;
      if (item?.status === "in_progress" && item.mock_interview_id) {
        set_choice_error("");
        set_choice({ kind, payload, item });
        return;
      }
    } catch {
      /* open the new interview when the check cannot be read */
    }
    open_mock(kind, payload);
  }

  function continue_current() {
    if (choice_busy) return;
    const open_id = choice?.item?.mock_interview_id;
    set_choice(null);
    set_choice_error("");
    if (open_id) open_mock_session(open_id);
    else on_navigate?.("/dashboard/mock_interview");
  }

  async function restart_with_new() {
    const pending = choice;
    if (!pending?.item?.mock_interview_id || choice_busy) return;
    set_choice_busy(true);
    set_choice_error("");
    try {
      await finish_mock_interview(pending.item.mock_interview_id);
      set_choice(null);
      open_mock(pending.kind, pending.payload);
    } catch (err) {
      set_choice_error(err.message || "");
    } finally {
      set_choice_busy(false);
    }
  }

  const items = [
  {
    id: "home",
    get label() { return ENGLISH.home; },
    icon: <Home_Icon />,
    onClick: () => on_navigate?.("/dashboard")
  },
  {
    id: "my_courses",
    get label() { return ENGLISH.my_courses; },
    icon: <Courses_Icon />,
    onClick: () => on_navigate?.("/dashboard/courses")
  },
  {
    id: "resume",
    get label() { return ENGLISH.resume; },
    icon: <Resume_Icon />,
    onClick: () => on_navigate?.("/dashboard/resume")
  },
  {
    id: "jobs",
    get label() { return ENGLISH.jobs; },
    icon: <Jobs_Icon />,
    onClick: () => on_navigate?.("/dashboard/jobs")
  },
  {
    id: "mock_interview",
    get label() { return ENGLISH.mock_interview; },
    icon: <Interview_Icon />,
    onClick: () => {
      set_mock_play(false);
      set_mock_start_fresh(false);
      set_mock_board_id(null);
      on_navigate?.("/dashboard/mock_interview");
    }
  },
  {
    id: "hackathons",
    get label() { return ENGLISH.hackathons; },
    icon: <Hackathon_Icon />,
    onClick: () => on_navigate?.("/dashboard/hackathons")
  },
  {
    id: "history",
    get label() { return ENGLISH.my_history; },
    icon: <Report_Card_Icon />,
    onClick: () => on_navigate?.("/dashboard/history")
  },
  {
    id: "profile",
    get label() { return ENGLISH.profile; },
    icon: <Profile_Icon />,
    onClick: () => on_navigate?.("/dashboard/profile")
  },
  {
    id: "logout",
    get label() { return ENGLISH.logout; },
    icon: <Logout_Icon />,
    onClick: async () => {
      try {
        await logout();
      } catch {

        /* still leave the screen */}
      on_logout?.();
    }
  }];


  const active_id =
  view === "learn" ?
  "my_courses" :
  view === "profile" ?
  "profile" :
  view === "resume" ?
  "resume" :
  view === "jobs" ?
  "jobs" :
  view === "mock_interview" ?
  "mock_interview" :
  view === "hackathons" ?
  "hackathons" :
  view === "report_card" || view === "history" ?
  "history" :
  view === "my_courses" ?
  "my_courses" :
  "home";

  const go_profile = () => on_navigate?.("/dashboard/profile");
  const [kept, set_kept] = useState({});
  const keep_id = view === "learn" ? "" : ["home", "my_courses"].includes(view) ? view : "";
  if (keep_id && !kept[keep_id]) {
    set_kept((current) => ({ ...current, [keep_id]: true }));
  }
  const learn_key = course_id ? `${course_id}:${registration_id || ""}` : "";
  const [learn_kept, set_learn_kept] = useState(null);
  if (view === "learn" && learn_key && learn_kept !== learn_key) {
    set_learn_kept(learn_key);
  }

  function open_learn(id, registration) {
    const asked = Number(registration);
    const query = Number.isInteger(asked) && asked > 0 ? ENGLISH.registration_id(asked) : "";
    on_navigate?.(`/dashboard/learn/${id}${query}`);
  }

  function place(id) {
    return view === id ? "adm_live" : "adm_screen_parked";
  }

  return (
    <AppShell theme="student" items={items} activeId={active_id}>
      {kept.home ?
      <div className={place("home")}>
          <Student_Home
            active={view === "home"}
            on_open_courses={() => on_navigate?.("/dashboard/courses")}
            on_open_learn={open_learn}
            on_profile={go_profile}
            on_open_hackathon={(id) => on_navigate?.(`/dashboard/hackathons/${id}`)}
            on_open_hackathons={() => on_navigate?.("/dashboard/hackathons")} />
        </div> :
      null}
      {kept.my_courses ?
      <div className={place("my_courses")}>
          <My_Courses
            on_open_learn={open_learn}
            on_profile={go_profile} />
        </div> :
      null}
      {learn_kept ?
      <div className={view === "learn" ? "adm_live" : "adm_screen_parked"}>
          <Course_Learning
            key={learn_kept}
            course_id={course_id}
            registration_id={registration_id}
            on_back={() => on_navigate?.("/dashboard/courses")}
            on_mock_interview={(course_context) => {
              ask_or_open("course", course_context);
            }} />
        </div> :
      null}
      {view === "profile" ?
      <Student_Profile /> :
      view === "resume" ?
      <Student_Resume_Analyser
        on_mock_interview={(file, role) => {
          ask_or_open("resume", { file, target_role: role });
        }} /> :
      view === "jobs" ?
      <div className="adm_live">
        <Student_Jobs
          on_practise={(job) => {
            ask_or_open("job", job);
          }} />
      </div> :
      view === "mock_interview" ?
      mock_play ?
      <Student_Mock_Interview
        key={mock_play_key}
        start_fresh={mock_start_fresh}
        on_return_to_board={return_to_mock_board} /> :
      <Mock_Hub
        open_id={mock_board_id}
        on_open_consumed={() => set_mock_board_id(null)}
        on_continue_fresher={open_fresher_quiz}
        on_continue_interview={open_mock_session}
        on_reattempt={open_mock_reattempt}
        on_started={(item) => open_mock_session(item.mock_interview_id)}
        on_start_new={() => {
          set_fresh_interview_handoff();
          set_mock_start_fresh(true);
          set_mock_board_id(null);
          set_mock_play(true);
          set_mock_play_key((value) => value + 1);
        }} /> :
      view === "hackathons" ?
      <Student_Hackathon
        hackathon_id={hackathon_id}
        on_open={(id) => on_navigate?.(`/dashboard/hackathons/${id}`)}
        on_back={() => on_navigate?.("/dashboard/hackathons")} /> :
      view === "report_card" || view === "history" ?
      <Student_History on_open_hackathon={(id) => on_navigate?.(`/dashboard/hackathons/${id}`)} /> :
      null}
      <Interview_Switch_Modal
        open={Boolean(choice)}
        busy={choice_busy}
        error={choice_error}
        on_continue={continue_current}
        on_restart={restart_with_new}
        on_close={() => {
          if (choice_busy) return;
          set_choice(null);
          set_choice_error("");
        }} />
    </AppShell>);

}
