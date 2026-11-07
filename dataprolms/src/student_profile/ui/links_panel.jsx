import { COPY, empty_link } from "../constants.js";
import { Close_Small_Icon } from "./icons.jsx";

function link_host(url) {
  try {
    return new URL(url).host.replace(/^www\./i, "");
  } catch {
    return String(url || "").replace(/^https?:\/\//i, "").split("/")[0] || url;
  }
}

function External_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 5h5v5M19 5l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Links_Editor({ links = [], on_change }) {
  function update_row(index, key, value) {
    on_change(links.map((item, item_index) => (item_index === index ? { ...item, [key]: value } : item)));
  }

  function add_row() {
    on_change([...links, empty_link()]);
  }

  function remove_row(index) {
    on_change(links.filter((_, item_index) => item_index !== index));
  }

  return (
    <div className="stp_links_edit">
      <p className="stp_links_hint">{COPY.linksHint}</p>
      {links.length ? (
        <ul className="stp_links_rows">
          {links.map((item, index) => (
            <li key={item.link_id || `new_${index}`} className="stp_links_row">
              <input
                type="text"
                className="stp_flat_input"
                value={item.link_title || ""}
                placeholder={COPY.linkTitlePlaceholder}
                aria-label={COPY.linkTitle}
                maxLength={100}
                onChange={(event) => update_row(index, "link_title", event.target.value)}
              />
              <input
                type="url"
                className="stp_flat_input"
                value={item.link_url || ""}
                placeholder={COPY.linkUrlPlaceholder}
                aria-label={COPY.linkUrl}
                maxLength={500}
                onChange={(event) => update_row(index, "link_url", event.target.value)}
              />
              <button
                type="button"
                className="stp_icon_btn"
                aria-label={COPY.removeLink}
                title={COPY.removeLink}
                onClick={() => remove_row(index)}>
                <Close_Small_Icon />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="stp_text_add" onClick={add_row}>
        + {COPY.addLink}
      </button>
    </div>
  );
}

export function Links_View({ links = [] }) {
  if (!links.length) {
    return (
      <div className="stp_links_empty_box">
        <p>{COPY.linksEmpty}</p>
        <small>{COPY.linksHint}</small>
      </div>
    );
  }

  return (
    <ul className="stp_links_list">
      {links.map((item, index) => (
        <li key={item.link_id || `${item.link_title}_${item.link_url}`}>
          <a
            className={`stp_links_item is_tone_${(index % 4) + 1}`}
            href={item.link_url}
            target="_blank"
            rel="noopener noreferrer">
            <strong className="stp_links_title">{item.link_title}</strong>
            <span className="stp_links_url">{link_host(item.link_url)}</span>
            <span className="stp_links_go" aria-hidden="true">
              <External_Icon />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
