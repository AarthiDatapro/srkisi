import { SearchInput } from "@datapromr/search-input";
import { COPY } from "../constants.js";
import { COHORTS_ENGLISH as ENGLISH } from "../../constants/english/cohorts_constants_english.js";

export function Cohort_List({
  items,
  count,
  query,
  selected_id,
  filtering = false,
  on_query,
  on_select
}) {
  return (
    <aside className="cht_rail">
      <header className="cht_rail_head">
        <h2>{ENGLISH.cohorts}</h2>
        <p><b>{count ?? items.length}</b>{ENGLISH.on_record_2}</p>
      </header>
      {(count || filtering) ?
        <div className="cht_rail_tools">
          <SearchInput
            id="cohort_search"
            value={query}
            placeholder={COPY.searchCohorts}
            onChange={on_query} />
        </div> :
        null}
      <ul className="cht_rail_list">
        {items.map((item) => {
          const selected = String(item.cohort_id) === String(selected_id);
          return (
            <li key={item.cohort_id}>
              <button
                type="button"
                className={selected ? "cht_cohort is_on" : "cht_cohort"}
                onClick={() => on_select(item.cohort_id)}>
                <span className="cht_thumb">
                  {item.thumbnail_url ?
                    <img src={item.thumbnail_url} alt="" /> :
                    <span>{item.cohort_name.slice(0, 1)}</span>}
                </span>
                <span className="cht_cohort_copy">
                  <strong>{item.cohort_name}</strong>
                  <small>{item.program_count} {item.program_count === 1 ? ENGLISH.program : ENGLISH.programs}</small>
                </span>
                <span className="cht_chevron" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            </li>
          );
        })}
        {items.length ? null : (
          <li className="cht_empty">{filtering ? ENGLISH.no_cohorts_match_this_filter : ENGLISH.no_cohorts_yet_2}</li>
        )}
      </ul>
    </aside>
  );
}
