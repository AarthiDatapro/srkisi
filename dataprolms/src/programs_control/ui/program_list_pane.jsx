import { Pagination } from "@datapromr/pagination";
import { SearchInput } from "@datapromr/search-input";
import { COPY } from "../constants.js";
import { Chevron_Icon, Plus_Icon, Students_Icon } from "./icons.jsx";
import { Program_Thumb } from "./program_thumb.jsx";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../../constants/english/programs_control_constants_english.js";

export function Program_List_Pane({
  items,
  total,
  page,
  page_count,
  search,
  page_size,
  selected_id,
  loading,
  compact = false,
  collapsed = false,
  cohorts = [],
  cohort_id = "",
  on_cohort,
  on_search,
  on_page,
  on_select,
  on_create,
  on_toggle
}) {
  const start = items.length ? (page - 1) * page_size + 1 : 0;
  const end = items.length ? start + items.length - 1 : 0;

  if (collapsed) {
    return (
      <aside className="prg_desk_list is_off">
        <button type="button" className="prg_desk_list_toggle" aria-label={ENGLISH.show_programs} onClick={on_toggle}>
          <Chevron_Icon dir="right" />
        </button>
      </aside>);

  }

  return (
    <aside className="prg_desk_list">
      <header className="prg_desk_list_head">
        <div className="prg_desk_list_title">
          <h1>{COPY.title}</h1>
          <p>{cohort_id ? <><b>{total}</b>{ENGLISH.on_record}</> : COPY.selectCohort}</p>
        </div>
        {on_toggle ?
        <button type="button" className="prg_desk_list_toggle" aria-label={ENGLISH.hide_programs} onClick={on_toggle}>
            <Chevron_Icon dir="left" />
          </button> :
        null}
      </header>

      <div className="prg_desk_list_tools">
        <select
          className="prg_desk_cohort"
          aria-label={COPY.selectCohort}
          value={cohort_id}
          onChange={(event) => on_cohort?.(event.target.value)}>
          <option value="">{COPY.selectCohort}</option>
          {cohorts.map((cohort) =>
            <option key={cohort.cohort_id} value={String(cohort.cohort_id)}>
              {cohort.cohort_name}
            </option>
          )}
        </select>
        <SearchInput
          id="program_search"
          value={search}
          placeholder={COPY.search}
          onChange={on_search} />
        {on_create ?
        <button type="button" className="prg_desk_add" aria-label={COPY.create} onClick={on_create}>
            <Plus_Icon />
            <span className="prg_desk_btn_text">{compact ? ENGLISH.add : COPY.create}</span>
          </button> :
        null}
      </div>

      <div className="prg_desk_items">
        {items.length ?
        items.map((program) => {
          const on = String(program.program_id) === String(selected_id);
          return (
            <button
              key={program.program_id}
              type="button"
              className={on ? "prg_desk_item is_on" : "prg_desk_item"}
              onClick={() => on_select(program)}>
              
                <span className="prg_desk_avatar">
                  <Program_Thumb
                    url={program.thumbnail_url}
                    program_type={program.program_type}
                    program_name={program.program_name}
                  />
                </span>
                <span className="prg_desk_item_copy">
                  <b>{program.program_name}</b>
                  <small className="prg_desk_enrolled">
                    <Students_Icon />
                    {Number(program.enrolled_students) || 0} {Number(program.enrolled_students) === 1 ? "student" : "students"}
                  </small>
                </span>
                <span className={program.is_active ? "prg_desk_pill is_on" : "prg_desk_pill"}>
                  {program.is_active ? ENGLISH.active : ENGLISH.inactive_2}
                </span>
                <span className="prg_desk_chevron" aria-hidden="true">
                  <Chevron_Icon />
                </span>
              </button>);

        }) :

        <div className="prg_desk_wait">
            <span className="prg_desk_wait_mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 7.5h16M4 12h10M4 16.5h13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="17.5" cy="15.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="M17.5 14.1v1.5l1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <strong>
              {loading ? ENGLISH.loading_programs_2 : cohort_id ? COPY.empty : ENGLISH.choose_a_cohort}
            </strong>
            <p>
              {loading ? ENGLISH.fetching_this_list : cohort_id ? COPY.emptyHint : COPY.pickCohort}
            </p>
          </div>
        }
      </div>

      {cohort_id ?
      <footer className="prg_desk_list_foot">
        <span>
          {compact ? `${start}–${end} of ${total}` : ENGLISH.showing_to_of_programs(start, end, total)}
        </span>
        <Pagination page={page} pageCount={page_count} onPageChange={on_page} />
      </footer> :
      null}
    </aside>);

}
