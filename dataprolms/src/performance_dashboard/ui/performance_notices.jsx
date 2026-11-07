import { pretty_date } from "../utils.js";
import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";

export function Performance_Notices({ notices = [] }) {
  return (
    <section className="po_panel po_panel_notes">
      <h2>{ENGLISH.notices}</h2>
      {notices.length ?
      <ul className="po_notes">
          {notices.map((item) =>
        <li key={item.id}>
              <strong>{item.title}</strong>
              <small>{item.date ? pretty_date(item.date) : item.course_name}</small>
            </li>
        )}
        </ul> :

      <p className="po_empty">{ENGLISH.no_announcements}</p>
      }
    </section>);

}
