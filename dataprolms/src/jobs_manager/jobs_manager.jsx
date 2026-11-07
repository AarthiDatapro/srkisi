import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Modal } from "@datapromr/modal";
import { useToast } from "@datapromr/toast";
import { Confirm_Modal } from "../admin_ui/confirm_modal.jsx";
import { Drawer_Stage } from "../admin_ui/drawer_stage.jsx";
import { Action_Button, Edit_Icon, Trash_Icon } from "../admin_ui/row_actions.jsx";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { screen_paths, use_slug_mirror } from "../url_slugs.js";
import { create_job, delete_job, import_searched_jobs, list_jobs, update_job } from "./api.js";
import { Fresher_Quiz } from "./ui/fresher_quiz.jsx";
import { Job_Brief } from "./ui/job_brief.jsx";
import "../admin_ui/theme/admin_forms.css";
import "./theme/jobs.css";
import { JOBS_MANAGER_ENGLISH as ENGLISH } from "../constants/english/jobs_manager_constants_english.js";

const EMPTY_JOB = {
  job_title: "",
  company_name: "",
  location: "",
  company_website: "",
  job_description: "",
  is_active: true
};

const EMPTY_SEARCH = {
  keyword: "",
  country: "in",
  location: "",
  date_posted: "week",
  remote_only: false,
  employment_types: "FULLTIME",
  job_requirements: "",
  radius: "25",
  language: "en",
  num_pages: "1",
  include_company_website: true
};

const DATE_POSTED = [
  { id: "today", get label() { return ENGLISH.today; } },
  { id: "3days", get label() { return ENGLISH.last_3_days; } },
  { id: "week", get label() { return ENGLISH.past_week; } },
  { id: "month", get label() { return ENGLISH.past_month; } },
  { id: "all", get label() { return ENGLISH.any_time; } }
];

const EMPLOYMENT_TYPES = [
  { id: "", get label() { return ENGLISH.any_type; } },
  { id: "FULLTIME", get label() { return ENGLISH.full_time; } },
  { id: "PARTTIME", get label() { return ENGLISH.part_time; } },
  { id: "CONTRACTOR", get label() { return ENGLISH.contract; } },
  { id: "INTERN", get label() { return ENGLISH.intern; } }
];

const FILTERS = [
  { id: "all", get label() { return ENGLISH.all; } },
  { id: "open", get label() { return ENGLISH.open; } },
  { id: "hidden", get label() { return ENGLISH.hidden; } }
];

function mark_of(title) {
  const parts = String(title || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "JB";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function Post_Job_Button({ on_manual, on_automate }) {
  const box = useRef(null);
  const [open, set_open] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function close(event) {
      if (!box.current?.contains(event.target)) set_open(false);
    }
    function on_key(event) {
      if (event.key === ENGLISH.escape) set_open(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", on_key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", on_key);
    };
  }, [open]);

  return (
    <div className="jbm_post" ref={box}>
      <Button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => set_open((value) => !value)}>{ENGLISH.post_a_job}</Button>
      {open ?
        <div className="jbm_post_menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { set_open(false); on_manual(); }}>{ENGLISH.enter_manually}</button>
          <button type="button" role="menuitem" onClick={() => { set_open(false); on_automate(); }}>{ENGLISH.automate}</button>
        </div> :
        null}
    </div>
  );
}

function Switch({ name, checked, label, onChange }) {
  return (
    <label className="jbm_switch">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
      <span className="jbm_switch_track" />
      <span>{label}</span>
    </label>
  );
}

