import { short_date } from "../utils.js";
import { Performance_Spark } from "./performance_spark.jsx";
import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";

export function Performance_Exam_Score({ exam_avg = 0, progress_series = [] }) {
  return (
    <section className="po_panel po_panel_score">
      <p>{ENGLISH.exam_average}</p>
      <strong>{exam_avg}%</strong>
      <small>{ENGLISH.across_all_quizzes_in_this_view}</small>
      {progress_series.length ? <Performance_Spark points={progress_series} /> : null}
      <div className="po_axis">
        <span>{short_date(progress_series?.[0]?.date)}</span>
        <span>{ENGLISH.today}</span>
      </div>
    </section>);

}
