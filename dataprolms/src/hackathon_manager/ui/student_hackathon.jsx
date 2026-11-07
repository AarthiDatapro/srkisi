import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@datapromr/toast";
import {
  download_student_hackathon_certificate,
  get_student_hackathon,
  list_student_hackathons,
  run_student_hackathon_code,
  save_student_hackathon_answer,
  save_student_project,
  submit_student_hackathon_code
} from "../api.js";
import { PROJECT_DELIVERABLES } from "../utils.js";
import { Coding_Desk } from "../../course_learning/ui/coding_workspace.jsx";
import { Hackathon_Lobby } from "./hackathon_lobby.jsx";
import "../../course_learning/theme/learn_stage.css";
import "../theme/student_hackathon.css";
import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/hackathon_manager_constants_english.js";

const SECTIONS = [
  { id: "all", get label() { return ENGLISH.all_questions; } },
  { id: "mcq", get label() { return ENGLISH.mcqs; } },
  { id: "coding", get label() { return ENGLISH.coding; } },
  { id: "project", get label() { return ENGLISH.project; } }
];

function when_label(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return ENGLISH.not_scheduled;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function item_done(item, saved) {
  const answer = saved?.answer || "";
  if (item.item_type === "project") {
    const parsed = read_project(answer);
    return Boolean(parsed.github_url || parsed.demo_url || parsed.documentation_url || parsed.file_name);
  }
  return Boolean(String(answer).trim());
}

function play_progress(hackathon, answers) {
  const items = hackathon?.items || [];
  const projects = items.filter((item) => item.item_type === "project");
  const required = projects.length ? Math.min(projects.length, Math.max(1, Number(hackathon?.required_submissions) || 1)) : 0;
  const goal = items.length - projects.length + required;
  let answered = 0;
  let answered_projects = 0;
  for (const item of items) {
    if (!item_done(item, answers[item.item_id])) continue;
    if (item.item_type === "project") answered_projects += 1;
    else answered += 1;
  }
  const done = answered + Math.min(answered_projects, required);
  return { goal, done, complete: goal > 0 && done >= goal };
}

function phase_of(starts_at, ends_at) {
  const now = Date.now();
  const start = new Date(starts_at).getTime();
  const end = new Date(ends_at).getTime();
  if (Number.isFinite(start) && now < start) return { id: "soon", label: ENGLISH.upcoming };
  if (Number.isFinite(end) && now > end) return { id: "done", label: ENGLISH.ended };
  return { id: "live", label: ENGLISH.live_now };
}

function read_project(answer) {
  try {
    const parsed = JSON.parse(answer || "");
    if (parsed && typeof parsed === "object") {
      return {
        github_url: parsed.github_url || parsed.repo_url || "",
        demo_url: parsed.demo_url || "",
        documentation_url: parsed.documentation_url || "",
        file_name: parsed.file_name || ""
      };
    }
  } catch {
    /* stored as plain notes */
  }
  return { github_url: "", demo_url: "", documentation_url: "", file_name: "" };
}

function Section_Icon({ id }) {
  if (id === "mcq") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  }
  if (id === "coding") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (id === "project") {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7.5h6l2 2H20v9H4v-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.7" /><path d="M12 11v3M9 20h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export function Student_Hackathon({ hackathon_id, on_open, on_back }) {
  const toast = useToast();
  const [items, set_items] = useState([]);
  const [loading, set_loading] = useState(true);

  useEffect(() => {
    if (hackathon_id) return;
    let alive = true;
    set_loading(true);
    list_student_hackathons().then((payload) => {
      if (alive) set_items(payload.items || []);
    }).catch((err) => {
      if (alive) toast.error(err.message);
    }).finally(() => {
      if (alive) set_loading(false);
    });
    return () => {
      alive = false;
    };
  }, [hackathon_id, toast]);

  if (hackathon_id) {
    return <Hackathon_Play hackathon_id={hackathon_id} on_back={on_back} />;
  }

  return <Hackathon_Lobby items={items} loading={loading} on_open={on_open} />;
}

function Hackathon_Play({ hackathon_id, on_back }) {
  const toast = useToast();
  const [hackathon, set_hackathon] = useState(null);
  const [answers, set_answers] = useState({});
  const [section, set_section] = useState("all");
  const [current_id, set_current_id] = useState(null);
  const [project, set_project] = useState({ github_url: "", demo_url: "", documentation_url: "", file_name: "" });
  const [busy, set_busy] = useState(false);
  const [review, set_review] = useState({});
  const [certificate_act, set_certificate_act] = useState("");
  const [preview_url, set_preview_url] = useState("");

  useEffect(() => {
    let alive = true;
    get_student_hackathon(hackathon_id).then((payload) => {
      if (!alive) return;
      const item = payload.item;
      set_hackathon(item);
      const map = {};
      for (const answer of payload.answers || []) map[answer.item_id] = answer;
      set_answers(map);
      set_current_id(item.items?.[0]?.item_id || null);
    }).catch((err) => {
      if (alive) toast.error(err.message);
    });
    return () => {
      alive = false;
    };
  }, [hackathon_id, toast]);

  const items = hackathon?.items || [];
  const visible = useMemo(() => items.filter((item) => section === "all" || item.item_type === section), [items, section]);
  const current = items.find((item) => item.item_id === current_id) || visible[0] || null;
  const counts = {
    all: items.length,
    mcq: items.filter((item) => item.item_type === "mcq").length,
    coding: items.filter((item) => item.item_type === "coding").length,
    project: items.filter((item) => item.item_type === "project").length
  };
  const answered = items.filter((item) => String(answers[item.item_id]?.answer || "").trim()).length;
  const saved = current ? answers[current.item_id] : null;

  useEffect(() => {
    if (current?.item_type !== "project") return;
    set_project(read_project(answers[current.item_id]?.answer || ""));
  }, [current?.item_id]);

  function choose_section(id) {
    set_section(id);
    const next = items.find((item) => id === "all" || item.item_type === id);
    if (next) set_current_id(next.item_id);
  }

  async function save_project(body) {
    if (!current) return;
    if (body.file) {
      const name = String(body.file.name || "").toLowerCase();
      if (!name.endsWith(".zip") || body.file.size >= 1024 * 1024) {
        toast.error(ENGLISH.upload_a_zip_file_under_1_mb);
        return;
      }
    }
    set_busy(true);
    const form = new FormData();
    form.set("github_url", body.github_url || "");
    form.set("demo_url", body.demo_url || "");
    form.set("documentation_url", body.documentation_url || "");
    if (body.file) form.set("file", body.file);
    try {
      const payload = await save_student_project(hackathon.hackathon_id, current.item_id, form);
      set_answers((map) => ({ ...map, [current.item_id]: payload.answer }));
      set_project(read_project(payload.answer?.answer || ""));
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy(false);
    }
  }

  async function save_current(answer) {
    if (!current) return;
    set_busy(true);
    try {
      const payload = await save_student_hackathon_answer(hackathon.hackathon_id, current.item_id, answer);
      set_answers((map) => ({ ...map, [current.item_id]: payload.answer }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy(false);
    }
  }

  if (!hackathon) {
    return (
      <section className="hks_desk">
        <button type="button" className="hks_back is_plain" onClick={on_back}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.all_hackathons}</button>
        <p className="hks_note">{ENGLISH.opening_hackathon}</p>
      </section>
    );
  }

  const progress = play_progress(hackathon, answers);
  const place = hackathon.audience === "open" ? ENGLISH.open_hackathon : hackathon.program_name || hackathon.cohort_name || ENGLISH.program;

  async function fetch_certificate() {
    const response = await download_student_hackathon_certificate(hackathon.hackathon_id);
    return response.blob();
  }

  async function download_certificate() {
    if (!progress.complete || certificate_act) return;
    set_certificate_act("download");
    try {
      const blob = await fetch_certificate();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${hackathon.title || "hackathon"}-certificate.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_certificate_act("");
    }
  }

  async function preview_certificate() {
    if (!progress.complete || certificate_act) return;
    set_certificate_act("preview");
    try {
      const blob = await fetch_certificate();
      if (preview_url) URL.revokeObjectURL(preview_url);
      set_preview_url(URL.createObjectURL(blob));
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_certificate_act("");
    }
  }
  const index = Math.max(0, visible.findIndex((item) => item.item_id === current?.item_id));
  const percent = items.length ? Math.round((answered / items.length) * 100) : 0;
  const phase = phase_of(hackathon.starts_at, hackathon.ends_at);
  return (
    <section className="hks_desk">
      <header className="hks_hero2">
        <button type="button" className="hks_back" aria-label={ENGLISH.all_hackathons_2} onClick={on_back}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="hks_h2_copy">
          <h1>{hackathon.title}</h1>
          <ul className="hks_h2_meta">
            <li>{place}</li>
            <li>{when_label(hackathon.starts_at)}{hackathon.ends_at ? ` → ${when_label(hackathon.ends_at)}` : ""}</li>
            {hackathon.batch_name ? <li className="is_team">{hackathon.batch_name}</li> : null}
            {counts.project && hackathon.required_submissions ?
              <li>{ENGLISH.submit}{hackathon.required_submissions}{ENGLISH.label_of_2}{counts.project}{ENGLISH.project_3}{counts.project === 1 ? "" : "s"}</li> :
              null}
          </ul>
        </div>
        <span className={`hks_phase is_${phase.id}`}><i aria-hidden="true" />{phase.label}</span>
        <div className="hks_ring" aria-label={ENGLISH.of_answered(answered, items.length)}>
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" className="hks_ring_track" />
            <circle cx="22" cy="22" r="18" className="hks_ring_fill" strokeDasharray={`${(percent / 100) * 113.1} 113.1`} />
          </svg>
          <div>
            <b>{answered}/{items.length || 0}</b>
            <small>{ENGLISH.answered}</small>
          </div>
        </div>
      </header>
      <Certificate_Banner
        locked={!progress.complete}
        done={progress.done}
        goal={progress.goal}
        busy={certificate_act}
        on_preview={preview_certificate}
        on_download={download_certificate} />
      {preview_url ?
        createPortal(
          <div
            className="hks_cert_preview"
            role="dialog"
            aria-modal="true"
            aria-label={ENGLISH.preview_certificate}>
            <div className="hks_cert_preview_bar">
              <button
                type="button"
                className="hks_cert_preview_close"
                aria-label={ENGLISH.close}
                onClick={() => {
                  URL.revokeObjectURL(preview_url);
                  set_preview_url("");
                }}>✕</button>
              <div className="hks_cert_preview_title">
                <b>{ENGLISH.preview_certificate}</b>
                <small>{hackathon.title || ""}</small>
              </div>
              <button
                type="button"
                className="hks_cert_preview_download"
                disabled={certificate_act === "download"}
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = preview_url;
                  link.download = `${hackathon.title || "hackathon"}-certificate.png`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}>
                {ENGLISH.download_certificate}
              </button>
            </div>
            <div
              className="hks_cert_preview_stage"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  URL.revokeObjectURL(preview_url);
                  set_preview_url("");
                }
              }}>
              <div className="hks_cert_preview_paper">
                <img src={preview_url} alt={ENGLISH.preview_certificate} />
              </div>
            </div>
          </div>,
          document.body
        ) :
        null}
      <nav className="hks_sections" aria-label={ENGLISH.question_sections}>
        {SECTIONS.filter((item) => item.id === "all" || counts[item.id]).map((item) =>
          <button key={item.id} type="button" className={section === item.id ? "is_on" : ""} onClick={() => choose_section(item.id)}>
            <Section_Icon id={item.id} />
            {item.label} ({counts[item.id]})
          </button>
        )}
      </nav>
      {current ?
        <Question_Bar
          items={visible}
          current_id={current.item_id}
          answers={answers}
          on_pick={set_current_id}
          on_leave={on_back} /> :
        null}
      <div className={`hks_play${current?.item_type === "coding" ? " is_code" : ""}${current?.item_type === "project" ? " is_project" : ""}`}>
        <div className="hks_sheet">
          {current?.item_type === "mcq" ?
            <Mcq_Panel
              item={current}
              number={index + 1}
              total={visible.length}
              saved={saved}
              busy={busy}
              reviewed={Boolean(review[current.item_id])}
              on_review={() => set_review((map) => ({ ...map, [current.item_id]: !map[current.item_id] }))}
              on_save={save_current}
              on_prev={index > 0 ? () => set_current_id(visible[index - 1].item_id) : null}
              on_next={index < visible.length - 1 ? () => set_current_id(visible[index + 1].item_id) : null} /> :
            null}
          {current?.item_type === "coding" ?
            <Coding_Panel
              hackathon_id={hackathon.hackathon_id}
              item={current}
              saved={saved}
              on_saved={(answer) => set_answers((map) => ({ ...map, [current.item_id]: answer }))} /> :
            null}
          {current?.item_type === "project" ?
            <Project_Panel
              item={current}
              value={project}
              busy={busy}
              on_change={set_project}
              on_save={save_project} /> :
            null}
          {!current ? <p className="hks_note">{ENGLISH.this_section_has_no_questions}</p> : null}
        </div>
        {current?.item_type === "mcq" ?
          <Play_Side
            items={visible}
            current_id={current?.item_id}
            answers={answers}
            on_pick={set_current_id} /> :
          null}
      </div>
    </section>
  );
}

