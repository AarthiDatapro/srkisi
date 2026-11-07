import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_manager_constants_english.js";

const NO_COHORT = "none";

function program_cohorts(program) {
  const links = Array.isArray(program.cohorts) ? program.cohorts : [];
  if (links.length) {
    return links.map((cohort) => ({
      id: String(cohort.cohort_id),
      name: cohort.cohort_name || ENGLISH.cohort
    }));
  }
  if (program.cohort_id) {
    return [{
      id: String(program.cohort_id),
      name: program.cohort_name || ENGLISH.cohort
    }];
  }
  return [{ id: NO_COHORT, name: ENGLISH.no_cohort }];
}

export function Program_Pick_Modal({
  open,
  course_name = "",
  programs = [],
  loading = false,
  on_pick,
  on_close
}) {
  const [cohort_id, set_cohort_id] = useState(null);

  useEffect(() => {
    if (!open) set_cohort_id(null);
  }, [open]);

  const cohorts = useMemo(() => {
    const grouped = new Map();
    for (const program of programs) {
      for (const cohort of program_cohorts(program)) {
        const current = grouped.get(cohort.id) || {
          id: cohort.id,
          name: cohort.name,
          programs: []
        };
        if (!current.programs.some((item) => item.program_id === program.program_id)) {
          current.programs.push(program);
        }
        grouped.set(cohort.id, current);
      }
    }
    return [...grouped.values()].sort((left, right) => {
      if (left.id === NO_COHORT) return 1;
      if (right.id === NO_COHORT) return -1;
      return left.name.localeCompare(right.name);
    });
  }, [programs]);

  const has_cohort = cohorts.some((cohort) => cohort.id !== NO_COHORT);
  const chosen = cohort_id == null ? null : cohorts.find((cohort) => cohort.id === cohort_id) || null;
  const program_list = !has_cohort ? programs : chosen ? chosen.programs : [];

  if (!open) return null;

  return createPortal(
    <div className="crs_open" role="dialog" aria-modal="true" aria-label={ENGLISH.select_program}>
      <button type="button" className="crs_pick_backdrop" aria-label={ENGLISH.close} onClick={on_close} />
      <div className="crs_pick_card">
        <p>{ENGLISH.open_course}</p>
        <h2>{course_name || ENGLISH.course}</h2>
        <span>
          {chosen ?
            ENGLISH.programs_in_that_include_this_course(chosen.name) :
            has_cohort ?
              ENGLISH.choose_a_cohort_then_pick_a_program_in :
              ENGLISH.choose_a_program_it_is_used_for_analytics}
        </span>
        {chosen ?
          <button type="button" className="crs_pick_back" onClick={() => set_cohort_id(null)}>{ENGLISH.cohorts}</button> :
          null}
        {loading ?
          <p className="crs_pick_status">{ENGLISH.loading_programs}</p> :
          !programs.length ?
            <div className="crs_pick_empty">
              <strong>{ENGLISH.assign_this_course_first}</strong>
              <p>{ENGLISH.this_course_is_not_on_a_program_yet}</p>
            </div> :
            has_cohort && !chosen ?
              <ul>
                {cohorts.map((cohort) =>
                  <li key={cohort.id || "none"}>
                    <button type="button" onClick={() => set_cohort_id(cohort.id)}>
                      <i>{String(cohort.name || "C").trim().charAt(0).toUpperCase()}</i>
                      <span>
                        <strong>{cohort.name}</strong>
                        <em>{cohort.programs.length}{ENGLISH.program_3}{cohort.programs.length === 1 ? "" : "s"}</em>
                      </span>
                      <b aria-hidden="true">→</b>
                    </button>
                  </li>
                )}
              </ul> :
              <ul>
                {program_list.map((program) =>
                  <li key={program.program_id}>
                    <button type="button" onClick={() => on_pick(program.program_id)}>
                      <i>{String(program.program_name || "P").trim().charAt(0).toUpperCase()}</i>
                      <span>
                        <strong>{program.program_name}</strong>
                      </span>
                      <b aria-hidden="true">→</b>
                    </button>
                  </li>
                )}
              </ul>}
      </div>
    </div>,
    document.body
  );
}
