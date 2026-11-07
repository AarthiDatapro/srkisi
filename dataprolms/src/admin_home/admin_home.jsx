import { useEffect, useState } from "react";
import { useToast } from "@datapromr/toast";
import { use_employee_access } from "../employee_authentication/employee_access.jsx";
import { ACCESS, SCREEN, admin_screen_path } from "../employee_authentication/screen_access.js";
import { get_admin_home } from "./api.js";
import { Dashboard_Header } from "./ui/dashboard_header.jsx";
import { Dashboard_Hero } from "./ui/dashboard_hero.jsx";
import { Kpi_Cards } from "./ui/kpi_cards.jsx";
import { Jump_Icon } from "./ui/jump_icons.jsx";
import "./theme/home.css";
import { use_slug_mirror } from "../url_slugs.js";
import { ADMIN_HOME_ENGLISH as ENGLISH } from "../constants/english/admin_home_constants_english.js";

const JUMPS = [
  { id: SCREEN.students, tone: "blue", icon: "students", get label() { return ENGLISH.jump_students; }, get hint() { return ENGLISH.jump_students_hint; } },
  { id: SCREEN.courses, tone: "green", icon: "courses", get label() { return ENGLISH.jump_courses; }, get hint() { return ENGLISH.jump_courses_hint; } },
  { id: SCREEN.programs, tone: "purple", icon: "programs", get label() { return ENGLISH.jump_programs; }, get hint() { return ENGLISH.jump_programs_hint; } },
  { id: SCREEN.cohorts, tone: "orange", icon: "cohorts", get label() { return ENGLISH.jump_cohorts; }, get hint() { return ENGLISH.jump_cohorts_hint; } },
  { id: SCREEN.employees, tone: "rose", icon: "employees", get label() { return ENGLISH.jump_employees; }, get hint() { return ENGLISH.jump_employees_hint; } },
  { id: SCREEN.jobs, tone: "brand", icon: "jobs", get label() { return ENGLISH.jump_jobs; }, get hint() { return ENGLISH.jump_jobs_hint; } },
  { id: SCREEN.mock_interviews, tone: "purple", icon: "interviews", get label() { return ENGLISH.jump_mock_interviews; }, get hint() { return ENGLISH.jump_mock_interviews_hint; } },
  { id: SCREEN.resume_analyser, tone: "green", icon: "resume", get label() { return ENGLISH.jump_resume_analyser; }, get hint() { return ENGLISH.jump_resume_analyser_hint; } },
  { id: SCREEN.hackathons, tone: "orange", icon: "hackathons", get label() { return ENGLISH.jump_hackathons; }, get hint() { return ENGLISH.jump_hackathons_hint; } },
  { id: SCREEN.performance, tone: "blue", icon: "performance", get label() { return ENGLISH.jump_performance; }, get hint() { return ENGLISH.jump_performance_hint; } },
  { id: SCREEN.quiz_analytics, tone: "rose", icon: "quiz", get label() { return ENGLISH.jump_quiz_analytics; }, get hint() { return ENGLISH.jump_quiz_analytics_hint; } },
  { id: SCREEN.attendance_analytics, tone: "brand", icon: "attendance", get label() { return ENGLISH.jump_attendance_analytics; }, get hint() { return ENGLISH.jump_attendance_analytics_hint; } },
  { id: SCREEN.hackathon_analytics, tone: "orange", icon: "analytics", get label() { return ENGLISH.jump_hackathon_analytics; }, get hint() { return ENGLISH.jump_hackathon_analytics_hint; } },
  { id: SCREEN.chatbot_usage, tone: "purple", icon: "chatbot", get label() { return ENGLISH.jump_chatbot_usage; }, get hint() { return ENGLISH.jump_chatbot_usage_hint; } },
  { id: SCREEN.dropdowns, tone: "green", icon: "dropdowns", get label() { return ENGLISH.jump_dropdowns; }, get hint() { return ENGLISH.jump_dropdowns_hint; } },
  { id: SCREEN.api_integration, tone: "blue", icon: "api", get label() { return ENGLISH.jump_api_integration; }, get hint() { return ENGLISH.jump_api_integration_hint; } },
  { id: SCREEN.certificates, tone: "green", icon: "certificates", get label() { return ENGLISH.jump_certificates; }, get hint() { return ENGLISH.jump_certificates_hint; } }
];

export function Admin_Home({ on_navigate }) {
  const toast = useToast();
  const { session, can } = use_employee_access();
  const [data, set_data] = useState(null);
  const [search, set_search] = useState("");

  use_slug_mirror(["/admin_dashboard", "/employee_dashboard"], { q: search }, { q: "" }, (from_url) => {
    set_search(from_url.q || "");
  });

  useEffect(() => {
    let alive = true;
    get_admin_home().
      then((payload) => {
        if (alive) set_data(payload);
      }).
      catch((err) => {
        if (alive) toast.error(err.message);
      });
    return () => {
      alive = false;
    };
  }, [toast]);

  const kpis = data?.kpis || {};
  const query = search.trim().toLowerCase();
  const jumps = JUMPS.filter((item) => {
    if (!can(item.id, ACCESS.view)) return false;
    if (!query) return true;
    return `${item.label} ${item.hint}`.toLowerCase().includes(query);
  });

  const display_name = session?.is_admin ?
    ENGLISH.admin_user :
    [session?.first_name, session?.last_name].filter(Boolean).join(" ") || ENGLISH.staff;
  const role_label = session?.is_admin ? ENGLISH.administrator : ENGLISH.staff;

  return (
    <section className="ah_desk">
      <div className="ah_stage">
        <Dashboard_Hero is_admin={session?.is_admin} />
        <Dashboard_Header
          search={search}
          set_search={set_search}
          display_name={display_name}
          role_label={role_label}
          profile_photo_url={session?.profile_photo_url} />
      </div>

      <Kpi_Cards kpis={kpis} />

      <section className="ah_jumps" aria-label={ENGLISH.quick_jumps}>
        {jumps.length ?
          <div className="ah_jump_grid">
            {jumps.map((item) =>
              <button
                key={item.id}
                type="button"
                className={`ah_jump is_${item.tone}`}
                onClick={() => on_navigate?.(admin_screen_path(item.id))}>
                <i><Jump_Icon name={item.icon} /></i>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
              </button>
            )}
          </div> :
          <p className="ah_empty">{ENGLISH.no_pages_match}</p>}
      </section>
    </section>
  );
}
