import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";
export function Performance_Feedback({ feedback = { average: 0, stars: [0, 0, 0, 0, 0] } }) {
  const star_max = Math.max(...(feedback.stars || [0]), 1);

  return (
    <section className="po_panel po_panel_feedback">
      <div className="po_panel_bar">
        <h2>{ENGLISH.feedback}</h2>
        <b className="po_avg">{feedback.average || 0}</b>
      </div>
      <ul className="po_stars">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = feedback.stars?.[star - 1] || 0;
          return (
            <li key={star}>
              <span>{star}★</span>
              <i><u style={{ width: `${count / star_max * 100}%` }} /></i>
              <b>{count}</b>
            </li>);

        })}
      </ul>
    </section>);

}
