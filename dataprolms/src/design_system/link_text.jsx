const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)/gi;

function split_url(raw) {
  let url = raw;
  let trail = "";
  while (/[),.!?:;]$/.test(url)) {
    trail = url.slice(-1) + trail;
    url = url.slice(0, -1);
  }
  const href = /^www\./i.test(url) ? `https://${url}` : url;
  return { href, label: url, trail };
}

export function Link_Text({ text, children }) {
  const value = String(text ?? children ?? "");
  if (!value) return null;
  const parts = value.split(URL_PATTERN);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^(?:https?:\/\/|www\.)/i.test(part)) {
      const link = split_url(part);
      return (
        <span key={index}>
          <a
            className="link_text"
            href={link.href}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}>
            {link.label}
          </a>
          {link.trail}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
