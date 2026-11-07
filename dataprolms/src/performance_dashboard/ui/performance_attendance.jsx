import { short_date, week_day } from "../utils.js";
import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";

export function Performance_Attendance({
  attendance_week = [],
  attendance_summary,
  attend_max = 1
}) {
  return (
    <section className="po_panel po_panel_attend">
      <h2>{ENGLISH.attendance}</h2>
      <div className="po_heat">
        {attendance_week.map((item) => {
          const present = Number(item.present) || 0;
          const level = present === 0 ? 0 : Math.min(4, Math.ceil(present / attend_max * 4));
          return (
            <div key={item.date} className={`lv-${level}`} title={ENGLISH.present(short_date(item.date), present)}>
              <b>{present}</b>
              <small>{week_day(item.date)}</small>
            </div>);

        })}
      </div>
      <div className="po_mini">
        <span><b>{attendance_summary?.average || 0}%</b>{ENGLISH.avg}</span>
        <span><b>{attendance_summary?.present_today || 0}</b>{ENGLISH.label_in}</span>
        <span><b>{attendance_summary?.absent_today || 0}</b>{ENGLISH.out}</span>
      </div>
    </section>);

}
