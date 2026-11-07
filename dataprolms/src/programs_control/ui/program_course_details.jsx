import { useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import { Clock_Icon, Tag_Icon } from "../../admin_ui/row_actions.jsx";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../../constants/english/programs_control_constants_english.js";

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function Level_Icon() {
  return (
    <Icon>
      <path d="M5 19V11M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>
  );
}

function Pin_Icon() {
  return (
    <Icon>
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </Icon>
  );
}

function Key_Icon() {
  return (
    <Icon>
      <circle cx="8.5" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 12h8l-2 2.2 2 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function Copy_Icon() {
  return (
    <Icon>
      <rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </Icon>
  );
}

function Check_Icon() {
  return (
    <Icon>
      <path d="m5 12 5 5 9-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function Course_Thumb({ url, course_name }) {
  const [broken, set_broken] = useState(false);
  if (url && !broken) {
    return (
      <img
        className="prg_course_peek_cover_media"
        src={url}
        alt=""
        onError={() => set_broken(true)} />
    );
  }
  return (
    <span className="prg_course_peek_cover_media prg_course_peek_letter">
      {course_name?.slice(0, 1) || "C"}
    </span>
  );
}

async function copy_text(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function Program_Course_Details({ course }) {
  const programs = course?.programs || [];
  const [copied_id, set_copied_id] = useState(null);
  const description = String(course?.course_description || "").trim();
  const id_sample = course?.student_id_format ? `${course.student_id_format}-1` : "";
  const keyed_count = programs.filter((item) => String(item.enroll_passkey || "").trim()).length;

  async function copy_passkey(program) {
    const ok = await copy_text(program.enroll_passkey);
    if (!ok) return;
    set_copied_id(program.program_id);
    window.setTimeout(() => {
      set_copied_id((current) => current === program.program_id ? null : current);
    }, 1600);
  }

  return (
    <div className="prg_course_peek">
      <header className="prg_course_peek_cover">
        <Course_Thumb url={course?.thumbnail_url} course_name={course?.course_name} />
        <div className="prg_course_peek_veil" />
        <div className="prg_course_peek_cover_copy">
          <span className={course?.is_active ? "prg_course_peek_live is_on" : "prg_course_peek_live"}>
            {course?.is_active ? ENGLISH.active : ENGLISH.inactive_2}
          </span>
          <h3>{course?.course_name}</h3>
          <p>{course?.course_code}</p>
        </div>
      </header>

      <div className="prg_course_peek_body">
        <ul className="prg_course_peek_stats">
          <li>
            <span className="prg_course_peek_stat_icon" aria-hidden="true"><Tag_Icon /></span>
            <small>{ENGLISH.type}</small>
            <b>{course?.course_type || "—"}</b>
          </li>
          <li>
            <span className="prg_course_peek_stat_icon" aria-hidden="true"><Clock_Icon /></span>
            <small>{ENGLISH.duration}</small>
            <b>{course?.duration_hours != null ? ENGLISH.hrs(course.duration_hours) : "—"}</b>
          </li>
          <li>
            <span className="prg_course_peek_stat_icon" aria-hidden="true"><Level_Icon /></span>
            <small>{ENGLISH.level}</small>
            <b>{course?.level || "—"}</b>
          </li>
          <li>
            <span className="prg_course_peek_stat_icon" aria-hidden="true"><Pin_Icon /></span>
            <small>{ENGLISH.delivery}</small>
            <b>{course?.is_offline ? ENGLISH.offline_2 : ENGLISH.online}</b>
          </li>
        </ul>

        {course?.is_offline ?
          <section className="prg_course_peek_id">
            <span className="prg_course_peek_id_mark" aria-hidden="true">{ENGLISH.id}</span>
            <div>
              <small>{ENGLISH.student_id_format}</small>
              <b>{id_sample || ENGLISH.not_set}</b>
            </div>
          </section> :
          null}

        <section className="prg_course_peek_vault">
          <div className="prg_course_peek_vault_head">
            <div>
              <h4>{ENGLISH.programs_passkeys}</h4>
              <p>
                {programs.length ?
                  ENGLISH.program_passkey_2(programs.length, programs.length === 1 ? "" : "s", keyed_count, keyed_count === 1 ? "" : "s") :
                  ENGLISH.no_programs_linked_yet}
              </p>
            </div>
          </div>
          {programs.length ?
            <ul className="prg_course_peek_keys">
              {programs.map((program) => {
                const key = String(program.enroll_passkey || "").trim();
                const copied = copied_id === program.program_id;
                return (
                  <li key={program.program_id} className={key ? "prg_course_peek_key" : "prg_course_peek_key is_empty"}>
                    <span className="prg_course_peek_key_icon" aria-hidden="true"><Key_Icon /></span>
                    <div className="prg_course_peek_key_copy">
                      <b>{program.program_name}</b>
                      <small>{program.is_active === false ? ENGLISH.inactive_2 : ENGLISH.assigned}</small>
                    </div>
                    {key ?
                      <button
                        type="button"
                        className={copied ? "prg_course_peek_key_code is_copied" : "prg_course_peek_key_code"}
                        onClick={() => copy_passkey(program)}
                        title={ENGLISH.copy_passkey}>
                        <code>{key}</code>
                        {copied ? <Check_Icon /> : <Copy_Icon />}
                      </button> :
                      <span className="prg_course_peek_key_wait">{ENGLISH.no_passkey}</span>}
                  </li>
                );
              })}
            </ul> :
            <p className="prg_course_peek_empty">{ENGLISH.assign_this_course_to_a_program_to_issue}</p>}
        </section>

        {description ?
          <section className="prg_course_peek_note">
            <small>{ENGLISH.about_this_course}</small>
            <p><Link_Text text={description} /></p>
          </section> :
          null}
      </div>
    </div>
  );
}