function Certificate_Banner({ locked, done, goal, busy, on_preview, on_download }) {
  const ratio = goal ? Math.min(1, done / goal) : 0;
  return (
    <aside className={`hks_cert${locked ? " is_locked" : " is_ready"}`}>
      <span className="hks_cert_mark" aria-hidden="true">
        {locked ?
          <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> :
          <svg viewBox="0 0 24 24" fill="none"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.8" /><path d="M7 20h10l-1.2-7H8.2L7 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m9.5 13.2 2.2 2.2 3.6-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <div className="hks_cert_copy">
        <b>{locked ? ENGLISH.certificate_locked : ENGLISH.certificate_ready}</b>
        <p>{locked ? ENGLISH.finish_hackathon_to_unlock : ENGLISH.preview_or_download_certificate}</p>
        {locked ?
          <span className="hks_cert_bar" style={{ "--hks-cert-ratio": ratio }}>
            <i />
            <small>{done}{ENGLISH.label_of_2}{goal || "—"}</small>
          </span> :
          null}
      </div>
      <div className="hks_cert_actions">
        <button
          type="button"
          className="hks_cert_eye"
          aria-label={ENGLISH.preview_certificate}
          disabled={locked || Boolean(busy)}
          onClick={on_preview}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.7" /></svg>
        </button>
        <button type="button" className="hks_cert_download" disabled={locked || Boolean(busy)} onClick={on_download}>
          {busy === "download" ? ENGLISH.downloading_certificate : ENGLISH.certificate}
        </button>
      </div>
    </aside>
  );
}

function Question_Bar({ items, current_id, answers, on_pick, on_leave }) {
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
          const done = Boolean(String(answers[item.item_id]?.answer || "").trim());
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
      <button type="button" className="hks_qbar_submit" onClick={on_leave}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 3 10.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M21 3 14.5 21l-4-7.5L3 9.5 21 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>{ENGLISH.submit_hackathon}</button>
    </div>
  );
}

