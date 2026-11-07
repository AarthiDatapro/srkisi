import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@datapromr/modal";
import { useToast } from "@datapromr/toast";
import { Confirm_Modal } from "../admin_ui/confirm_modal.jsx";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { screen_paths, use_slug_mirror } from "../url_slugs.js";
import {
  assign_cohort_program,
  create_cohort,
  delete_cohort,
  delete_cohort_program,
  delete_cohort_profile,
  delete_cohort_thumbnail,
  get_cohort,
  list_cohorts,
  update_cohort,
  upload_cohort_profile,
  upload_cohort_thumbnail } from
"./api.js";
import { list_employees } from "../employee_manager/api.js";
import {
  assign_program_faculty,
  create_program,
  get_program_faculty,
  update_program } from
"../programs_control/api.js";
import { Button } from "@datapromr/button";
import { COPY, EMPTY_COHORT, EMPTY_PROGRAM } from "./constants.js";
import { Cohort_Form } from "./ui/cohort_form.jsx";
import { Cohort_List } from "./ui/cohort_list.jsx";
import { Cohort_Stage } from "./ui/cohort_stage.jsx";
import { Program_Record_Form } from "./ui/program_record_form.jsx";
import {
  cohort_errors,
  cohort_form,
  get_program_record_errors,
  has_errors,
  matches_query } from
"./utils.js";
import "../admin_ui/theme/admin_forms.css";
import "./theme/cohorts.css";
import { COHORTS_ENGLISH as ENGLISH } from "../constants/english/cohorts_constants_english.js";

