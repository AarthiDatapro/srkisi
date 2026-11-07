import { useEffect, useState } from "react";
import { Button } from "@datapromr/button";
import { Input } from "@datapromr/input";
import { Modal } from "@datapromr/modal";
import { Select } from "@datapromr/select";
import { useToast } from "@datapromr/toast";
import { JOBS_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/jobs_manager_constants_english.js";
import { generate_fresher_quiz, get_fresher_quiz, save_fresher_quiz } from "../api.js";

const SECTIONS = [
  { id: "quantitative", get label() { return ENGLISH.quantitative_aptitude; } },
  { id: "reasoning", get label() { return ENGLISH.reasoning; } },
  { id: "verbal", get label() { return ENGLISH.verbal; } }
];

const LEVELS = [
  { id: "easy", get label() { return ENGLISH.easy; } },
  { id: "medium", get label() { return ENGLISH.medium; } },
  { id: "hard", get label() { return ENGLISH.hard; } }
];

function blank_question() {
  return {
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    explanation: "",
    difficulty: ""
  };
}

function Question_Editor({ index, question, on_change, on_remove, can_remove }) {
  const options = question.options || ["", "", "", ""];

  function set_option(offset, value) {
    const previous = options[offset];
    const next = options.map((item, item_index) => item_index === offset ? value : item);
    on_change({
      ...question,
      options: next,
      correct_answer: question.correct_answer === previous ? value : question.correct_answer
    });
  }

  return (
    <fieldset className="jbm_fq">
      <legend>{ENGLISH.question} {index + 1}</legend>
      {can_remove ?
        <button type="button" className="jbm_fq_remove" onClick={on_remove}>{ENGLISH.remove}</button> :
        null}
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.question}</span>
        <textarea
          className="ui-input ui-input--outlined jbm_fq_area"
          value={question.question_text}
          placeholder=" "
          required
          onChange={(event) => on_change({ ...question, question_text: event.target.value })} />
      </label>
      <div className="jbm_fq_opts">
        {options.map((option, offset) =>
          <label key={offset} className={question.correct_answer === option && option ? "is_on" : ""}>
            <input
              type="radio"
              name={`fresher-correct-${index}-${question.section_key || offset}`}
              checked={Boolean(option) && question.correct_answer === option}
              onChange={() => option && on_change({ ...question, correct_answer: option })} />
            <input
              className="ui-input ui-input--outlined"
              value={option}
              placeholder={ENGLISH.option_label(offset + 1)}
              onChange={(event) => set_option(offset, event.target.value)} />
          </label>
        )}
      </div>
      <label className="ui-field ui-field--outlined">
        <span className="ui-field__label">{ENGLISH.explanation}</span>
        <textarea
          className="ui-input ui-input--outlined jbm_fq_area"
          value={question.explanation || ""}
          placeholder=" "
          onChange={(event) => on_change({ ...question, explanation: event.target.value })} />
      </label>
    </fieldset>
  );
}

