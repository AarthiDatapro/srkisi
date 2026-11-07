import { useEffect, useMemo, useRef, useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import { useToast } from "@datapromr/toast";
import robot_src from "../../assets/mock_interview_robot.svg";
import { run_learn_code, submit_learn_code } from "../api.js";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../../constants/english/course_learning_constants_english.js";
import { live_items } from "../../constants/live_text.js";


const SECTION_LABELS = live_items([() => ENGLISH.problem_statement, () => ENGLISH.examples, () => ENGLISH.constraints, () => ENGLISH.function_signature, () => ENGLISH.test_cases, () => ENGLISH.difficulty]);

function clean_markup(value) {
  return String(value || "").
    replace(/\$/g, "").
    replace(/\\le\b/g, "≤").
    replace(/\\ge\b/g, "≥").
    replace(/\\times\b/g, "×").
    replace(/\\text\{([^}]*)\}/g, "$1").
    replace(/\\[a-zA-Z]+/g, "").
    replace(/\*\*([^*]+)\*\*/g, "$1").
    replace(/\s+/g, " ").
    trim();
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
      sections[match[1].toLowerCase().replace(/\s+/g, "_")] = part.slice(match[0].length).trim();
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
      input: slice_between(part, ENGLISH.input, ENGLISH.output).replace(/`/g, "").trim(),
      output: slice_between(part, ENGLISH.output, ENGLISH.explanation).replace(/`/g, "").trim(),
      explanation: slice_between(part, ENGLISH.explanation).replace(/`/g, "").trim()
    })).
    filter((item) => item.input || item.output || item.explanation);
}

function read_constraints(text) {
  return clean_markup(text).
    split(/\s+-\s+(?=\S)/).
    map((line) => line.replace(/^[-•]\s*/, "").replace(/`/g, "").trim()).
    filter(Boolean);
}

