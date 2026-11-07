import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@datapromr/toast";
import { list_dropdown_options } from "../dropdown_manager/api.js";
import {
  create_lesson,
  create_lesson_item,
  create_module,
  create_coding_set,
  create_quiz,
  delete_lesson,
  delete_lesson_item,
  delete_module,
  delete_coding_set,
  delete_quiz,
  get_course_content,
  get_quiz,
  list_lesson_done,
  list_lesson_feedback,
  reorder_course_content,
  set_lesson_done,
  update_lesson,
  update_lesson_item,
  update_module,
  update_quiz } from
"./api.js";
import { EMPTY_CODING, EMPTY_ITEM, EMPTY_LESSON, EMPTY_MODULE, EMPTY_QUIZ, TABS } from "./constants.js";
import {
  content_stats,
  form_from_quiz,
  get_item_errors,
  get_lesson_errors,
  get_module_errors,
  get_coding_errors,
  get_quiz_errors,
  has_errors,
  reorder_payload } from
"./utils.js";
import { Content_Workspace } from "./ui/content_workspace.jsx";
import "./theme/content.css";
import "./theme/content_2.css";
import "./theme/content_3.css";
import "./theme/content_4.css";
import "./theme/content_5.css";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { content_paths, use_slug_mirror } from "../url_slugs.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_content_manager_constants_english.js";

const MOBILE_QUERY = ENGLISH.max_width_1100px;

function is_mobile_viewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

function class_scopes_for(programs, program_id) {
  const scopes = [];
  for (const program of programs || []) {
    if (program_id && String(program.program_id) !== String(program_id)) continue;
    const cohorts = program.cohorts?.length ?
      program.cohorts :
      program.cohort_id ? [{ cohort_id: program.cohort_id, cohort_name: program.cohort_name }] : [];
    for (const cohort of cohorts) {
      if (!cohort.cohort_id) continue;
      scopes.push({
        key: `${cohort.cohort_id}:${program.program_id}`,
        cohort_id: Number(cohort.cohort_id),
        cohort_name: cohort.cohort_name || ENGLISH.cohort,
        program_id: Number(program.program_id),
        program_name: program.program_name || ENGLISH.program
      });
    }
  }
  return scopes;
}

