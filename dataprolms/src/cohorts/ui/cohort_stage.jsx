import { Button } from "@datapromr/button";
import { Link_Text } from "../../design_system/link_text.jsx";
import { SearchInput } from "@datapromr/search-input";
import { COPY } from "../constants.js";
import { format_day, format_range } from "../utils.js";
import { COHORTS_ENGLISH as ENGLISH } from "../../constants/english/cohorts_constants_english.js";

const TABS = [
  ["programs", COPY.programs],
  ["details", COPY.details]
];

function Tab_Icon({ id }) {
  if (id === "details") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4.5h7.5L19 9v10.5H7V4.5Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14 4.5V9h5M9.5 13h5M9.5 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7.5h14M5 12h14M5 16.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Image_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="m7 16 3.2-3.2a1 1 0 0 1 1.4 0L16 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function People_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 17.5c.4-2.4 2-3.6 4.2-3.6s3.8 1.2 4.2 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 13.4c1.4.2 2.6 1.1 3 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Stack_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4 4 8l8 4 8-4-8-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function Calendar_Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 10h16M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Cohort_Details({ cohort, roster }) {
  const enrolled = roster.reduce((sum, program) => sum + (Number(program.enrolled) || 0), 0);
  const starts = roster.map((program) => program.start_date).filter(Boolean).sort();
  const ends = roster.map((program) => program.end_date).filter(Boolean).sort();
  const window_label = starts.length || ends.length ? format_range(starts[0], ends.at(-1)) : ENGLISH.dates_not_set;
  return (
    <div className="cht_details">
      <ul className="cht_facts">
        <li>
          <span><Stack_Icon /></span>
          <small>{ENGLISH.programs}</small>
          <b>{cohort.program_count}</b>
        </li>
        <li>
          <span><People_Icon /></span>
          <small>{ENGLISH.enrolled}</small>
          <b>{enrolled}</b>
        </li>
        <li>
          <span><Calendar_Icon /></span>
          <small>{ENGLISH.runs}</small>
          <b>{window_label}</b>
        </li>
      </ul>
      <article className="cht_about">
        <h3>{cohort.cohort_name}</h3>
        <p><Link_Text text={cohort.description || ENGLISH.no_description_yet} /></p>
      </article>
      <section className="cht_lineup">
        <h3>{ENGLISH.programs_in_this_cohort}</h3>
        {roster.length ?
          <ul>
            {roster.map((program) =>
              <li key={program.program_id}>
                <div>
                  <b>{program.program_name}</b>
                  <small>{[program.program_type, program.duration_months ? ENGLISH.months(program.duration_months) : ""].filter(Boolean).join(" · ") || ENGLISH.program}</small>
                </div>
                <em>{format_range(program.start_date, program.end_date)}</em>
                <strong>{program.enrolled}{ENGLISH.enrolled_2}</strong>
              </li>
            )}
          </ul> :
          <p>{ENGLISH.no_programs_in_this_cohort_yet}</p>}
      </section>
    </div>
  );
}

export function Cohort_Stage({
  cohort,
  programs,
  tab,
  can_edit,
  program_query,
  on_tab,
  on_program_query,
  on_edit_cohort,
  on_delete_cohort,
  on_create_program,
  on_edit_program,
  on_delete_program,
  roster
}) {
  return (
    <section className="cht_stage">
      <header className="cht_hero">
        {cohort.thumbnail_url ?
          <img className="cht_hero_banner" src={cohort.thumbnail_url} alt="" /> :
          <span className="cht_hero_fallback"><Image_Icon /></span>}
        <div className="cht_hero_shade" />
        <div className="cht_hero_profile">
          {cohort.profile_url ?
            <img src={cohort.profile_url} alt="" /> :
            <Image_Icon />}
        </div>
        {can_edit ?
          <div className="cht_hero_actions">
            <button type="button" aria-label={ENGLISH.edit_cohort_2} onClick={on_edit_cohort}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20h4l11-11-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m13 7 4 4" stroke="currentColor" strokeWidth="1.6" />
              </svg>{ENGLISH.edit_cohort_3}</button>
            <button type="button" className="is_danger" aria-label={ENGLISH.delete_cohort} onClick={on_delete_cohort}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>{ENGLISH.delete_cohort_3}</button>
          </div> :
          null}
        <div className="cht_hero_copy">
          <h2>{cohort.cohort_name}</h2>
          {cohort.description ? <p><Link_Text text={cohort.description} /></p> : null}
        </div>
      </header>

      <div className="cht_tabs_row">
        <div className="cht_tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "is_on" : undefined}
              onClick={() => on_tab(id)}>
              <Tab_Icon id={id} />
              {label}
            </button>
          ))}
        </div>
        {tab === "programs" ?
          <div className="cht_stage_actions">
            <SearchInput
              id="cohort_program_search"
              value={program_query}
              placeholder={COPY.searchPrograms}
              onChange={on_program_query} />
            {can_edit ?
              <Button type="button" onClick={on_create_program}>{COPY.addProgram}</Button> :
              null}
          </div> :
          null}
      </div>

      {tab === "programs" ?
        <div className="cht_programs">
          <div className="cht_cards">
            {programs.map((program) => (
              <article key={program.program_id} className="cht_card">
                <div className="cht_card_media">
                  {program.thumbnail_url ?
                    <img src={program.thumbnail_url} alt="" /> :
                    <span><Image_Icon /></span>}
                </div>
                <div className="cht_card_copy">
                  <h4>{program.program_name}</h4>
                  <p className="cht_card_dates">
                    {program.start_date ?
                      <span><Calendar_Icon />{format_day(program.start_date)}</span> :
                      null}
                    {program.end_date ?
                      <span><Calendar_Icon />{format_day(program.end_date)}</span> :
                      null}
                    {!program.start_date && !program.end_date ? ENGLISH.dates_not_set : null}
                  </p>
                  <p className="cht_card_desc"><Link_Text text={program.description || ENGLISH.no_description_yet} /></p>
                  <p className="cht_card_enrolled">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="9" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M4.8 17.5c.4-2.4 2-3.6 4.2-3.6s3.8 1.2 4.2 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <circle cx="16" cy="9" r="1.8" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M15 13.4c1.4.2 2.6 1.1 3 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    {program.enrolled}{ENGLISH.enrolled_3}</p>
                </div>
                {can_edit ?
                  <div className="cht_card_actions">
                    <button type="button" onClick={() => on_edit_program(program)}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 20h4l11-11-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        <path d="m13 7 4 4" stroke="currentColor" strokeWidth="1.6" />
                      </svg>{ENGLISH.edit}</button>
                    <button type="button" className="is_danger" onClick={() => on_delete_program(program)}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>{ENGLISH.label_delete_2}</button>
                  </div> :
                  null}
              </article>
            ))}
          </div>
          {can_edit ?
            <button type="button" className="cht_add_bar" onClick={on_create_program}>
              <span className="cht_add_plus" aria-hidden="true">+</span>
              <strong>{COPY.addNew}</strong>
              <small>{COPY.addNewHint}</small>
            </button> :
            null}
          {programs.length || can_edit ? null : <p className="cht_empty">{COPY.emptyPrograms}</p>}
        </div> :
        null}

      {tab === "details" ? <Cohort_Details cohort={cohort} roster={roster || programs} /> : null}
    </section>
  );
}