function show_value(value) {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function show_inputs(inputs) {
  if (!Array.isArray(inputs)) return show_value(inputs);
  if (inputs.length === 1) return show_value(inputs[0]);
  return inputs.map(show_value).join(", ");
}

function language_label(language) {
  const name = String(language || "").toLowerCase();
  if (name.startsWith("python")) return ENGLISH.python_3;
  if (name === "node" || name.includes("javascript")) return "Node.js";
  return language || ENGLISH.code;
}

function difficulty_of(description) {
  return String(description || "").match(/Difficulty:\s*(Easy|Medium|Hard)/i)?.[1] || ENGLISH.easy;
}

function Play_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

function Send_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h12M13 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Code_Mark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function program_name(exercise) {
  const name = String(exercise.function_name || "").replace(/_/g, " ").trim();
  if (!name) return ENGLISH.program;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function Coding_Desk({ course_id, registration_id, exercise, case_examples = false, on_run, on_submit, on_score }) {
  const toast = useToast();
  const sections = useMemo(() => read_sections(exercise.description), [exercise.description]);
  const problem = clean_markup(sections.problem_statement || sections.body || "");
  const written_examples = read_examples(sections.examples);
  const examples = written_examples.length || !case_examples ?
    written_examples :
    (exercise.test_cases || []).slice(0, 3).map((item) => ({
      input: show_inputs(item.inputs),
      output: show_value(item.output),
      explanation: ""
    }));
  const constraints = read_constraints(sections.constraints);
  const difficulty = difficulty_of(exercise.description);
  const cases = exercise.test_cases || [];
  const [bench, set_bench] = useState("cases");
  const [code, set_code] = useState(exercise.submission?.student_code || exercise.template || "");
  const [busy, set_busy] = useState("");
  const [grade, set_grade] = useState(exercise.submission || null);
  const [coach, set_coach] = useState("");
  const [coach_tick, set_coach_tick] = useState(0);
  const hint_ref = useRef(null);
  const coach_lines = coach.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const hint_lines = coach_lines.length ?
    coach_lines :
    examples.map((example) => example.explanation).filter(Boolean);
  const lines = code.split("\n");
  const passed = grade?.passed || 0;
  const total = grade?.total || cases.length;

  useEffect(() => {
    if (!coach_tick || !hint_ref.current) return;
    const node = hint_ref.current;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [coach_tick]);

  function result_for(test_case) {
    return (grade?.results || []).find((item) => Number(item.test_case) === Number(test_case));
  }

  async function run(save) {
    set_busy(save ? "submit" : "run");
    try {
      const payload = save ?
        await (on_submit ? on_submit(code) : submit_learn_code(course_id, exercise.exercise_id, code, registration_id)) :
        await (on_run ? on_run(code) : run_learn_code(course_id, exercise.exercise_id, code, registration_id));
      set_grade(payload);
      set_bench("results");
      if (!save) {
        if (payload.help) {
          set_coach(payload.help);
          set_coach_tick((tick) => tick + 1);
        } else {
          set_coach("");
        }
      }
      if (save) {
        toast.success(ENGLISH.code_submitted);
        on_score?.(payload.score);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  return (
    <div className="lrn_code">
      <article className="lrn_code_brief">
        <header>
          <span><Code_Mark /></span>
          <h4>{program_name(exercise)}</h4>
          <em className={`is_${difficulty.toLowerCase()}`}>{difficulty}</em>
        </header>
        <div className="lrn_code_read">
          {problem ? <p><Link_Text text={problem.replace(/`/g, "")} /></p> : null}
          {examples.map((example, sample_index) =>
            <article key={`${example.input}-${sample_index}`} className="lrn_case">
              <header>
                <i>{String(sample_index + 1).padStart(2, "0")}</i>
                <b>{ENGLISH.example}</b>
              </header>
              <div className="lrn_case_flow">
                <code>{example.input}</code>
                <span aria-hidden="true">→</span>
                <strong>{example.output}</strong>
              </div>
            </article>
          )}
          {constraints.length ?
            <div className="lrn_limits">
              <b>{ENGLISH.constraints}</b>
              <ul>
                {constraints.map((line) => <li key={line}><Link_Text text={line} /></li>)}
              </ul>
            </div> :
            null}
          {hint_lines.length ?
            <div
              ref={hint_ref}
              key={coach_tick || "hints"}
              className={coach ? "lrn_hints is_focus" : "lrn_hints"}>
              <b>{coach ? ENGLISH.look_here : ENGLISH.hints}</b>
              <p><Link_Text text={hint_lines.join(" ")} /></p>
            </div> :
            null}
        </div>
      </article>

      <article className="lrn_code_desk">
        <header>
          <b><Code_Mark />{ENGLISH.code_editor}</b>
          <span>{language_label(exercise.language)}</span>
          <button type="button" disabled={Boolean(busy)} onClick={() => run(false)}>
            <Play_Icon />
            {busy === "run" ? ENGLISH.running : ENGLISH.run_code}
          </button>
          <button type="button" className="is_submit" disabled={Boolean(busy)} onClick={() => run(true)}>
            <Send_Icon />
            {busy === "submit" ? ENGLISH.submitting : ENGLISH.submit}
          </button>
        </header>
        <div className="lrn_code_editor">
          <ol>
            {lines.map((_, line_index) => <li key={line_index}>{line_index + 1}</li>)}
          </ol>
          <textarea
            value={code}
            spellCheck={false}
            aria-label={ENGLISH.code_editor_2}
            onChange={(event) => set_code(event.target.value)} />
        </div>
        <div className="lrn_code_bench">
          <div className="lrn_code_tabs">
            {["cases", "output", "results"].map((id) =>
              <button
                key={id}
                type="button"
                className={bench === id ? "is_on" : undefined}
                onClick={() => set_bench(id)}>
                {id === "cases" ? ENGLISH.test_cases : id === "output" ? ENGLISH.output : ENGLISH.results}
              </button>
            )}
            <em>{passed}/{total} <span>{ENGLISH.test_cases_passed}</span></em>
          </div>
          {bench === "cases" ?
            <ul>
              {cases.map((item) =>
                <li key={item.test_case}>
                  <b>{ENGLISH.test_case}{item.test_case}</b>
                  <span>{show_inputs(item.inputs)}</span>
                  <small>{ENGLISH.expected_output}</small>
                  <strong>{show_value(item.output)}</strong>
                </li>
              )}
            </ul> :
            null}
          {bench === "output" ?
            <ul>
              {cases.map((item) => {
                const result = result_for(item.test_case);
                const state = !result ? "wait" : result.passed ? "pass" : "fail";
                return (
                  <li key={item.test_case} className={`is_${state}`}>
                    <b>{ENGLISH.test_case}{item.test_case}</b>
                    <span>{result ? result.error || (result.passed ? ENGLISH.accepted : ENGLISH.wrong_answer) : ENGLISH.not_run}</span>
                    <i>{state === "pass" ? ENGLISH.passed : state === "fail" ? ENGLISH.failed : ENGLISH.not_run}</i>
                  </li>
                );
              })}
            </ul> :
            null}
          {bench === "results" ?
            <ul className="is_results">
              {cases.map((item) => {
                const result = result_for(item.test_case);
                const state = !result ? "wait" : result.passed ? "pass" : "fail";
                return (
                  <li key={item.test_case} className={`is_${state}`}>
                    <b>{ENGLISH.test_case}{item.test_case}</b>
                    <span>{show_inputs(item.inputs)}</span>
                    <small>{ENGLISH.expected_output}</small>
                    <strong>{show_value(item.output)}</strong>
                    <i>{state === "pass" ? ENGLISH.passed : state === "fail" ? ENGLISH.failed : ENGLISH.not_run}</i>
                  </li>
                );
              })}
            </ul> :
            null}
        </div>
        <img className="lrn_code_robot" src={robot_src} alt="" />
      </article>
    </div>
  );
}

export function Coding_Workspace({ course_id, registration_id = null, sets = [] }) {
  const exercises = sets.flatMap((set) => set.exercises || []);
  const [picked, set_picked] = useState(exercises[0]?.exercise_id || null);
  const exercise = exercises.find((item) => item.exercise_id === picked) || exercises[0];
  if (!exercise) return null;

  return (
    <div className="lrn_code_wrap">
      {exercises.length > 1 ?
        <div className="lrn_code_pick" role="tablist" aria-label={ENGLISH.programs}>
          {exercises.map((item) => {
            const on = item.exercise_id === exercise.exercise_id;
            return (
              <button
                key={item.exercise_id}
                type="button"
                role="tab"
                aria-selected={on}
                className={on ? "lrn_prog is_on" : "lrn_prog"}
                onClick={() => set_picked(item.exercise_id)}>
                <span className="lrn_prog_name">{program_name(item)}</span>
              </button>
            );
          })}
        </div> :
        null}
      <Coding_Desk
        key={exercise.exercise_id}
        course_id={course_id}
        registration_id={registration_id}
        exercise={exercise} />
    </div>
  );
}