export function Course_Content_Manager({ course_id, program_id, on_pick_scope }) {
  const locked_program_id = Number(program_id) > 0 ? String(program_id) : "";
  const content_access = use_screen_access(SCREEN.course_content);
  const students_access = use_screen_access(SCREEN.course_students);
  const attendance_access = use_screen_access(SCREEN.course_attendance);
  const feedback_access = use_screen_access(SCREEN.course_feedback);
  const reports_access = use_screen_access(SCREEN.course_reports);
  const section_edit = {
    content: content_access.can_edit,
    students: students_access.can_edit,
    attendance: attendance_access.can_edit,
    feedback: feedback_access.can_edit,
    reports: reports_access.can_edit
  };
  const desk_ref = useRef(null);
  const [compact, set_compact] = useState(is_mobile_viewport);
  const [data, set_data] = useState(null);
  const [error, set_error] = useState("");
  const [loading, set_loading] = useState(false);
  const [tab, set_tab] = useState("content");

  use_slug_mirror(
    course_id ? content_paths(course_id) : ["/admin_dashboard/courses/content", "/employee_dashboard/courses/content"],
    { section: tab },
    { section: "content" },
    (from_url) => set_tab(TABS.some((item) => item.id === from_url.section) ? from_url.section : "content")
  );
  const [add_open, set_add_open] = useState(false);
  const [panel, set_panel] = useState(null);
  const [lesson_form, set_lesson_form] = useState(EMPTY_LESSON);
  const [lesson_errors, set_lesson_errors] = useState({});
  const [module_form, set_module_form] = useState(EMPTY_MODULE);
  const [module_errors, set_module_errors] = useState({});
  const [item_form, set_item_form] = useState(EMPTY_ITEM);
  const [item_errors, set_item_errors] = useState({});
  const [file, set_file] = useState(null);
  const [selected_id, set_selected_id] = useState(null);
  const [peek_tab, set_peek_tab] = useState("overview");
  const [feedback, set_feedback] = useState(null);
  const [feedback_loading, set_feedback_loading] = useState(false);
  const [expanded, set_expanded] = useState(() => new Set());
  const [expanded_modules, set_expanded_modules] = useState(() => new Set());
  const [expanded_quizzes, set_expanded_quizzes] = useState(() => new Set());
  const [menu_id, set_menu_id] = useState(null);
  const [target_lesson_id, set_target_lesson_id] = useState(null);
  const [item_edit_id, set_item_edit_id] = useState(null);
  const [module_edit_id, set_module_edit_id] = useState(null);
  const [quiz_form, set_quiz_form] = useState(EMPTY_QUIZ);
  const [quiz_errors, set_quiz_errors] = useState({});
  const [coding_form, set_coding_form] = useState(EMPTY_CODING);
  const [programming_languages, set_programming_languages] = useState([]);
  const [coding_errors, set_coding_errors] = useState({});
  const [quiz_edit_id, set_quiz_edit_id] = useState(null);
  const [preview, set_preview] = useState(null);
  const [scope_program_id, set_scope_program_id] = useState(locked_program_id);
  const [class_key, set_class_key] = useState("");
  const [done_ids, set_done_ids] = useState([]);
  const [reordering, set_reordering] = useState(false);
  const [drag, set_drag] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!course_id) return;
    set_loading(true);
    set_error("");
    try {
      const next = await get_course_content(course_id);
      set_data(next);
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }, [course_id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const class_scopes = useMemo(
    () => class_scopes_for(data?.course?.programs, locked_program_id),
    [data, locked_program_id]
  );
  const class_scope = class_scopes.find((item) => item.key === class_key) || null;

  useEffect(() => {
    if (!class_scopes.length) {
      set_class_key("");
      return;
    }
    if (class_scopes.some((item) => item.key === class_key)) return;
    set_class_key(class_scopes[0].key);
  }, [class_scopes, class_key]);

  useEffect(() => {
    if (!course_id || !class_scope) {
      set_done_ids([]);
      return undefined;
    }
    let active = true;
    list_lesson_done(course_id, class_scope).
      then((payload) => {
        if (active) set_done_ids(payload.lesson_ids || []);
      }).
      catch((err) => {
        if (active) toast.error(err.message);
      });
    return () => {
      active = false;
    };
  }, [course_id, class_scope, toast]);

  async function mark_lesson_done(lesson) {
    if (!class_scope || !lesson?.lesson_id) return;
    const lesson_id = Number(lesson.lesson_id);
    const done = !done_ids.includes(lesson_id);
    try {
      const result = await set_lesson_done(course_id, lesson_id, {
        cohort_id: class_scope.cohort_id,
        program_id: class_scope.program_id,
        done
      });
      set_done_ids((current) => (
        result.is_done ?
          current.includes(lesson_id) ? current : [...current, lesson_id] :
          current.filter((id) => id !== lesson_id)
      ));
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    const sync = () => set_compact(is_mobile_viewport());
    sync();
    const media = window.matchMedia(MOBILE_QUERY);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (compact && tab === "reports") set_tab("content");
  }, [compact, tab]);

  useEffect(() => {
    if (compact) set_selected_id(null);
  }, [compact]);

  useEffect(() => {
    set_scope_program_id(locked_program_id);
  }, [course_id, locked_program_id]);

  useEffect(() => {
    if (!course_id || !selected_id) {
      set_feedback(null);
      return undefined;
    }
    let alive = true;
    set_feedback_loading(true);
    list_lesson_feedback(course_id, selected_id, scope_program_id).
    then((payload) => {
      if (alive) set_feedback(payload);
    }).
    catch((err) => {
      if (!alive) return;
      set_feedback({ summary: { count: 0, average: 0 }, items: [] });
      toast.error(err.message);
    }).
    finally(() => {
      if (alive) set_feedback_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [course_id, selected_id, toast, scope_program_id]);

  useEffect(() => {
    function close_menus(event) {
      if (!event.target.closest?.(".ccm_more")) set_menu_id(null);
      if (!event.target.closest?.(".ccm_add")) set_add_open(false);
    }
    document.addEventListener("mousedown", close_menus);
    return () => document.removeEventListener("mousedown", close_menus);
  }, []);

  const course = data?.course;
  const modules = data?.modules || [];
  const blocks = modules.flatMap((module) => module.blocks || []);
  const stats = useMemo(() => content_stats(modules), [modules]);
  const selected = blocks.find((block) => block.lesson?.lesson_id === selected_id)?.lesson;

  function apply_data(next) {
    set_data(next);
    return next;
  }

  function open_create_module() {
    set_add_open(false);
    set_module_form(EMPTY_MODULE);
    set_module_errors({});
    set_module_edit_id(null);
    set_panel("module");
  }

  function open_edit_module(module) {
    set_module_form({
      module_title: module.module_title || "",
      module_description: module.module_description || "",
      is_active: module.is_active !== false
    });
    set_module_errors({});
    set_module_edit_id(module.module_id);
    set_panel("module_edit");
    set_menu_id(null);
  }

  function open_create_lesson(module_id) {
    set_add_open(false);
    set_lesson_form({
      ...EMPTY_LESSON,
      module_id: module_id || modules[0]?.module_id || ""
    });
    set_lesson_errors({});
    set_panel("lesson");
    set_menu_id(null);
  }

  function open_quiz(module_id, lesson_id) {
    set_add_open(false);
    const module =
    modules.find((item) => Number(item.module_id) === Number(module_id)) || modules[0];
    const lessons = (module?.blocks || []).
    filter((block) => block.lesson).
    map((block) => block.lesson);
    const picked =
    lesson_id || (
    lessons.length === 1 ? lessons[0].lesson_id : "");
    set_quiz_form({
      ...EMPTY_QUIZ,
      module_id: module?.module_id || module_id || modules[0]?.module_id || "",
      lesson_id: picked || ""
    });
    set_quiz_errors({});
    set_quiz_edit_id(null);
    set_panel("quiz");
    set_menu_id(null);
  }

  async function open_coding(module_or_lesson, lesson_id) {
    set_add_open(false);
    const from_lesson = module_or_lesson && typeof module_or_lesson === "object";
    const module_id = from_lesson ? module_or_lesson.module_id : module_or_lesson;
    const picked_lesson = from_lesson ? module_or_lesson.lesson_id : lesson_id;
    const module =
    modules.find((item) => Number(item.module_id) === Number(module_id)) || modules[0];
    const lessons = (module?.blocks || []).
    filter((block) => block.lesson).
    map((block) => block.lesson);
    const picked = picked_lesson || (lessons.length === 1 ? lessons[0].lesson_id : "");
    set_coding_form({
      ...EMPTY_CODING,
      module_id: module?.module_id || "",
      lesson_id: picked || ""
    });
    set_coding_errors({});
    set_panel("coding");
    set_menu_id(null);
    try {
      const data = await list_dropdown_options("programming_languages", { status: "active" });
      set_programming_languages(data.items || []);
    } catch (err) {
      set_programming_languages([]);
      toast.error(err.message);
    }
  }

  async function open_edit_quiz(quiz) {
    set_menu_id(null);
    set_quiz_errors({});
    set_quiz_edit_id(quiz.quiz_id);
    set_quiz_form(form_from_quiz(quiz));
    set_panel("quiz_edit");
    if (quiz.questions?.length) return;
    try {
      const payload = await get_quiz(course_id, quiz.quiz_id);
      set_quiz_form(form_from_quiz({ ...quiz, ...payload.quiz, questions: payload.questions }));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function rename_lesson(title) {
    if (!selected_id) return;
    const lesson = blocks.find((block) => block.lesson?.lesson_id === selected_id)?.lesson;
    if (!lesson) return;
    set_loading(true);
    try {
      const next = await update_lesson(course_id, selected_id, {
        module_id: lesson.module_id || "",
        lesson_title: title,
        lesson_description: lesson.lesson_description || "",
        duration_minutes: lesson.duration_minutes ?? "",
        is_active: lesson.is_active !== false
      });
      apply_data(next);
      toast.success(ENGLISH.lesson_name_updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  function open_edit_lesson(lesson) {
    set_lesson_form({
      module_id: lesson.module_id || "",
      lesson_title: lesson.lesson_title || "",
      lesson_description: lesson.lesson_description || "",
      duration_minutes: lesson.duration_minutes ?? "",
      is_active: lesson.is_active !== false
    });
    set_lesson_errors({});
    set_panel("lesson_edit");
    set_menu_id(null);
  }

  function open_edit_overview(lesson, item) {
    set_target_lesson_id(lesson.lesson_id);
    set_item_edit_id(item.content_id);
    set_item_form({
      ...EMPTY_ITEM,
      get content_type() { return ENGLISH.overview; },
      content_title: item.content_title || "",
      content_description: item.content_description || ""
    });
    set_item_errors({});
    set_file(null);
    set_panel("item_edit");
    set_menu_id(null);
  }

  function open_add_item(lesson, type = ENGLISH.video, notes_language) {
    set_item_edit_id(null);
    set_target_lesson_id(lesson.lesson_id);
    set_selected_id(lesson.lesson_id);
    set_expanded((current) => new Set(current).add(lesson.lesson_id));
    set_item_form({
      ...EMPTY_ITEM,
      content_type: type,
      source_mode: type === ENGLISH.notes ? "file" : "link",
      notes_language: notes_language === "telugu" ? "telugu" : "english"
    });
    set_item_errors({});
    set_file(null);
    set_panel("item");
    set_menu_id(null);
    set_add_open(false);
  }

  async function save_module() {
    const next_errors = get_module_errors(module_form);
    set_module_errors(next_errors);
    if (has_errors(next_errors)) return;
    set_loading(true);
    try {
      const next =
      panel === "module_edit" && module_edit_id ?
      await update_module(course_id, module_edit_id, module_form) :
      await create_module(course_id, module_form);
      apply_data(next);
      const created = next.modules[next.modules.length - 1];
      if (created) set_expanded_modules((current) => new Set(current).add(created.module_id));
      set_panel(null);
      toast.success(panel === "module_edit" ? ENGLISH.module_updated : ENGLISH.module_created);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function save_lesson() {
    const next_errors = get_lesson_errors(lesson_form, { requireModule: modules.length > 1 });
    set_lesson_errors(next_errors);
    if (has_errors(next_errors)) return;
    set_loading(true);
    try {
      const next =
      panel === "lesson_edit" && selected_id ?
      await update_lesson(course_id, selected_id, lesson_form) :
      await create_lesson(course_id, lesson_form);
      apply_data(next);
      if (panel === "lesson_edit") {
        set_selected_id(selected_id);
      } else {
        const created = next.modules.
        flatMap((module) => module.blocks || []).
        map((block) => block.lesson).
        filter(Boolean).
        sort((a, b) => b.lesson_id - a.lesson_id)[0];
        if (created) {
          set_selected_id(created.lesson_id);
          set_expanded((current) => new Set(current).add(created.lesson_id));
          if (created.module_id) {
            set_expanded_modules((current) => new Set(current).add(created.module_id));
          }
        }
      }
      if (panel === "lesson_edit" && selected_id) {
        set_expanded((current) => new Set(current).add(selected_id));
      }
      set_panel(null);
      toast.success(panel === "lesson_edit" ? ENGLISH.lesson_updated : ENGLISH.lesson_created);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function save_quiz() {
    const editing = panel === "quiz_edit" && quiz_edit_id;
    const next_errors = get_quiz_errors(quiz_form, {
      requireModule: modules.length > 0,
      requireLesson: true,
      editing: Boolean(editing)
    });
    set_quiz_errors(next_errors);
    if (has_errors(next_errors)) return;
    set_loading(true);
    try {
      const next = editing ?
      await update_quiz(course_id, quiz_edit_id, {
        ...quiz_form,
        quiz_title: quiz_form.quiz_name,
        questions: quiz_form.questions,
        questions_shown: Number(quiz_form.questions_shown)
      }) :
      await create_quiz(course_id, {
        quiz_name: quiz_form.quiz_name,
        text: quiz_form.text,
        content: quiz_form.text,
        count: Number(quiz_form.count),
        questions_shown: Number(quiz_form.questions_shown),
        difficulty: quiz_form.difficulty_mix,
        bloom: quiz_form.bloom_mix,
        module_id: quiz_form.module_id,
        lesson_id: quiz_form.lesson_id
      });
      apply_data(next);
      if (quiz_form.module_id) {
        set_expanded_modules((current) => new Set(current).add(Number(quiz_form.module_id)));
      }
      if (quiz_form.lesson_id) {
        set_expanded((current) => new Set(current).add(Number(quiz_form.lesson_id)));
      }
      if (editing) {
        set_expanded_quizzes((current) => new Set(current).add(quiz_edit_id));
      }
      set_panel(null);
      set_quiz_edit_id(null);
      toast.success(editing ? ENGLISH.quiz_updated : ENGLISH.quiz_created);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function save_coding() {
    const next_errors = get_coding_errors(coding_form, { require_module: modules.length > 0 });
    set_coding_errors(next_errors);
    if (has_errors(next_errors)) return;
    set_loading(true);
    try {
      const next = await create_coding_set(course_id, {
        set_title: coding_form.set_title,
        prompt: coding_form.prompt,
        programming_language_id: coding_form.programming_language_id,
        module_id: coding_form.module_id,
        lesson_id: coding_form.lesson_id
      });
      apply_data(next);
      if (coding_form.module_id) {
        set_expanded_modules((current) => new Set(current).add(Number(coding_form.module_id)));
      }
      if (coding_form.lesson_id) {
        set_expanded((current) => new Set(current).add(Number(coding_form.lesson_id)));
      }
      set_panel(null);
      toast.success(ENGLISH.coding_exercise_created);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function save_item() {
    const next_errors = get_item_errors(item_form, file);
    set_item_errors(next_errors);
    if (has_errors(next_errors)) return;
    const lesson_id = target_lesson_id || selected_id;
    if (!lesson_id) return;
    set_loading(true);
    try {
      const is_announcement = item_form.content_type === ENGLISH.announcement;
      const is_overview = item_form.content_type === ENGLISH.overview;
      const message = String(item_form.content_description || "").trim();
      const payload = {
        ...item_form,
        content_title: is_overview ? "" : is_announcement ? message.slice(0, 200) : item_form.content_title,
        content_url: is_announcement || item_form.source_mode === "file" ? "" : item_form.content_url
      };
      const next = item_edit_id ?
        await update_lesson_item(course_id, lesson_id, item_edit_id, payload) :
        await create_lesson_item(
          course_id,
          lesson_id,
          payload,
          is_announcement || item_form.source_mode === "link" ? null : file
        );
      apply_data(next);
      set_expanded((current) => new Set(current).add(lesson_id));
      set_item_edit_id(null);
      set_panel(null);
      set_file(null);
      toast.success(item_edit_id ? ENGLISH.overview_updated : ENGLISH.content_added);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function remove_module(module) {
    set_menu_id(null);
    try {
      const next = await delete_module(course_id, module.module_id);
      apply_data(next);
      if (selected?.module_id === module.module_id) set_selected_id(null);
      toast.success(ENGLISH.module_deleted);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove_lesson(lesson) {
    set_menu_id(null);
    try {
      const next = await delete_lesson(course_id, lesson.lesson_id);
      apply_data(next);
      if (selected_id === lesson.lesson_id) set_selected_id(null);
      toast.success(ENGLISH.lesson_deleted);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove_quiz(quiz) {
    set_menu_id(null);
    try {
      const next = await delete_quiz(course_id, quiz.quiz_id);
      apply_data(next);
      toast.success(ENGLISH.quiz_deleted);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove_coding(set) {
    set_menu_id(null);
    try {
      const next = await delete_coding_set(course_id, set.coding_set_id);
      apply_data(next);
      toast.success(ENGLISH.coding_exercises_deleted);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove_item(item) {
    set_menu_id(null);
    try {
      const next = await delete_lesson_item(course_id, item.lesson_id, item.content_id);
      apply_data(next);
      toast.success(ENGLISH.item_removed);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function preview_item(item) {
    const href = item.content_url || item.file_path;
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.content_description) set_preview(item);
  }

  function toggle_module(id) {
    set_expanded_modules((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  }

  function toggle_lesson(id) {
    set_expanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  }

  function toggle_quiz(id) {
    set_expanded_quizzes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);else
      next.add(id);
      return next;
    });
  }

  function clone_modules(list) {
    return list.map((module) => ({ ...module, blocks: [...(module.blocks || [])] }));
  }

  async function persist_order(next_modules) {
    set_data((current) => ({ ...(current || {}), modules: next_modules }));
    try {
      const next = await reorder_course_content(course_id, reorder_payload(next_modules));
      apply_data(next);
    } catch (err) {
      toast.error(err.message);
      await load();
    }
  }

  function move_module(from_index, to_index) {
    if (to_index < 0 || to_index >= modules.length || from_index === to_index) return;
    const next = clone_modules(modules);
    const [item] = next.splice(from_index, 1);
    next.splice(to_index, 0, item);
    persist_order(next);
  }

  function place_lesson(module_id, lesson_id, to_slot) {
    const next = clone_modules(modules);
    const mod = next.find((module) => String(module.module_id) === String(module_id));
    if (!mod) return;
    const indexes = mod.blocks.
      map((block, index) => block.lesson ? index : -1).
      filter((index) => index >= 0);
    const from_slot = indexes.findIndex(
      (index) => String(mod.blocks[index].lesson.lesson_id) === String(lesson_id)
    );
    if (from_slot < 0 || to_slot < 0 || to_slot >= indexes.length || from_slot === to_slot) return;
    const lesson_blocks = indexes.map((index) => mod.blocks[index]);
    const [moved] = lesson_blocks.splice(from_slot, 1);
    lesson_blocks.splice(to_slot, 0, moved);
    indexes.forEach((block_index, slot) => {
      mod.blocks[block_index] = lesson_blocks[slot];
    });
    persist_order(next);
  }

  function move_block(from_module_id, from_index, to_module_id, to_index) {
    const next = clone_modules(modules);
    const from_mod = next.find((module) => module.module_id === from_module_id);
    const to_mod = next.find((module) => module.module_id === to_module_id);
    if (!from_mod || !to_mod) return;
    if (from_index < 0 || from_index >= from_mod.blocks.length) return;
    const [item] = from_mod.blocks.splice(from_index, 1);
    const insert_at = from_module_id === to_module_id && from_index < to_index ? to_index - 1 : to_index;
    to_mod.blocks.splice(Math.max(0, Math.min(insert_at, to_mod.blocks.length)), 0, item);
    persist_order(next);
  }

  function handle_module_drag_start(index) {
    set_drag({ kind: "module", index });
  }

  function handle_module_drop(to_index) {
    if (drag?.kind === "module") move_module(drag.index, to_index);
    set_drag(null);
  }

  function handle_block_drag_start(module_id, index) {
    set_drag({ kind: "block", module_id, index });
  }

  function handle_block_drop(to_module_id, to_index) {
    if (drag?.kind === "block") move_block(drag.moduleId, drag.index, to_module_id, to_index);
    set_drag(null);
  }

  function toggle_all() {
    const lesson_ids = blocks.filter((block) => block.lesson).map((block) => block.lesson.lesson_id);
    const quiz_ids = blocks.filter((block) => block.quiz).map((block) => block.quiz.quiz_id);
    const module_ids = modules.map((module) => module.module_id);
    const all_open_now =
    module_ids.length > 0 &&
    expanded_modules.size >= module_ids.length && (
    lesson_ids.length === 0 || expanded.size >= lesson_ids.length) && (
    quiz_ids.length === 0 || expanded_quizzes.size >= quiz_ids.length);
    set_expanded(all_open_now ? new Set() : new Set(lesson_ids));
    set_expanded_quizzes(all_open_now ? new Set() : new Set(quiz_ids));
    set_expanded_modules(all_open_now ? new Set() : new Set(module_ids));
  }

  return (
    <Content_Workspace
      desk_ref={desk_ref}
      selected={selected}
      compact={compact}
      section_edit={section_edit}
      on_pick_scope={on_pick_scope}
      error={error}
      course={course}
      set_add_open={set_add_open}
      add_open={add_open}
      open_create_module={open_create_module}
      open_create_lesson={open_create_lesson}
      open_quiz={open_quiz}
      open_coding={open_coding}
      tab={tab}
      reordering={reordering}
      set_reordering={set_reordering}
      set_drag={set_drag}
      toggle_all={toggle_all}
      modules={modules}
      expanded_modules={expanded_modules}
      expanded={expanded}
      selected_id={selected_id}
      menu_id={menu_id}
      drag={drag}
      toggle_module={toggle_module}
      toggle_lesson={toggle_lesson}
      set_selected_id={set_selected_id}
      set_peek_tab={set_peek_tab}
      set_menu_id={set_menu_id}
      open_edit_module={open_edit_module}
      remove_module={remove_module}
      open_add_item={open_add_item}
      open_edit_overview={open_edit_overview}
      preview_item={preview_item}
      remove_lesson={remove_lesson}
      remove_item={remove_item}
      open_edit_quiz={open_edit_quiz}
      remove_quiz={remove_quiz}
      remove_coding={remove_coding}
      expanded_quizzes={expanded_quizzes}
      toggle_quiz={toggle_quiz}
      move_module={move_module}
      move_block={move_block}
      place_lesson={place_lesson}
      handle_module_drag_start={handle_module_drag_start}
      handle_module_drop={handle_module_drop}
      handle_block_drag_start={handle_block_drag_start}
      handle_block_drop={handle_block_drop}
      loading={loading}
      stats={stats}
      course_id={course_id}
      class_scopes={class_scopes}
      class_key={class_key}
      set_class_key={set_class_key}
      done_ids={done_ids}
      mark_lesson_done={mark_lesson_done}
      scope_program_id={scope_program_id}
      peek_tab={peek_tab}
      open_edit_lesson={open_edit_lesson}
      rename_lesson={rename_lesson}
      feedback={feedback}
      feedback_loading={feedback_loading}
      panel={panel}
      set_panel={set_panel}
      module_form={module_form}
      module_errors={module_errors}
      set_module_form={set_module_form}
      save_module={save_module}
      lesson_form={lesson_form}
      lesson_errors={lesson_errors}
      set_lesson_form={set_lesson_form}
      save_lesson={save_lesson}
      item_form={item_form}
      item_errors={item_errors}
      file={file}
      set_item_form={set_item_form}
      set_file={set_file}
      save_item={save_item}
      quiz_form={quiz_form}
      quiz_errors={quiz_errors}
      set_quiz_form={set_quiz_form}
      save_quiz={save_quiz}
      coding_form={coding_form}
      coding_errors={coding_errors}
      programming_languages={programming_languages}
      set_coding_form={set_coding_form}
      save_coding={save_coding}
      preview={preview}
      set_preview={set_preview}
    />
  );
}
