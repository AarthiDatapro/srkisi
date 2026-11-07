import { useCallback, useEffect, useMemo, useState } from "react";
import { Grid } from "@designdaddy/datagrid";
import { Button } from "@datapromr/button";
import { Modal } from "@datapromr/modal";
import { useToast } from "@datapromr/toast";
import { list_dropdown_options } from "../dropdown_manager/api.js";
import {
  Action_Button,
  Edit_Icon,
  Power_Icon,
  Trash_Icon,
  View_Icon } from
"../admin_ui/row_actions.jsx";
import {
  activate_employee,
  create_employee,
  deactivate_employee,
  delete_employee,
  get_employee,
  list_employees,
  update_employee,
  upload_employee_photo,
  delete_employee_photo } from
"./api.js";
import { COMPACT_EMPLOYEE_COLUMNS, EMPLOYEE_COLUMNS, GRID_THEME } from "./columns.js";
import { COPY, EMPTY_EMPLOYEE } from "./constants.js";
import { form_from_employee, get_employee_errors, has_errors, today_iso } from "./utils.js";
import { Employee_Details } from "./ui/employee_details.jsx";
import { Employee_Form } from "./ui/employee_form.jsx";
import { LMS_MEDIA_TABLET } from "../design_system/breakpoints.js";
import "../admin_ui/theme/admin_forms.css";
import "./theme/employees.css";
import { use_screen_access } from "../employee_authentication/employee_access.jsx";
import { SCREEN } from "../employee_authentication/screen_access.js";
import { EMPLOYEE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/employee_manager_constants_english.js";

function first_active(list) {
  return list.find((item) => item.is_active) || list[0];
}

function dash(value) {
  return value ? value : "—";
}

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

export function Employee_Manager() {
  const { can_edit } = use_screen_access(SCREEN.employees);
  const compact = use_narrow();
  const [items, set_items] = useState([]);
  const [error, set_error] = useState("");
  const [loading, set_loading] = useState(false);
  const [panel, set_panel] = useState(null);
  const [selected, set_selected] = useState(null);
  const [form, set_form] = useState(EMPTY_EMPLOYEE);
  const [form_errors, set_form_errors] = useState({});
  const [file, set_file] = useState(null);
  const [departments, set_departments] = useState([]);
  const [types, set_types] = useState([]);
  const [designations, set_designations] = useState([]);
  const [employment_types, set_employment_types] = useState([]);
  const [genders, set_genders] = useState([]);
  const [locations, set_locations] = useState([]);
  const toast = useToast();

  const load = useCallback(async () => {
    set_loading(true);
    set_error("");
    try {
      const data = await list_employees({
        sort: "name",
        dir: "asc",
        page: 1,
        pageSize: 500
      });
      set_items(data.items || []);
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    const loads = [
      ["departments", set_departments],
      ["employee_types", set_types],
      ["designations", set_designations],
      ["employment_types", set_employment_types],
      ["genders", set_genders],
      ["locations", set_locations]
    ];
    Promise.allSettled(loads.map(([key]) => list_dropdown_options(key))).
    then((results) => {
      if (!active) return;
      let message = "";
      results.forEach((result, index) => {
        const set_list = loads[index][1];
        if (result.status === "fulfilled") {
          set_list(result.value.items || []);
          return;
        }
        set_list([]);
        message = result.reason?.message || message;
      });
      if (message) toast.error(message);
    });
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (panel !== "create") return;
    const type = first_active(types);
    const dept = first_active(departments);
    const role = first_active(designations);
    set_form((current) => ({
      ...current,
      employee_type_id: current.employee_type_id || (type ? String(type.id) : ""),
      department_id: current.department_id || (dept ? String(dept.id) : ""),
      designation_id: current.designation_id || (role ? String(role.id) : "")
    }));
  }, [panel, types, departments, designations]);

  const rows = useMemo(
    () =>
    items.map((employee) => ({
      ...employee,
      id: employee.employee_id,
      photo: employee.profile_photo_url || "",
      status: employee.is_active ? ENGLISH.active : ENGLISH.inactive
    })),
    [items]
  );

  function open_create() {
    const type = first_active(types);
    const dept = first_active(departments);
    const role = first_active(designations);
    set_form({
      ...EMPTY_EMPLOYEE,
      employee_type_id: type ? String(type.id) : "",
      department_id: dept ? String(dept.id) : "",
      designation_id: role ? String(role.id) : "",
      joining_date: today_iso(),
      is_active: true
    });
    set_form_errors({});
    set_file(null);
    set_selected(null);
    set_panel("create");
  }

  function open_edit(row) {
    set_form(form_from_employee(row));
    set_form_errors({});
    set_file(null);
    set_selected(row);
    set_panel("edit");
    get_employee(row.employee_id).
    then((full) => {
      set_selected(full);
      set_form(form_from_employee(full));
    }).
    catch(() => {});
  }

  function open_details(row) {
    set_selected(row);
    set_panel("details");
    get_employee(row.employee_id).then(set_selected).catch(() => {});
  }

  async function remove_employee_photo() {
    if (!selected?.employee_id || !selected?.profile_photo_url) return;
    set_loading(true);
    try {
      const saved = await delete_employee_photo(selected.employee_id);
      set_selected(saved);
      toast.success(ENGLISH.photo_removed);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function save_employee() {
    const next_errors = get_employee_errors(form, { passwordRequired: panel === "create" });
    set_form_errors(next_errors);
    if (has_errors(next_errors)) return;

    set_loading(true);
    try {
      const saved =
      panel === "edit" && selected ?
      await update_employee(selected.employee_id, form) :
      await create_employee(form);
      if (file) {
        await upload_employee_photo(saved.employee_id, file);
      }
      set_panel(null);
      set_file(null);
      toast.success(panel === "edit" ? ENGLISH.employee_updated : ENGLISH.employee_created);
      await load();
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    } finally {
      set_loading(false);
    }
  }

  async function run_action(row, action) {
    try {
      if (action === "activate") {
        await activate_employee(row.employee_id);
        toast.success(ENGLISH.employee_activated);
      }
      if (action === "deactivate") {
        await deactivate_employee(row.employee_id);
        toast.success(ENGLISH.employee_deactivated);
      }
      if (action === "delete") {
        await delete_employee(row.employee_id);
        toast.success(ENGLISH.employee_deleted);
      }
      if (panel && selected?.employee_id === row.employee_id) set_panel(null);
      await load();
    } catch (err) {
      set_error(err.message);
      toast.error(err.message);
    }
  }

  function render_cell(column_id, row) {
    if (column_id === "photo") {
      const letter = (row.full_name || row.first_name || "E").slice(0, 1).toUpperCase();
      return row.photo ?
      <span className="emp_desk_photo">
          <img src={row.photo} alt="" />
        </span> :

      <span className="emp_desk_photo">{letter}</span>;

    }
    if (column_id === "status") {
      return (
        <span className={`ub-status ub-status--${row.status === "Active" ? "active" : "inactive"}`}>
          {row.status}
        </span>);

    }
    return dash(row[column_id]);
  }

  function render_actions(row) {
    return (
      <div className="emp_desk_actions">
        <Action_Button label={ENGLISH.view} onClick={() => open_details(row)}>
          <View_Icon />
        </Action_Button>
        {can_edit ?
        <>
            <Action_Button label={ENGLISH.edit} onClick={() => open_edit(row)}>
              <Edit_Icon />
            </Action_Button>
            <Action_Button
            label={row.is_active ? ENGLISH.deactivate : ENGLISH.activate}
            tone={row.is_active ? "neutral" : "success"}
            onClick={() => run_action(row, row.is_active ? "deactivate" : "activate")}>
            
              <Power_Icon />
            </Action_Button>
            <Action_Button label={ENGLISH.label_delete} tone="danger" onClick={() => run_action(row, "delete")}>
              <Trash_Icon />
            </Action_Button>
          </> :
        null}
      </div>);

  }

  return (
    <section className={compact ? "emp_desk is_compact" : "emp_desk"}>
      <header className="emp_desk_banner">
        <div>
          <h1>{compact ? COPY.title : ENGLISH.staff_directory}</h1>
          <p>
            <b>{items.length}</b> {items.length === 1 ? "person" : "people"}
            {compact ? "" : ENGLISH.on_record}
            {loading ? ENGLISH.refreshing : ""}
          </p>
        </div>
        {can_edit ?
        <Button type="button" onClick={open_create}>
            {compact ? ENGLISH.add : COPY.create}
          </Button> :
        null}
      </header>

      {error ? <p className="emp_desk_error">{error}</p> : null}

      <div className="emp_desk_grid">
        <Grid
          className="emp_grid"
          theme={compact ? { ...GRID_THEME, fontSize: "12px", radius: "8px" } : GRID_THEME}
          columns={compact ? COMPACT_EMPLOYEE_COLUMNS : EMPLOYEE_COLUMNS}
          rows={rows}
          rowKey="employee_id"
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          toolbarIcons={compact}
          showFreeze={!compact}
          showFilterColumns={!compact}
          showColumnFilter={!compact}
          showClear={!compact}
          showPageSizeCustom={!compact}
          searchPlaceholder={compact ? "Search…" : ENGLISH.search_any_column}
          emptyMessage={loading ? ENGLISH.loading_employees : COPY.empty}
          emptyHint={loading ? ENGLISH.fetching_this_directory : COPY.emptyHint}
          tableAriaLabel={ENGLISH.employees}
          renderCell={render_cell}
          renderActions={render_actions} />
        
      </div>

      <Modal
        open={panel === "create" || panel === "edit"}
        title={panel === ENGLISH.edit_2 ? COPY.edit : COPY.create}
        size="sheet"
        onClose={() => set_panel(null)}>
        
        <Employee_Form
          values={form}
          errors={form_errors}
          types={types}
          departments={departments}
          designations={designations}
          employment_types={employment_types}
          genders={genders}
          locations={locations}
          managers={items.
          filter((item) => String(item.employee_id) !== String(selected?.employee_id || "")).
          map((item) => ({
            id: item.employee_id,
            name: item.full_name,
            is_active: item.is_active
          }))}
          require_password={panel === "create"}
          file={file}
          preview_url={selected?.profile_photo_url}
          submit_label={panel === "edit" ? ENGLISH.save_changes : ENGLISH.create_employee}
          loading={loading}
          on_change={set_form}
          on_file={set_file}
          on_remove={selected?.profile_photo_url ? remove_employee_photo : undefined}
          on_submit={save_employee} />
        
      </Modal>

      <Modal
        open={panel === "details"}
        title={COPY.details}
        size="sheet"
        onClose={() => set_panel(null)}>
        
        {selected ?
        <Employee_Details
          employee={selected}
          compact={compact}
          on_edit={can_edit ? () => open_edit(selected) : undefined} /> :

        null}
      </Modal>
    </section>);

}
