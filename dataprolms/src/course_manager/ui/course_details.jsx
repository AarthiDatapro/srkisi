import { useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import { format_date, pretty_date } from "../../design_system/format.js";
import { Button } from "@datapromr/button";
import { Clock_Icon, Edit_Icon, Link_Icon, Tag_Icon } from "../../admin_ui/row_actions.jsx";
import { COPY } from "../constants.js";
import { Course_Thumb } from "./course_thumb.jsx";
import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_manager_constants_english.js";

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

function Users_Icon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.8 17.2c.6-2.2 2.2-3.4 4.2-3.4s3.6 1.2 4.2 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.2 13.8c1.6.2 2.8 1.2 3.4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function fee_label(course) {
  if (!course.is_paid) return ENGLISH.free;
  const fee = Number(course.fee_amount) || 0;
  const discount = Number(course.discount_percent) || 0;
  const sale = discount ? Math.round(fee * (100 - discount)) / 100 : fee;
  return discount ? ENGLISH.off(money(sale), discount) : money(sale);
}

function split_overview(text) {
  const lines = String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const points = [];
  const prose = [];
  for (const line of lines) {
    if (/^[•\-*]/.test(line)) points.push(line.replace(/^[•\-*]\s*/, ""));
    else prose.push(line);
  }
  return { prose: prose.join(" "), points };
}

function program_meta(program) {
  const cohorts = (program.cohorts || []).map((item) => item.cohort_name).filter(Boolean);
  const cohort = cohorts.length ? cohorts.join(", ") : program.cohort_name;
  const start = program.start_date ? pretty_date(program.start_date) : "";
  const end = program.end_date ? pretty_date(program.end_date) : "";
  const dated = [start, end].filter((value) => value && value !== "—");
  const dates = dated.length === 2 ? `${dated[0]} – ${dated[1]}` : dated[0] || "";
  return [
    cohort,
    program.program_code,
    program.program_type,
    program.duration_months ? ENGLISH.months(program.duration_months) : "",
    dates
  ].filter(Boolean).join(" · ");
}

function Point_List({ label, points }) {
  if (!points.length) return null;
  return (
    <section className="crs_peek_note">
      <small>{label}</small>
      <ul className="crs_peek_points">
        {points.map((point) => <li key={point}><Link_Text text={point} /></li>)}
      </ul>
    </section>
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

export function Course_Details({ course, on_edit, on_assign, on_passkey }) {
  const programs = course.programs || [];
  const [copied_id, set_copied_id] = useState(null);
  const overview = split_overview(course.course_description);
  const learn = (course.learn_points || []).map((point) => String(point || "").trim()).filter(Boolean);
  const audience = (course.audience_points || []).map((point) => String(point || "").trim()).filter(Boolean);
  const languages = course.languages || [];
  const opened = course.created_at ? format_date(course.created_at) : "";
  const id_sample = course.student_id_format ? `${course.student_id_format}-1` : "";
  const keyed_count = programs.filter((item) => String(item.enroll_passkey || "").trim()).length;
  const catalog = [
    course.course_domain,
    course.course_tag,
    course.is_open ? ENGLISH.open_course : ENGLISH.closed_course,
    fee_label(course),
    languages.length ? languages.join(", ") : "",
    course.real_world_project_count != null ? ENGLISH.projects(course.real_world_project_count) : "",
    course.has_completion_certificate ? ENGLISH.certificate : "",
    opened && opened !== "—" ? ENGLISH.opened(opened) : "",
    course.created_by_display
  ].filter(Boolean);

  async function copy_passkey(program) {
    const ok = await copy_text(program.enroll_passkey);
    if (!ok) return;
    set_copied_id(program.program_id);
    window.setTimeout(() => {
      set_copied_id((current) => (current === program.program_id ? null : current));
    }, 1600);
  }

  return (
    <div className="crs_peek">
      <header className="crs_peek_cover">
        <Course_Thumb
          url={course.thumbnail_url}
          course_name={course.course_name}
          className="crs_peek_cover_media"
        />
        <div className="crs_peek_veil" />
        <div className="crs_peek_cover_copy">
          <span className={course.is_active ? "crs_peek_live is_on" : "crs_peek_live"}>
            {course.is_active ? ENGLISH.active : ENGLISH.inactive}
          </span>
          <h3>{course.course_name}</h3>
          <p>{course.course_code}</p>
          {course.course_tagline ?
            <em><Link_Text text={course.course_tagline} /></em> :
            null}
        </div>
      </header>

      <div className="crs_peek_body">
        <ul className="crs_peek_stats">
          <li>
            <span className="crs_peek_stat_icon" aria-hidden="true"><Tag_Icon /></span>
            <small>{ENGLISH.type}</small>
            <b>{course.course_type || "—"}</b>
          </li>
          <li>
            <span className="crs_peek_stat_icon" aria-hidden="true"><Clock_Icon /></span>
            <small>{ENGLISH.duration}</small>
            <b>{course.duration_hours != null ? ENGLISH.hrs(course.duration_hours) : "—"}</b>
          </li>
          <li>
            <span className="crs_peek_stat_icon" aria-hidden="true"><Level_Icon /></span>
            <small>{ENGLISH.level}</small>
            <b>{course.level || "—"}</b>
          </li>
          <li>
            <span className="crs_peek_stat_icon" aria-hidden="true"><Pin_Icon /></span>
            <small>{ENGLISH.delivery}</small>
            <b>{course.is_offline ? ENGLISH.offline : ENGLISH.online}</b>
          </li>
          <li>
            <span className="crs_peek_stat_icon" aria-hidden="true"><Users_Icon /></span>
            <small>{ENGLISH.enrolled}</small>
            <b>{course.enrolled_count || 0}</b>
          </li>
        </ul>

        {course.is_offline ?
          <section className="crs_peek_id">
            <span className="crs_peek_id_mark" aria-hidden="true">{ENGLISH.id}</span>
            <div>
              <small>{ENGLISH.student_id_format}</small>
              <b>{id_sample || ENGLISH.not_set}</b>
            </div>
          </section> :
          null}

        <section className="crs_peek_vault">
          <div className="crs_peek_vault_head">
            <div>
              <h4>{ENGLISH.programs_passkeys}</h4>
              <p>
                {programs.length ?
                  ENGLISH.program_passkey_2(programs.length, programs.length === 1 ? "" : "s", keyed_count, keyed_count === 1 ? "" : "s") :
                  ENGLISH.no_programs_linked_yet}
              </p>
            </div>
            {on_passkey && course.is_offline ?
              <button type="button" className="crs_peek_textbtn" onClick={on_passkey}>{ENGLISH.edit_passkeys}</button> :
              null}
          </div>

          {programs.length ?
            <ul className="crs_peek_keys">
              {programs.map((program) => {
                const key = String(program.enroll_passkey || "").trim();
                const copied = copied_id === program.program_id;
                return (
                  <li key={program.program_id} className={key ? "crs_peek_key" : "crs_peek_key is_empty"}>
                    <span className="crs_peek_key_icon" aria-hidden="true"><Key_Icon /></span>
                    <div className="crs_peek_key_copy">
                      <b>{program.program_name}</b>
                      <small>{program.is_active === false ? ENGLISH.inactive : ENGLISH.assigned}</small>
                      {program_meta(program) ? <em>{program_meta(program)}</em> : null}
                    </div>
                    {key ?
                      <button
                        type="button"
                        className={copied ? "crs_peek_key_code is_copied" : "crs_peek_key_code"}
                        onClick={() => copy_passkey(program)}
                        title={ENGLISH.copy_passkey}>
                        <code>{key}</code>
                        {copied ? <Check_Icon /> : <Copy_Icon />}
                      </button> :
                      <span className="crs_peek_key_wait">{ENGLISH.no_passkey}</span>}
                  </li>
                );
              })}
            </ul> :
            <p className="crs_peek_empty">{ENGLISH.assign_this_course_to_a_program_to_issue}</p>}
        </section>

        <section className="crs_peek_note">
          <small>{ENGLISH.catalog}</small>
          <p>{catalog.join(" · ") || ENGLISH.catalog_details_are_not_set_yet}</p>
        </section>

        {overview.prose || overview.points.length ?
          <section className="crs_peek_note">
            <small>{ENGLISH.about_this_course}</small>
            {overview.prose ? <p><Link_Text text={overview.prose} /></p> : null}
            {overview.points.length ?
              <ul className="crs_peek_points">
                {overview.points.map((point) => <li key={point}><Link_Text text={point} /></li>)}
              </ul> :
              null}
          </section> :
          null}

        <Point_List label={ENGLISH.what_you_ll_learn} points={learn} />
        <Point_List label={ENGLISH.who_this_is_for} points={audience} />
      </div>

      <div className="crs_peek_foot">
        <Button type="button" variant="ghost" onClick={on_assign}>
          <Link_Icon />
          {COPY.assign}
        </Button>
        <Button type="button" onClick={on_edit}>
          <Edit_Icon />
          {COPY.edit}
        </Button>
      </div>
    </div>
  );
}
