import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";
export function Performance_Filters({
  cohort_id,
  program_id,
  course_id,
  cohorts = [],
  programs = [],
  courses = [],
  can_view_all_courses,
  on_cohort_change,
  on_program_change,
  on_course_change
}) {
  return (
    <div className="po_filters">
      <label>{ENGLISH.cohort}<select
          value={cohort_id}
          onChange={(event) => on_cohort_change?.(event.target.value)}>
          {cohorts.length ? null : <option value="">{ENGLISH.no_cohorts}</option>}
          {cohorts.map((item) =>
          <option key={item.cohort_id} value={item.cohort_id}>
              {item.cohort_name}
            </option>
          )}
        </select>
      </label>
      <label>{ENGLISH.program}<select
          value={program_id}
          onChange={(event) => on_program_change?.(event.target.value)}>
          {programs.length ? null : <option value="">{ENGLISH.no_programs}</option>}
          {programs.map((item) =>
          <option key={item.program_id} value={item.program_id}>
              {item.program_name}
            </option>
          )}
        </select>
      </label>
      <label>{ENGLISH.course}<select
          value={course_id || "all"}
          onChange={(event) => on_course_change?.(event.target.value === "all" ? "" : event.target.value)}>
          {can_view_all_courses ? <option value="all">{ENGLISH.all_courses}</option> : null}
          {courses.map((item) =>
          <option key={item.course_id} value={item.course_id}>
              {item.course_name}
            </option>
          )}
        </select>
      </label>
    </div>);

}
