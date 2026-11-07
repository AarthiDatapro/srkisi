import { Link_Text } from "../../design_system/link_text.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";
import { live_items } from "../../constants/live_text.js";


const SECTION_LABELS = live_items([() => ENGLISH.problem_statement, () => ENGLISH.examples, () => ENGLISH.constraints, () => ENGLISH.function_signature, () => ENGLISH.test_cases, () => ENGLISH.difficulty]);

function format_case_value(value) {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function format_inputs(inputs) {
  if (!Array.isArray(inputs)) return format_case_value(inputs);
  if (inputs.length === 1) return format_case_value(inputs[0]);
  return inputs.map((item) => format_case_value(item)).join(", ");
}

function pretty(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function clean_markup(value) {
  return String(value || "").
    replace(/\$/g, "").
    replace(/\\le\b/g, "≤").
    replace(/\\ge\b/g, "≥").
    replace(/\\neq\b/g, "≠").
    replace(/\\times\b/g, "×").
    replace(/\\text\{([^}]*)\}/g, "$1").
    replace(/\\[a-zA-Z]+/g, "").
    replace(/\*\*([^*]+)\*\*/g, "$1").
    replace(/\s+/g, " ").
    trim();
}

function rich_text(value) {
  const text = clean_markup(value);
  if (!text) return null;
  return text.split(/`([^`]+)`/g).map((part, index) =>
    index % 2 ? <code key={index}>{part}</code> : <Link_Text key={index} text={part} />
  );
}

function slice_between(text, start_label, end_label) {
  const start = new RegExp(`${start_label}\\s*:`, "i").exec(text);
  if (!start) return "";
  const from = start.index + start[0].length;
  if (!end_label) return text.slice(from).trim();
  const end = new RegExp(`${end_label}\\s*:`, "i").exec(text.slice(from));
  return (end ? text.slice(from, from + end.index) : text.slice(from)).trim();
}

function read_sections(description) {
  const raw = String(description || "").trim();
  if (!raw) return {};
  const markdown_parts = raw.split(/###\s+/).map((part) => part.trim()).filter(Boolean);
  if (markdown_parts.length > 1) {
    const sections = {};
    markdown_parts.forEach((part) => {
      const match = new RegExp(`^(${SECTION_LABELS.join("|")})\\b[:\\s]*`, "i").exec(part);
      if (!match) return;
      const key = match[1].toLowerCase().replace(/\s+/g, "_");
      sections[key] = part.slice(match[0].length).trim();
    });
    if (Object.keys(sections).length) return sections;
  }

  const text = raw.replace(/\s+/g, " ").trim();
  const matcher = new RegExp(`(${SECTION_LABELS.join("|")})\\s*:`, "gi");
  const hits = [];
  let match = matcher.exec(text);
  while (match) {
    hits.push({
      key: match[1].toLowerCase().replace(/\s+/g, "_"),
      index: match.index,
      end: matcher.lastIndex
    });
    match = matcher.exec(text);
  }
  if (!hits.length) return { body: text };
  const sections = {};
  hits.forEach((hit, index) => {
    const next = hits[index + 1];
    sections[hit.key] = text.slice(hit.end, next ? next.index : text.length).trim();
  });
  return sections;
}

function read_examples(text) {
  return clean_markup(text).
    split(/Example\s+\d+\s*:/i).
    map((part) => part.trim()).
    filter(Boolean).
    map((part) => ({
      input: slice_between(part, ENGLISH.input, ENGLISH.output).replace(/`/g, ""),
      output: slice_between(part, ENGLISH.output, ENGLISH.explanation).replace(/`/g, ""),
      explanation: slice_between(part, ENGLISH.explanation)
    })).
    filter((item) => item.input || item.output || item.explanation);
}

function read_constraints(text) {
  return clean_markup(text).
    split(/\s+-\s+(?=\S)/).
    map((line) => line.replace(/^[-•]\s*/, "").replace(/`/g, "").trim()).
    filter(Boolean);
}

export function Coding_Exercise({ exercise, look = "card", number }) {
  const sections = read_sections(exercise.description);
  const problem = sections.problem_statement || sections.body || "";
  const examples = read_examples(sections.examples);
  const constraints = read_constraints(sections.constraints);
  const signature = clean_markup(sections.function_signature).replace(/`/g, "");
  const difficulty = String(sections.difficulty || "").match(/easy|medium|hard/i)?.[0] || "";
  const cases = exercise.test_cases || [];
  const line = look === "line";
  const shown = number ?? exercise.exercise_number;

  return (
    <article className={line ? "ccm_code_card is_line" : "ccm_code_card"}>
      <details>
        <summary>
          <span className={line ? "ccm_editor_gutter" : "ccm_code_num"}>
            {line ? String(shown || 1).padStart(2, "0") : shown}
          </span>
          <div>
            {line ?
              <strong>
                <span className="ccm_editor_fn">{exercise.function_name}</span>
                <span className="ccm_editor_paren">()</span>
              </strong> :
              <strong>{exercise.function_name}</strong>}
          </div>
          <div className="ccm_code_card_tags">
            {!line && exercise.language ? <em>{exercise.language}</em> : null}
            {difficulty ?
              <em className={`ccm_code_level is_${difficulty.toLowerCase()}`}>{pretty(difficulty)}</em> :
              null}
          </div>
          <i className="ccm_code_chevron" aria-hidden="true" />
        </summary>

        <div className="ccm_code_body">
          {problem ?
            <p className="ccm_code_problem">{rich_text(problem)}</p> :
            null}

          {signature ?
            <div className="ccm_code_sign">
              <span>{ENGLISH.label_function}</span>
              <code>{signature}</code>
            </div> :
            null}

          {examples.length ?
            <section className="ccm_code_block">
              <h4>{ENGLISH.examples}</h4>
              <div className="ccm_code_examples">
                {examples.map((example, index) =>
                  <article key={`${example.input}-${index}`}>
                    <span>{ENGLISH.example}{index + 1}</span>
                    {example.input ? <p><b>{ENGLISH.input}</b><code>{example.input}</code></p> : null}
                    {example.output ? <p><b>{ENGLISH.output}</b><code>{example.output}</code></p> : null}
                    {example.explanation ? <small><Link_Text text={example.explanation} /></small> : null}
                  </article>
                )}
              </div>
            </section> :
            null}

          {constraints.length ?
            <section className="ccm_code_block">
              <h4>{ENGLISH.constraints}</h4>
              <ul>
                {constraints.map((line) => <li key={line}><Link_Text text={line} /></li>)}
              </ul>
            </section> :
            null}

          {exercise.reference_code ?
            <details className="ccm_code_solution">
              <summary>{ENGLISH.reference_solution}</summary>
              <pre>{exercise.reference_code}</pre>
            </details> :
            null}

          {cases.length ?
            <section className="ccm_code_block">
              <h4>{ENGLISH.test_cases_2}</h4>
              <div className="ccm_code_table">
                <div className="ccm_code_table_head">
                  <span>{ENGLISH.input}</span>
                  <span>{ENGLISH.expected}</span>
                </div>
                {cases.map((test_case, index) =>
                  <div key={test_case.test_case_id || test_case.test_case || index}>
                    <code>{format_inputs(test_case.inputs)}</code>
                    <code className={test_case.error ? "is_error" : ""}>
                      {test_case.error ? test_case.error : format_case_value(test_case.output)}
                    </code>
                  </div>
                )}
              </div>
            </section> :
            null}
        </div>
      </details>
    </article>
  );
}