export function Fresher_Quiz({ open, job_ids, source_job_id, on_close, on_saved }) {
  const toast = useToast();
  const [picked_sections, set_picked_sections] = useState(["quantitative", "reasoning", "verbal"]);
  const [level, set_level] = useState("medium");
  const [count, set_count] = useState("5");
  const [sections, set_sections] = useState([]);
  const [busy, set_busy] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    set_picked_sections(["quantitative", "reasoning", "verbal"]);
    set_level("medium");
    set_count("5");
    set_sections([]);
    if (!source_job_id) return undefined;
    set_busy("load");
    get_fresher_quiz(source_job_id).then((data) => {
      if (!alive) return;
      set_level(data.difficulty || "medium");
      set_picked_sections((data.sections || []).map((section) => section.section_key));
      set_sections(data.sections || []);
      const longest = Math.max(1, ...(data.sections || []).map((section) => section.questions?.length || 0));
      set_count(String(Math.min(longest, 10)));
    }).catch((err) => {
      if (alive) toast.error(err.message);
    }).finally(() => {
      if (alive) set_busy("");
    });
    return () => {
      alive = false;
    };
  }, [open, source_job_id, toast]);

  function toggle_section(id) {
    set_picked_sections((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function set_question(section_key, index, next) {
    set_sections((current) => current.map((section) => {
      if (section.section_key !== section_key) return section;
      return {
        ...section,
        questions: section.questions.map((question, offset) => offset === index ? next : question)
      };
    }));
  }

  function add_question(section_key) {
    set_sections((current) => current.map((section) =>
      section.section_key === section_key ?
        { ...section, questions: [...section.questions, blank_question()] } :
        section
    ));
  }

  function remove_question(section_key, index) {
    set_sections((current) => current.map((section) =>
      section.section_key === section_key ?
        { ...section, questions: section.questions.filter((_, offset) => offset !== index) } :
        section
    ));
  }

  async function generate() {
    if (!picked_sections.length) {
      toast.error(ENGLISH.select_at_least_one_section);
      return;
    }
    set_busy("generate");
    try {
      const data = await generate_fresher_quiz({
        sections: SECTIONS.map((section) => section.id).filter((id) => picked_sections.includes(id)),
        difficulty: level,
        count: Number(count)
      });
      set_sections(data.sections || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!job_ids.length) {
      toast.error(ENGLISH.select_at_least_one_job);
      return;
    }
    if (!sections.some((section) => section.questions?.length)) {
      toast.error(ENGLISH.no_questions_yet);
      return;
    }
    set_busy("save");
    try {
      await save_fresher_quiz({
        job_ids,
        difficulty: level,
        sections
      });
      toast.success(ENGLISH.fresher_quiz_saved);
      on_saved?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy("");
    }
  }

  return (
    <Modal open={open} title={ENGLISH.fresher_mode} size="sheet" onClose={on_close}>
      <form className="jbm_fresher" onSubmit={save}>
        <div className="jbm_fresher_body">
          <section className="jbm_fresher_card">
            <header className="jbm_fresher_card_head">
              <strong>{ENGLISH.jobs_selected(job_ids.length)}</strong>
              <span>{ENGLISH.each_job_keeps_its_own_copy}</span>
            </header>
            <div className="jbm_fresher_sections">
              {SECTIONS.map((section) =>
                <label key={section.id} className={picked_sections.includes(section.id) ? "is_on" : ""}>
                  <input
                    type="checkbox"
                    checked={picked_sections.includes(section.id)}
                    onChange={() => toggle_section(section.id)} />
                  {section.label}
                </label>
              )}
            </div>
            <div className="jbm_fresher_row">
              <Select
                id="fresher_level"
                name="level"
                label={ENGLISH.level}
                variant="outlined"
                value={level}
                options={LEVELS.map((item) => ({ value: item.id, label: item.label }))}
                onChange={(event) => set_level(event.target.value)} />
              <Input
                id="fresher_count"
                name="count"
                type="number"
                min="1"
                max="10"
                label={ENGLISH.questions_per_section}
                variant="outlined"
                value={count}
                onChange={(event) => set_count(event.target.value)} />
            </div>
            <Button type="button" loading={busy === "generate"} disabled={Boolean(busy) && busy !== "generate"} onClick={generate}>
              {busy === "generate" ? ENGLISH.generating_questions : ENGLISH.generate_questions}
            </Button>
          </section>
          {sections.map((section) => {
            const meta = SECTIONS.find((item) => item.id === section.section_key);
            return (
              <section key={section.section_key} className="jbm_fresher_block">
                <div className="jbm_fresher_block_head">
                  <h3>{meta?.label || section.section_key}</h3>
                  <button type="button" className="jbm_fq_add" onClick={() => add_question(section.section_key)}>{ENGLISH.add_question}</button>
                </div>
                {(section.questions || []).map((question, index) =>
                  <Question_Editor
                    key={`${section.section_key}-${question.question_id || index}`}
                    index={index}
                    question={{ ...question, section_key: section.section_key }}
                    can_remove={(section.questions || []).length > 1}
                    on_change={(next) => set_question(section.section_key, index, next)}
                    on_remove={() => remove_question(section.section_key, index)} />
                )}
              </section>
            );
          })}
          {busy === "load" ? <p className="jbm_fresher_hint">{ENGLISH.loading_jobs}</p> : null}
        </div>
        {sections.length ?
          <div className="jbm_fresher_foot">
            <Button type="submit" loading={busy === "save"} disabled={busy === "generate" || busy === "load"}>
              {busy === "save" ? ENGLISH.saving_fresher_quiz : ENGLISH.save_to_selected_jobs}
            </Button>
          </div> :
          null}
      </form>
    </Modal>
  );
}
