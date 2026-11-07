import { pretty_date } from "../utils.js";
import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";

export function Performance_Daily_Reports({ days = [] }) {
  return (
    <section className="po_panel po_panel_days">
      <h2>{ENGLISH.daily_reports}</h2>
      {days.length ?
      <ol className="po_days">
          {days.map((item) =>
        <li key={item.report_id}>
              <b>{item.day_no ? String(item.day_no).padStart(2, "0") : "—"}</b>
              <div>
                <strong>{item.topic || ENGLISH.untitled_session}</strong>
                <small>{pretty_date(item.date)} · {item.status}</small>
              </div>
            </li>
        )}
        </ol> :

      <p className="po_empty">{ENGLISH.no_daily_reports_yet}</p>
      }
    </section>);

}
