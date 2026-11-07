import { useEffect, useState } from "react";
import { ToastProvider } from "@datapromr/toast";
import {
  Employee_Dashboard,
  Employee_Login } from
"./employee_authentication/index.js";
import { ADMIN_SCREEN_IDS, SCREEN, admin_screen_path, is_admin_screen } from "./employee_authentication/screen_access.js";
import {
  Student_Dashboard,
  Student_Forgot_Password,
  Student_Login,
  Student_Registration } from
"./student_authentication/index.js";
import { Google_Callback } from "./student_authentication/google/google_callback.jsx";
import { is_google_callback } from "./student_authentication/google/google_api.js";
import { api_request } from "./api_client.js";
import { Hackathon_Showcase } from "./hackathon_showcase/index.js";
import "./design_system/shell.css";
import "./design_system/mobile.css";
import "./design_system/admin_tablet.css";
import "./design_system/student_responsive.css";
import "./design_system/desktop.css";
import "./design_system/fonts.css";
import "./design_system/menubar_expand.css";
import "./design_system/screen_fit.css";
import "./design_system/required_fields.css";
import "./design_system/srkisi_theme.css";
import { bind_required_fields } from "./design_system/required_fields.js";
import { subscribe_language } from "./constants/language.js";
import { APP_ENGLISH as ENGLISH } from "./constants/english/app_constants_english.js";

bind_required_fields();

