import { Link_Text } from "../../design_system/link_text.jsx";
import "../theme/job_brief.css";
import { JOBS_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/jobs_manager_constants_english.js";

function is_heading(line) {
  const text = line.trim();
  if (!text || text.length > 72) return false;
  if (/^[•\-*]/.test(text)) return false;
  if (/^https?:/i.test(text)) return false;
  return /:\s*$/.test(text) && text.split(/\s+/).length <= 8;
}

function bullet_of(line) {
  const match = String(line || "").match(/^[•\-*]\s+(.+)$/);
  return match ? match[1].trim() : "";
}

function fact_of(line) {
  const match = String(line || "").match(/^([^:]{2,42}):\s+(\S.*)$/);
  if (!match) return null;
  const label = match[1].trim();
  if (/^https?$/i.test(label)) return null;
  return { label, value: match[2].trim() };
}

function blocks_of(body) {
  const lines = String(body || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const blocks = [];
  let paragraph = [];
  let list = [];
  let facts = [];

  function flush() {
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
    if (list.length) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
    if (facts.length) {
      blocks.push({ type: "facts", items: facts });
      facts = [];
    }
  }

  for (const line of lines) {
    const bullet = bullet_of(line);
    const source = bullet || line;
    const fact = fact_of(source);
    if (bullet && fact) {
      if (paragraph.length || list.length) flush();
      facts.push(fact);
      continue;
    }
    if (bullet) {
      if (/^[^:]{2,40}:\s*$/.test(source)) continue;
      if (paragraph.length || facts.length) flush();
      list.push(source);
      continue;
    }
    if (fact && !paragraph.length) {
      if (list.length) flush();
      facts.push(fact);
      continue;
    }
    if (list.length || facts.length) flush();
    paragraph.push(line);
  }
  flush();
  return blocks;
}

export function parse_job_copy(raw) {
  const sections = [];
  let current = { title: "", lines: [] };

  function push() {
    const body = current.lines.join("\n").trim();
    if (!current.title && !body) return;
    sections.push({ title: current.title, blocks: blocks_of(body) });
  }

  for (const raw_line of String(raw || "").replace(/\r/g, "").split("\n")) {
    const line = raw_line.trim();
    if (!line) {
      if (current.lines.length && current.lines[current.lines.length - 1] !== "") current.lines.push("");
      continue;
    }
    if (is_heading(line)) {
      push();
      current = { title: line.replace(/:\s*$/, ""), lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  push();
  return sections;
}

function site_of(value) {
  const text = String(value || "").trim();
  if (!/^(https?:\/\/|www\.)/i.test(text)) return null;
  try {
    const href = /^www\./i.test(text) ? `https://${text}` : text;
    const host = new URL(href).hostname.replace(/^www\./, "");
    return { href, host };
  } catch {
    return null;
  }
}

function Fact_Value({ value }) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return <a href={`mailto:${value}`}>{value}</a>;
  }
  const site = site_of(value);
  if (site) {
    return <a className="jbr_slug" href={site.href} target="_blank" rel="noreferrer">{site.host}</a>;
  }
  return <Link_Text text={value} />;
}

export function Job_Brief({ text }) {
  const sections = parse_job_copy(text);
  if (!sections.length) return <p className="jbr_empty">{ENGLISH.no_description_yet}</p>;

  return (
    <div className="jbr">
      {sections.map((section, index) =>
        <section key={`${section.title}-${index}`} className="jbr_section">
          {section.title ? <h3>{section.title}</h3> : null}
          {section.blocks.map((block, block_index) => {
            if (block.type === "list") {
              return (
                <ul key={block_index} className="jbr_list">
                  {block.items.map((item, item_index) => <li key={item_index}><Link_Text text={item} /></li>)}
                </ul>
              );
            }
            if (block.type === "facts") {
              return (
                <dl key={block_index} className="jbr_facts">
                  {block.items.map((item, item_index) =>
                    <div key={item_index}>
                      <dt>{item.label}</dt>
                      <dd><Fact_Value value={item.value} /></dd>
                    </div>
                  )}
                </dl>
              );
            }
            return <p key={block_index}><Link_Text text={block.text} /></p>;
          })}
        </section>
      )}
    </div>
  );
}
