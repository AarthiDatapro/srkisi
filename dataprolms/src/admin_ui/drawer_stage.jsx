import { ADMIN_UI_ENGLISH as ENGLISH } from "../constants/english/admin_ui_constants_english.js";
function Mark({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const MARKS = {
  module: (
    <Mark>
      <path d="M12 4 4.5 8 12 12l7.5-4L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m4.5 12 7.5 4 7.5-4M4.5 16l7.5 4 7.5-4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </Mark>
  ),
  lesson: (
    <Mark>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Mark>
  ),
  quiz: (
    <Mark>
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Mark>
  ),
  coding: (
    <Mark>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Mark>
  ),
  course: (
    <Mark>
      <path d="M4 7.5 12 4l8 3.5L12 11 4 7.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 9.5v4.2c0 .8 1.8 2.3 4 2.3s4-1.5 4-2.3V9.5" stroke="currentColor" strokeWidth="1.7" />
    </Mark>
  ),
  people: (
    <Mark>
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 19c.8-2.8 3-4.2 6-4.2s5.2 1.4 6 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Mark>
  ),
  job: (
    <Mark>
      <rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7M4 12h16" stroke="currentColor" strokeWidth="1.7" />
    </Mark>
  ),
  cohort: (
    <Mark>
      <circle cx="8" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.8 17.5c.6-2 2.2-3 4.2-3s3.6 1 4.2 3M11.8 17.5c.6-2 2.2-3 4.2-3s3.6 1 4.2 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Mark>
  ),
  program: (
    <Mark>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 9h8M8 12.5h8M8 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Mark>
  ),
  option: (
    <Mark>
      <path d="M6 7h12M6 12h12M6 17h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Mark>
  ),
  passkey: (
    <Mark>
      <circle cx="8.5" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11.5 12H20l-1.6 1.8 1.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Mark>
  )
};

function close_drawer() {
  const buttons = document.querySelectorAll(".ui-modal .ui-modal__close");
  buttons[buttons.length - 1]?.click();
}

export function Drawer_Close() {
  return (
    <button type="button" className="lms_stage_close" aria-label={ENGLISH.close} onClick={close_drawer}>
      ×
    </button>
  );
}

export function Drawer_Stage({ tone = "course", kicker, hint }) {
  return (
    <section className={`lms_stage is_${tone}`}>
      <span>{MARKS[tone] || MARKS.course}</span>
      <div>
        <strong>{kicker}</strong>
        {hint ? <p>{hint}</p> : null}
      </div>
      <Drawer_Close />
    </section>
  );
}
