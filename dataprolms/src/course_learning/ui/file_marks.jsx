import { file_kind, file_kind_label } from "../utils.js";

export function File_Type_Mark({ name, href, kind: kind_prop }) {
  const kind = kind_prop || file_kind(name, href);
  return (
    <span className={`lrn_ftype is_${kind}`} aria-hidden="true" title={file_kind_label(kind)}>
      <File_Glyph kind={kind} />
    </span>
  );
}

function File_Glyph({ kind }) {
  if (kind === "quiz") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="currentColor" />
        <path
          d="M9.2 9.4c0-1.55 1.2-2.55 2.85-2.55 1.55 0 2.75.9 2.75 2.35 0 1.05-.55 1.7-1.55 2.25-.85.45-1.2.9-1.2 1.7"
          stroke="#fff"
          strokeWidth="1.85"
          strokeLinecap="round" />
        <circle cx="12" cy="16.6" r="1.15" fill="#fff" />
      </svg>
    );
  }
  if (kind === "help") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 7.4c0-1.6 1.3-2.9 2.9-2.9h8.2c1.6 0 2.9 1.3 2.9 2.9v6c0 1.6-1.3 2.9-2.9 2.9H10L6.2 19.4V16.3C5.5 15.7 5 14.6 5 13.4V7.4Z"
          fill="currentColor" />
        <path d="M8.4 9.4h7.2M8.4 12.6h4.8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "feedback") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3.4 13.9 9h5.9l-4.8 3.5 1.8 5.6L12 14.8 7.2 18.1 9 12.5 4.2 9h5.9L12 3.4Z"
          fill="currentColor" />
      </svg>
    );
  }
  if (kind === "resources") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4.5 7.2h6.2l1.4 1.6H19.5v9.5a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V7.2Z" fill="currentColor" />
        <path d="M7 11.2h10M7 14.2h7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "announcements") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4.2 9.6v4.8c0 .7.5 1.2 1.2 1.2H7l3.4 3.2V5.2L7 8.4H5.4c-.7 0-1.2.5-1.2 1.2Z"
          fill="currentColor" />
        <path
          d="M14 8.4c1 .8 1.6 1.9 1.6 3.2S15 14 14 14.8M16.4 6.6c1.7 1.3 2.7 3.1 2.7 5S18.1 15.3 16.4 16.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none" />
      </svg>
    );
  }
  if (kind === "overview") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4.5" y="4.5" width="15" height="15" rx="3" fill="currentColor" />
        <path d="M8 9.2h8M8 12h8M8 14.8h5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "doc") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="6.2" y="3.4" width="11.6" height="17.2" rx="2" fill="currentColor" />
        <path d="M9 8.2h6.2M9 11.6h6.2M9 15h4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "ppt") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3.2" y="5.5" width="17.6" height="13" rx="2" fill="currentColor" />
        <path d="M10.2 9.2 15.4 12l-5.2 2.8V9.2Z" fill="#fff" />
      </svg>
    );
  }
  if (kind === "xls") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
        <path d="M8 9h8M8 12h8M8 15h8M11 9v9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "pdf") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6.5 3.4h7.4L18.8 8.4V20.6H6.5V3.4Z" fill="currentColor" />
        <path d="M13.9 3.4v5h5" fill="#fff" opacity="0.28" />
        <path d="M9 12.2h6.5M9 15.2h4.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="10.2" cy="18.2" r="1.5" fill="#fff" />
      </svg>
    );
  }
  if (kind === "zip") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="6" y="3.6" width="12" height="16.8" rx="2" fill="currentColor" />
        <path d="M12 5.4v1.8M12 9v1.8M12 12.6v1.8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
        <rect x="10.3" y="15.4" width="3.4" height="2.2" rx="0.4" fill="#fff" />
      </svg>
    );
  }
  if (kind === "img") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5.2" width="16" height="13.6" rx="2.4" fill="currentColor" />
        <circle cx="9.1" cy="10" r="1.5" fill="#fff" />
        <path
          d="M6.4 16.4 10 12.8l2.2 2.1 2.4-2.8 4.6 4.3"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "vid") {
    return (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3.8" y="6" width="12.4" height="12" rx="2.2" fill="currentColor" />
        <path d="M16.8 9.2 20.2 7.4v9.2l-3.4-1.8V9.2Z" fill="currentColor" />
        <path d="M8.4 9.6 13 12l-4.6 2.4V9.6Z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7 3.6h7.1L19.2 8.8V20.4H7V3.6Z" fill="currentColor" />
      <path d="M14.1 3.6v5.2h5.1" fill="#fff" opacity="0.28" />
      <path d="M9.2 13.2h6.4M9.2 16.4h4.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
