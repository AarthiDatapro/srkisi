import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@datapromr/toast";
import { list_dropdown_options } from "../dropdown_manager/api.js";
import { list_programs } from "../programs_control/api.js";
import {
  activate_course,
  create_course,
  deactivate_course,
  delete_course,
  get_course,
  export_course_enrollments,
  list_courses,
  set_course_program_passkey,
  update_course,
  upload_course_thumbnail,
  delete_course_thumbnail
} from
  "./api.js";
import { COURSE_COLUMNS } from "./columns.js";
import { EMPTY_COURSE } from "./constants.js";
import { form_from_course, get_course_errors, has_errors } from "./utils.js";
import { Course_Catalog_View } from "./ui/course_catalog_view.jsx";
import { Program_Pick_Modal } from "./ui/program_pick_modal.jsx";
import { LMS_MEDIA_PHONE } from "../design_system/breakpoints.js";
import { save_workbook } from "../design_system/excel_workbook.js";
import "../admin_ui/theme/admin_forms.css";
import "./theme/courses.css";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { screen_paths, use_slug_mirror } from "../url_slugs.js";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_manager_constants_english.js";

function first_active(list) {
  return list.find((item) => item.is_active) || list[0];
}

const VIEW_STORE_KEY = "course_manager_view";
const COURSE_TABS = ["open", "closed"];
const SORT_DIRS = ["asc", "desc"];
const EMPTY_VIEW = {
  course_tab: "open",
  search: "",
  filter_columns: [],
  filter_column: "",
  filter_value: "",
  sort_key: "",
  sort_dir: ""
};
const COLUMN_LABELS = Object.fromEntries(COURSE_COLUMNS.map((column) => [column.id, column.label]));
const SEARCH_KEYS = COURSE_COLUMNS.map((column) => column.id);
const GRID_ROOT = ".crs_desk_grid";
const FILTER_PANEL = ENGLISH.gds_column_picker_panel_aria_label_columns_for;
const GRID_LAYER_CSS = `
.crs_desk .crs_desk_grid .gds-shell__filters {
  z-index: 12;
}
`;

function clean_view(saved) {
  if (!saved || typeof saved !== "object") return { ...EMPTY_VIEW };
  const filter_columns = Array.isArray(saved.filter_columns) ?
    saved.filter_columns.filter((id) => COLUMN_LABELS[id]) :
    [];
  const filter_column = filter_columns.includes(saved.filter_column) ? saved.filter_column : "";
  const sort_key = COLUMN_LABELS[saved.sort_key] && SORT_DIRS.includes(saved.sort_dir) ? saved.sort_key : "";
  return {
    course_tab: COURSE_TABS.includes(saved.course_tab) ? saved.course_tab : "open",
    search: typeof saved.search === "string" ? saved.search : "",
    filter_columns,
    filter_column,
    filter_value: filter_column && typeof saved.filter_value === "string" ? saved.filter_value : "",
    sort_key,
    sort_dir: sort_key ? saved.sort_dir : ""
  };
}

function read_view() {
  try {
    return clean_view(JSON.parse(window.localStorage.getItem(VIEW_STORE_KEY) || "null"));
  } catch {
    return { ...EMPTY_VIEW };
  }
}

function write_view(view) {
  try {
    window.localStorage.setItem(VIEW_STORE_KEY, JSON.stringify(view));
  } catch {
    /* storage unavailable */
  }
}

