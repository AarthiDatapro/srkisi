import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";
export function Performance_Course_Health({ courses = [], loading = false }) {
  return (
    <section className="po_panel po_panel_courses">
      <h2>{ENGLISH.course_health}</h2>
      {courses.length ?
      <ul className="po_courses">
          {courses.map((course) =>
        <li key={course.course_id}>
              <div>
                <strong>{course.course_name}</strong>
                <small>
                  {course.enrolled || 0}{ENGLISH.students}{course.duration_hours ? ENGLISH.hrs(course.duration_hours) : ""}
                </small>
              </div>
              <div className="po_meters">
                <label>{ENGLISH.progress}<b>{course.progress || 0}%</b>
                  <i><u style={{ width: `${course.progress || 0}%` }} /></i>
                </label>
                <label>{ENGLISH.score}<b>{course.avg_score || 0}%</b>
                  <i className="is_score"><u style={{ width: `${course.avg_score || 0}%` }} /></i>
                </label>
              </div>
            </li>
        )}
        </ul> :

      <p className="po_empty">{loading ? "Loading..." : ENGLISH.no_courses_in_this_program}</p>
      }
    </section>);

}
