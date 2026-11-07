import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../../constants/english/student_mock_interview_constants_english.js";
import "../theme/mock_hub.css";

export function Fresher_Quiz_Board({ item, on_back, on_continue }) {
  const total = Number(item?.total_questions) || 0;
  const answered = Number(item?.answered) || 0;
  const pending = Math.max(0, total - answered);

  return (
    <section className="smi_board_wrap">
      <header className="smi_board_head">
        <button type="button" className="smi_board_back" onClick={on_back}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {ENGLISH.back_to_list}
        </button>
        <h1>
          {item.target_role || item.job_title || ENGLISH.fresher_quiz_round}
          {item.company_name ? <small>{item.company_name}</small> : null}
        </h1>
        <span className="smi_board_count">{ENGLISH.answered_of(answered, total)}</span>
      </header>

      <div className="smi_pending_banner">
        <div>
          <b>{ENGLISH.pending_quiz}</b>
          <p>{ENGLISH.pending_quiz_copy(pending || total || 0)}</p>
        </div>
        <button type="button" className="smi_q_start" onClick={() => on_continue?.(item)}>
          {ENGLISH.continue_quiz} →
        </button>
      </div>
    </section>
  );
}
