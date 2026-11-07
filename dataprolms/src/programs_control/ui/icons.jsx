function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>);

}

export function Download_Icon() {
  return (
    <Icon>
      <path d="M12 5v10M8 11l4 4 4-4M6 19h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}

export function Students_Icon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 17c.4-2.3 2-3.5 4.2-3.5s3.8 1.2 4.2 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="8.5" r="1.7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.2 13.4c1.3.3 2.4 1.1 2.8 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Icon>);

}

export function Plus_Icon() {
  return (
    <Icon>
      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>);

}

export function Chevron_Icon({ dir = "left" }) {
  const points = dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6";
  return (
    <Icon>
      <path d={points} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>);

}
