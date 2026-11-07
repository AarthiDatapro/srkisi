import { pretty_date } from "../utils.js";
import { PERFORMANCE_DASHBOARD_ENGLISH as ENGLISH } from "../../constants/english/performance_dashboard_constants_english.js";

export function Performance_Header({ program, cohort }) {
  return (
    <div className="po_head_title">
      <span className={program?.is_active ? "is_on" : "is_off"} />
      <div>
        <p>{ENGLISH.program_performance}</p>
        <h1>{program?.program_name || ENGLISH.performance}</h1>
        <small>
          {[
          cohort?.cohort_name,
          program?.program_type,
          program?.duration_months ? ENGLISH.months(program.duration_months) : null,
          program?.created_at ? ENGLISH.started(pretty_date(program.created_at)) : null].

          filter(Boolean).
          join("  ·  ")}
        </small>
      </div>
    </div>);

}
