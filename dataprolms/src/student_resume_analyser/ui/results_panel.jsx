import { STUDENT_RESUME_ANALYSER_ENGLISH as ENGLISH } from "../../constants/english/student_resume_analyser_constants_english.js";
function list_of(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function score_label(score) {
  const value = Number(score) || 0;
  if (value >= 80) return ENGLISH.good_resume;
  if (value >= 60) return ENGLISH.fair_resume;
  return ENGLISH.needs_work;
}

function split_cert(line) {
  const parts = String(line).split(/\s+[—–-]\s+/);
  if (parts.length < 2) return { title: line, meta: "" };
  return { title: parts[0], meta: parts.slice(1).join(" — ") };
}

function Chip_Mark() {
  return (
    <svg className="sra_chip_icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8 4.5 12 8 16M16 8l3.5 4L16 16M13 6l-2 12" />
    </svg>
  );
}

function initial_of(name) {
  const text = String(name || "").trim();
  return text ? text.charAt(0).toUpperCase() : "R";
}

function Score_Ring({ score }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const dash = (value / 100) * circ;
  return (
    <div className="sra_ring_wrap">
      <svg className="sra_ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle className="sra_ring_track" cx="60" cy="60" r={radius} />
        <circle
          className="sra_ring_value"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={`${dash} ${circ - dash}`}
        />
      </svg>
      <span className="sra_ring_num">
        <b>{Math.round(value)}</b>
        <small>/ 100</small>
      </span>
    </div>
  );
}

function File_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V9h5.5" />
    </svg>
  );
}

function Doc_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h7l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.8V8.5h4.2M8.5 12.5h7M8.5 16h5" />
    </svg>
  );
}

function Brief_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V6.2A1.7 1.7 0 0 1 10.7 4.5h2.6A1.7 1.7 0 0 1 15 6.2v1.3M3.5 12.5h17" />
    </svg>
  );
}

function Cap_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10 12 5.5 21 10 12 14.5 3 10Z" />
      <path d="M7 12.2V16c1.4 1.4 3 2 5 2s3.6-.6 5-2v-3.8" />
    </svg>
  );
}

function Folder_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 8.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-6.2L10.8 6H5.5a2 2 0 0 0-2 2.5Z" />
    </svg>
  );
}

function Ribbon_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="4.2" />
      <path d="M9.2 12.6 8 20l4-2.2L16 20l-1.2-7.4" />
    </svg>
  );
}

function Check_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12.2 2.3 2.3 4.7-5" />
    </svg>
  );
}

function Warn_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5M12 16.2h.01" />
    </svg>
  );
}

function Pin_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

function Spark_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 13.6 9 19 10.5 13.6 12 12 17.5 10.4 12 5 10.5 10.4 9 12 3.5Z" />
    </svg>
  );
}

function Save_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10M8 10.5 12 14.5 16 10.5" />
      <path d="M5 16.5v2A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </svg>
  );
}

function Chat_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6.5h12A1.5 1.5 0 0 1 19.5 8v6A1.5 1.5 0 0 1 18 15.5H10l-4 3v-3H6A1.5 1.5 0 0 1 4.5 14V8A1.5 1.5 0 0 1 6 6.5Z" />
    </svg>
  );
}

function Arrow_Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 12h12M13.5 7.5 18 12l-4.5 4.5" />
    </svg>
  );
}

function Meter({ label, score, tone, icon }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <article className={`sra_meter is_${tone}`}>
      <span className="sra_meter_icon">{icon}</span>
      <div>
        <small>{label}</small>
        <b>{Math.round(value)} / 100</b>
        <span className="sra_meter_bar"><i style={{ width: `${value}%` }} /></span>
      </div>
    </article>
  );
}

