import { useCallback, useEffect, useState } from "react";
import { useToast } from "@datapromr/toast";
import { access_my_course, list_my_courses } from "./api.js";
import { COPY, TABS } from "./constants.js";
import { Course_Switcher } from "./ui/course_switcher.jsx";
import {
  Award_Stat_Icon,
  Book_Stat_Icon,
  Check_Stat_Icon,
  Play_Stat_Icon } from
"./ui/icons.jsx";
import { display_name, initials } from "./utils.js";
import { Link_Text } from "../design_system/link_text.jsx";
import { use_slug_mirror } from "../url_slugs.js";
import "./theme/my_courses.css";
import { MY_COURSES_ENGLISH as ENGLISH } from "../constants/english/my_courses_constants_english.js";

const EMPTY_STATS = { enrolled: 0, in_progress: 0, completed: 0, certificates: 0 };

export function My_Courses({ on_browse_courses, on_browse_programs, on_open_learn, on_profile }) {
  const toast = useToast();
  const [student, set_student] = useState(null);
  const [items, set_items] = useState([]);
  const [stats, set_stats] = useState(EMPTY_STATS);
  const [tab, set_tab] = useState("all");
  const [sort, set_sort] = useState("recent");

  use_slug_mirror(
    "/dashboard/courses",
    { tab, sort },
    { tab: "all", sort: "recent" },
    (from_url) => {
      set_tab(from_url.tab || "all");
      set_sort(from_url.sort || "recent");
    }
  );
  const [active_id, set_active_id] = useState(null);
  const [active_registration, set_active_registration] = useState(null);
  const [busy_id, set_busy_id] = useState(null);
  const [loading, set_loading] = useState(false);

  const load = useCallback(async ({ focus_course_id = null, reset_filters = false } = {}) => {
    set_loading(true);
    try {
      const query = reset_filters ?
        { tab: "all", sort: "recent" } :
        { tab, sort };
      const data = await list_my_courses(query);
      const next = data.items || [];
      const focus_id = focus_course_id == null ? null : Number(focus_course_id);
      const focused = Number.isInteger(focus_id) ?
        next.find((item) => Number(item.course_id) === focus_id) :
        null;
      if (reset_filters) {
        set_tab("all");
        set_sort("recent");
      }
      set_student(data.student || null);
      set_items(next);
      set_stats(data.stats || EMPTY_STATS);
      set_active_id((current) => {
        const kept = focused?.course_id ||
          (current && next.some((item) => item.course_id === current) ? current : next[0]?.course_id || null);
        set_active_registration((reg) => {
          if (reg && next.some((item) => item.registration_id === reg && item.course_id === kept)) return reg;
          return next.find((item) => item.course_id === kept)?.registration_id || null;
        });
        return kept;
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }, [sort, tab, toast]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    function refresh_after_enrollment(event) {
      load({ focus_course_id: event.detail?.course_id, reset_filters: true });
    }

    window.addEventListener("lms-course-enrolled", refresh_after_enrollment);
    return () => window.removeEventListener("lms-course-enrolled", refresh_after_enrollment);
  }, [load]);

  async function open_course(course, target = null) {
    set_busy_id(course.course_id);
    try {
      if (target?.kind && target?.id != null) {
        try {
          sessionStorage.setItem(
            `lrn_open_${course.course_id}`,
            JSON.stringify({ kind: target.kind, id: target.id })
          );
        } catch {
          /* ignore */
        }
      }
      await access_my_course(course.course_id, course.registration_id);
      on_open_learn?.(course.course_id, course.registration_id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy_id(null);
    }
  }

  const name = display_name(student);
  const active_course =
    items.find((item) => item.registration_id === active_registration) ||
    items.find((item) => item.course_id === active_id) ||
    null;
  const program = active_course?.program_id && active_course.program_name ? active_course : null;

  function select_course(course_id, registration_id) {
    set_active_id(course_id);
    set_active_registration(registration_id || null);
  }

  return (
    <section className="myc_desk">
      <header className="myc_top">
        <div className="myc_heading">
          <h1>{COPY.title}</h1>
        </div>
        <div className="myc_user">
          <button type="button" className="myc_user_who" onClick={() => on_profile?.()}>
            <div className="myc_user_avatar">{initials(student?.first_name, student?.last_name)}</div>
            <div>
              <strong>{name}</strong>
              <span>{ENGLISH.view_profile}</span>
            </div>
          </button>
        </div>
      </header>

      <div className="myc_band">


      <div className="myc_stats">
        <article>
          <span className="is_enrolled">
            <Book_Stat_Icon />
          </span>
          <div>
            <p>{COPY.enrolled}</p>
            <b>
              {stats.enrolled} {stats.enrolled === 1 ? "course" : "courses"}
            </b>
          </div>
        </article>
        <article>
          <span className="is_progress">
            <Play_Stat_Icon />
          </span>
          <div>
            <p>{COPY.inProgress}</p>
            <b>
              {stats.in_progress} {stats.in_progress === 1 ? "course" : "courses"}
            </b>
          </div>
        </article>
        <article>
          <span className="is_done">
            <Check_Stat_Icon />
          </span>
          <div>
            <p>{COPY.completed}</p>
            <b>
              {stats.completed} {stats.completed === 1 ? "course" : "courses"}
            </b>
          </div>
        </article>
        <article>
          <span className="is_award">
            <Award_Stat_Icon />
          </span>
          <div>
            <p>{COPY.certificates}</p>
            <b>
              {stats.certificates} {stats.certificates === 1 ? "certificate" : "certificates"}
            </b>
          </div>
        </article>
      </div>
      </div>

      {program ?
        <article className="myc_program">
          {program.program_thumbnail ?
            <span
              className="myc_program_photo"
              style={{ backgroundImage: `url("${String(program.program_thumbnail).replace(/"/g, "")}")` }} /> :
            <span className="myc_program_wash" />}
          <div className="myc_program_copy">
            <p>{ENGLISH.program}</p>
            <h2>{program.program_name}</h2>
            {program.program_description ? <span><Link_Text text={program.program_description} /></span> : null}
          </div>
        </article> :
        null}

      <div className="myc_toolbar">
        <div className="myc_tabs" role="tablist">
          {TABS.map((item) =>
          <button
            key={item.id}
            type="button"
            role="tab"
            className={tab === item.id ? "is_on" : undefined}
            onClick={() => set_tab(item.id)}>
            
              {item.label}
            </button>
          )}
        </div>
        <div className="myc_tools">
          <select value={sort} onChange={(event) => set_sort(event.target.value)}>
            <option value="recent">{COPY.sortRecent}</option>
            <option value="name">{COPY.sortName}</option>
          </select>
        </div>
      </div>

      {items.length ?
      <Course_Switcher
        courses={items}
        active_id={active_id}
        busy_id={busy_id}
        active_registration={active_registration}
        on_select={select_course}
        on_open={open_course} />
       :

      <p className="myc_empty">{loading ? ENGLISH.loading_courses : COPY.empty}</p>
      }

      {on_browse_courses || on_browse_programs ?
        <p className="myc_browse">
          {COPY.browse}{" "}
          {on_browse_courses ?
            <button type="button" onClick={() => on_browse_courses()}>
              {COPY.browseLink}
            </button> :
            null}
          {on_browse_courses && on_browse_programs ? <span aria-hidden="true"> · </span> : null}
          {on_browse_programs ?
            <button type="button" onClick={() => on_browse_programs()}>
              {COPY.browseProgramsLink}
            </button> :
            null}
        </p> :
        null}
    </section>);

}
