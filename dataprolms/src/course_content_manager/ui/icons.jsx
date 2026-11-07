import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";
function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>);

}

export function Code_Icon() {
  return (
    <Icon>
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}

export function Video_Icon() {
  return (
    <Icon>
      <rect x="3.5" y="6" width="17" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="m10 9.5 5 2.5-5 2.5V9.5Z" fill="currentColor" />
    </Icon>);

}

export function Pdf_Icon() {
  return (
    <Icon>
      <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 3.5V9h5.5" stroke="currentColor" strokeWidth="1.7" />
    </Icon>);

}

export function Notes_Icon() {
  return (
    <Icon>
      <path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v14l-3-1.8-3 1.8-3-1.8-3 1.8V6A1.5 1.5 0 0 1 6.5 4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 9h6M9 12.5h6M9 16h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Overview_Icon() {
  return (
    <Icon>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Settings_Icon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.2l1.6 1.6M17.6 16.2l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.8l1.6-1.6M17.6 7.8l1.6-1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Taught_Icon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.5 12.2 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}

export function Announcement_Icon() {
  return (
    <Icon>
      <path d="M5 10v4h2l5 3.5V6.5L7 10H5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M17 9.2a3.2 3.2 0 0 1 0 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Quiz_Icon() {
  return (
    <Icon>
      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Chevron_Icon({ down = false, up = false }) {
  return (
    <Icon>
      <path
        d={up ? "m7 14 5-5 5 5" : down ? "m7 10 5 5 5-5" : "m9 6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round" />
      
    </Icon>);

}

export function Close_Icon() {
  return (
    <Icon>
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Layers_Icon() {
  return (
    <Icon>
      <path d="M12 4 4.5 8 12 12l7.5-4L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m4.5 12 7.5 4 7.5-4M4.5 16l7.5 4 7.5-4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </Icon>);

}

export function Pencil_Icon() {
  return (
    <Icon>
      <path d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </Icon>);

}

export function Clock_Icon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Trash_Icon() {
  return (
    <Icon>
      <path d="M5 7h14M9 7V5h6v2M8 7l.8 12h6.4L16 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}

export function Plus_Icon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Grip_Icon() {
  return (
    <Icon>
      <path d="M9 7h.01M9 12h.01M9 17h.01M15 7h.01M15 12h.01M15 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </Icon>);

}

export function Reorder_Controls({ on_up, on_down, disable_up, disable_down }) {
  return (
    <div className="ccm_order">
      <button type="button" disabled={disable_up} onClick={on_up} aria-label={ENGLISH.move_up}>
        ▲
      </button>
      <button type="button" disabled={disable_down} onClick={on_down} aria-label={ENGLISH.move_down}>
        ▼
      </button>
    </div>);

}

export function Link_Icon() {
  return (
    <Icon>
      <path d="M10 13.5a4 4 0 0 0 5.7.4l2.2-2.2a4 4 0 0 0-5.7-5.6L11 7.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.4L6.1 12.3a4 4 0 0 0 5.7 5.6L13 16.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function Upload_Icon() {
  return (
    <Icon>
      <path d="M12 16V6M8.5 9.5 12 6l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 16.5V19h14v-2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}

export function File_Icon() {
  return (
    <Icon>
      <path d="M8 4.5h5.2L18 9.2V19a1.4 1.4 0 0 1-1.4 1.4H8A1.4 1.4 0 0 1 6.6 19V5.9A1.4 1.4 0 0 1 8 4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 4.6V9.2H18M9.2 12.6h5.2M9.2 15.6h3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}

export function Question_Icon() {
  return (
    <Icon>
      <path d="M7.2 16.2 5.4 19.4V8.6A3.2 3.2 0 0 1 8.6 5.4h6.8a3.2 3.2 0 0 1 3.2 3.2v3.6a3.2 3.2 0 0 1-3.2 3.2H7.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10.2 10a1.8 1.8 0 1 1 2.2 1.7c-.5.2-.8.6-.8 1.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="11.6" cy="14.4" r=".7" fill="currentColor" />
    </Icon>);

}

export function Cap_Icon() {
  return (
    <Icon>
      <path d="M3.2 10.2 12 6.4l8.8 3.8L12 14 3.2 10.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.2 12.2v3.2c1.4 1.3 3 2 4.8 2s3.4-.7 4.8-2v-3.2M20.8 10.2v4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}

export function People_Icon() {
  return (
    <Icon>
      <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15.4" cy="10" r="1.7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.6 17.4c.7-2.1 2.4-3.3 4.4-3.3s3.7 1.2 4.4 3.3M14.2 14.3c.7-.4 1.6-.6 2.4-.5 1.4.2 2.5 1.2 3 2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Icon>);

}

export function item_icon(type) {
  const key = String(type || "").toLowerCase();
  if (key.includes("video")) return <Video_Icon />;
  if (key.includes("overview")) return <Overview_Icon />;
  if (key.includes("announce")) return <Announcement_Icon />;
  if (key.includes("note")) return <Notes_Icon />;
  if (key.includes("quiz")) return <Quiz_Icon />;
  return <Pdf_Icon />;
}
