const MARKS = {
  students: <><circle cx="9" cy="8" r="3" /><path d="M4.2 18.2c.7-2.7 2.5-4.2 4.8-4.2s4.1 1.5 4.8 4.2" /><circle cx="16.6" cy="9" r="2.2" /><path d="M15.2 14.2c1.6.2 2.9 1.2 3.6 3" /></>,
  courses: <><path d="M5 6.5h11.2A2.3 2.3 0 0 1 18.5 8.8V19H7.2A2.2 2.2 0 0 1 5 16.8V6.5Z" /><path d="M5 6.5A2.2 2.2 0 0 1 7.2 4.3H18.5" /><path d="M8.2 10h6.2M8.2 13.2h4.2" /></>,
  programs: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.4" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" /></>,
  cohorts: <><circle cx="8" cy="9" r="2.4" /><circle cx="16" cy="9" r="2.4" /><circle cx="12" cy="15.2" r="2.4" /><path d="M10.2 10.4 11.2 13.2M13.8 10.4 12.8 13.2" /></>,
  employees: <><rect x="3.5" y="8" width="17" height="11" rx="2" /><path d="M8 8V6.5A2.5 2.5 0 0 1 10.5 4h3A2.5 2.5 0 0 1 16 6.5V8" /><path d="M3.5 13h17" /></>,
  jobs: <><path d="M8 7.5V6.2A2.2 2.2 0 0 1 10.2 4h3.6A2.2 2.2 0 0 1 16 6.2v1.3" /><rect x="4" y="7.5" width="16" height="12" rx="2" /><path d="M4 12.5h16" /><path d="M11 12.5v2h2v-2" /></>,
  interviews: <><rect x="8" y="3.5" width="8" height="11" rx="4" /><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" /><path d="M12 17v3.2M9 20.2h6" /></>,
  resume: <><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5H7Z" /><path d="M14 3.8V8h4" /><path d="M9 12.5h6M9 16h4" /></>,
  hackathons: <><path d="M6 20.5h12" /><path d="M8 20.5V10.2L12 4l4 6.2v10.3" /><path d="M12 4v16.5" /></>,
  performance: <><path d="M4 18.5h16" /><path d="M7 18.5v-5M12 18.5V8M17 18.5v-8" /><path d="M6.2 10.2 11.2 6.8 16.2 8.6" /></>,
  quiz: <><circle cx="12" cy="12" r="8" /><path d="m8.6 12.2 2.2 2.2 4.6-4.8" /></>,
  attendance: <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M4 9.5h16M8 3.8v3.4M16 3.8v3.4" /><path d="m9 14.2 1.8 1.8 3.6-3.8" /></>,
  analytics: <><path d="M12 4.2a7.8 7.8 0 1 0 7.8 7.8H12V4.2Z" /><path d="M14.2 4.6A7.8 7.8 0 0 1 19.4 9.8H14.2V4.6Z" /></>,
  chatbot: <><path d="M6 16.5 4.2 19.2V7.2A2.2 2.2 0 0 1 6.4 5h11.2A2.2 2.2 0 0 1 19.8 7.2v7.1a2.2 2.2 0 0 1-2.2 2.2H6Z" /><path d="M8.5 10h.1M12 10h.1M15.5 10h.1" /></>,
  dropdowns: <><path d="M5 7h14M5 12h14M5 17h8" /><path d="m16.2 15.2 1.8 1.8 1.8-1.8" /></>,
  api: <><path d="M8.2 8.2 5 12l3.2 3.8M15.8 8.2 19 12l-3.2 3.8" /><path d="m13.2 6-2.4 12" /></>,
  certificates: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5v5l3 1.8" /><path d="M8.4 15.6 12 12" /></>
};

export function Jump_Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {MARKS[name]}
      </g>
    </svg>
  );
}