export function Jobs_Manager() {
  const { can_edit } = use_screen_access(SCREEN.jobs);
  const toast = useToast();
  const [items, set_items] = useState([]);
  const [loading, set_loading] = useState(false);
  const [panel, set_panel] = useState(null);
  const [form, set_form] = useState(EMPTY_JOB);
  const [search, set_search] = useState(EMPTY_SEARCH);
  const [selected_id, set_selected_id] = useState(null);
  const [picked_id, set_picked_id] = useState(null);
  const [query, set_query] = useState("");
  const [filter, set_filter] = useState("all");
  const [confirm, set_confirm] = useState(null);
  const [checked_ids, set_checked_ids] = useState(() => new Set());
  const [fresher_open, set_fresher_open] = useState(false);
  const [fresher_source, set_fresher_source] = useState(null);

  use_slug_mirror(screen_paths(SCREEN.jobs), { q: query, show: filter }, { q: "", show: "all" }, (from_url) => {
    set_query(from_url.q || "");
    set_filter(from_url.show || "all");
  });

  const load = useCallback(async () => {
    set_loading(true);
    try {
      const data = await list_jobs();
      set_items(data.items || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const open_count = items.filter((job) => job.is_active).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((job) => {
      if (filter === "open" && !job.is_active) return false;
      if (filter === "hidden" && job.is_active) return false;
      if (!needle) return true;
      return [job.job_title, job.company_name, job.location, job.company_website, job.job_description].
      join(" ").
      toLowerCase().
      includes(needle);
    });
  }, [items, query, filter]);

  const picked = visible.find((job) => job.job_id === picked_id) || visible[0] || null;

  function update(event) {
    const { name, type, value, checked } = event.target;
    set_form((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function update_search(event) {
    const { name, type, value, checked } = event.target;
    set_search((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function open_create() {
    set_selected_id(null);
    set_form(EMPTY_JOB);
    set_panel("edit");
  }

  function open_automate() {
    set_search(EMPTY_SEARCH);
    set_panel("automate");
  }

  function toggle_job(job_id) {
    set_checked_ids((current) => {
      const next = new Set(current);
      if (next.has(job_id)) next.delete(job_id);
      else next.add(job_id);
      return next;
    });
  }

  function select_visible() {
    set_checked_ids(new Set(visible.map((job) => job.job_id)));
  }

  function clear_checked() {
    set_checked_ids(new Set());
  }

  function open_fresher(source_job) {
    if (source_job) {
      set_checked_ids(new Set([source_job.job_id]));
      set_fresher_source(source_job.has_fresher_quiz ? source_job.job_id : null);
    } else if (checked_ids.size === 1) {
      const only_id = [...checked_ids][0];
      const only_job = items.find((job) => job.job_id === only_id);
      set_fresher_source(only_job?.has_fresher_quiz ? only_id : null);
    } else {
      set_fresher_source(null);
    }
    set_fresher_open(true);
  }

  function open_edit(job) {
    set_selected_id(job.job_id);
    set_form({
      job_title: job.job_title || "",
      company_name: job.company_name || "",
      location: job.location || "",
      company_website: job.company_website || "",
      job_description: job.job_description || "",
      is_active: Boolean(job.is_active)
    });
    set_panel("edit");
  }

  async function save_job(event) {
    event.preventDefault();
    set_loading(true);
    try {
      if (selected_id) await update_job(selected_id, form);
      else await create_job(form);
      set_panel(null);
      toast.success(selected_id ? ENGLISH.job_updated : ENGLISH.job_posted);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function run_search(event) {
    event.preventDefault();
    set_loading(true);
    try {
      const data = await import_searched_jobs({
        ...search,
        radius: search.radius === "" ? null : Number(search.radius),
        num_pages: Number(search.num_pages),
        job_requirements: search.job_requirements.trim() || null,
        location: search.location.trim() || null
      });
      set_panel(null);
      const posted = Number(data.posted) || 0;
      const skipped = Number(data.skipped) || 0;
      if (!posted && !skipped) toast.error(ENGLISH.no_jobs_matched_that_search);
      else if (!posted) toast.success(ENGLISH.those_jobs_are_already_posted);
      else toast.success(skipped ? ENGLISH.posted_skipped_already_listed(posted, skipped) : ENGLISH.posted(posted, posted === 1 ? "job" : "jobs"));
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function remove_job() {
    if (!confirm) return;
    set_loading(true);
    try {
      await delete_job(confirm.job_id);
      if (picked_id === confirm.job_id) set_picked_id(null);
      set_confirm(null);
      toast.success(ENGLISH.job_removed);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  return (
    <section className="jbm_desk">
      <header className="jbm_banner">
        <div>
          <h1>{ENGLISH.jobs}</h1>
          <p>
            <b>{items.length}</b> {items.length === 1 ? "role" : "roles"}
            {" · "}
            <b>{open_count}</b>{ENGLISH.open_for_students}{loading ? ENGLISH.refreshing : ""}
          </p>
        </div>
        {can_edit ?
          <div className="jbm_banner_actions">
            <Button type="button" variant="ghost" disabled={!items.length} onClick={() => open_fresher(checked_ids.size ? null : picked)}>{ENGLISH.fresher_mode}</Button>
            <Post_Job_Button on_manual={open_create} on_automate={open_automate} />
          </div> :
          null}
      </header>

      <div className="jbm_board">
        <aside className="jbm_rail">
          <div className="jbm_rail_tools">
            <input
              className="jbm_search"
              value={query}
              placeholder={ENGLISH.search_roles}
              onChange={(event) => set_query(event.target.value)} />
            <div className="jbm_filters" role="tablist" aria-label={ENGLISH.job_status}>
              {FILTERS.map((item) =>
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  className={filter === item.id ? "is_on" : ""}
                  onClick={() => set_filter(item.id)}>
                  {item.label}
                </button>
              )}
            </div>
            {can_edit ?
              <div className="jbm_pick_all">
                <button type="button" onClick={select_visible}>{ENGLISH.select_all}</button>
                <button type="button" onClick={clear_checked} disabled={!checked_ids.size}>{ENGLISH.deselect_all}</button>
              </div> :
              null}
          </div>
          {visible.length ?
            <ul className="jbm_roles">
              {visible.map((job) =>
                <li key={job.job_id} className={can_edit ? "jbm_role_line" : ""}>
                  {can_edit ?
                    <label className="jbm_pick">
                      <input
                        type="checkbox"
                        checked={checked_ids.has(job.job_id)}
                        aria-label={ENGLISH.select_role(job.job_title)}
                        onChange={() => toggle_job(job.job_id)} />
                    </label> :
                    null}
                  <button
                    type="button"
                    className={picked?.job_id === job.job_id ? "jbm_role is_on" : "jbm_role"}
                    onClick={() => set_picked_id(job.job_id)}>
                    <span className="jbm_mark" aria-hidden="true">{mark_of(job.job_title)}</span>
                    <span>
                      <b>{job.job_title}</b>
                      <small>
                        {[job.company_name, job.location].filter(Boolean).join(" · ") || ENGLISH.company_not_listed}
                        {job.has_fresher_quiz ? ` · ${ENGLISH.fresher}` : ""}
                      </small>
                    </span>
                    <em className={job.is_active ? "is_on" : ""}>{job.is_active ? ENGLISH.open : ENGLISH.hidden}</em>
                  </button>
                </li>
              )}
            </ul> :
            <p className="jbm_empty">{loading ? ENGLISH.loading_jobs : ENGLISH.no_roles_match_this_view}</p>}
        </aside>

        {picked ?
          <article className="jbm_stage">
            <header className="jbm_stage_head">
              <span className="jbm_mark is_large" aria-hidden="true">{mark_of(picked.job_title)}</span>
              <div>
                <h2>{picked.job_title}</h2>
                <p>{[picked.company_name, picked.location].filter(Boolean).join(" · ") || ENGLISH.company_and_location_not_listed}</p>
              </div>
              <em className={picked.is_active ? "is_on" : ""}>{picked.is_active ? ENGLISH.open : ENGLISH.hidden}</em>
            </header>
            <ul className="jbm_facts">
              <li>
                <span>{ENGLISH.company}</span>
                <b>{picked.company_name || "—"}</b>
              </li>
              <li>
                <span>{ENGLISH.location}</span>
                <b>{picked.location || "—"}</b>
              </li>
              <li>
                <span>{ENGLISH.students}</span>
                <b>{picked.is_active ? ENGLISH.can_practise_this_role : ENGLISH.hidden_from_interviews}</b>
              </li>
              <li>
                <span>{ENGLISH.website}</span>
                <b>
                  {picked.company_website ?
                    <a href={picked.company_website} target="_blank" rel="noreferrer">{picked.company_website.replace(/^https?:\/\//, "")}</a> :
                    "—"}
                </b>
              </li>
            </ul>
            <div className="jbm_copy">
              <Job_Brief text={picked.job_description} />
            </div>
            {can_edit ?
              <footer className="jbm_stage_foot">
                <div className="jbm_actions">
                  <Action_Button label={ENGLISH.edit} onClick={() => open_edit(picked)}>
                    <Edit_Icon />
                  </Action_Button>
                  <Action_Button label={ENGLISH.label_delete} tone="danger" onClick={() => set_confirm(picked)}>
                    <Trash_Icon />
                  </Action_Button>
                </div>
                <div className="jbm_stage_links">
                  <Button type="button" variant="ghost" onClick={() => open_fresher(picked)}>
                    {picked.has_fresher_quiz ? ENGLISH.edit_fresher_quiz : ENGLISH.fresher_mode}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => open_edit(picked)}>{ENGLISH.edit_role}</Button>
                </div>
              </footer> :
              null}
          </article> :
          <article className="jbm_stage jbm_stage_blank">
            <span className="jbm_mark is_large" aria-hidden="true">{ENGLISH.jb}</span>
            <h2>{items.length ? ENGLISH.nothing_in_this_view : ENGLISH.post_the_first_role}</h2>
            <p>
              {items.length ?
                ENGLISH.try_another_filter_or_clear_the_search :
                ENGLISH.students_open_the_jobs_board_and_practise_a}
            </p>
            {can_edit && !items.length ?
              <Post_Job_Button on_manual={open_create} on_automate={open_automate} /> :
              null}
          </article>}
      </div>

      <Modal
        open={panel === "edit"}
        title={selected_id ? ENGLISH.edit_job : ENGLISH.post_a_job}
        size="sheet"
        onClose={() => set_panel(null)}>
        <form className="prg_form jbm_form is_job" onSubmit={save_job}>
          <Drawer_Stage
            tone="job"
            kicker={selected_id ? ENGLISH.edit_job : ENGLISH.new_job}
            hint={ENGLISH.title_company_and_what_the_role_involves} />
          <div className="prg_form_fields">
            <Input id="job_title" name="job_title" label={ENGLISH.job_title} variant="outlined" required value={form.job_title} onChange={update} />
            <div className="prg_form_row">
              <Input id="company_name" name="company_name" label={ENGLISH.company} variant="outlined" value={form.company_name} onChange={update} />
              <Input id="location" name="location" label={ENGLISH.location} variant="outlined" value={form.location} onChange={update} />
            </div>
            <label className="ui-field ui-field--outlined">
              <span className="ui-field__label">{ENGLISH.job_description}</span>
              <textarea
                className="ui-input ui-input--outlined prg_textarea jbm_text"
                name="job_description"
                required
                placeholder=" "
                value={form.job_description}
                onChange={update} />
            </label>
            <Switch
              name="is_active"
              checked={Boolean(form.is_active)}
              label={ENGLISH.open_for_students_2}
              onChange={update} />
          </div>
          <div className="prg_form_foot">
            <Button type="submit" loading={loading}>{selected_id ? ENGLISH.save_job : ENGLISH.post_job}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={panel === "automate"}
        title={ENGLISH.automate_jobs}
        size="sheet"
        onClose={() => set_panel(null)}>
        <form className="prg_form jbm_form is_search" onSubmit={run_search}>
          <Drawer_Stage
            tone="job"
            kicker={ENGLISH.live_search}
            hint={ENGLISH.we_ll_look_up_listings_and_post_each} />
          <div className="prg_form_fields">
            <Input id="keyword" name="keyword" label={ENGLISH.keyword} variant="outlined" required value={search.keyword} onChange={update_search} />
            <div className="prg_form_row">
              <Input id="country" name="country" label={ENGLISH.country_code} variant="outlined" required maxLength={2} value={search.country} onChange={update_search} />
              <Input id="search_location" name="location" label={ENGLISH.location} variant="outlined" value={search.location} onChange={update_search} />
            </div>
            <div className="prg_form_row">
              <label className="ui-field ui-field--outlined">
                <span className="ui-field__label">{ENGLISH.date_posted}</span>
                <select className="ui-input ui-input--outlined" name="date_posted" value={search.date_posted} onChange={update_search}>
                  {DATE_POSTED.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
              <label className="ui-field ui-field--outlined">
                <span className="ui-field__label">{ENGLISH.employment_type}</span>
                <select className="ui-input ui-input--outlined" name="employment_types" value={search.employment_types} onChange={update_search}>
                  {EMPLOYMENT_TYPES.map((item) => <option key={item.id || "any"} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            </div>
            <div className="prg_form_row">
              <Input id="radius" name="radius" label={ENGLISH.radius_km} variant="outlined" type="number" min="0" max="200" value={search.radius} onChange={update_search} />
              <Input id="num_pages" name="num_pages" label={ENGLISH.pages} variant="outlined" type="number" min="1" max="20" required value={search.num_pages} onChange={update_search} />
            </div>
            <div className="prg_form_row">
              <Input id="language" name="language" label={ENGLISH.language} variant="outlined" value={search.language} onChange={update_search} />
              <Input id="job_requirements" name="job_requirements" label={ENGLISH.requirements} variant="outlined" value={search.job_requirements} onChange={update_search} />
            </div>
            <Switch name="remote_only" checked={Boolean(search.remote_only)} label={ENGLISH.remote_only} onChange={update_search} />
            <Switch name="include_company_website" checked={Boolean(search.include_company_website)} label={ENGLISH.look_up_company_websites} onChange={update_search} />
          </div>
          <div className="prg_form_foot">
            <Button type="submit" loading={loading}>{ENGLISH.search_and_post}</Button>
          </div>
        </form>
      </Modal>

      <Fresher_Quiz
        open={fresher_open}
        job_ids={[...checked_ids]}
        source_job_id={fresher_source}
        on_close={() => set_fresher_open(false)}
        on_saved={() => {
          set_fresher_open(false);
          load();
        }} />

      <Confirm_Modal
        open={Boolean(confirm)}
        title={ENGLISH.remove_this_job}
        message={confirm ? ENGLISH.will_no_longer_appear_for_students(confirm.job_title) : ""}
        confirm_label={ENGLISH.label_delete}
        loading={loading}
        on_confirm={remove_job}
        on_cancel={() => set_confirm(null)} />
    </section>
  );
}
