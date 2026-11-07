import { logout } from "@datapromr/auth/client";
import { Admin_Shell } from "./admin_shell.jsx";
import { useCallback, useEffect, useState } from "react";
import { LMS_MEDIA_PHONE } from "../design_system/breakpoints.js";
import { TABS } from "../course_content_manager/constants.js";
import { Employee_Access_Provider, use_employee_access } from "./employee_access.jsx";
import {
  ACCESS,
  ADMIN_SCREENS,
  SCREEN,
  admin_screen_path,
  is_admin_screen } from
"./screen_access.js";
import { Programs_Control } from "../programs_control/index.js";
import { Cohorts } from "../cohorts/index.js";
import { Course_Manager } from "../course_manager/index.js";
import { Course_Content_Manager } from "../course_content_manager/index.js";
import { Employee_Manager } from "../employee_manager/index.js";
import { Jobs_Manager } from "../jobs_manager/index.js";
import { Hackathon_Manager } from "../hackathon_manager/index.js";
import { Chatbot_Monitor, Mock_Interview_Monitor, Resume_Monitor } from "../ai_monitor/index.js";
import { Student_Manager } from "../student_manager/index.js";
import { Attendance_Analytics, Hackathon_Analytics, Quiz_Analytics } from "../analytics_center/index.js";
import { Dropdown_Manager } from "../dropdown_manager/index.js";
import { Api_Integration } from "../api_integration/index.js";
import { Certificate_Manager } from "../certificate_manager/index.js";
import { Performance_Dashboard } from "../performance_dashboard/index.js";
import { Admin_Home } from "../admin_home/index.js";
import "./theme/admin_nav.css";
import { EMPLOYEE_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/employee_authentication_constants_english.js";

function Home_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20H4V10.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Performance_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 18V8M10 18V5M15 18v-7M20 18V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Programs_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Cohorts_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="8" y="13" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
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

function Employees_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.2 18.5c.6-3 2.5-4.7 4.8-4.7s4.2 1.7 4.8 4.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.5" cy="8.8" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.2 13.8c2 .2 3.5 1.6 4 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Students_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9l9-5 9 5-9 5-9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5M21 9v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Jobs_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3.5 12h17" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Hackathons_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 6H5.5A1.5 1.5 0 0 0 4 7.5V8a3 3 0 0 0 3 3M16 6h2.5A1.5 1.5 0 0 1 20 7.5V8a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12v3M9 20h6M12 15v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Mock_Interviews_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 20h6M12 16v4M9 9.5h6M9 12.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Resume_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v5h5M10 12h6M10 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Chatbot_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5h14v10H9l-4 4V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Hackathon_Analytics_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5 14.3 8l5 .7-3.6 3.5.9 5L12 14.8 7.4 17.2l.9-5L4.7 8.7l5-.7L12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 20.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Quiz_Analytics_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 16v-3M12 16V9M15.5 16v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Attendance_Analytics_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v4M16 3v4M4 10h16M8.5 14.5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

function Api_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Certificates_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Dropdowns_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m16 15 3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

function Logout_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);

}

function course_content_path(course_id, program_id) {
  const base = `${admin_screen_path(SCREEN.courses)}/${course_id}/content`;
  const id = Number(program_id);
  if (Number.isInteger(id) && id > 0) return ENGLISH.program_id(base, id);
  return base;
}

function course_section_path(course_id, program_id, section) {
  const base = course_content_path(course_id, program_id);
  const join = base.includes("?") ? "&" : "?";
  return ENGLISH.section(base, join, section || "content");
}

function course_workspace_path(section, program_id) {
  const params = new URLSearchParams();
  params.set("section", section || "content");
  if (Number(program_id) > 0) params.set("program_id", String(program_id));
  return `${admin_screen_path(SCREEN.courses)}/content?${params}`;
}

function read_course_section() {
  const query = String(window.location.hash || "").split("?")[1] || "";
  const section = new URLSearchParams(query).get("section") || "content";
  return TABS.some((item) => item.id === section) ? section : "content";
}

let remembered_course = null;