function normalize_hash(raw_path) {
  const raw = String(raw_path || "").replace(/^#/, "") || "/";
  const with_slash = raw.startsWith("/") ? raw : `/${raw}`;
  const path = with_slash.split("?")[0].replace(/\/+$/, "") || "/";
  const query = with_slash.includes("?") ? with_slash.slice(with_slash.indexOf("?")) : "";
  return `${path}${query}`;
}

function hash_path(raw_path) {
  return normalize_hash(raw_path).split("?")[0];
}

function learn_course_id(hash) {
  const match = String(hash || "").match(/^\/dashboard\/learn\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function learn_registration_id(hash) {
  const query = String(hash || "").split("?")[1] || "";
  const id = Number(new URLSearchParams(query).get("registration_id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function content_course_id(hash) {
  const path = String(hash || "").split("?")[0];
  const match = path.match(
    new RegExp(ENGLISH.admin_dashboard_employee_dashboard_d_content(SCREEN.courses))
  );
  return match ? Number(match[1]) : null;
}

function content_program_id(hash) {
  const query = String(hash || "").split("?")[1] || "";
  const id = Number(new URLSearchParams(query).get("program_id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function student_hackathon_id(hash) {
  const match = hash_path(hash).match(/^\/dashboard\/hackathons\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function student_view(hash) {
  if (learn_course_id(hash)) return "learn";
  if (hash.startsWith("/dashboard/profile")) return "profile";
  if (hash.startsWith("/dashboard/resume")) return "resume";
  if (hash.startsWith("/dashboard/jobs")) return "jobs";
  if (hash.startsWith("/dashboard/mock_interview")) return "mock_interview";
  if (hash.startsWith("/dashboard/hackathons")) return "hackathons";
  if (hash.startsWith("/dashboard/report_card")) return "report_card";
  if (hash.startsWith("/dashboard/history")) return "history";
  if (
  hash.includes("my_course") ||
  hash.startsWith("/dashboard/courses"))
  {
    return "my_courses";
  }
  return "home";
}

function showcase_token(hash) {
  const match = hash_path(hash).match(/^\/hackathon_showcase\/([a-f0-9]{48})$/);
  return match ? match[1] : "";
}

function page_from_path(raw_path) {
  const hash = hash_path(raw_path);

  if (content_course_id(hash) || /^\/(?:admin_dashboard|employee_dashboard)\/courses\/content$/.test(hash)) {
    return "course_content";
  }
  for (const screen_id of ADMIN_SCREEN_IDS) {
    if (
    hash.startsWith(admin_screen_path(screen_id)) ||
    hash.startsWith(`/employee_dashboard/${screen_id}`))
    {
      return screen_id;
    }
  }
  if (hash === "/admin_dashboard" || hash === "/employee_dashboard") {
    return "employee_dashboard";
  }
  if (showcase_token(hash)) return "hackathon_showcase";
  if (hash === "/employee_login") return "employee";
  if (hash === "/register") return "register";
  if (hash === "/forgot_password") return "forgot_password";
  if (hash === "/dashboard" || hash.startsWith("/dashboard/")) return "student";
  return "login";
}

function page_from_hash() {
  return page_from_path(window.location.hash);
}

const PENDING_COURSE_KEY = "pending_course_enrollment";

async function enroll_pending_course() {
  const raw_course_id = sessionStorage.getItem(PENDING_COURSE_KEY);
  if (!raw_course_id) return null;

  const course_id = Number(raw_course_id);
  if (!Number.isInteger(course_id) || course_id < 1) {
    sessionStorage.removeItem(PENDING_COURSE_KEY);
    return null;
  }

  try {
    await api_request("/api/student/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id }),
      error_message: ENGLISH.request_failed
    });
  } catch (error) {
    if (error.status !== 409 || !/already registered/i.test(error.message || "")) {
      throw error;
    }
  }

  sessionStorage.removeItem(PENDING_COURSE_KEY);
  window.dispatchEvent(new CustomEvent("lms-course-enrolled", { detail: { course_id } }));
  return course_id;
}

export default function App() {
  const [, set_language_tick] = useState(0);
  const [page, set_page] = useState(page_from_hash);
  const [google_return, set_google_return] = useState(is_google_callback);
  const [student_screen, set_student_screen] = useState(() => student_view(normalize_hash(window.location.hash)));
  const [student_course_id, set_student_course_id] = useState(() => learn_course_id(normalize_hash(window.location.hash)));
  const [student_hackathon_id_value, set_student_hackathon_id] = useState(() => student_hackathon_id(normalize_hash(window.location.hash)));
  const [student_registration_id, set_student_registration_id] = useState(() =>
  learn_registration_id(normalize_hash(window.location.hash))
  );
  const [employee_course_id, set_employee_course_id] = useState(() =>
  content_course_id(normalize_hash(window.location.hash))
  );
  const [employee_program_id, set_employee_program_id] = useState(() =>
  content_program_id(normalize_hash(window.location.hash))
  );
  const [showcase_id, set_showcase_id] = useState(() =>
  showcase_token(normalize_hash(window.location.hash))
  );

  useEffect(() => subscribe_language(() => set_language_tick((tick) => tick + 1)), []);

  function apply_hash(raw) {
    const hash = normalize_hash(raw);
    set_page(page_from_path(raw));
    set_student_screen(student_view(hash));
    set_student_course_id(learn_course_id(hash));
    set_student_hackathon_id(student_hackathon_id(hash));
    set_student_registration_id(learn_registration_id(hash));
    set_employee_course_id(content_course_id(hash));
    set_employee_program_id(content_program_id(hash));
    set_showcase_id(showcase_token(hash));
  }

  function go(path) {
    const next = path.startsWith("/") ? path : `/${path}`;
    const url = `${window.location.pathname}${window.location.search}#${next}`;
    window.history.pushState({ page: next }, "", url);
    apply_hash(next);
    window.dispatchEvent(new Event("lms-navigate"));
  }

  useEffect(() => {
    function sync_page() {
      apply_hash(window.location.hash);
    }

    window.addEventListener("hashchange", sync_page);
    window.addEventListener("popstate", sync_page);
    sync_page();

    return () => {
      window.removeEventListener("hashchange", sync_page);
      window.removeEventListener("popstate", sync_page);
    };
  }, []);

  async function finish_google_return(path) {
    if (path === "/dashboard") {
      const course_id = await enroll_pending_course();
      set_google_return(false);
      go(course_id ? "/dashboard/courses" : path);
      return;
    }
    set_google_return(false);
    go(path);
  }

  async function finish_student_login() {
    const course_id = await enroll_pending_course();
    go(course_id ? "/dashboard/courses" : "/dashboard");
  }

  let screen =
    <Student_Login
      on_register={() => go("/register")}
      on_forgot={() => go("/forgot_password")}
      on_success={finish_student_login} />;

  if (google_return) {
    screen = <Google_Callback on_done={finish_google_return} />;
  } else if (page === "hackathon_showcase") {
    screen = <Hackathon_Showcase token={showcase_id} />;
  } else if (page === "forgot_password") {
    screen =
    <Student_Forgot_Password
      on_back={() => go("/login")}
      on_sign_in={() => go("/login")} />;
  } else if (page === "register") {
    screen = <Student_Registration on_sign_in={() => go("/login")} />;
  } else if (page === "student") {
    screen =
    <Student_Dashboard
      view={student_screen}
      course_id={student_course_id}
      hackathon_id={student_hackathon_id_value}
      registration_id={student_registration_id}
      on_navigate={go}
      on_logout={() => go("/login")} />;


  } else if (page === "employee") {
    screen = <Employee_Login on_success={() => go("/admin_dashboard")} />;
  } else if (page === "course_content") {
    screen =
    <Employee_Dashboard
      view="course_content"
      course_id={employee_course_id}
      program_id={employee_program_id}
      on_navigate={go}
      on_logout={() => go("/employee_login")} />;


  } else if (is_admin_screen(page)) {
    screen =
    <Employee_Dashboard
      view={page}
      on_navigate={go}
      on_logout={() => go("/employee_login")} />;


  } else if (page === "employee_dashboard") {
    screen =
    <Employee_Dashboard
      view="home"
      on_navigate={go}
      on_logout={() => go("/employee_login")} />;


  }

  return (
    <ToastProvider>
      {screen}
    </ToastProvider>);
}