export function Results_Panel({
  item,
  skill_tab,
  on_skill_tab,
  saving,
  saved,
  notice,
  on_save,
  on_mock
}) {
  const analysis = item?.analysis || {};
  const skills = list_of(analysis.skills);
  const technical = list_of(analysis.technical_skills);
  const soft = list_of(analysis.soft_skills);
  const projects = list_of(analysis.projects);
  const certifications = list_of(analysis.certifications);
  const education = list_of(analysis.education);
  const strengths = list_of(analysis.strengths);
  const gaps = list_of(analysis.areas_for_improvement);
  const missing = list_of(analysis.missing_resume_sections);
  const recommendations = list_of(analysis.recommendations);
  const chips = skill_tab === "technical" ? technical : skill_tab === "other" ? soft : skills;

  return (
    <div className="sra_results">
      <section className="sra_top_grid">
        <div className="sra_col">
          <div className="sra_file">
            <span className="sra_file_mark">{ENGLISH.pdf}</span>
            <div>
              <b>{item.file_name || ENGLISH.resume}</b>
              <small>{ENGLISH.uploaded_successfully}</small>
            </div>
          </div>

          <article className="sra_card sra_identity">
            <span className="sra_avatar">{initial_of(analysis.candidate_name)}</span>
            <div>
              <h2>{analysis.candidate_name || ENGLISH.candidate}</h2>
              <p>{analysis.current_or_recent_role || ENGLISH.role_not_listed}</p>
            </div>
            {analysis.professional_summary ? (
              <blockquote>
                <span aria-hidden="true">“</span>
                {analysis.professional_summary}
              </blockquote>
            ) : null}
          </article>

          <article className="sra_card sra_fact">
            <span className="sra_fact_icon"><Brief_Icon /></span>
            <div>
              <small>{ENGLISH.total_experience}</small>
              <p>{analysis.total_experience || ENGLISH.not_listed}</p>
            </div>
          </article>

          <article className="sra_card sra_fact">
            <span className="sra_fact_icon"><Doc_Icon /></span>
            <div>
              <small>{ENGLISH.current_recent_role}</small>
              <p>{analysis.current_or_recent_role || ENGLISH.not_listed}</p>
            </div>
          </article>

          <article className="sra_card sra_fact">
            <span className="sra_fact_icon"><Cap_Icon /></span>
            <div>
              <small>{ENGLISH.education}</small>
              {education.length ? education.map((line) => <p key={line}>{line}</p>) : <p>{ENGLISH.not_listed}</p>}
            </div>
          </article>

        </div>

        <div className="sra_col">
          <article className="sra_card sra_score">
            <Score_Ring score={analysis.overall_score} />
            <div className="sra_score_copy">
              <h3>{ENGLISH.overall_resume_score}</h3>
              <span className="sra_badge">{score_label(analysis.overall_score)}</span>
              <p>
                <span className="sra_score_float" aria-hidden="true" />
                {analysis.feedback || ENGLISH.analysis_complete}
              </p>
            </div>
            <div className="sra_meters">
              <Meter label={ENGLISH.clarity_score} score={analysis.clarity_score} tone="clarity" icon={<Doc_Icon />} />
              <Meter label={ENGLISH.completeness_score} score={analysis.completeness_score} tone="complete" icon={<Check_Icon />} />
              <Meter label={ENGLISH.impact_score} score={analysis.impact_score} tone="impact" icon={<Spark_Icon />} />
            </div>
          </article>

          <article className="sra_card">
            <header className="sra_card_head sra_split">
              <span className="sra_head_title"><Spark_Icon /><h3>{ENGLISH.key_skills}</h3></span>
              <div className="sra_tabs" role="tablist">
                {[
                  ["all", ENGLISH.all_skills, ENGLISH.all],
                  ["technical", ENGLISH.technical, ENGLISH.technical],
                  ["other", ENGLISH.other, ENGLISH.other]
                ].map(([id, label, short_label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={skill_tab === id}
                    className={skill_tab === id ? "is_on" : ""}
                    onClick={() => on_skill_tab(id)}
                  >
                    <span className="sra_tab_full">{label}</span>
                    <span className="sra_tab_short">{short_label}</span>
                  </button>
                ))}
              </div>
            </header>
            {chips.length ? (
              <ul className="sra_chips">
                {chips.map((name) => <li key={name}>{name}</li>)}
              </ul>
            ) : <p className="sra_empty">{ENGLISH.none_listed}</p>}
          </article>

          <article className="sra_card">
            <header className="sra_card_head">
              <File_Icon />
              <h3>{ENGLISH.technical_skills}</h3>
            </header>
            {technical.length ? (
              <ul className="sra_chips is_tech">
                {technical.map((name) => (
                  <li key={name}><Chip_Mark />{name}</li>
                ))}
              </ul>
            ) : <p className="sra_empty">{ENGLISH.none_listed}</p>}
          </article>

        </div>
      </section>

      <section className="sra_low_grid">
        <article className="sra_card">
          <header className="sra_card_head">
            <Folder_Icon />
            <h3>{ENGLISH.projects}{projects.length})</h3>
          </header>
          {projects.length ? (
            <ol className="sra_projects">
              {projects.map((name, index) => (
                <li key={name}>
                  <span className="sra_project_no">{String(index + 1).padStart(2, "0")}</span>
                  <span>{name}</span>
                </li>
              ))}
            </ol>
          ) : <p className="sra_empty">{ENGLISH.no_projects_listed}</p>}
        </article>

        <div className="sra_col">
          <article className="sra_card sra_cert_card">
            <header className="sra_card_head">
              <Ribbon_Icon />
              <h3>{ENGLISH.certifications}{certifications.length})</h3>
            </header>
            {certifications.length ? (
              <ul className="sra_certs">
                {certifications.map((line) => {
                  const cert = split_cert(line);
                  return (
                    <li key={line}>
                      <span className="sra_cert_mark"><Ribbon_Icon /></span>
                      <span>
                        <b>{cert.title}</b>
                        {cert.meta ? <small>{cert.meta}</small> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="sra_empty">{ENGLISH.no_certifications_listed}</p>}
          </article>

          <article className="sra_card">
            <header className="sra_card_head">
              <Pin_Icon />
              <h3>{ENGLISH.recommendations}</h3>
            </header>
            {recommendations.length ? (
              <ol className="sra_recs">
                {recommendations.map((line) => <li key={line}>{line}</li>)}
              </ol>
            ) : <p className="sra_empty">{ENGLISH.no_recommendations}</p>}
          </article>
        </div>

        <div className="sra_col">
          <article className="sra_card is_strength">
            <header className="sra_card_head">
              <Check_Icon />
              <h3>{ENGLISH.strengths}</h3>
            </header>
            {strengths.length ? (
              <ul className="sra_checks">
                {strengths.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : <p className="sra_empty">{ENGLISH.none_listed}</p>}
          </article>

          <article className="sra_card is_gap">
            <header className="sra_card_head">
              <Warn_Icon />
              <h3>{ENGLISH.areas_for_improvement}</h3>
            </header>
            {gaps.length ? (
              <ul className="sra_alerts">
                {gaps.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : <p className="sra_empty">{ENGLISH.none_listed}</p>}
          </article>

          <article className="sra_card is_missing">
            <header className="sra_card_head">
              <Warn_Icon />
              <h3>{ENGLISH.missing_resume_sections}</h3>
            </header>
            {missing.length ? (
              <ul className="sra_pills">
                {missing.map((name) => <li key={name}>{name}</li>)}
              </ul>
            ) : <p className="sra_empty">{ENGLISH.no_missing_sections}</p>}
          </article>
        </div>
      </section>

      <section className="sra_next">
        <div className="sra_next_copy">
          <span className="sra_next_mark"><Doc_Icon /></span>
          <div>
            <h3>{ENGLISH.what_would_you_like_to_do_next}</h3>
            <p>{ENGLISH.take_the_next_step_in_your_career_journey}</p>
          </div>
        </div>
        <button type="button" className="sra_save" onClick={on_save} disabled={saving}>
          <Save_Icon />
          <span>
            <b>{saving ? "Saving..." : saved ? ENGLISH.saved_to_my_profile : ENGLISH.save_to_my_profile}</b>
            <small>{ENGLISH.keep_this_analysis_in_your_profile_for_future}</small>
          </span>
          <Arrow_Icon />
        </button>
        <button type="button" className="sra_mock" onClick={on_mock}>
          <Chat_Icon />
          <span>
            <b>{ENGLISH.take_a_mock_interview}</b>
            <small>{ENGLISH.generate_personalized_interview_questions}</small>
          </span>
          <Arrow_Icon />
        </button>
      </section>
      {notice ? <p className={`sra_notice${saved ? " is_ok" : ""}`}>{notice}</p> : null}
    </div>
  );
}
