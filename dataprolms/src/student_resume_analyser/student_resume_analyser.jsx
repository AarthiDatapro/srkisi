import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import robot_src from "../assets/resume_match_robot.svg";
import { analyze_resume, save_resume_profile } from "./api.js";
import { Results_Panel } from "./ui/results_panel.jsx";
import "./theme/analyser.css";
import { STUDENT_RESUME_ANALYSER_ENGLISH as ENGLISH } from "../constants/english/student_resume_analyser_constants_english.js";
import { live_items } from "../constants/live_text.js";


const STEPS = [
  live_items([() => ("upload"), () => (ENGLISH.upload_resume)]),
  live_items([() => ("analyze"), () => (ENGLISH.analyze)]),
  live_items([() => ("results"), () => (ENGLISH.view_results)])
];

function step_index(step) {
  if (step === "results") return 2;
  if (step === "analyze") return 1;
  return 0;
}

export function Student_Resume_Analyser({ on_mock_interview }) {
  const picker = useRef(null);
  const save_picker = useRef(null);
  const file_ref = useRef(null);
  const [step, set_step] = useState("upload");
  const [item, set_item] = useState(null);
  const [file_name, set_file_name] = useState("");
  const [skill_tab, set_skill_tab] = useState("all");
  const [busy, set_busy] = useState(false);
  const [saving, set_saving] = useState(false);
  const [saved, set_saved] = useState(false);
  const [notice, set_notice] = useState("");
  const [error, set_error] = useState("");
  const [confirm_save, set_confirm_save] = useState(false);

  async function run_analyze(file) {
    if (!file) return;
    file_ref.current = file;
    set_file_name(file.name);
    set_error("");
    set_notice("");
    set_saved(false);
    set_busy(true);
    set_step("analyze");
    try {
      const payload = await analyze_resume(file);
      set_item(payload.item);
      set_skill_tab("all");
      set_step("results");
    } catch (err) {
      set_error(err.message || ENGLISH.unable_to_analyze_this_resume);
      set_step("upload");
    } finally {
      set_busy(false);
    }
  }

  async function run_save(file) {
    const chosen = file || file_ref.current;
    if (!item?.analysis_id) return;
    if (!chosen) {
      save_picker.current?.click();
      return;
    }
    file_ref.current = chosen;
    set_saving(true);
    set_notice("");
    set_error("");
    try {
      await save_resume_profile(item.analysis_id, chosen);
      set_saved(true);
      set_notice(ENGLISH.resume_saved_to_your_profile);
    } catch (err) {
      set_saved(false);
      set_notice(err.message || ENGLISH.unable_to_save_this_resume_to_your_profile);
    } finally {
      set_saving(false);
    }
  }

  const active = step_index(step);

  return (
    <section className="sra_desk">
      <div className="sra_banner">
        <header className="sra_top">
          <ol className="sra_steps">
            {STEPS.map(([id, label], index) => (
              <li key={id} className={index < active ? "is_done" : index === active ? "is_on" : ""}>
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </header>

        <div className="sra_hero">
          <div className="sra_hero_copy">
            {step === "results" ? (
              <span className="sra_kicker"><i />{ENGLISH.results_ready}</span>
            ) : null}
            <h1>
              {step === "results" ? (
                <>{ENGLISH.resume_analysis}<span>{ENGLISH.complete}</span>
                </>
              ) : (
                ENGLISH.resume_analysis_2
              )}
            </h1>
            <p>
              {step === "results"
                ? ENGLISH.we_have_analyzed_your_resume_and_identified_your
                : ENGLISH.upload_a_resume_the_analysis_is_saved_for}
            </p>
            {step === "results" ? (
              <button type="button" className="sra_again" onClick={() => { set_step("upload"); set_error(""); }}>{ENGLISH.analyze_another_resume}<svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            ) : null}
          </div>
          <img className="sra_robot" src={robot_src} alt="" />
        </div>
      </div>

      {step !== "results" ? (
        <div className="sra_upload">
          <input
            ref={picker}
            type="file"
            accept=".pdf,.docx,.pptx,.txt,application/pdf"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              run_analyze(file);
            }}
          />
          <button type="button" className="sra_drop" onClick={() => picker.current?.click()} disabled={busy}>
            <b>{busy ? ENGLISH.analyzing_your_resume : ENGLISH.upload_resume}</b>
            <span>{file_name || ENGLISH.pdf_docx_pptx_or_txt}</span>
          </button>
          {error ? <p className="sra_notice">{error}</p> : null}
        </div>
      ) : (
        <>
          <input
            ref={save_picker}
            type="file"
            accept=".pdf,.docx,.pptx,.txt,application/pdf"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) run_save(file);
            }}
          />
          <Results_Panel
            item={item}
            skill_tab={skill_tab}
            on_skill_tab={set_skill_tab}
            saving={saving}
            saved={saved}
            notice={notice}
            on_save={() => set_confirm_save(true)}
            on_mock={() => on_mock_interview?.(file_ref.current, item?.analysis?.target_role || "")}
          />
        </>
      )}
      {confirm_save ? createPortal(
        <div
          className="sra_confirm_scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sra_confirm_title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) set_confirm_save(false);
          }}>
          <div className="sra_confirm">
            <img src={robot_src} alt="" />
            <h2 id="sra_confirm_title">{ENGLISH.this_replaces_your_profile}</h2>
            <p>{ENGLISH.the_headline_summary_skills_experience_projects_and_achievements}</p>
            <div>
              <button type="button" onClick={() => set_confirm_save(false)} disabled={saving}>{ENGLISH.not_now}</button>
              <button
                type="button"
                className="is_save"
                disabled={saving}
                onClick={() => {
                  set_confirm_save(false);
                  run_save();
                }}>
                {saving ? "Saving..." : ENGLISH.save_it}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
