import { createPortal } from "react-dom";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../../constants/english/student_mock_interview_constants_english.js";
import "../theme/interview.css";

export function Interview_Switch_Modal({ open, busy = false, error = "", on_continue, on_restart, on_close }) {
  if (!open) return null;

  return createPortal(
    <div
      className="smi_switch_scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smi_switch_title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) on_close?.();
      }}>
      <div className="smi_switch_card">
        <span className="smi_switch_mark" aria-hidden="true">
          <i />
          <i />
        </span>
        <header className="smi_switch_head">
          <h2 id="smi_switch_title">{ENGLISH.interview_already_open}</h2>
          <button type="button" className="smi_switch_close" aria-label={ENGLISH.close} disabled={busy} onClick={on_close}>
            ×
          </button>
        </header>
        <p>{ENGLISH.an_interview_is_still_open_end_it_and_start}</p>
        {error ? <p className="smi_switch_error">{error}</p> : null}
        <div className="smi_switch_actions">
          <button type="button" className="smi_switch_continue" disabled={busy} onClick={on_continue}>
            {ENGLISH.continue_current_interview}
          </button>
          <button type="button" className="smi_switch_restart" disabled={busy} onClick={on_restart}>
            {busy ? ENGLISH.ending_interview : ENGLISH.end_and_start_new}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
