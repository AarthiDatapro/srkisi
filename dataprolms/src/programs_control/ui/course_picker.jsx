import { useMemo, useState } from "react";
import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Drawer_Stage } from "../../admin_ui/drawer_stage.jsx";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../../constants/english/programs_control_constants_english.js";

export function Course_Picker({
  courses = [],
  selected_ids = [],
  course_passkeys = {},
  passkey_errors = {},
  loading,
  on_change,
  on_passkeys_change,
  on_submit
}) {
  const [query, set_query] = useState("");
  const chosen = new Set(selected_ids.map(String));

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return courses;
    return courses.filter((course) =>
    `${course.course_name} ${course.course_code}`.toLowerCase().includes(text)
    );
  }, [courses, query]);

  function toggle(id) {
    const key = String(id);
    on_change(
      chosen.has(key) ?
      selected_ids.filter((item) => String(item) !== key) :
      [...selected_ids, id]
    );
  }

  return (
    <form
      className="prg_desk_picker"
      onSubmit={(event) => {
        event.preventDefault();
        on_submit();
      }}>
      <Drawer_Stage
        tone="course"
        kicker={ENGLISH.add_courses}
        hint={ENGLISH.search_the_catalog_and_tick_the_courses_for} />
      <div className="prg_desk_picker_bar">
        <input
          type="search"
          value={query}
          placeholder={ENGLISH.search_courses}
          onChange={(event) => set_query(event.target.value)} />
        <span>{selected_ids.length}{ENGLISH.selected}</span>
      </div>
      <div className="prg_desk_picker_list" role="list">
        {visible.length ?
        visible.map((course) => {
          const checked = chosen.has(String(course.course_id));
          const key = String(course.course_id);
          return (
            <div key={course.course_id} className={checked ? "prg_desk_picker_item is_on" : "prg_desk_picker_item"} role="listitem">
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(course.course_id)} />
                <span>
                  <b>{course.course_name}</b>
                  <small>
                    {course.course_code}
                    {course.course_type ? ` · ${course.course_type}` : ""}
                    {course.is_offline ? ENGLISH.offline : ""}
                  </small>
                </span>
              </label>
              {checked && course.is_offline && on_passkeys_change ?
              <div className="prg_desk_picker_passkey">
                <Input
                  id={`picker_passkey_${key}`}
                  name={`picker_passkey_${key}`}
                  label={ENGLISH.program_passkey}
                  variant="outlined"
                  value={course_passkeys[key] || ""}
                  error={passkey_errors[key] || ""}
                  onChange={(event) =>
                  on_passkeys_change({
                    ...course_passkeys,
                    [key]: event.target.value
                  })
                  } />
              </div> :
              null}
            </div>
          );
        }) :
        <p>{ENGLISH.no_courses_match_that_search}</p>
        }
      </div>
      <div className="prg_form_foot">
        <Button type="submit" loading={loading}>{ENGLISH.save_courses}</Button>
      </div>
    </form>
  );
}