export function Cohorts() {
  const toast = useToast();
  const { can_edit } = use_screen_access(SCREEN.cohorts);
  const [items, set_items] = useState([]);
  const [selected_id, set_selected_id] = useState(null);
  const [detail, set_detail] = useState(null);
  const [loading, set_loading] = useState(true);
  const [saving, set_saving] = useState(false);
  const [cohort_query, set_cohort_query] = useState("");
  const [program_query, set_program_query] = useState("");
  const [tab, set_tab] = useState("programs");

  use_slug_mirror(
    screen_paths(SCREEN.cohorts),
    { q: cohort_query, programs: program_query, tab },
    { q: "", programs: "", tab: "programs" },
    (from_url) => {
      set_cohort_query(from_url.q || "");
      set_program_query(from_url.programs || "");
      set_tab(from_url.tab || "programs");
    }
  );
  const [panel, set_panel] = useState(null);
  const [form, set_form] = useState(EMPTY_COHORT);
  const [program_record, set_program_record] = useState(EMPTY_PROGRAM);
  const [editing_program, set_editing_program] = useState(null);
  const [form_errors, set_form_errors] = useState({});
  const [record_errors, set_record_errors] = useState({});
  const [file, set_file] = useState(null);
  const [profile_file, set_profile_file] = useState(null);
  const [cohort_image_key, set_cohort_image_key] = useState(0);
  const [profile_image_key, set_profile_image_key] = useState(0);
  const [faculty_people, set_faculty_people] = useState([]);
  const [faculty_ids, set_faculty_ids] = useState([]);
  const [faculty_ready, set_faculty_ready] = useState(false);
  const [confirm, set_confirm] = useState(null);

  const apply_detail = useCallback((data) => {
    set_detail(data);
    if (!data?.cohort) return;
    set_items((current) => {
      const next = current.map((item) => (
        String(item.cohort_id) === String(data.cohort.cohort_id) ? data.cohort : item
      ));
      if (next.some((item) => String(item.cohort_id) === String(data.cohort.cohort_id))) return next;
      return [data.cohort, ...current];
    });
    set_selected_id(data.cohort.cohort_id);
  }, []);

  const load_detail = useCallback(async (id) => {
    if (!id) {
      set_detail(null);
      return;
    }
    try {
      apply_detail(await get_cohort(id));
    } catch (err) {
      toast.error(err.message);
    }
  }, [apply_detail, toast]);

  const load = useCallback(async (prefer_id) => {
    set_loading(true);
    try {
      const data = await list_cohorts();
      const next = data.items || [];
      set_items(next);
      const id = prefer_id || selected_id;
      const match = next.find((item) => String(item.cohort_id) === String(id)) || next[0];
      if (match) await load_detail(match.cohort_id);
      else {
        set_selected_id(null);
        set_detail(null);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }, [load_detail, selected_id, toast]);

  useEffect(() => {
    load();
  }, []);

  const visible_cohorts = useMemo(() => items.filter((item) => (
    matches_query(`${item.cohort_name} ${item.description}`, cohort_query)
  )), [items, cohort_query]);

  const visible_programs = useMemo(() => (detail?.programs || []).filter((item) => (
    matches_query(`${item.program_name} ${item.description}`, program_query)
  )), [detail, program_query]);

  function open_cohort_create() {
    set_form(EMPTY_COHORT);
    set_form_errors({});
    set_file(null);
    set_profile_file(null);
    set_panel("cohort_create");
  }

  function open_cohort_edit() {
    set_form(cohort_form(detail?.cohort));
    set_form_errors({});
    set_file(null);
    set_profile_file(null);
    set_panel("cohort_edit");
  }

  function open_program_create() {
    if (!detail?.cohort) {
      toast.error(COPY.needCohort);
      return;
    }
    const types = detail.program_types || [];
    set_program_record({
      ...EMPTY_PROGRAM,
      program_type_id: types[0] ? String(types[0].id) : ""
    });
    set_editing_program(null);
    set_record_errors({});
    set_faculty_people([]);
    set_faculty_ids([]);
    set_panel("program_create");
  }

  async function open_program_edit(row) {
    if (!row) return;
    set_program_record({
      program_name: row.program_name,
      program_type_id: row.program_type_id ? String(row.program_type_id) : "",
      duration_months: row.duration_months ?? "",
      description: row.description || "",
      start_date: row.start_date || "",
      end_date: row.end_date || ""
    });
    set_editing_program(row);
    set_record_errors({});
    set_faculty_people([]);
    set_faculty_ids([]);
    set_faculty_ready(false);
    set_panel("program_edit");
    try {
      const assigned = await get_program_faculty(row.program_id);
      set_faculty_ids((assigned.items || []).map((item) => item.employee_id));
      set_faculty_ready(true);
    } catch (err) {
      toast.error(err.message);
    }
    try {
      const people = await list_employees({
        sort: "name",
        dir: "asc",
        page: 1,
        pageSize: 500,
        status: "active"
      });
      set_faculty_people(people.items || []);
    } catch {
      set_faculty_people([]);
    }
  }

  async function clear_cohort_thumbnail() {
    if (file) {
      set_file(null);
      set_cohort_image_key((key) => key + 1);
      return;
    }
    if (panel !== "cohort_edit" || !cohort?.cohort_id || !cohort?.thumbnail_url) return;
    set_saving(true);
    try {
      apply_detail(await delete_cohort_thumbnail(cohort.cohort_id));
      set_cohort_image_key((key) => key + 1);
      toast.success(ENGLISH.banner_image_removed);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function clear_cohort_profile() {
    if (profile_file) {
      set_profile_file(null);
      set_profile_image_key((key) => key + 1);
      return;
    }
    if (panel !== "cohort_edit" || !cohort?.cohort_id || !cohort?.profile_url) return;
    set_saving(true);
    try {
      apply_detail(await delete_cohort_profile(cohort.cohort_id));
      set_profile_image_key((key) => key + 1);
      toast.success(ENGLISH.profile_image_removed);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function save_cohort() {
    const next_errors = cohort_errors(form);
    set_form_errors(next_errors);
    if (has_errors(next_errors)) return;
    set_saving(true);
    try {
      let saved = panel === "cohort_edit" && detail?.cohort ?
        await update_cohort(detail.cohort.cohort_id, form) :
        await create_cohort(form);
      apply_detail(saved);
      if (file) {
        saved = await upload_cohort_thumbnail(saved.cohort.cohort_id, file);
        apply_detail(saved);
      }
      if (profile_file) {
        saved = await upload_cohort_profile(saved.cohort.cohort_id, profile_file);
        apply_detail(saved);
      }
      set_panel(null);
      set_file(null);
      set_profile_file(null);
      toast.success(file || profile_file ? COPY.imageSaved : COPY.savedCohort);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function save_program() {
    const next_errors = get_program_record_errors(program_record);
    set_record_errors(next_errors);
    if (has_errors(next_errors) || !detail?.cohort) return;

    set_saving(true);
    try {
      const editing = panel === "program_edit" && editing_program;
      const saved = editing ?
        await update_program(editing_program.program_id, program_record) :
        await create_program(program_record);
      if (editing) {
        if (faculty_ready) await assign_program_faculty(saved.program_id, faculty_ids);
        apply_detail(await get_cohort(detail.cohort.cohort_id));
      } else {
        apply_detail(await assign_cohort_program(detail.cohort.cohort_id, {
          program_id: saved.program_id,
          start_date: program_record.start_date,
          end_date: program_record.end_date
        }));
      }
      set_panel(null);
      toast.success(editing ? ENGLISH.program_updated : ENGLISH.program_created);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function run_confirm() {
    if (!confirm) return;
    set_saving(true);
    try {
      if (confirm.kind === "cohort") {
        await delete_cohort(confirm.id);
        toast.success(COPY.removedCohort);
        set_confirm(null);
        await load(null);
      } else if (confirm.kind === "program") {
        apply_detail(await delete_cohort_program(detail.cohort.cohort_id, confirm.id));
        toast.success(COPY.removedProgram);
        set_confirm(null);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  const cohort = detail?.cohort;

  return (
    <section className="cht_desk">
      <header className="cht_banner">
        <div>
          <h1>{COPY.title}</h1>
          <p>
            <b>{items.length}</b> {items.length === 1 ? "cohort" : "cohorts"}{ENGLISH.on_record}{loading ? ENGLISH.refreshing : ""}
          </p>
        </div>
        {can_edit ?
          <div className="cht_banner_actions">
            <Button type="button" onClick={open_cohort_create}>
              {COPY.createCohort}
            </Button>
            <Button type="button" onClick={open_program_create}>
              {COPY.createProgram}
            </Button>
          </div> :
          null}
      </header>

      {loading && !items.length ?
        <p className="cht_empty">{ENGLISH.loading_cohorts}</p> :
        !items.length ?
        <div className="cht_blank">
          <strong>{COPY.emptyCohorts}</strong>
          <p>{COPY.emptyCohortsHint}</p>
          {can_edit ?
            <Button type="button" onClick={open_cohort_create}>{COPY.createCohort}</Button> :
            null}
        </div> :
        <div className="cht_board">
          <Cohort_List
            items={visible_cohorts}
            count={items.length}
            query={cohort_query}
            filtering={Boolean(cohort_query)}
            selected_id={cohort?.cohort_id}
            on_query={set_cohort_query}
            on_select={(id) => {
              set_tab("programs");
              load_detail(id);
            }} />
          {cohort ?
            <Cohort_Stage
              cohort={cohort}
              programs={visible_programs}
              roster={detail?.programs || []}
              tab={tab}
              can_edit={can_edit}
              program_query={program_query}
              on_tab={set_tab}
              on_program_query={set_program_query}
              on_edit_cohort={open_cohort_edit}
              on_delete_cohort={() => set_confirm({
                kind: "cohort",
                id: cohort.cohort_id,
                get title() { return ENGLISH.delete_cohort; },
                message: ENGLISH.delete_this_cohort_programs_already_created_stay_in
              })}
              on_create_program={open_program_create}
              on_edit_program={open_program_edit}
              on_delete_program={(row) => set_confirm({
                kind: "program",
                id: row.program_id,
                get title() { return ENGLISH.delete_program; },
                message: ENGLISH.delete_this_program_it_will_be_removed_from
              })} /> :
            <div className="cht_blank">
              <strong>{ENGLISH.no_cohort_selected}</strong>
              <p>{ENGLISH.choose_a_cohort_from_the_list}</p>
            </div>}
        </div>}

      <Modal
        open={panel === "cohort_create" || panel === "cohort_edit"}
        title={panel === "cohort_edit" ? COPY.editCohort : COPY.createCohort}
        size="wide"
        onClose={() => set_panel(null)}>
        <Cohort_Form
          values={form}
          errors={form_errors}
          file={file}
          preview_url={panel === "cohort_edit" ? cohort?.thumbnail_url || "" : ""}
          image_key={cohort_image_key}
          profile_file={profile_file}
          profile_preview_url={panel === "cohort_edit" ? cohort?.profile_url || "" : ""}
          profile_key={profile_image_key}
          submit_label={panel === "cohort_edit" ? ENGLISH.save_cohort : ENGLISH.create_cohort}
          loading={saving}
          on_change={set_form}
          on_file={set_file}
          on_clear={clear_cohort_thumbnail}
          on_profile={set_profile_file}
          on_clear_profile={clear_cohort_profile}
          on_submit={save_cohort} />
      </Modal>

      <Modal
        open={panel === "program_create" || panel === "program_edit"}
        title={panel === "program_edit" ? ENGLISH.edit_program : ENGLISH.add_program}
        size="wide"
        onClose={() => set_panel(null)}>
        <Program_Record_Form
          values={program_record}
          errors={record_errors}
          types={detail?.program_types || []}
          submit_label={panel === "program_edit" ? ENGLISH.save_changes : ENGLISH.create_program}
          loading={saving}
          on_change={set_program_record}
          show_faculty={panel === "program_edit"}
          employees={faculty_people}
          faculty_ids={faculty_ids}
          on_faculty_change={set_faculty_ids}
          on_submit={save_program} />
      </Modal>

      <Confirm_Modal
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirm_label={ENGLISH.label_delete}
        loading={saving}
        on_confirm={run_confirm}
        on_cancel={() => !saving && set_confirm(null)} />
    </section>
  );
}