function Play_Side({ items, current_id, answers, on_pick }) {
  return (
    <aside className="hks_side">
      <section className="hks_card">
        <h2>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /></svg>{ENGLISH.question_overview}</h2>
        <ul className="hks_legend">
          <li className="is_done">{ENGLISH.answered_2}</li>
          <li className="is_on">{ENGLISH.current}</li>
          <li>{ENGLISH.not_answered}</li>
        </ul>
        <div className="hks_grid">
          {items.map((item, number) => {
            const done = String(answers[item.item_id]?.answer || "").trim();
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

function Mcq_Panel({ item, number, total, saved, busy, reviewed, on_review, on_save, on_prev, on_next }) {
  const [picked, set_picked] = useState(saved?.answer || "");
  useEffect(() => {
    set_picked(saved?.answer || "");
  }, [item.item_id, saved?.answer]);
  const letters = "ABCDEFGH";
  const revealed = Boolean(saved?.answer);
  return (
    <article className="hks_mcq">
      <header>
        <b>{ENGLISH.question_2}{number}{ENGLISH.label_of_2}{total}</b>
        <em>{ENGLISH.mcq_question}</em>
        <button type="button" className={`hks_review ${reviewed ? "is_on" : ""}`} onClick={on_review}>
          <svg viewBox="0 0 24 24" fill={reviewed ? "currentColor" : "none"} aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>{ENGLISH.mark_for_review}</button>
      </header>
      <h2>{item.question_text || item.title}</h2>
      <ul>
        {(item.options || []).map((option, index) => {
          const on = picked === option;
          const right = revealed && option === saved.correct_answer;
          const wrong = revealed && on && saved.correct === false;
          return (
            <li key={`${index}-${option}`}>
              <button type="button" className={`${on && !right && !wrong ? "is_on" : ""} ${right ? "is_right" : ""} ${wrong ? "is_wrong" : ""}`} disabled={busy} onClick={() => { set_picked(option); if (saved?.answer !== option) on_save(option); }}>
                <i className="hks_radio" aria-hidden="true">{right || wrong ? <svg viewBox="0 0 24 24" fill="none"><path d="m6 12 4 4 8-8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}</i>
                <b>{letters[index] || index + 1}</b>
                <span>{option}</span>
                {right || wrong ? <svg className="hks_tick" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {revealed && saved.explanation ?
        <div className="hks_explain">
          <i aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M12 3a6 6 0 0 0-3 11.2V16h6v-1.8A6 6 0 0 0 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
          </i>
          <div>
            <b>{ENGLISH.explanation_after_submission}</b>
            <p>{saved.explanation}</p>
          </div>
        </div> :
        null}
      <footer className="hks_nav">
        <button type="button" className="hks_prev" disabled={!on_prev} onClick={on_prev || undefined}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{ENGLISH.previous}</button>
        <button type="button" className="hks_next" disabled={!on_next} onClick={on_next || undefined}>{ENGLISH.next_question}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </footer>
    </article>
  );
}

function Coding_Panel({ hackathon_id, item, saved, on_saved }) {
  const exercise = {
    exercise_id: item.item_id,
    description: item.description || item.prompt || "",
    language: item.language,
    function_name: item.function_name,
    template: item.template || "",
    test_cases: item.test_cases || [],
    submission: saved?.grade && saved.grade.student_code != null ? saved.grade : (saved?.answer ? { student_code: saved.answer } : null)
  };
  return (
    <div className="lrn_code_wrap">
      <Coding_Desk
        key={item.item_id}
        exercise={exercise}
        case_examples
        on_run={(code) => run_student_hackathon_code(hackathon_id, item.item_id, code)}
        on_submit={async (code) => {
          const payload = await submit_student_hackathon_code(hackathon_id, item.item_id, code);
          if (payload.answer) on_saved?.(payload.answer);
          return payload;
        }} />
    </div>
  );
}

function Brief_Icon({ id }) {
  const paths = {
    overview: <><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
    team: <><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M16 5.5a3 3 0 0 1 0 5.5M17.5 14.5A5 5 0 0 1 20.5 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
    tech: <><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="m10 10-2 2 2 2M14 10l2 2-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>,
    time: <><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
    type: <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
    target: <><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
    spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
    box: <><path d="M4 8l8-4 8 4-8 4-8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M4 8v8l8 4 8-4V8M12 12v8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></>,
    source_code: <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
    project_report: <><path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M14 3v5h5M10 13h6M10 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
    demo_video: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" /></>,
    presentation: <><path d="M3 4h18M5 4v10h14V4M12 14v3M8 21l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none">{paths[id] || paths.overview}</svg>;
}

function Project_Panel({ item, value, busy, on_change, on_save }) {
  const [file, set_file] = useState(null);
  const [file_error, set_file_error] = useState("");
  const deliverables = item.deliverables || {};
  useEffect(() => {
    set_file(null);
    set_file_error("");
  }, [item.item_id]);
  const facts = [
    { id: "team", get label() { return ENGLISH.team_size_2; }, value: item.team_size ? ENGLISH.members(item.team_size) : "" },
    { id: "tech", get label() { return ENGLISH.technology; }, value: item.technology },
    { id: "time", get label() { return ENGLISH.duration; }, value: item.project_duration ? ENGLISH.mins(item.project_duration) : "" },
    { id: "type", get label() { return ENGLISH.submission_type_2; }, value: item.submission_type }
  ].filter((row) => row.value);
  const links = [
    { id: "github_url", get label() { return ENGLISH.github_repository; }, placeholder: "https://github.com/..." },
    { id: "demo_url", get label() { return ENGLISH.live_demo; }, placeholder: "https://..." },
    { id: "documentation_url", get label() { return ENGLISH.documentation; }, placeholder: "https://..." }
  ];
  const picked_name = file?.name || value.file_name || "";
  return (
    <article className="hks_project">
      <div className="hks_brief">
        <section className="hks_po">
          <h3 className="hks_po_head">
            <i className="is_indigo" aria-hidden="true"><Brief_Icon id="overview" /></i>{ENGLISH.project_overview}<em>{item.marks}{ENGLISH.marks_2}</em>
          </h3>
          <div className="hks_po_body">
            <p className="hks_po_lede">
              <b>{item.title}</b>
              {item.overview || item.description ? ` — ${item.overview || item.description}` : null}
            </p>
            {facts.length ?
              <ul className="hks_po_facts">
                {facts.map((row) =>
                  <li key={row.id} className={`is_${row.id}`}>
                    <i aria-hidden="true"><Brief_Icon id={row.id} /></i>
                    <div>
                      <b>{row.label}</b>
                      <small>{row.value}</small>
                    </div>
                  </li>
                )}
              </ul> :
              null}
          </div>
        </section>
        {item.objectives?.length || item.features?.length ?
          <div className="hks_po_pair">
            {item.objectives?.length ?
              <section className="hks_po">
                <h3 className="hks_po_head">
                  <i className="is_indigo" aria-hidden="true"><Brief_Icon id="target" /></i>{ENGLISH.objectives_2}</h3>
                <div className="hks_po_body">
                  <ul className="hks_po_checks">{item.objectives.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ul>
                </div>
              </section> :
              null}
            {item.features?.length ?
              <section className="hks_po">
                <h3 className="hks_po_head">
                  <i className="is_indigo" aria-hidden="true"><Brief_Icon id="spark" /></i>{ENGLISH.expected_features_2}</h3>
                <div className="hks_po_body">
                  <ul className="hks_po_checks">{item.features.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ul>
                </div>
              </section> :
              null}
          </div> :
          null}
        <section className="hks_po">
          <h3 className="hks_po_head">
            <i className="is_indigo" aria-hidden="true"><Brief_Icon id="box" /></i>{ENGLISH.deliverables_2}</h3>
          <div className="hks_po_body">
            <ul className="hks_po_deliver">
              {PROJECT_DELIVERABLES.map((row) =>
                <li key={row.id} className={`is_${row.id}`}>
                  <i aria-hidden="true"><Brief_Icon id={row.id} /></i>
                  <div>
                    <b>{row.label}{deliverables[row.id] ? "" : ENGLISH.optional_2}</b>
                    <small>{row.hint}</small>
                    <em className={deliverables[row.id] ? "is_required" : ""}>{deliverables[row.id] ? ENGLISH.required : ENGLISH.optional}</em>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>
      <form className="hks_submit_card" onSubmit={(event) => { event.preventDefault(); if (!file_error) on_save({ ...value, file }); }}>
        <h3 className="hks_po_head">
          <i aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4M7 9l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </i>{ENGLISH.your_submission}{value.file_name || value.github_url || value.demo_url || value.documentation_url ?
            <em className="is_saved">{ENGLISH.submitted}</em> :
            <em className="is_wait">{ENGLISH.not_submitted}</em>}
        </h3>
        <label className={`hks_drop${file_error ? " is_bad" : ""}${picked_name ? " is_set" : ""}`}>
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const next = event.target.files?.[0] || null;
              if (next && (!next.name.toLowerCase().endsWith(".zip") || next.size >= 1024 * 1024)) {
                set_file(null);
                set_file_error(ENGLISH.upload_a_zip_file_under_1_mb);
                return;
              }
              set_file_error("");
              set_file(next);
            }} />
          <i aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4M7 9l5-5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </i>
          <b>{picked_name || ENGLISH.upload_project_zip}</b>
          <small>{file_error || ENGLISH.zip_only_under_1_mb(deliverables.source_code ? ENGLISH.required_2 : "")}</small>
        </label>
        {links.map((row) =>
          <label key={row.id} className="hks_link_field">
            <span>{row.label}</span>
            <input
              type="url"
              placeholder={row.placeholder}
              value={value[row.id]}
              onChange={(event) => on_change({ ...value, [row.id]: event.target.value })} />
          </label>
        )}
        <button type="submit" className="hks_project_send" disabled={busy || Boolean(file_error)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 3 10.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M21 3 14.5 21l-4-7.5L3 9.5 21 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          {busy ? "Submitting..." : ENGLISH.submit_project}
        </button>
      </form>
    </article>
  );
}