function Section_Icon({ id }) {
  const paths = {
    content: "M5 6.5h14M5 12h14M5 17.5h9",
    students: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 18.5c.4-2.2 2.2-3.5 4.5-3.5s4.1 1.3 4.5 3.5M16 11a2.4 2.4 0 1 0 0-4.8M16.2 15c1.6.3 2.8 1.4 3.3 3.5",
    attendance: "M6 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 3.5v3M16 3.5v3M5 9h14M8.5 13.5l1.8 1.8 3.2-3.4",
    feedback: "M6 6.5h12v8H9l-3 2.5v-2.5H6v-8Z",
    reports: "M7 4h7l4 4v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM14 4v4h4M8 12h8M8 16h5"
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={paths[id] || paths.content} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SCREEN_ICONS = {
  [SCREEN.performance]: <Performance_Icon />,
  [SCREEN.programs]: <Programs_Icon />,
  [SCREEN.cohorts]: <Cohorts_Icon />,
  [SCREEN.courses]: <Courses_Icon />,
  [SCREEN.course_content]: <Section_Icon id="content" />,
  [SCREEN.course_students]: <Section_Icon id="students" />,
  [SCREEN.course_attendance]: <Section_Icon id="attendance" />,
  [SCREEN.course_feedback]: <Section_Icon id="feedback" />,
  [SCREEN.course_reports]: <Section_Icon id="reports" />,
  [SCREEN.quiz_analytics]: <Quiz_Analytics_Icon />,
  [SCREEN.attendance_analytics]: <Attendance_Analytics_Icon />,
  [SCREEN.employees]: <Employees_Icon />,
  [SCREEN.students]: <Students_Icon />,
  [SCREEN.jobs]: <Jobs_Icon />,
  [SCREEN.hackathons]: <Hackathons_Icon />,
  [SCREEN.hackathon_analytics]: <Hackathon_Analytics_Icon />,
  [SCREEN.mock_interviews]: <Mock_Interviews_Icon />,
  [SCREEN.resume_analyser]: <Resume_Icon />,
  [SCREEN.chatbot_usage]: <Chatbot_Icon />,
  [SCREEN.dropdowns]: <Dropdowns_Icon />,
  [SCREEN.api_integration]: <Api_Icon />,
  [SCREEN.certificates]: <Certificates_Icon />
};

function Analytics_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5v8.5h8.5A8.5 8.5 0 1 1 12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15V3.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>);

}

const PHONE_HIDDEN = new Set([
  SCREEN.quiz_analytics,
  SCREEN.attendance_analytics,
  SCREEN.hackathon_analytics,
  SCREEN.api_integration
]);

