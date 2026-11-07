import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@datapromr/modal";
import { useToast } from "@datapromr/toast";
import { list_cohorts } from "../cohorts/api.js";
import { list_courses } from "../course_manager/api.js";
import {
  activate_program,
  assign_program_courses,
  deactivate_program,
  delete_program,
  get_program_courses,
  get_program_faculty,
  get_program_students,
  list_programs } from
"./api.js";
import { COPY } from "./constants.js";
import { Cohort_Pick } from "./ui/cohort_pick.jsx";
import { Course_Picker } from "./ui/course_picker.jsx";
import { Program_Courses_Board } from "./ui/program_courses_board.jsx";
import { Program_List_Pane } from "./ui/program_list_pane.jsx";
import { Program_Overview } from "./ui/program_overview.jsx";
import { Confirm_Modal } from "../admin_ui/confirm_modal.jsx";
import { LMS_BP_TABLET_PX, LMS_MEDIA_TABLET } from "../design_system/breakpoints.js";
import "../admin_ui/theme/admin_forms.css";
import "./theme/programs.css";
import "./theme/workspace.css";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { id_from_named_slug, screen_paths, slug_with_id, use_slug_mirror } from "../url_slugs.js";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../constants/english/programs_control_constants_english.js";

const PAGE_SIZE = 7;
const MOBILE_QUERY = LMS_MEDIA_TABLET;
const COMPACT_WIDTH = LMS_BP_TABLET_PX;

function is_mobile_viewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

function next_selected(current, next, compact) {
  if (current) {
    const match = next.find(
      (item) => String(item.program_id) === String(current.program_id)
    );
    if (match) return match;
  }
  if (compact) return null;
  return next[0] || null;
}

