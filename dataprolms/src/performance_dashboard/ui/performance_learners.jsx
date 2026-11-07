import { course_label, initials } from "../utils.js";
import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";

export function Performance_Learners({ students = [], search, set_search, loading = false }) {
  return (
    <section className="po_panel po_panel_learners">
      <div className="po_panel_bar">
        <h2>{ENGLISH.learners}</h2>
        <input
          value={search}
          onChange={(event) => set_search(event.target.value)}
          placeholder={ENGLISH.find_a_student} />
        
      </div>
      {students.length ?
      <ul className="po_people">
          {students.slice(0, 12).map((item) => {
          const exam = Number(item.exam_avg) || 0;
          const attend = Number(item.attendance) || 0;
          const tone = (value) => value >= 75 ? "is_good" : value > 0 ? "is_mid" : "is_low";
          return (
            <li key={item.student_id}>
                <b className="po_people_avatar">{initials(item.full_name)}</b>
                <div className="po_people_who">
                  <strong>{item.full_name}</strong>
                  <small>{course_label(item)}</small>
                </div>
                <div className="po_people_chips">
                  <em className={tone(attend)}>{ENGLISH.attend}{attend}%</em>
                  <em className={tone(exam)}>{ENGLISH.exam}{exam}%</em>
                </div>
              </li>);

        })}
        </ul> :

      <p className="po_empty">{loading ? ENGLISH.loading_students : ENGLISH.no_students_enrolled}</p>
      }
    </section>);

}
