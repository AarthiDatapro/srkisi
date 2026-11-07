import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";
export function Performance_Kpis({ kpis = {}, exam_avg = 0 }) {
  return (
    <div className="po_rail">
      <article className="is_blue">
        <b>{kpis.students || 0}</b>
        <span>{ENGLISH.students_2}</span>
      </article>
      <article className="is_navy">
        <b>{exam_avg}%</b>
        <span>{ENGLISH.exam_average}</span>
      </article>
      <article className="is_violet">
        <b>{kpis.progress || 0}%</b>
        <span>{ENGLISH.progress_2}</span>
      </article>
      <article className="is_green">
        <b>{kpis.present_today || 0}</b>
        <span>{ENGLISH.present_today}</span>
      </article>
      <article className="is_rose">
        <b>{kpis.absent_today || 0}</b>
        <span>{ENGLISH.absent_today}</span>
      </article>
      <article className="is_amber">
        <b>{kpis.courses || 0}</b>
        <span>{ENGLISH.courses}</span>
      </article>
    </div>);

}
