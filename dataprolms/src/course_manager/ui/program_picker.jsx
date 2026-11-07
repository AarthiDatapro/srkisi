import { useMemo, useState } from "react";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_manager_constants_english.js";

export function Program_Picker({ programs = [], selected_ids = [], on_change }) {
  const [query, set_query] = useState("");
  const chosen = new Set(selected_ids.map(String));

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return programs;
    return programs.filter((program) =>
    `${program.program_name} ${program.program_code}`.toLowerCase().includes(text)
    );
  }, [programs, query]);

  function toggle(id) {
    const key = String(id);
    on_change(
      chosen.has(key) ?
      selected_ids.filter((item) => String(item) !== key) :
      [...selected_ids, id]
    );
  }

  return (
    <div className="crs_pick">
      <div className="crs_pick_bar">
        <input
          className="crs_pick_search"
          type="search"
          value={query}
          placeholder={ENGLISH.search_programs}
          onChange={(event) => set_query(event.target.value)} />
        
        <span className="crs_pick_count">
          {selected_ids.length}{ENGLISH.selected}</span>
      </div>
      <div className="crs_pick_list" role="list">
        {visible.length ?
        visible.map((program) => {
          const checked = chosen.has(String(program.program_id));
          return (
            <label
              key={program.program_id}
              className={`crs_pick_row${checked ? " is_on" : ""}`}
              role="listitem">
              
                <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(program.program_id)} />
              
                <span>
                  <b>{program.program_name}</b>
                  <small>
                    {program.program_code}
                    {program.is_active ? "" : ENGLISH.inactive_2}
                  </small>
                </span>
              </label>);

        }) :

        <p className="crs_pick_empty">
            {programs.length ? ENGLISH.no_programs_match_that_search : ENGLISH.create_a_program_first}
          </p>
        }
      </div>
    </div>);

}
