import { Grid } from "@designdaddy/datagrid";
import { Modal } from "@datapromr/modal";
import {
  Action_Button,
  Edit_Icon,
  Link_Icon,
  Power_Icon,
  Trash_Icon,
  View_Icon } from
"../../admin_ui/row_actions.jsx";
import { Confirm_Modal } from "../../admin_ui/confirm_modal.jsx";
import { COURSE_COLUMNS, GRID_THEME } from "../columns.js";
import { COPY } from "../constants.js";
import { format_hours } from "../utils.js";
import { Course_Details } from "./course_details.jsx";
import { Course_Form } from "./course_form.jsx";
import { Course_Thumb } from "./course_thumb.jsx";
import { Program_Passkey_Panel } from "./program_passkey_panel.jsx";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_manager_constants_english.js";

export function Course_Catalog_View({
  compact,
  items,
  course_tab,
  set_course_tab,
  open_count,
  closed_count,
  loading,
  can_edit,
  error,
  card_query,
  set_card_query,
  visible_rows,
  rows,
  open_course,
  open_details,
  open_edit,
  run_action,
  open_create,
  panel,
  set_panel,
  set_file,
  form,
  form_errors,
  types,
  domains,
  levels,
  languages,
  tags,
  programs,
  selected_program_ids,
  file,
  preview_url,
  remove_course_image,
  set_form,
  on_cohorts,
  save_course,
  selected,
  open_passkey,
  passkey_form,
  passkey_error,
  set_passkey_form,
  set_passkey_error,
  save_passkey,
  confirm,
  set_confirm,
  run_confirm,
  exporting,
  download_enrollments
}) {
  function dash(value) {
    return value === 0 || value ? value : "—";
  }

  function render_cell(column_id, row) {
    if (column_id === "course_name") {
      return (
        <button
          type="button"
          className="crs_desk_name_cell"
          title={row.course_name}
          onClick={() => open_course(row)}>
          <Course_Thumb
            url={row.thumbnail_url}
            course_name={row.course_name}
            className="crs_desk_avatar"
          />
          <b>{row.course_name || "—"}</b>
        </button>
      );
    }
    if (column_id === "course_code") {
      return (
        <button
          type="button"
          className="crs_desk_code"
          title={row.course_code}
          onClick={() => open_course(row)}>
          {row.course_code}
        </button>);

    }
    if (column_id === "status") {
      return (
        <button
          type="button"
          className="crs_desk_row_hit"
          onClick={() => open_course(row)}>
          <span className={`ub-status ub-status--${row.status === "Active" ? "active" : "inactive"}`}>
            {row.status}
          </span>
        </button>);

    }
    if (column_id === "program_count") {
      return (
        <button
          type="button"
          className="crs_desk_row_hit"
          onClick={() => open_course(row)}>
          <span className="crs_desk_count">{row.program_count || 0}</span>
        </button>);

    }
    if (column_id === "duration_hours") {
      return (
        <button
          type="button"
          className="crs_desk_row_hit"
          onClick={() => open_course(row)}>
          {dash(row.duration_hours)}
        </button>);

    }
    return (
      <button
        type="button"
        className="crs_desk_row_hit"
        onClick={() => open_course(row)}>
        {dash(row[column_id])}
      </button>);

  }

  function Download_Icon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  function render_download(row) {
    return (
      <Action_Button
        label={ENGLISH.download_students}
        onClick={() => download_enrollments(row.course_id)}>
        <Download_Icon />
      </Action_Button>
    );
  }

  function render_actions(row) {
    return (
      <div className="crs_desk_actions" onClick={(event) => event.stopPropagation()}>
        <Action_Button label={ENGLISH.view_details} onClick={() => open_details(row)}>
          <View_Icon />
        </Action_Button>
        {render_download(row)}
        {can_edit ?
        <>
            <Action_Button label={ENGLISH.edit} onClick={() => open_edit(row)}>
              <Edit_Icon />
            </Action_Button>
            <Action_Button label={ENGLISH.assign_to_programs} onClick={on_cohorts}>
              <Link_Icon />
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
    <section className={compact ? "crs_desk is_compact" : "crs_desk"}>
      <header className="crs_desk_banner">
        <div>
          <h1>{compact ? COPY.title : ENGLISH.course_catalog}</h1>
          <p>
            <b>{items.length}</b> {items.length === 1 ? "course" : "courses"}
            {compact ? "" : ENGLISH.on_record}
            {loading ? ENGLISH.refreshing : ""}
          </p>
        </div>
        <div className="crs_desk_banner_end">
          <div className="crs_desk_tabs" role="tablist" aria-label={ENGLISH.course_catalog}>
            <button
              type="button"
              role="tab"
              className={course_tab === "open" ? "is_on" : ""}
              aria-selected={course_tab === "open"}
              onClick={() => set_course_tab("open")}>{ENGLISH.open_courses}<b>{open_count}</b>
            </button>
            <button
              type="button"
              role="tab"
              className={course_tab === "closed" ? "is_on" : ""}
              aria-selected={course_tab === "closed"}
              onClick={() => set_course_tab("closed")}>{ENGLISH.non_open_courses}<b>{closed_count}</b>
            </button>
          </div>
          <button
            type="button"
            className="crs_desk_export"
            disabled={Boolean(exporting)}
            onClick={() => download_enrollments()}>
            {ENGLISH.download_all_enrollments}
          </button>
          {can_edit ?
          <button type="button" className="crs_desk_add" aria-label={ENGLISH.new_course} onClick={open_create}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button> :
          null}
        </div>
      </header>

      {error ? <p className="crs_desk_error">{error}</p> : null}

      {compact ?
      <div className="crs_desk_cards_wrap">
          <input
          className="crs_desk_card_search"
          value={card_query}
          placeholder={ENGLISH.search_courses}
          onChange={(event) => set_card_query(event.target.value)} />
        
          {visible_rows.length ?
        <ul className="crs_desk_cards">
              {visible_rows.map((row) =>
          <li key={row.course_id} className="crs_desk_card">
                  <button type="button" className="crs_desk_card_main" onClick={() => open_course(row)}>
                    <Course_Thumb
                      url={row.thumbnail_url}
                      course_name={row.course_name}
                      className="crs_desk_avatar"
                    />
                    <span>
                      <b>{row.course_name}</b>
                      <small>
                        {[
                          row.course_code,
                          row.course_type,
                          format_hours(row.duration_hours),
                          `${row.enrolled_count || 0} ${ENGLISH.enrolled}`
                        ].
                  filter((part) => part && part !== "—").
                  join(" · ")}
                      </small>
                    </span>
                  </button>
                  <div className="crs_desk_card_side">
                    <span className={`ub-status ub-status--${row.status === "Active" ? "active" : "inactive"}`}>
                      {row.status}
                    </span>
                    <div className="crs_desk_actions">
                      <Action_Button label={ENGLISH.view_details} onClick={() => open_details(row)}>
                        <View_Icon />
                      </Action_Button>
                      {render_download(row)}
                      {can_edit ?
                      <>
                        <Action_Button label={ENGLISH.edit} onClick={() => open_edit(row)}>
                          <Edit_Icon />
                        </Action_Button>
                        <Action_Button label={ENGLISH.label_delete} tone="danger" onClick={() => run_action(row, "delete")}>
                          <Trash_Icon />
                        </Action_Button>
                      </> :
                      null}
                    </div>
                  </div>
                </li>
          )}
            </ul> :

        <p className="crs_desk_empty">{loading ? ENGLISH.loading_courses : course_tab === "open" ? ENGLISH.no_open_courses : ENGLISH.no_non_open_courses}</p>
        }
        </div> :

      <div className="crs_desk_grid">
          <Grid
          className="crs_grid"
          theme={GRID_THEME}
          columns={COURSE_COLUMNS}
          rows={rows}
          rowKey="course_id"
          pageSize={10}
          pageSizeOptions={[10, 20, 50, 100]}
          searchPlaceholder={ENGLISH.search_any_column}
          emptyMessage={loading ? ENGLISH.loading_courses : course_tab === "open" ? ENGLISH.no_open_courses : ENGLISH.no_non_open_courses}
          emptyHint={loading ? ENGLISH.fetching_this_catalog : ENGLISH.courses_in_this_tab_show_up_here}
          tableAriaLabel={ENGLISH.courses}
          renderCell={render_cell}
          renderActions={render_actions} />
        
        </div>
      }

      <Modal
        open={panel === "create" || panel === "edit"}
        title={panel === ENGLISH.edit_2 ? COPY.edit : COPY.create}
        size="wide"
        onClose={() => {
          set_panel(null);
          set_file(null);
        }}>
        
        <Course_Form
          values={form}
          errors={form_errors}
          types={types}
          domains={domains}
          levels={levels}
          languages={languages}
          tags={tags}
          programs={programs}
          selected_ids={selected_program_ids}
          file={file}
          preview_url={preview_url}
          submit_label={panel === "edit" ? ENGLISH.save_changes : ENGLISH.create_course}
          editing={panel === "edit"}
          loading={loading}
          on_change={set_form}
          on_cohorts={on_cohorts}
          on_file={set_file}
          on_remove={selected?.thumbnail_url ? remove_course_image : undefined}
          on_submit={save_course} />
        
      </Modal>

      <Modal
        open={panel === "details"}
        title={COPY.details}
        size="wide"
        onClose={() => set_panel(null)}>
        
        {selected ?
        <Course_Details
          course={selected}
          on_edit={() => open_edit(selected)}
          on_assign={on_cohorts}
          on_passkey={can_edit && selected.is_offline ? () => open_passkey(selected) : undefined} /> :

        null}
      </Modal>

      <Modal
        open={panel === "passkey"}
        title={ENGLISH.program_passkey}
        size="wide"
        onClose={() => set_panel(null)}>
        
        {selected ?
        <Program_Passkey_Panel
          programs={programs.map((program) => {
            const linked = (selected.programs || []).find(
              (item) => Number(item.program_id) === Number(program.program_id)
            );
            return {
              ...program,
              enroll_passkey: linked?.enroll_passkey || "",
              has_passkey: Boolean(linked?.has_passkey || linked?.enroll_passkey)
            };
          })}
          program_id={passkey_form.program_id}
          passkey={passkey_form.passkey}
          error={passkey_error}
          loading={loading}
          on_change={(next) => {
            const linked = (selected.programs || []).find(
              (item) => String(item.program_id) === String(next.program_id)
            );
            set_passkey_form({
              program_id: next.program_id,
              passkey:
              next.program_id === passkey_form.program_id ?
              next.passkey :
              linked?.enroll_passkey || ""
            });
            set_passkey_error("");
          }}
          on_submit={() => save_passkey(false)} /> :

        null}
      </Modal>

      <Confirm_Modal
        open={Boolean(confirm)}
        title={confirm?.title || ENGLISH.confirm}
        message={confirm?.message || ""}
        confirm_label={ENGLISH.replace}
        loading={loading}
        on_cancel={() => set_confirm(null)}
        on_confirm={run_confirm} />
    </section>);

}
