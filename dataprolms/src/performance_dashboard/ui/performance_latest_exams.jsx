import { pretty_date } from "../utils.js";
import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";

export function Performance_Latest_Exams({ exams = [] }) {
  return (
    <section className="po_panel po_panel_exams">
      <h2>{ENGLISH.latest_exams}</h2>
      {exams.length ?
      <ul className="po_exams">
          {exams.slice(0, 6).map((item) =>
        <li key={item.quiz_id}>
              <div>
                <strong>{item.title}</strong>
                <small>{item.date ? pretty_date(item.date) : item.course_name}</small>
              </div>
              <div className="po_exams_meter">
                <i><u style={{ width: `${Math.min(100, Number(item.average) || 0)}%` }} /></i>
                <b>{item.average}%</b>
              </div>
            </li>
        )}
        </ul> :

      <p className="po_empty">{ENGLISH.no_exams_yet}</p>
      }
    </section>);

}
