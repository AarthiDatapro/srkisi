import { useMemo, useState } from "react";
import { SearchInput } from "@datapromr/search-input";
import { face_tone, initials_from_name } from "../../design_system/people.js";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../../constants/english/programs_control_constants_english.js";

export function Faculty_Picker({
  employees = [],
  selected_ids = [],
  on_change
}) {
  const [query, set_query] = useState("");
  const chosen = new Set(selected_ids.map(String));

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return employees;
    return employees.filter((employee) =>
      `${employee.full_name} ${employee.employee_code} ${employee.email} ${employee.designation || ""}`.
      toLowerCase().
      includes(text)
    );
  }, [employees, query]);

  function toggle(id) {
    const key = String(id);
    on_change(
      chosen.has(key) ?
      selected_ids.filter((item) => String(item) !== key) :
      [...selected_ids, id]
    );
  }

  return (
    <div className="prg_pick">
      <div className="prg_pick_bar">
        <SearchInput
          id="program_faculty_search"
          value={query}
          placeholder={ENGLISH.search_faculty_by_name}
          onChange={set_query} />
        <span className="prg_pick_count">
          {selected_ids.length}{ENGLISH.selected}</span>
      </div>
      <div className="prg_pick_list" role="list">
        {visible.length ?
        visible.map((employee) => {
          const checked = chosen.has(String(employee.employee_id));
          return (
            <label
              key={employee.employee_id}
              className={`prg_pick_row${checked ? " is_on" : ""}`}
              role="listitem"
              title={employee.employee_code || ""}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(employee.employee_id)} />
              <span
                className="prg_pick_face"
                style={{ background: face_tone(employee.full_name) }}>
                {initials_from_name(employee.full_name)}
              </span>
              <span className="prg_pick_who">
                <b>{employee.full_name}</b>
                <small>
                  {employee.designation || ENGLISH.faculty}
                  {employee.is_active === false ? ENGLISH.inactive : ""}
                </small>
              </span>
            </label>
          );
        }) :
        <p className="prg_pick_empty">
          {employees.length ? ENGLISH.no_employees_match_that_search : ENGLISH.add_employees_first}
        </p>}
      </div>
    </div>
  );
}
