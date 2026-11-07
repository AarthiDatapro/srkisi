import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@datapromr/button";
import { Modal } from "@datapromr/modal";
import { SearchInput } from "@datapromr/search-input";
import { Input } from "@datapromr/input";
import { useToast } from "@datapromr/toast";
import {
  activate_dropdown_option,
  create_dropdown_option,
  deactivate_dropdown_option,
  delete_dropdown_option,
  list_dropdown_options,
  list_dropdowns,
  update_dropdown_option } from
"./api.js";
import { COPY, EMPTY_OPTION } from "./constants.js";
import { domain_code_preview, get_option_errors, has_errors } from "./utils.js";
import { Drawer_Stage } from "../admin_ui/drawer_stage.jsx";
import { Option_Row } from "./ui/option_row.jsx";
import { LMS_MEDIA_TABLET } from "../design_system/breakpoints.js";
import "../admin_ui/theme/admin_forms.css";
import "./theme/dropdowns.css";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { catalog_key, catalog_slug, screen_paths, use_slug_mirror } from "../url_slugs.js";
import { DROPDOWN_MANAGER_ENGLISH as ENGLISH } from "../constants/english/dropdown_manager_constants_english.js";

function use_narrow(query = LMS_MEDIA_TABLET) {
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

export function Dropdown_Manager() {
  const { can_edit } = use_screen_access(SCREEN.dropdowns);
  const compact = use_narrow();
  const [picked, set_picked] = useState(false);
  const [groups, set_groups] = useState([]);
  const [key, set_key] = useState("program_types");
  const [items, set_items] = useState([]);
  const [label, set_label] = useState(ENGLISH.program_types);
  const [search_input, set_search_input] = useState("");
  const [search, set_search] = useState("");
  const [status, set_status] = useState("");
  const [error, set_error] = useState("");
  const [loading, set_loading] = useState(false);
  const [panel, set_panel] = useState(null);
  const [selected, set_selected] = useState(null);
  const [form, set_form] = useState(EMPTY_OPTION);
  const [form_errors, set_form_errors] = useState({});
  const toast = useToast();

  use_slug_mirror(
    groups.length ? screen_paths(SCREEN.dropdowns) : "/__wait",
    { catalog: catalog_slug(key), q: search, status },
    { catalog: "program-types", q: "", status: "" },
    (from_url) => {
      set_key(catalog_key(from_url.catalog || "program-types"));
      set_search(from_url.q || "");
      set_search_input(from_url.q || "");
      set_status(from_url.status || "");
    }
  );

  const load_groups = useCallback(async () => {
    try {
      const data = await list_dropdowns();
      const next = data.items || [];
      set_groups(next);
      if (!next.some((item) => item.key === key) && next[0]) {
        set_key(next[0].key);
      }
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    }
  }, [key, toast]);

  const load = useCallback(async () => {
    if (!key) return;
    set_loading(true);
    set_error("");
    try {
      const data = await list_dropdown_options(key, { search, status });
      set_items(data.items || []);
      set_label(data.label || ENGLISH.options);
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }, [key, search, status, toast]);

  useEffect(() => {
    load_groups();
  }, [load_groups]);

  useEffect(() => {
    const timer = window.setTimeout(() => set_search(search_input), 280);
    return () => window.clearTimeout(timer);
  }, [search_input]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: items.length,
      active: items.filter((item) => item.is_active).length,
      used: items.reduce((sum, item) => sum + Number(item.used_count || 0), 0)
    }),
    [items]
  );
  const usage_noun = key === "program_types" ?
    "program" :
    key === "programming_languages" ?
    ENGLISH.coding_exercise :
    key.startsWith("course_") ?
    "course" :
    "employee";

  function open_create() {
    set_form(EMPTY_OPTION);
    set_form_errors({});
    set_selected(null);
    set_panel("create");
  }

  function open_edit(row) {
    set_form({
      name: row.name,
      description: row.description || "",
      color: row.color || "#EB7828",
      code_letters: row.code_letters || "",
      number_next: row.number_next === "" || row.number_next == null ? "" : String(row.number_next)
    });
    set_form_errors({});
    set_selected(row);
    set_panel("edit");
  }

  async function save_option() {
    const next_errors = get_option_errors(form, {
      color: key === "course_tags",
      code_format: key === "course_domains"
    });
    set_form_errors(next_errors);
    if (has_errors(next_errors)) return;
    set_loading(true);
    try {
      if (panel === "edit" && selected) {
        await update_dropdown_option(key, selected.id, form);
      } else {
        await create_dropdown_option(key, form);
      }
      set_panel(null);
      toast.success(panel === "edit" ? ENGLISH.option_updated : ENGLISH.option_created);
      await load();
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function run_action(event, row, action) {
    event.stopPropagation();
    try {
      if (action === "activate") {
        await activate_dropdown_option(key, row.id);
        toast.success(ENGLISH.option_activated);
      }
      if (action === "deactivate") {
        await deactivate_dropdown_option(key, row.id);
        toast.success(ENGLISH.option_deactivated);
      }
      if (action === "delete") {
        await delete_dropdown_option(key, row.id);
        toast.success(ENGLISH.option_deleted);
      }
      await load();
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    }
  }

  return (
    <section className={compact ? `ddm is_compact${picked ? " is_picked" : ""}` : "ddm"}>
      <aside className="ddm_rail">
        <div className="ddm_rail_head">
          <p className="ddm_rail_kicker">{ENGLISH.catalogs}</p>
          <h1>{COPY.title}</h1>
          {compact ? null : <p>{COPY.subtitle}</p>}
        </div>
        <div className="ddm_catalogs">
          {groups.map((group) => {
            const on = group.key === key;
            return (
              <button
                key={group.key}
                type="button"
                className={on ? "ddm_catalog is_on" : "ddm_catalog"}
                onClick={() => {
                  set_key(group.key);
                  if (compact) set_picked(true);
                }}>
                
                <span className="ddm_catalog_copy">
                  <b>{group.label}</b>
                  <span>
                    {on ? ENGLISH.options_live(stats.total, stats.active) : ENGLISH.view_options}
                  </span>
                </span>
                {on ? <em>{stats.total}</em> : null}
              </button>);

          })}
        </div>
      </aside>

      <div className="ddm_stage">
        <header className="ddm_stage_head">
          <div className="ddm_stage_title">
            {compact ?
            <button type="button" className="ddm_back" onClick={() => set_picked(false)}>{ENGLISH.catalogs}</button> :
            null}
            <h2>{label}</h2>
            {can_edit ?
            <Button type="button" onClick={open_create}>
                {compact ? ENGLISH.add : COPY.create}
              </Button> :
            null}
          </div>
          {compact ?
          <p className="ddm_meta">
              {stats.total}{ENGLISH.options_2}{stats.active}{ENGLISH.active}{stats.used}{ENGLISH.in_use}</p> :

          <div className="ddm_stats">
              <div className="ddm_stat">
                <b>{stats.total}</b>
                <span>{ENGLISH.options}</span>
              </div>
              <div className="ddm_stat">
                <b>{stats.active}</b>
                <span>{ENGLISH.active_2}</span>
              </div>
              <div className="ddm_stat">
                <b>{stats.used}</b>
                <span>{ENGLISH.in_use_2}</span>
              </div>
            </div>
          }
        </header>

        <div className="ddm_toolbar">
          <SearchInput
            value={search_input}
            placeholder={COPY.search}
            onChange={set_search_input} />
          
          <div className="ddm_seg" role="group" aria-label={ENGLISH.status}>
            <button
              type="button"
              className={status === "" ? "is_on" : undefined}
              onClick={() => set_status("")}>{ENGLISH.all}</button>
            <button
              type="button"
              className={status === "active" ? "is_on" : undefined}
              onClick={() => set_status("active")}>{ENGLISH.active_2}</button>
            <button
              type="button"
              className={status === "inactive" ? "is_on" : undefined}
              onClick={() => set_status("inactive")}>{ENGLISH.inactive}</button>
          </div>
        </div>

        {error ? <p className="ddm_error">{error}</p> : null}

        {items.length ?
        <>
            <div className="ddm_cols">
              <span>{ENGLISH.option}</span>
              <span>{ENGLISH.in_use_2}</span>
              <span>{ENGLISH.status}</span>
              <span>{ENGLISH.actions}</span>
            </div>
            <div className="ddm_list">
              {items.map((option) =>
            <Option_Row
              key={option.id}
              option={option}
              usage_noun={usage_noun}
              on_edit={can_edit ? open_edit : undefined}
              on_toggle={
              can_edit ?
              (event, row) =>
              run_action(event, row, row.is_active ? "deactivate" : "activate") :
              undefined
              }
              on_delete={
              can_edit ? (event, row) => run_action(event, row, "delete") : undefined
              } />

            )}
            </div>
          </> :

        <div className="ddm_empty">
            <strong>{loading ? ENGLISH.loading_options : COPY.empty}</strong>
            <p>{loading ? ENGLISH.fetching_this_list : COPY.emptyHint}</p>
            {loading ? null : can_edit ?
          <Button type="button" onClick={open_create}>
                {COPY.create}
              </Button> :
          null}
          </div>
        }
      </div>

      <Modal
        open={Boolean(panel)}
        title={panel === ENGLISH.edit ? COPY.edit : COPY.create}
        onClose={() => set_panel(null)}>
        
        <form
          className="prg_form is_option"
          onSubmit={(event) => {
            event.preventDefault();
            save_option();
          }}>
          <Drawer_Stage
            tone="option"
            kicker={panel === "edit" ? ENGLISH.edit_option : ENGLISH.new_option}
            hint={ENGLISH.a_name_students_and_staff_will_see_in} />
          <div className="prg_form_fields">
            <Input
              id="option_name"
              name="name"
              label={ENGLISH.name}
              required
              variant="outlined"
              value={form.name}
              error={form_errors.name}
              onChange={(event) => set_form({ ...form, name: event.target.value })} />
            
            <label className="ui-field ui-field--outlined">
              <span className="ui-field__label">{ENGLISH.description}</span>
              <textarea
                className="ui-input ui-input--outlined prg_textarea"
                name="description"
                placeholder=" "
                value={form.description}
                onChange={(event) =>
                set_form({ ...form, description: event.target.value })
                } />
              
              {form_errors.description ?
              <span className="ui-field__error">{form_errors.description}</span> :
              null}
            </label>
            {key === "course_domains" ?
            <>
              <Input
                id="option_code_letters"
                name="code_letters"
                label={ENGLISH.letter_code}
                required
                variant="outlined"
                value={form.code_letters}
                error={form_errors.code_letters}
                onChange={(event) => set_form({
                  ...form,
                  code_letters: event.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5)
                })} />
              <Input
                id="option_number_next"
                name="number_next"
                label={ENGLISH.number_series}
                required
                variant="outlined"
                inputMode="numeric"
                value={form.number_next}
                error={form_errors.number_next}
                onChange={(event) => set_form({
                  ...form,
                  number_next: event.target.value.replace(/\D/g, "").slice(0, 5)
                })} />
              <p className="ddm_code_preview">
                <span>{ENGLISH.course_code}</span>
                <b>{domain_code_preview(form.code_letters, form.number_next)}</b>
              </p>
            </> :
            null}
            {key === "course_tags" ?
            <label className="ui-field ui-field--outlined ddm_color_field">
                <span className="ui-field__label">{ENGLISH.color}</span>
                <span className="ddm_color_box">
                  <input
                    type="color"
                    name="color"
                    required
                    value={form.color || "#EB7828"}
                    onChange={(event) => set_form({ ...form, color: event.target.value })} />
                  <span>{form.color || "#EB7828"}</span>
                </span>
                {form_errors.color ? <span className="ui-field__error">{form_errors.color}</span> : null}
              </label> :
            null}
          </div>
          <div className="prg_form_foot">
            <Button type="submit" loading={loading}>
              {panel === "edit" ? ENGLISH.save_changes : ENGLISH.create_option}
            </Button>
          </div>
        </form>
      </Modal>
    </section>);

}
