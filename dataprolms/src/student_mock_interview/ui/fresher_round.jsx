import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import robot_src from "../../assets/mock_interview_robot.svg";
import {
  save_student_fresher_progress,
  start_student_fresher_quiz,
  submit_student_fresher_quiz
} from "../api.js";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../../constants/english/student_mock_interview_constants_english.js";
import "../../hackathon_manager/theme/student_hackathon.css";
import "../theme/fresher_round.css";

const SECTIONS = [
  { id: "quantitative", get label() { return ENGLISH.quantitative_aptitude; } },
  { id: "verbal", get label() { return ENGLISH.verbal; } },
  { id: "reasoning", get label() { return ENGLISH.reasoning; } }
];

function flatten_questions(sections) {
  const items = [];
  for (const section of sections || []) {
    for (const question of section.questions || []) {
      items.push({
        ...question,
        item_id: question.question_id,
        section_key: section.section_key
      });
    }
  }
  return items;
}

function Question_Bar({ items, current_id, answers, busy, on_pick, on_proceed }) {
  const nums_ref = useRef(null);
  const [edges, set_edges] = useState({ left: false, right: false });

  function read_edges() {
    const strip = nums_ref.current;
    if (!strip) return;
    const left = strip.scrollLeft > 2;
    const right = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2;
    set_edges((current) => (current.left === left && current.right === right ? current : { left, right }));
  }

  function slide(direction) {
    const strip = nums_ref.current;
    if (strip) strip.scrollBy({ left: direction * strip.clientWidth * 0.8 });
  }

  useEffect(() => {
    const strip = nums_ref.current;
    if (!strip) return undefined;
    read_edges();
    const observer = new ResizeObserver(read_edges);
    observer.observe(strip);
    strip.addEventListener("scroll", read_edges, { passive: true });
    return () => {
      observer.disconnect();
      strip.removeEventListener("scroll", read_edges);
    };
  }, [items.length]);

  useEffect(() => {
    const strip = nums_ref.current;
    const button = strip?.querySelector(".is_on");
    if (!strip || !button) return;
    const left = button.offsetLeft - strip.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left) });
  }, [current_id]);

  return (
    <div className="hks_qbar">
      <div className={`hks_qbar_track${edges.left ? " is_left" : ""}${edges.right ? " is_right" : ""}`}>
        {edges.left ?
          <button type="button" className="hks_qbar_slide is_left" aria-label={ENGLISH.show_earlier_questions} onClick={() => slide(-1)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button> :
          null}
        <div className="hks_qbar_nums" ref={nums_ref}>
          {items.map((item, number) => {
            const done = Boolean(String(answers[item.item_id] || "").trim());
            const on = item.item_id === current_id;
            return (
              <button key={item.item_id} type="button" className={`${on ? "is_on" : ""} ${!on && done ? "is_done" : ""}`} onClick={() => on_pick(item.item_id)}>
                {!on && done ?
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 12 4 4 8-8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg> :
                  number + 1}
              </button>
            );
          })}
        </div>
        {edges.right ?
          <button type="button" className="hks_qbar_slide is_right" aria-label={ENGLISH.show_later_questions} onClick={() => slide(1)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button> :
          null}
      </div>
      <button type="button" className="hks_qbar_submit" onClick={on_proceed} disabled={busy}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {busy ? ENGLISH.submitting_quiz : ENGLISH.proceed_to_next_round_interview}
      </button>
    </div>
  );
}

function Play_Side({ items, current_id, answers, on_pick }) {
  return (
    <aside className="hks_side">
      <section className="hks_card">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /></svg>
          {ENGLISH.question_overview}
        </h2>
        <ul className="hks_legend">
          <li className="is_done">{ENGLISH.answered}</li>
          <li className="is_on">{ENGLISH.current}</li>
          <li>{ENGLISH.not_answered}</li>
        </ul>
        <div className="hks_grid">
          {items.map((item, number) => {
            const done = String(answers[item.item_id] || "").trim();
            const on = item.item_id === current_id;
            return (
              <button key={item.item_id} type="button" className={`${on ? "is_on" : ""} ${!on && done ? "is_done" : ""}`} onClick={() => on_pick(item.item_id)}>
                {number + 1}
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

function Mcq_Panel({ item, number, total, answer, on_save, on_prev, on_next }) {
  const letters = "ABCDEFGH";
  return (
    <article className="hks_mcq">
      <header>
        <b>{ENGLISH.question}{number}{ENGLISH.label_of}{total}</b>
        <em>{ENGLISH.mcq_question}</em>
      </header>
      <h2>{item.question_text}</h2>
      <ul>
        {(item.options || []).filter(Boolean).map((option, index) => {
          const on = answer === option;
          return (
            <li key={`${index}-${option}`}>
              <button
                type="button"
                className={on ? "is_on" : ""}
                onClick={() => on_save(on ? "" : option)}>
                <i className="hks_radio" aria-hidden="true" />
                <b>{letters[index] || index + 1}</b>
                <span>{option}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="hks_nav">
        <button type="button" className="hks_prev" disabled={!on_prev} onClick={on_prev || undefined}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {ENGLISH.previous}
        </button>
        <button type="button" className="hks_next" disabled={!on_next} onClick={on_next || undefined}>
          {ENGLISH.next_question}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </footer>
    </article>
  );
}

export function Fresher_Round({ job_id, job_title, company_name, language = "en-IN", on_proceed, on_error }) {
  const [quiz, set_quiz] = useState(null);
  const [answers, set_answers] = useState({});
  const [section, set_section] = useState("quantitative");
  const [current_id, set_current_id] = useState(null);
  const [busy, set_busy] = useState(false);
  const [loading, set_loading] = useState(true);
  const [block_message, set_block_message] = useState("");

  useEffect(() => {
    let alive = true;
    set_loading(true);
    start_student_fresher_quiz(job_id, { language }).then((payload) => {
      if (!alive) return;
      set_quiz(payload);
      const map = {};
      for (const item of payload.answers || []) {
        if (item?.question_id && item?.answer) map[item.question_id] = item.answer;
      }
      set_answers(map);
      const items = flatten_questions(payload.sections);
      const first_unanswered = items.find((item) => !String(map[item.item_id] || "").trim());
      const start = first_unanswered || items[0] || null;
      const first_section = start?.section_key ||
        SECTIONS.find((item) => items.some((question) => question.section_key === item.id))?.id ||
        "quantitative";
      set_section(first_section);
      set_current_id(start?.item_id || items.find((item) => item.section_key === first_section)?.item_id || null);
      set_loading(false);
    }).catch((err) => {
      if (!alive) return;
      set_loading(false);
      on_error?.(err.message);
    });
    return () => {
      alive = false;
    };
  }, [job_id, language, on_error]);

  function save_answer(question_id, option) {
    set_answers((map) => {
      const next = { ...map };
      if (!option) delete next[question_id];
      else next[question_id] = option;
      const payload = Object.entries(next).map(([id, answer]) => ({
        question_id: Number(id),
        answer
      }));
      save_student_fresher_progress(job_id, payload).catch(() => { });
      return next;
    });
  }

  const items = useMemo(() => flatten_questions(quiz?.sections), [quiz]);
  const visible = useMemo(
    () => items.filter((item) => item.section_key === section),
    [items, section]
  );
  const current = items.find((item) => item.item_id === current_id) || visible[0] || null;
  const counts = Object.fromEntries(SECTIONS.map((item) => [item.id, items.filter((question) => question.section_key === item.id).length]));
  const answered = items.filter((item) => String(answers[item.item_id] || "").trim()).length;
  const percent = items.length ? Math.round((answered / items.length) * 100) : 0;
  const index = Math.max(0, visible.findIndex((item) => item.item_id === current?.item_id));
  const global_index = Math.max(0, items.findIndex((item) => item.item_id === current?.item_id));

  function go_to(item) {
    if (!item) return;
    set_section(item.section_key);
    set_current_id(item.item_id);
  }

  function choose_section(id) {
    const next = items.find((item) => item.section_key === id);
    if (next) go_to(next);
  }

  async function proceed() {
    const missing = items.filter((item) => !String(answers[item.item_id] || "").trim()).length;
    if (missing) {
      set_block_message(ENGLISH.answer_all_quiz_questions(missing));
      return;
    }
    set_busy(true);
    on_error?.("");
    try {
      const payload = await submit_student_fresher_quiz(
        job_id,
        items.map((item) => ({ question_id: item.item_id, answer: answers[item.item_id] }))
      );
      await on_proceed?.(payload);
    } catch (err) {
      on_error?.(err.message);
    } finally {
      set_busy(false);
    }
  }

  if (loading) {
    return <p className="smi_fresher_note">{ENGLISH.loading_fresher_quiz}</p>;
  }

  if (!quiz || !items.length) {
    return <p className="smi_fresher_note">{ENGLISH.this_job_has_no_fresher_quiz}</p>;
  }

  return (
    <section className="hks_desk smi_fresher">
      <header className="hks_hero2">
        <div className="hks_h2_copy">
          <h1>{ENGLISH.fresher_aptitude_round}</h1>
          <ul className="hks_h2_meta">
            <li>{job_title || ENGLISH.selected_job}</li>
            {company_name ? <li>{company_name}</li> : null}
          </ul>
        </div>
        <span className="hks_phase is_live"><i aria-hidden="true" />{ENGLISH.round_1_quiz}</span>
        <div className="hks_ring" aria-label={ENGLISH.of_answered(answered, items.length)}>
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" className="hks_ring_track" />
            <circle cx="22" cy="22" r="18" className="hks_ring_fill" strokeDasharray={`${(percent / 100) * 113.1} 113.1`} />
          </svg>
          <div>
            <b>{answered}/{items.length}</b>
            <small>{ENGLISH.answered}</small>
          </div>
        </div>
      </header>

      <nav className="hks_sections" aria-label={ENGLISH.question_sections}>
        {SECTIONS.filter((item) => counts[item.id]).map((item) =>
          <button key={item.id} type="button" className={section === item.id ? "is_on" : ""} onClick={() => choose_section(item.id)}>
            {item.label} ({counts[item.id]})
          </button>
        )}
      </nav>

      {current ?
        <Question_Bar
          items={visible}
          current_id={current.item_id}
          answers={answers}
          busy={busy}
          on_pick={set_current_id}
          on_proceed={proceed} /> :
        null}

      <div className="hks_play">
        <div className="hks_sheet">
          {current ?
            <Mcq_Panel
              item={current}
              number={index + 1}
              total={visible.length}
              answer={answers[current.item_id] || ""}
              on_save={(option) => save_answer(current.item_id, option)}
              on_prev={global_index > 0 ? () => go_to(items[global_index - 1]) : null}
              on_next={global_index < items.length - 1 ? () => go_to(items[global_index + 1]) : null} /> :
            <p className="hks_note">{ENGLISH.this_section_has_no_questions}</p>}
        </div>
        {current ?
          <Play_Side
            items={visible}
            current_id={current.item_id}
            answers={answers}
            on_pick={set_current_id} /> :
          null}
      </div>

      {block_message ? createPortal(
        <div
          className="smi_confirm_scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="smi_fresher_block_title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) set_block_message("");
          }}>
          <div className="smi_confirm">
            <img src={robot_src} alt="" />
            <h2 id="smi_fresher_block_title">{ENGLISH.finish_the_quiz_first}</h2>
            <p>{block_message}</p>
            <div>
              <button type="button" className="is_save" onClick={() => set_block_message("")}>
                {ENGLISH.got_it}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