function created_time(course) {
  const raw = course?.created_at;
  if (!raw) return 0;
  const time = new Date(typeof raw === "string" ? raw.replace(" ", "T") : raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function newest_first(left, right) {
  const gap = created_time(right) - created_time(left);
  if (gap) return gap;
  return Number(right.course_id || 0) - Number(left.course_id || 0);
}

function has_value(rows, column, value) {
  return rows.some((row) => String(row[column] ?? "") === String(value));
}

function wait_render() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

function set_field_value(field, value) {
  if (!field) return false;
  const is_select = field instanceof HTMLSelectElement;
  if (is_select && ![...field.options].some((option) => option.value === value)) return false;
  const proto = is_select ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(field, value);
  field.dispatchEvent(new Event(is_select ? "change" : "input", { bubbles: true }));
  return true;
}

function read_grid_filters(root) {
  const column_select = root.querySelector("#gds-filter-column");
  return {
    filter_columns: column_select ? [...column_select.options].map((option) => option.value).filter(Boolean) : [],
    filter_column: column_select?.value || ""
  };
}

async function clear_filter_columns(root) {
  const toggle = root.querySelector(ENGLISH.button_aria_label_filter_columns);
  if (!toggle?.querySelector(".gds-column-picker__count")) return;
  if (toggle.getAttribute("aria-expanded") !== "true") {
    toggle.click();
    await wait_render();
  }
  let box = root.querySelector(ENGLISH.input_type_checkbox_checked(FILTER_PANEL));
  while (box) {
    box.click();
    await wait_render();
    box = root.querySelector(ENGLISH.input_type_checkbox_checked(FILTER_PANEL));
  }
  if (toggle.getAttribute("aria-expanded") === "true") {
    toggle.click();
    await wait_render();
  }
}

function read_grid_sort(root) {
  const sorted = root.querySelector(ENGLISH.th_aria_sort_ascending_th_aria_sort_descending);
  if (!sorted) return { sort_key: "", sort_dir: "" };
  return {
    sort_key: sorted.getAttribute("data-col-id") || "",
    sort_dir: sorted.getAttribute("aria-sort") === "ascending" ? "asc" : "desc"
  };
}

function use_narrow(query = LMS_MEDIA_PHONE) {
  const [narrow, set_narrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const on_change = () => set_narrow(media.matches);
    on_change();
    media.addEventListener("change", on_change);
    return () => media.removeEventListener("change", on_change);
  }, [query]);

  return narrow;
}

export function Course_Manager({ on_open_course, on_open_cohorts }) {
  const { can_edit } = use_screen_access(SCREEN.courses);
  const [items, set_items] = useState([]);
  const [programs, set_programs] = useState([]);
  const [error, set_error] = useState("");
  const [loading, set_loading] = useState(false);
  const [panel, set_panel] = useState(null);
  const [selected, set_selected] = useState(null);
  const [form, set_form] = useState(EMPTY_COURSE);
  const [form_errors, set_form_errors] = useState({});
  const [selected_program_ids, set_selected_program_ids] = useState([]);
  const [passkey_form, set_passkey_form] = useState({ program_id: "", passkey: "" });
  const [passkey_error, set_passkey_error] = useState("");
  const [confirm, set_confirm] = useState(null);
  const [file, set_file] = useState(null);
  const [pick, set_pick] = useState(null);
  const [types, set_types] = useState([]);
  const [domains, set_domains] = useState([]);
  const [levels, set_levels] = useState([]);
  const [languages, set_languages] = useState([]);
  const [tags, set_tags] = useState([]);
  const toast = useToast();
  const compact = use_narrow();

  const [view, set_view] = useState(read_view);
  const [loaded, set_loaded] = useState(false);
  const [exporting, set_exporting] = useState("");
  const view_ref = useRef(view);
  const restoring_ref = useRef(false);
  const grid_ready_ref = useRef(false);

  const course_tab = view.course_tab;
  const card_query = view.search;

  use_slug_mirror(
    screen_paths(SCREEN.courses),
    { tab: course_tab, q: card_query },
    { tab: "open", q: "" },
    (from_url) => {
      set_view((current) => ({
        ...current,
        course_tab: from_url.tab || "open",
        search: from_url.q || "",
      }));
    }
  );

  const preview_url = file
    ? URL.createObjectURL(file)
    : selected?.thumbnail_url || "";

  useEffect(() => {
    view_ref.current = view;
    write_view(view);
  }, [view]);

  function set_course_tab(tab) {
    set_view((current) => ({ ...current, course_tab: COURSE_TABS.includes(tab) ? tab : "open" }));
  }

  function set_card_query(value) {
    set_view((current) => ({ ...current, search: value }));
  }

  const load = useCallback(async () => {
    set_loading(true);
    set_error("");
    try {
      const data = await list_courses({
        sort: "date",
        dir: "desc",
        page: 1,
        pageSize: 500
      });
      set_items(data.items || []);
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    } finally {
      set_loading(false);
      set_loaded(true);
    }
  }, [toast]);

  useEffect(() => {
    list_dropdown_options("course_types").
      then((data) => set_types(data.items || [])).
      catch(() => set_types([]));
    list_dropdown_options("course_domains").
      then((data) => set_domains(data.items || [])).
      catch(() => set_domains([]));
    list_dropdown_options("course_levels").
      then((data) => set_levels(data.items || [])).
      catch(() => set_levels([]));
    list_dropdown_options("course_languages").
      then((data) => set_languages(data.items || [])).
      catch(() => set_languages([]));
    list_dropdown_options("course_tags").
      then((data) => set_tags(data.items || [])).
      catch(() => set_tags([]));
    list_programs({ sort: "name", dir: "asc", page: 1, pageSize: 500 }).
      then((data) => set_programs(data.items || [])).
      catch(() => set_programs([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ordered_items = useMemo(() => [...items].sort(newest_first), [items]);

  const tab_items = useMemo(
    () => ordered_items.filter((course) => course_tab === "open" ? course.is_open : !course.is_open),
    [ordered_items, course_tab]
  );

  const rows = useMemo(
    () =>
      tab_items.map((course) => ({
        ...course,
        id: course.course_id,
        status: course.is_active ? ENGLISH.active : ENGLISH.inactive
      })),
    [tab_items]
  );

  const visible_rows = useMemo(() => {
    const needle = card_query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      SEARCH_KEYS.map((key) => String(row[key] ?? "")).
        join(" ").
        toLowerCase().
        includes(needle)
    );
  }, [card_query, rows]);

  useEffect(() => {
    if (compact) return undefined;

    function in_grid(target) {
      return target instanceof Element && Boolean(target.closest(GRID_ROOT));
    }

    function grid_root() {
      return document.querySelector(GRID_ROOT);
    }

    function on_input(event) {
      const target = event.target;
      if (restoring_ref.current || !in_grid(target) || target.id !== "gds-grid-search") return;
      set_view((current) => ({ ...current, search: target.value }));
    }

    function on_change(event) {
      const target = event.target;
      if (restoring_ref.current || !in_grid(target)) return;
      if (target.id === "gds-filter-column") {
        set_view((current) => ({ ...current, filter_column: target.value, filter_value: "" }));
        return;
      }
      if (target.id === "gds-filter-value") {
        set_view((current) => ({ ...current, filter_value: target.value }));
        return;
      }
      if (target.closest(FILTER_PANEL)) {
        wait_render().then(() => {
          const root = grid_root();
          if (!root) return;
          const next = read_grid_filters(root);
          set_view((current) => ({
            ...current,
            ...next,
            filter_value: next.filter_column === current.filter_column ? current.filter_value : ""
          }));
        });
      }
    }

    function on_click(event) {
      const target = event.target;
      if (restoring_ref.current || !in_grid(target)) return;
      if (target.closest(".gds-toolbar__clear")) {
        set_view((current) => ({
          ...current,
          search: "",
          filter_columns: [],
          filter_column: "",
          filter_value: "",
          sort_key: "",
          sort_dir: ""
        }));
        wait_render().then(async () => {
          const root = grid_root();
          if (!root) return;
          restoring_ref.current = true;
          try {
            await clear_filter_columns(root);
          } finally {
            restoring_ref.current = false;
          }
        });
        return;
      }
      if (target.closest(".ub-table__sort-btn")) {
        wait_render().then(() => {
          const root = grid_root();
          if (root) set_view((current) => ({ ...current, ...read_grid_sort(root) }));
        });
      }
    }

    document.addEventListener("input", on_input);
    document.addEventListener("change", on_change);
    document.addEventListener("click", on_click);
    return () => {
      document.removeEventListener("input", on_input);
      document.removeEventListener("change", on_change);
      document.removeEventListener("click", on_click);
    };
  }, [compact]);

  useEffect(() => {
    if (compact || !loaded) return undefined;
    let cancelled = false;
    grid_ready_ref.current = false;

    async function restore_grid() {
      await wait_render();
      const root = document.querySelector(GRID_ROOT);
      if (cancelled || !root) return;
      const saved = view_ref.current;
      restoring_ref.current = true;
      try {
        const toggle = root.querySelector(ENGLISH.button_aria_label_filter_columns);
        if (saved.filter_columns.length && toggle) {
          if (toggle.getAttribute("aria-expanded") !== "true") {
            toggle.click();
            await wait_render();
          }
          for (const id of saved.filter_columns) {
            if (cancelled) return;
            const picker_rows = root.querySelectorAll(`${FILTER_PANEL} .gds-column-picker__row`);
            const row = [...picker_rows].find((item) => item.textContent.trim() === COLUMN_LABELS[id]);
            const box = row?.querySelector('input[type="checkbox"]');
            if (box && !box.checked) {
              box.click();
              await wait_render();
            }
          }
          if (toggle.getAttribute("aria-expanded") === "true") {
            toggle.click();
            await wait_render();
          }
        }
        if (cancelled) return;
        if (saved.filter_column) {
          set_field_value(root.querySelector("#gds-filter-column"), saved.filter_column);
          await wait_render();
        }
        if (cancelled) return;
        if (saved.filter_column && saved.filter_value) {
          set_field_value(root.querySelector("#gds-filter-value"), saved.filter_value);
          await wait_render();
        }
        if (cancelled) return;
        if (saved.search) {
          set_field_value(root.querySelector("#gds-grid-search"), saved.search);
          await wait_render();
        }
        if (saved.sort_key && saved.sort_dir) {
          const clicks = saved.sort_dir === "desc" ? 2 : 1;
          for (let index = 0; index < clicks; index += 1) {
            if (cancelled) return;
            const button = root.querySelector(ENGLISH.th_data_col_id_ub_table_sort_btn(saved.sort_key));
            if (!button) break;
            button.click();
            await wait_render();
          }
        }
        if (cancelled) return;
        const grid_filters = read_grid_filters(root);
        const grid_sort = read_grid_sort(root);
        set_view((current) => ({
          ...current,
          ...grid_filters,
          ...grid_sort,
          filter_value: grid_filters.filter_column === current.filter_column ? current.filter_value : ""
        }));
        grid_ready_ref.current = true;
      } finally {
        restoring_ref.current = false;
      }
    }

    restore_grid();
    return () => {
      cancelled = true;
      restoring_ref.current = false;
    };
  }, [compact, loaded]);

  useEffect(() => {
    if (compact || !loaded || !grid_ready_ref.current) return;
    const root = document.querySelector(GRID_ROOT);
    const { filter_column, filter_value } = view_ref.current;
    if (!root || !filter_column || !filter_value) return;
    if (root.querySelector("#gds-filter-column")?.value !== filter_column) return;
    const value_select = root.querySelector("#gds-filter-value");
    const available = has_value(rows, filter_column, filter_value);
    if (available && value_select?.value === filter_value) return;
    restoring_ref.current = true;
    try {
      set_field_value(value_select, available ? filter_value : "");
    } finally {
      restoring_ref.current = false;
    }
  }, [compact, loaded, rows]);

  function open_create() {
    const type = first_active(types);
    set_form({
      ...EMPTY_COURSE,
      course_type_id: type ? String(type.id) : "",
      is_active: true
    });
    set_form_errors({});
    set_selected(null);
    set_selected_program_ids([]);
    set_file(null);
    set_panel("create");
  }

  function open_edit(row) {
    set_form(form_from_course(row));
    set_form_errors({});
    set_selected(row);
    set_selected_program_ids((row.programs || []).map((item) => item.program_id));
    set_file(null);
    set_panel("edit");
    get_course(row.course_id).
      then((full) => {
        set_selected(full);
        set_form(form_from_course(full));
        set_selected_program_ids((full.programs || []).map((item) => item.program_id));
      }).
      catch(() => { });
  }

  function open_details(row) {
    set_selected(row);
    set_panel("details");
    get_course(row.course_id).then(set_selected).catch(() => { });
  }

  async function open_course(row) {
    if (!on_open_course) {
      open_details(row);
      return;
    }
    if (Number(row?.program_id) > 0) {
      on_open_course(row);
      return;
    }
    try {
      const full = await get_course(row.course_id);
      const assigned = full.programs || [];
      if (!assigned.length) {
        on_open_course(full);
        return;
      }
      set_pick({ course: full, programs: assigned, loading: false });
    } catch (err) {
      set_pick(null);
      toast.error(err.message);
    }
  }

  function choose_program(program_id) {
    const course = pick?.course;
    set_pick(null);
    if (!course || !on_open_course) return;
    on_open_course({ ...course, program_id });
  }

  function open_passkey(row) {
    set_selected(row);
    set_passkey_form({ program_id: "", passkey: "" });
    set_passkey_error("");
    set_panel("passkey");
    get_course(row.course_id).
      then((full) => {
        set_selected(full);
        const first = (full.programs || [])[0];
        set_passkey_form({
          program_id: first ? String(first.program_id) : "",
          passkey: first?.enroll_passkey || ""
        });
      }).
      catch(() => { });
  }

  async function remove_course_image() {
    if (!selected?.course_id || !selected?.thumbnail_url) return;
    set_loading(true);
    try {
      const saved = await delete_course_thumbnail(selected.course_id);
      set_selected(saved);
      toast.success(ENGLISH.course_image_removed);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function save_course(overwrite_passkeys = false) {
    const next_errors = get_course_errors({
      ...form,
      program_passkeys: form.is_offline ?
        Object.fromEntries(
          selected_program_ids.map((id) => [
            String(id),
            form.program_passkeys?.[String(id)] || ""
          ])
        ) :
        {}
    });
    set_form_errors(next_errors);
    if (has_errors(next_errors)) return;

    set_loading(true);
    try {
      const program_passkeys = {};
      if (form.is_offline) {
        for (const id of selected_program_ids) {
          const key = String(form.program_passkeys?.[String(id)] || "").trim();
          if (key) program_passkeys[String(id)] = key;
        }
      }
      const payload = {
        ...form,
        program_ids: selected_program_ids,
        program_passkeys,
        overwrite_passkeys
      };
      const saved =
        panel === "edit" && selected ?
          await update_course(selected.course_id, payload) :
          await create_course(payload);
      if (file) {
        await upload_course_thumbnail(saved.course_id, file);
      }
      set_panel(null);
      set_file(null);
      set_confirm(null);
      toast.success(panel === "edit" ? ENGLISH.course_updated : ENGLISH.course_created);
      list_dropdown_options("course_domains").
        then((data) => set_domains(data.items || [])).
        catch(() => { });
      await load();
    } catch (err) {
      if (err.code === "PASSKEY_EXISTS" && !overwrite_passkeys) {
        set_loading(false);
        set_confirm({
          get title() { return ENGLISH.replace_passkey; },
          message: ENGLISH.replace_the_existing_passkey_s(err.message),
          action: "course"
        });
        return;
      }
      set_error(err.message);
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function save_passkey(overwrite = false) {
    if (!selected) return;
    const program_id = Number(passkey_form.program_id);
    const passkey = String(passkey_form.passkey || "").trim();
    if (!program_id) {
      set_passkey_error(ENGLISH.select_a_program);
      return;
    }
    if (!passkey || passkey.length < 4) {
      set_passkey_error(passkey ? ENGLISH.passkey_must_be_at_least_4_characters : ENGLISH.enter_a_program_passkey);
      return;
    }
    set_passkey_error("");
    set_loading(true);
    try {
      const full = await set_course_program_passkey(selected.course_id, {
        program_id,
        enroll_passkey: passkey,
        overwrite
      });
      set_selected(full);
      set_confirm(null);
      toast.success(overwrite ? ENGLISH.passkey_replaced : ENGLISH.passkey_saved);
      set_panel("details");
      await load();
    } catch (err) {
      if (err.code === "PASSKEY_EXISTS" && !overwrite) {
        set_loading(false);
        set_confirm({
          get title() { return ENGLISH.replace_passkey; },
          get message() { return ENGLISH.a_passkey_already_exists_for_this_program_replace; },
          action: "passkey"
        });
        return;
      }
      set_passkey_error(err.message);
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  function run_confirm() {
    const action = confirm?.action;
    set_confirm(null);
    if (action === "course") return save_course(true);
    if (action === "passkey") return save_passkey(true);
    return undefined;
  }

  function student_sheet(label, students) {
    return {
      label,
      widths: [180, 220, 130, 180, 110, 150],
      headers: [
        ENGLISH.student,
        ENGLISH.email,
        ENGLISH.mobile,
        ENGLISH.program_name,
        ENGLISH.enrolled_on,
        ENGLISH.registration_id
      ],
      rows: students.map((student) => [
        student.student_name,
        student.email,
        student.mobile_number,
        student.program_name,
        student.enrolled_on,
        student.course_student_id
      ])
    };
  }

  function enrollment_workbook(data, course_id) {
    const courses = data.courses || [];
    const students = data.students || [];
    if (course_id) {
      const code = String(courses[0]?.course_code || course_id).replace(/[^\w.-]+/g, "_").slice(0, 40);
      return {
        file_name: `${code}_students.xls`,
        sheets: [student_sheet(courses[0]?.course_name || ENGLISH.students, students)]
      };
    }
    const students_by_course = new Map();
    for (const student of students) {
      const key = String(student.course_id);
      const list = students_by_course.get(key) || [];
      list.push(student);
      students_by_course.set(key, list);
    }
    return {
      file_name: "course_enrollments.xls",
      sheets: [
        {
          label: ENGLISH.overall,
          widths: [220, 140, 130, 120, 80, 100, 100],
          headers: [
            ENGLISH.course,
            ENGLISH.code,
            ENGLISH.type,
            ENGLISH.level,
            ENGLISH.hours,
            ENGLISH.status,
            ENGLISH.enrolled
          ],
          rows: courses.map((course) => [
            course.course_name,
            course.course_code,
            course.course_type,
            course.course_level,
            course.duration_hours,
            course.is_active ? ENGLISH.active : ENGLISH.inactive,
            course.enrolled_count
          ])
        },
        ...courses.map((course) => student_sheet(
          course.course_name || course.course_code || ENGLISH.course,
          students_by_course.get(String(course.course_id)) || []
        ))
      ]
    };
  }

  async function download_enrollments(course_id) {
    const key = course_id ? String(course_id) : "all";
    if (exporting) return;
    set_exporting(key);
    try {
      const data = await export_course_enrollments(course_id);
      save_workbook(enrollment_workbook(data, course_id));
    } catch (err) {
      toast.error(err.message || ENGLISH.unable_to_download_students);
    } finally {
      set_exporting("");
    }
  }

  async function run_action(row, action) {
    try {
      if (action === "activate") {
        await activate_course(row.course_id);
        toast.success(ENGLISH.course_activated);
      }
      if (action === "deactivate") {
        await deactivate_course(row.course_id);
        toast.success(ENGLISH.course_deactivated);
      }
      if (action === "delete") {
        await delete_course(row.course_id);
        toast.success(ENGLISH.course_deleted);
      }
      if (panel && selected?.course_id === row.course_id) set_panel(null);
      await load();
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    }
  }

  return (
    <>
      <style>{GRID_LAYER_CSS}</style>
      <Course_Catalog_View
        compact={compact}
        items={tab_items}
        course_tab={course_tab}
        set_course_tab={set_course_tab}
        open_count={ordered_items.filter((course) => course.is_open).length}
        closed_count={ordered_items.filter((course) => !course.is_open).length}
        loading={loading}
        can_edit={can_edit}
        error={error}
        card_query={card_query}
        set_card_query={set_card_query}
        visible_rows={visible_rows}
        rows={rows}
        open_course={open_course}
        open_details={open_details}
        open_edit={open_edit}
        run_action={run_action}
        open_create={open_create}
        panel={panel}
        set_panel={set_panel}
        set_file={set_file}
        form={form}
        form_errors={form_errors}
        types={types}
        domains={domains}
        levels={levels}
        languages={languages}
        tags={tags}
        programs={programs}
        selected_program_ids={selected_program_ids}
        file={file}
        preview_url={preview_url}
        remove_course_image={remove_course_image}
        set_form={set_form}
        on_cohorts={on_open_cohorts}
        save_course={save_course}
        selected={selected}
        open_passkey={open_passkey}
        passkey_form={passkey_form}
        passkey_error={passkey_error}
        set_passkey_form={set_passkey_form}
        set_passkey_error={set_passkey_error}
        save_passkey={save_passkey}
        confirm={confirm}
        set_confirm={set_confirm}
        run_confirm={run_confirm}
        exporting={exporting}
        download_enrollments={download_enrollments}
      />
      <Program_Pick_Modal
        open={Boolean(pick)}
        course_name={pick?.course?.course_name || ""}
        programs={pick?.programs || []}
        loading={Boolean(pick?.loading)}
        on_pick={choose_program}
        on_close={() => set_pick(null)} />
    </>
  );
}