function use_phone() {
  const [phone, set_phone] = useState(
    () => typeof window !== "undefined" && window.matchMedia(LMS_MEDIA_PHONE).matches
  );

  useEffect(() => {
    const media = window.matchMedia(LMS_MEDIA_PHONE);
    const sync = () => set_phone(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return phone;
}

const NAV_GROUPS = [
{
  id: "courses_menu",
  get label() { return ENGLISH.courses; },
  icon: <Courses_Icon />,
  screens: [
    SCREEN.courses,
    SCREEN.course_content,
    SCREEN.course_students,
    SCREEN.course_attendance,
    SCREEN.course_feedback,
    SCREEN.course_reports
  ]
},
{
  id: "analytics_menu",
  get label() { return ENGLISH.analytics; },
  icon: <Analytics_Icon />,
  screens: [
  SCREEN.quiz_analytics,
  SCREEN.attendance_analytics,
  SCREEN.mock_interviews,
  SCREEN.resume_analyser,
  SCREEN.chatbot_usage]

},
{
  id: "hackathon_menu",
  get label() { return ENGLISH.hackathons; },
  icon: <Hackathons_Icon />,
  screens: [SCREEN.hackathons, SCREEN.hackathon_analytics],
  get labels() { return { [SCREEN.hackathons]: ENGLISH.manage_hackathons }; }
}];


const SCREEN_LABEL = {
  get performance() { return ENGLISH.screen_performance; },
  get programs() { return ENGLISH.screen_programs; },
  get cohorts() { return ENGLISH.screen_cohorts; },
  get courses() { return ENGLISH.screen_courses; },
  get course_content() { return ENGLISH.screen_course_content; },
  get course_students() { return ENGLISH.screen_course_students; },
  get course_attendance() { return ENGLISH.screen_course_attendance; },
  get course_feedback() { return ENGLISH.screen_course_feedback; },
  get course_reports() { return ENGLISH.screen_course_reports; },
  get quiz_analytics() { return ENGLISH.screen_quiz_analytics; },
  get attendance_analytics() { return ENGLISH.screen_attendance_analytics; },
  get hackathon_analytics() { return ENGLISH.screen_hackathon_analytics; },
  get employees() { return ENGLISH.screen_employees; },
  get students() { return ENGLISH.screen_students; },
  get jobs() { return ENGLISH.screen_jobs; },
  get hackathons() { return ENGLISH.screen_hackathons; },
  get mock_interviews() { return ENGLISH.screen_mock_interviews; },
  get resume_analyser() { return ENGLISH.screen_resume_analyser; },
  get chatbot_usage() { return ENGLISH.screen_chatbot_usage; },
  get dropdowns() { return ENGLISH.screen_dropdowns; },
  get api_integration() { return ENGLISH.screen_api_integration; },
  get certificates() { return ENGLISH.screen_certificates; }
};

function nav_items(screens, on_navigate, clicks = {}) {
  const allowed = new Map(screens.map((screen) => [screen.id, screen]));
  const grouped = new Set(NAV_GROUPS.flatMap((group) => group.screens));
  const placed = new Set();
  const screen_item = (screen, label) => ({
    id: screen.id,
    get label() { return label || SCREEN_LABEL[screen.id] || screen.label; },
    icon: SCREEN_ICONS[screen.id],
    onClick: clicks[screen.id] || (() => on_navigate?.(admin_screen_path(screen.id)))
  });
  const list = [];
  for (const screen of screens) {
    if (!grouped.has(screen.id)) {
      list.push(screen_item(screen));
      continue;
    }
    for (const group of NAV_GROUPS) {
      if (placed.has(group.id) || !group.screens.includes(screen.id)) continue;
      placed.add(group.id);
      const children = group.screens.filter((id) => allowed.has(id)).map((id) => screen_item(allowed.get(id), group.labels?.[id]));
      if (children.length === 1) list.push(screen_item(allowed.get(children[0].id)));
      else if (children.length) list.push({ id: group.id, label: group.label, icon: group.icon, children });
    }
  }
  return list;
}

export function Employee_Dashboard({ view = "home", course_id, program_id, on_navigate, on_logout }) {
  const on_unauthorized = useCallback(() => on_logout?.(), [on_logout]);

  return (
    <Employee_Access_Provider on_unauthorized={on_unauthorized}>
      <Employee_Dashboard_Shell
        view={view}
        course_id={course_id}
        program_id={program_id}
        on_navigate={on_navigate}
        on_logout={on_logout} />
      
    </Employee_Access_Provider>);

}

function Employee_Dashboard_Shell({ view, course_id, program_id, on_navigate, on_logout }) {
  const { loading, can } = use_employee_access();
  const phone = use_phone();
  const [section, set_section] = useState(read_course_section);
  if (course_id) remembered_course = { id: course_id, program_id: program_id || null };
  const open_id = course_id || remembered_course?.id || null;
  const open_program_id = course_id ? program_id : remembered_course?.program_id;

  useEffect(() => {
    if (!phone || loading) return;
    if (PHONE_HIDDEN.has(view)) on_navigate?.("/admin_dashboard");
  }, [phone, loading, view, on_navigate]);

  useEffect(() => {
    function sync_section() {
      set_section(read_course_section());
    }
    window.addEventListener("lms-navigate", sync_section);
    window.addEventListener("hashchange", sync_section);
    window.addEventListener("popstate", sync_section);
    return () => {
      window.removeEventListener("lms-navigate", sync_section);
      window.removeEventListener("hashchange", sync_section);
      window.removeEventListener("popstate", sync_section);
    };
  }, []);

  function open_course(course) {
    const id = course?.course_id;
    if (!id) return;
    on_navigate?.(course_content_path(id, course?.program_id));
  }

  const items = [
  {
    id: "home",
    get label() { return ENGLISH.home; },
    icon: <Home_Icon />,
    onClick: () => on_navigate?.("/admin_dashboard")
  },
  ...nav_items(
    ADMIN_SCREENS.filter((screen) => can(screen.id, ACCESS.view) && !(phone && PHONE_HIDDEN.has(screen.id))),
    on_navigate,
    {
      [SCREEN.course_content]: () => open_course_section("content"),
      [SCREEN.course_students]: () => open_course_section("students"),
      [SCREEN.course_attendance]: () => open_course_section("attendance"),
      [SCREEN.course_feedback]: () => open_course_section("feedback"),
      [SCREEN.course_reports]: () => open_course_section("reports")
    }
  )];


  const footer_items = [
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


  function open_course_section(next_section) {
    if (!open_id) {
      on_navigate?.(course_workspace_path(next_section));
      return;
    }
    on_navigate?.(course_section_path(open_id, open_program_id, next_section));
  }

  const section_screen = {
    content: SCREEN.course_content,
    students: SCREEN.course_students,
    attendance: SCREEN.course_attendance,
    feedback: SCREEN.course_feedback,
    reports: SCREEN.course_reports
  };

  const active_id =
  view === "course_content" ?
  section_screen[section] || SCREEN.course_content :
  is_admin_screen(view) ?
  view :
  "home";

  const screen_id = view === "course_content" ? (section_screen[section] || SCREEN.course_content) : view;
  const allowed = view === "home" || can(screen_id, ACCESS.view);

  const [kept, set_kept] = useState({});
  const keep_id = view === "course_content" ? "" : view === "home" || is_admin_screen(view) ? view : "";
  if (keep_id && !loading && allowed && !kept[keep_id]) {
    set_kept((current) => ({ ...current, [keep_id]: true }));
  }
  const content_key = view === "course_content" ? (course_id ? `${course_id}:${program_id || ""}` : ENGLISH.pick(program_id || "")) : "";
  const [content_kept, set_content_kept] = useState("");
  if (view === "course_content" && content_key && !loading && allowed && content_kept !== content_key) {
    set_content_kept(content_key);
  }

  function place(id) {
    return !loading && allowed && view === id ? "adm_live" : "adm_screen_parked";
  }

  return (
    <Admin_Shell items={items} footer_items={footer_items} active_id={active_id}>
      {kept.home ?
      <div className={place("home")}>
          <Admin_Home on_navigate={on_navigate} />
        </div> :
      null}
      {kept[SCREEN.performance] ?
      <div className={place(SCREEN.performance)}>
          <Performance_Dashboard />
        </div> :
      null}
      {kept[SCREEN.programs] ?
      <div className={place(SCREEN.programs)}>
          <Programs_Control on_open_course={open_course} />
        </div> :
      null}
      {kept[SCREEN.cohorts] ?
      <div className={place(SCREEN.cohorts)}>
          <Cohorts />
        </div> :
      null}
      {kept[SCREEN.courses] ?
      <div className={place(SCREEN.courses)}>
          <Course_Manager
            on_open_course={open_course}
            on_open_cohorts={() => on_navigate?.(admin_screen_path(SCREEN.cohorts))} />
        </div> :
      null}
      {kept[SCREEN.quiz_analytics] ?
      <div className={place(SCREEN.quiz_analytics)}>
          <Quiz_Analytics />
        </div> :
      null}
      {kept[SCREEN.attendance_analytics] ?
      <div className={place(SCREEN.attendance_analytics)}>
          <Attendance_Analytics />
        </div> :
      null}
      {kept[SCREEN.employees] ?
      <div className={place(SCREEN.employees)}>
          <Employee_Manager />
        </div> :
      null}
      {kept[SCREEN.students] ?
      <div className={place(SCREEN.students)}>
          <Student_Manager />
        </div> :
      null}
      {kept[SCREEN.jobs] ?
      <div className={place(SCREEN.jobs)}>
          <Jobs_Manager />
        </div> :
      null}
      {kept[SCREEN.hackathons] ?
      <div className={place(SCREEN.hackathons)}>
          <Hackathon_Manager />
        </div> :
      null}
      {kept[SCREEN.hackathon_analytics] ?
      <div className={place(SCREEN.hackathon_analytics)}>
          <Hackathon_Analytics />
        </div> :
      null}
      {kept[SCREEN.mock_interviews] ?
      <div className={place(SCREEN.mock_interviews)}>
          <Mock_Interview_Monitor />
        </div> :
      null}
      {kept[SCREEN.resume_analyser] ?
      <div className={place(SCREEN.resume_analyser)}>
          <Resume_Monitor />
        </div> :
      null}
      {kept[SCREEN.chatbot_usage] ?
      <div className={place(SCREEN.chatbot_usage)}>
          <Chatbot_Monitor />
        </div> :
      null}
      {kept[SCREEN.dropdowns] ?
      <div className={place(SCREEN.dropdowns)}>
          <Dropdown_Manager />
        </div> :
      null}
      {kept[SCREEN.api_integration] ?
      <div className={place(SCREEN.api_integration)}>
          <Api_Integration />
        </div> :
      null}
      {kept[SCREEN.certificates] ?
      <div className={place(SCREEN.certificates)}>
          <Certificate_Manager />
        </div> :
      null}
      {content_kept ?
      <div className={!loading && allowed && view === "course_content" ? "adm_live" : "adm_screen_parked"}>
          <Course_Content_Manager
            key={content_kept}
            course_id={content_kept.startsWith("pick") ? null : Number(content_kept.split(":")[0])}
            program_id={content_kept.split(":")[1] ? Number(content_kept.split(":")[1]) : null}
            on_pick_scope={({ program_id: next_program, course_id: next_course }) => {
              if (next_course) on_navigate?.(course_section_path(next_course, next_program, section));
              else on_navigate?.(course_workspace_path(section, next_program));
            }} />
        </div> :
      null}
      {loading ?
      <p>{ENGLISH.loading_workspace}</p> :
      !allowed ?
      <h1>{ENGLISH.you_do_not_have_access_to_this_screen}</h1> :
      null}
    </Admin_Shell>);

}
