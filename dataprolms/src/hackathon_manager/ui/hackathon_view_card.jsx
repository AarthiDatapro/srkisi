import { createPortal } from "react-dom";
import { TYPE_LABEL } from "../constants.js";
import { parse_types } from "../utils.js";
import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/hackathon_manager_constants_english.js";

function stamp_parts(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { day: ENGLISH.not_set, time: "" };
  return {
    day: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).toLowerCase()
  };
}

function item_label(item) {
  if (item.item_type === "mcq") return item.question_text || item.title || ENGLISH.untitled_question;
  return item.title || ENGLISH.untitled_question;
}

function rule_lines(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  const lines = text.split(/\n+/).map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  return text.split(/(?<=\.)\s+/).map((line) => line.trim()).filter(Boolean);
}

function View_Art() {
  return (
    <svg className="hkm_view_art" viewBox="0 0 140 110" aria-hidden="true">
      <ellipse cx="108" cy="92" rx="28" ry="8" fill="#c4b5fd" opacity="0.55" />
      <path d="M86 78c12-2 22 6 24 16H72c2-8 8-15 14-16Z" fill="#ddd6fe" />
      <rect x="78" y="58" width="44" height="30" rx="6" fill="#312e81" />
      <rect x="84" y="64" width="32" height="16" rx="2" fill="#a5b4fc" />
      <path d="M90 70h8M90 74h14" stroke="#312e81" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M108 46c8 7 11 16 11 24v8H86v-8c0-8 3-17 11-24Z" fill="#fbbf24" />
      <circle cx="97" cy="62" r="4.5" fill="#7c3aed" />
      <path d="m86 70-7 8 8-2M108 70l7 8-8-2" fill="#fde68a" />
      <path d="M92 78h10l-5 9Z" fill="#f59e0b" />
    </svg>
  );
}

export function Hackathon_View_Card({ open, item, certificates = [], loading, on_close }) {
  if (!open) return null;
  const types = parse_types(item?.hackathon_type);
  const certificate = certificates.find((row) => String(row.certificate_id) === String(item?.certificate_id));
  const place = item?.audience === "open" ? ENGLISH.open_hackathon_2 : item?.program_name || item?.cohort_name || ENGLISH.no_program;
  const items = item?.items || [];
  const start = stamp_parts(item?.starts_at);
  const end = stamp_parts(item?.ends_at);
  const rules = rule_lines(item?.rules);

  return createPortal(
    <div
      className="hkm_view_scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) on_close?.();
      }}>
      <div className="hkm_view_card" role="dialog" aria-modal="true" aria-labelledby="hkm_view_title">
        <header className="hkm_view_bar">
          <span className="hkm_view_bar_mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="m8 8-4 4 4 4M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <h2 id="hkm_view_title">{ENGLISH.hackathon_details}</h2>
          <button type="button" className="hkm_view_close" aria-label={ENGLISH.close} onClick={on_close}>×</button>
        </header>
        {loading && !item?.title ?
          <p className="hkm_note">{ENGLISH.opening_details}</p> :
          <div className="hkm_view_body">
            <section className="hkm_view_hero">
              <div className="hkm_view_copy">
                <em className={item?.status === "published" ? "is_live" : "is_draft"}>
                  {item?.status === "published" ? ENGLISH.published : ENGLISH.draft}
                </em>
                <h3>{item?.title}</h3>
                <p>{place}</p>
                <ul>
                  {(types.length ? types : ["mcq"]).map((id) =>
                    <li key={id} className={`is_${id}`}>{TYPE_LABEL[id] || ENGLISH.hackathon}</li>
                  )}
                </ul>
              </div>
              <View_Art />
            </section>
            <dl className="hkm_view_meta">
              <div>
                <dt>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                  {ENGLISH.starts}
                </dt>
                <dd>{start.day}{start.time ? `, ${start.time}` : ""}</dd>
              </div>
              <div>
                <dt>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 4v4M16 4v4M4 11h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                  {ENGLISH.ends}
                </dt>
                <dd>{end.day}{end.time ? `, ${end.time}` : ""}</dd>
              </div>
              <div>
                <dt>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.7" /><path d="M12 11v3M9 20h6M10 14h4v6h-4v-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                  {ENGLISH.certificate_template}
                </dt>
                <dd>{certificate?.certificate_name || ENGLISH.not_set}</dd>
              </div>
            </dl>
            <section className="hkm_view_block">
              <h4>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                {ENGLISH.description}
              </h4>
              <p className={item?.description ? "" : "is_empty"}>{item?.description || ENGLISH.no_description}</p>
            </section>
            <section className="hkm_view_block is_rules">
              <h4>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4h10l2 3v13H6V4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                {ENGLISH.rules}
              </h4>
              {rules.length ?
                <ul>{rules.map((line, index) => <li key={`${index}-${line.slice(0, 24)}`}>{line}</li>)}</ul> :
                <p className="is_empty">{ENGLISH.no_rules}</p>}
            </section>
            <section className="hkm_view_block">
              <h4>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 6h8M7 10h10M8 14h8M9 18h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                {ENGLISH.tasks}
                <small>{items.length}</small>
              </h4>
              {items.length ?
                <ul className="hkm_view_tasks">
                  {items.map((row) =>
                    <li key={row.item_id || row.title}>
                      <em className={`is_${row.item_type || "mcq"}`}>{TYPE_LABEL[row.item_type] || ENGLISH.hackathon}</em>
                      <span>{item_label(row)}</span>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </li>
                  )}
                </ul> :
                <p className="is_empty">{ENGLISH.no_tasks_yet}</p>}
            </section>
          </div>}
      </div>
    </div>,
    document.body
  );
}
