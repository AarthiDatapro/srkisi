import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";
export function Performance_Today_Schedule({ schedule = [] }) {
  return (
    <section className="po_panel po_panel_today">
      <h2>{ENGLISH.today}</h2>
      {schedule.length ?
      <ul className="po_sched">
          {schedule.map((item, index) =>
        <li key={`${item.time}-${index}`}>
              <time>{item.time || "—"}</time>
              <span>{item.title}</span>
            </li>
        )}
        </ul> :

      <p className="po_empty">{ENGLISH.no_session_listed_for_today}</p>
      }
    </section>);

}
