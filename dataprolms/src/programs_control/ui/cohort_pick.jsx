import { useMemo, useState } from "react";
import { SearchInput } from "@datapromr/search-input";
import { COPY } from "../constants.js";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../../constants/english/programs_control_constants_english.js";

function cohort_mark(cohort) {
  if (cohort.thumbnail_url) return <img src={cohort.thumbnail_url} alt="" />;
  return String(cohort.cohort_name || "C").trim().charAt(0).toUpperCase();
}

export function Cohort_Pick({ cohorts = [], on_select }) {
  const [query, set_query] = useState("");
  const text = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!text) return cohorts;
    return cohorts.filter((cohort) =>
      String(cohort.cohort_name || "").toLowerCase().includes(text)
    );
  }, [cohorts, text]);
  const total = cohorts.length;

  return (
    <section className="prg_desk_pick">
      <header className="prg_desk_pick_head">
        <div>
          <p>{ENGLISH.programs}</p>
          <h2>{COPY.selectCohort}</h2>
          <span>{COPY.pickCohort}</span>
        </div>
        <div className="prg_desk_pick_stat">
          <b>{total}</b>
          <span>{total === 1 ? "cohort" : "cohorts"}</span>
        </div>
      </header>

      <div className="prg_desk_pick_tools">
        <SearchInput
          id="cohort_pick_search"
          value={query}
          placeholder={ENGLISH.search_cohorts}
          onChange={set_query} />
      </div>

      {visible.length ?
      <ul className="prg_desk_pick_grid">
        {visible.map((cohort) => {
          const count = Number(cohort.program_count) || 0;
          return (
            <li key={cohort.cohort_id}>
              <button type="button" onClick={() => on_select(String(cohort.cohort_id))}>
                <span className={`prg_desk_pick_cover${cohort.thumbnail_url ? " is_photo" : ""}`}>
                  {cohort_mark(cohort)}
                </span>
                <span className="prg_desk_pick_shade" aria-hidden="true" />
                <span className="prg_desk_pick_body">
                  <span className="prg_desk_pick_copy">
                    <small>{count} {count === 1 ? "program" : "programs"}</small>
                    <b>{cohort.cohort_name}</b>
                  </span>
                  <span className="prg_desk_pick_go">{ENGLISH.view_programs}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul> :
      <p className="prg_desk_pick_empty">
        {total ? ENGLISH.no_cohorts_match_this_search : ENGLISH.no_cohorts_yet}
      </p>}
    </section>
  );
}