export function Programs_Control({ on_open_course }) {
  const { can_edit } = use_screen_access(SCREEN.programs);
  const [items, set_items] = useState([]);
  const [total, set_total] = useState(0);
  const [page, set_page] = useState(1);
  const [search_input, set_search_input] = useState("");
  const [search, set_search] = useState("");
  const [cohorts, set_cohorts] = useState([]);
  const [cohort_id, set_cohort_id] = useState("");
  const [lists_ready, set_lists_ready] = useState(false);
  const [error, set_error] = useState("");
  const [loading, set_loading] = useState(false);
  const [panel, set_panel] = useState(null);
  const [selected, set_selected] = useState(null);
  const [courses, set_courses] = useState([]);
  const [students, set_students] = useState([]);
  const [faculty, set_faculty] = useState([]);
  const [catalog, set_catalog] = useState([]);
  const [course_ids, set_course_ids] = useState([]);
  const [course_passkeys, set_course_passkeys] = useState({});
  const [course_passkey_errors, set_course_passkey_errors] = useState({});
  const [confirm, set_confirm] = useState(null);
  const [compact, set_compact] = useState(is_mobile_viewport);
  const [list_open, set_list_open] = useState(true);
  const desk_ref = useRef(null);
  const compact_ref = useRef(compact);
  const toast = useToast();

  compact_ref.current = compact;

  const page_count = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load_board = useCallback(async (program) => {
    if (!program) {
      set_courses([]);
      set_students([]);
      set_faculty([]);
      return;
    }
    try {
      const [course_data, student_data, faculty_data] = await Promise.all([
      get_program_courses(program.program_id),
      get_program_students(program.program_id),
      get_program_faculty(program.program_id)]
      );
      set_courses(course_data.courses || []);
      set_students(student_data.items || []);
      set_faculty(faculty_data.items || []);
    } catch {
      set_courses([]);
      set_students([]);
      set_faculty([]);
    }
  }, []);

  const load_seq = useRef(0);

  const load = useCallback(async () => {
    const seq = load_seq.current + 1;
    load_seq.current = seq;
    if (!cohort_id) {
      set_items([]);
      set_total(0);
      set_selected(null);
      set_loading(false);
      set_error("");
      return;
    }
    set_loading(true);
    set_error("");
    try {
      const data = await list_programs({
        search,
        sort: "name",
        dir: "asc",
        page,
        pageSize: PAGE_SIZE,
        cohort_id
      });
      if (load_seq.current !== seq) return;
      const next = data.items || [];
      set_items(next);
      set_total(data.total || 0);
      set_selected((current) => next_selected(current, next, compact_ref.current));
    } catch (err) {
      if (load_seq.current !== seq) return;
      set_error(err.message);
      toast.error(err.message);
    } finally {
      if (load_seq.current === seq) set_loading(false);
    }
  }, [page, search, toast, cohort_id]);

  useEffect(() => {
    let active = true;
    list_cohorts().
      then((data) => {
        if (active) set_cohorts(data.items || []);
      }).
      catch((err) => {
        if (!active) return;
        set_error(err.message);
        toast.error(err.message);
      }).
      finally(() => {
        if (active) set_lists_ready(true);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      set_page(1);
      set_search(search_input);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search_input]);

  use_slug_mirror(
    lists_ready ? screen_paths(SCREEN.programs) : "/__wait",
    {
      q: search,
      cohort: slug_with_id(
        cohorts.find((item) => String(item.cohort_id) === String(cohort_id))?.cohort_name,
        cohort_id
      )
    },
    { q: "", cohort: "" },
    (from_url) => {
      set_search(from_url.q || "");
      set_search_input(from_url.q || "");
      set_cohort_id(id_from_named_slug(cohorts, from_url.cohort, "cohort_id", "cohort_name"));
    }
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const node = desk_ref.current;
    const sync = () => {
      if (document.querySelector(".ui-modal")) return;
      const desk_width = node?.getBoundingClientRect().width || 0;
      set_compact(desk_width <= COMPACT_WIDTH || is_mobile_viewport());
    };
    sync();
    const observer = node ? new ResizeObserver(sync) : null;
    if (node && observer) observer.observe(node);
    window.addEventListener("resize", sync);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    load_board(selected);
  }, [selected?.program_id, load_board]);

  function choose_cohort(id) {
    set_cohort_id(id);
    set_page(1);
    set_search_input("");
    set_search("");
    set_selected(null);
  }

  async function run_action(row, action) {
    try {
      if (action === "activate") {
        const updated = await activate_program(row.program_id);
        set_selected(updated);
        toast.success(ENGLISH.program_activated);
      }
      if (action === "deactivate") {
        const updated = await deactivate_program(row.program_id);
        set_selected(updated);
        toast.success(ENGLISH.program_deactivated);
      }
      if (action === "delete") {
        await delete_program(row.program_id);
        set_selected(null);
        toast.success(ENGLISH.program_deleted);
      }
      await load();
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    }
  }

  async function open_assign() {
    if (!selected) return;
    try {
      const data = await list_courses({ sort: "name", dir: "asc", page: 1, pageSize: 500 });
      set_catalog(data.items || []);
      set_course_ids(courses.map((item) => item.course_id));
      const keys = {};
      for (const course of courses) {
        if (course.enroll_passkey) keys[String(course.course_id)] = course.enroll_passkey;
      }
      set_course_passkeys(keys);
      set_course_passkey_errors({});
      set_panel("assign");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function save_courses(overwrite_passkeys = false) {
    if (!selected) return;
    const offline_selected = catalog.filter(
      (course) => course_ids.some((id) => Number(id) === Number(course.course_id)) && course.is_offline
    );
    const linked_by_id = new Map(courses.map((item) => [Number(item.course_id), item]));
    const next_errors = {};
    for (const course of offline_selected) {
      const key = String(course.course_id);
      const text = String(course_passkeys[key] || "").trim();
      const linked = linked_by_id.get(Number(course.course_id));
      const has_existing = Boolean(String(linked?.enroll_passkey || "").trim());
      if (!text && !has_existing) next_errors[key] = ENGLISH.enter_a_program_passkey;
      else if (text && text.length < 4) next_errors[key] = ENGLISH.passkey_must_be_at_least_4_characters;
    }
    set_course_passkey_errors(next_errors);
    if (Object.values(next_errors).some(Boolean)) return;

    set_loading(true);
    try {
      const keyed = {};
      for (const course of offline_selected) {
        const text = String(course_passkeys[String(course.course_id)] || "").trim();
        if (text) keyed[String(course.course_id)] = text;
      }
      const data = await assign_program_courses(selected.program_id, course_ids, {
        course_passkeys: keyed,
        overwrite_passkeys
      });
      set_courses(data.courses || []);
      set_panel(null);
      set_confirm(null);
      toast.success(ENGLISH.courses_assigned);
      await load_board(selected);
    } catch (err) {
      if (err.code === "PASSKEY_EXISTS" && !overwrite_passkeys) {
        set_loading(false);
        set_confirm({
          get title() { return ENGLISH.replace_passkey; },
          message: ENGLISH.replace_the_existing_passkey_s(err.message)
        });
        return;
      }
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function unassign_course(course) {
    if (!selected) return;
    try {
      const next = courses.
      filter((item) => item.course_id !== course.course_id).
      map((item) => item.course_id);
      const data = await assign_program_courses(selected.program_id, next);
      set_courses(data.courses || []);
      toast.success(ENGLISH.course_removed_from_program);
      await load_board(selected);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <section
      ref={desk_ref}
      className={["prg_desk", selected ? "is_picked" : "", compact ? "is_compact" : "", !list_open && !compact ? "is_list_off" : ""].
      filter(Boolean).
      join(" ")}>
      
      {error ? <p className="prg_desk_error">{error}</p> : null}

      <Program_List_Pane
        items={items}
        total={total}
        page={page}
        page_size={PAGE_SIZE}
        page_count={page_count}
        search={search_input}
        selected_id={selected?.program_id}
        loading={loading}
        compact={compact}
        collapsed={!compact && !list_open}
        cohorts={cohorts}
        cohort_id={cohort_id}
        on_cohort={choose_cohort}
        on_search={set_search_input}
        on_page={set_page}
        on_select={(program) => {
          set_selected(program);
          window.scrollTo(0, 0);
        }}
        on_toggle={compact ? undefined : () => set_list_open((open) => !open)} />
      

      <div className="prg_desk_main">
        {selected ?
        <>
            <Program_Overview
            program={selected}
            on_back={() => {
              set_selected(null);
              window.scrollTo(0, 0);
            }}
            on_toggle={
            can_edit ?
            () => run_action(selected, selected.is_active ? "deactivate" : "activate") :
            undefined
            }
            on_delete={can_edit ? () => run_action(selected, "delete") : undefined} />
          
            <Program_Courses_Board
            program={selected}
            compact={compact}
            courses={courses}
            students={students}
            faculty={faculty}
            on_add_course={can_edit ? open_assign : undefined}
            on_view_course={(row) =>
              on_open_course?.({ ...row, program_id: selected.program_id })
            }
            on_unassign={can_edit ? unassign_course : undefined} />
          
          </> :

        <div className={cohort_id ? "prg_desk_blank" : "prg_desk_blank is_pick"}>
            {cohort_id ?
            <>
              <strong>{loading ? ENGLISH.loading_programs : COPY.empty}</strong>
              <p>{loading ? ENGLISH.fetching_this_list : COPY.emptyHint}</p>
            </> :
            <Cohort_Pick cohorts={cohorts} on_select={choose_cohort} />}
          </div>
        }
      </div>

      <Modal
        open={panel === "assign"}
        title={COPY.addCourse}
        size="wide"
        onClose={() => set_panel(null)}>
        
        <Course_Picker
          courses={catalog}
          selected_ids={course_ids}
          course_passkeys={course_passkeys}
          passkey_errors={course_passkey_errors}
          loading={loading}
          on_change={set_course_ids}
          on_passkeys_change={set_course_passkeys}
          on_submit={() => save_courses(false)} />
        
      </Modal>

      <Confirm_Modal
        open={Boolean(confirm)}
        title={confirm?.title || ENGLISH.confirm}
        message={confirm?.message || ""}
        confirm_label={ENGLISH.replace}
        loading={loading}
        on_cancel={() => set_confirm(null)}
        on_confirm={() => {
          set_confirm(null);
          save_courses(true);
        }} />
    </section>);

}
