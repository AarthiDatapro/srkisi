function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>);

}

export function Type_Glyph({ name = "" }) {
  const key = name.trim().toLowerCase();

  if (key.includes("boot")) {
    return (
      <Icon>
        <path d="M13 3 5.5 13h6L11 21l7.5-10h-6L13 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </Icon>);

  }
  if (key.includes("cert")) {
    return (
      <Icon>
        <circle cx="12" cy="10" r="5.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9.2 14.6 8 20l4-2 4 2-1.2-5.4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </Icon>);

  }
  if (key.includes("degree")) {
    return (
      <Icon>
        <path d="M3 10.5 12 6l9 4.5L12 15 3 10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M7 12.5v4.2c2 1.4 3.5 2 5 2s3-.6 5-2v-4.2" stroke="currentColor" strokeWidth="1.7" />
      </Icon>);

  }
  if (key.includes("diploma")) {
    return (
      <Icon>
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </Icon>);

  }
  if (key.includes("work") || key.includes("lab")) {
    return (
      <Icon>
        <path d="M8 8V6.8A1.8 1.8 0 0 1 9.8 5h4.4A1.8 1.8 0 0 1 16 6.8V8" stroke="currentColor" strokeWidth="1.7" />
        <rect x="4" y="8" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
      </Icon>);

  }
  if (key.includes("elect")) {
    return (
      <Icon>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 8v8M8.5 12h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </Icon>);

  }
  if (key.includes("core")) {
    return (
      <Icon>
        <path d="M12 4 19 8v8l-7 4-7-4V8l7-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 12 19 8M12 12v8M12 12 5 8" stroke="currentColor" strokeWidth="1.7" />
      </Icon>);

  }

  return (
    <Icon>
      <path d="M20 13.2 12.8 20.4a1.8 1.8 0 0 1-2.5 0L3.6 13.7A1.8 1.8 0 0 1 3 12.4V5.8A1.8 1.8 0 0 1 4.8 4h6.6c.5 0 .9.2 1.3.6L20 12c.7.7.7 1.8 0 2.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" />
    </Icon>);

}
