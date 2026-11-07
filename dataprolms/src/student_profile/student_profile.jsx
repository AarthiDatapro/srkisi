import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@datapromr/empty-state";
import { useToast } from "@datapromr/toast";
import { get_student_profile, update_ollama_api_key, update_student_photo, delete_student_photo, update_student_profile } from "./api.js";
import {
  COPY,
  empty_achievements,
  empty_experiences,
  empty_form,
  empty_links,
  empty_projects,
  empty_skills,
  OLLAMA_API_KEY_MANUAL_URL } from
"./constants.js";
import { Career_Panel } from "./ui/career_panel.jsx";
import { Field, Profile_Form } from "./ui/profile_form.jsx";
import { Links_Editor, Links_View } from "./ui/links_panel.jsx";
import { Camera_Icon, Close_Small_Icon, Eye_Icon, Eye_Off_Icon, Mail_Icon, Manual_Link_Icon, Pen_Icon, Phone_Icon, Pin_Icon } from "./ui/icons.jsx";
import { display_name, format_dob, format_joined, initials, profile_dob_error } from "./utils.js";
import "./theme/profile.css";
import "./theme/career.css";
import { STUDENT_PROFILE_ENGLISH as ENGLISH } from "../constants/english/student_profile_constants_english.js";

export function Student_Profile() {
  const toast = useToast();
  const file_ref = useRef(null);
  const [student, set_student] = useState(null);
  const [form, set_form] = useState(empty_form());
  const [links, set_links] = useState([]);
  const [saved_links, set_saved_links] = useState([]);
  const [skills, set_skills] = useState([]);
  const [saved_skills, set_saved_skills] = useState([]);
  const [experiences, set_experiences] = useState([]);
  const [saved_experiences, set_saved_experiences] = useState([]);
  const [projects, set_projects] = useState([]);
  const [saved_projects, set_saved_projects] = useState([]);
  const [achievements, set_achievements] = useState([]);
  const [saved_achievements, set_saved_achievements] = useState([]);
  const [editing, set_editing] = useState(false);
  const [career_editing, set_career_editing] = useState(false);
  const [form_errors, set_form_errors] = useState({});
  const [career_tab, set_career_tab] = useState("skills");
  const [photo_open, set_photo_open] = useState(false);
  const [pending_photo, set_pending_photo] = useState(null);
  const [pending_url, set_pending_url] = useState("");
  const [loading, set_loading] = useState(true);
  const [saving, set_saving] = useState(false);
  const [api_key_draft, set_api_key_draft] = useState("");
  const [api_key_saving, set_api_key_saving] = useState(false);
  const [show_api_key, set_show_api_key] = useState(false);

  function apply_lists(data) {
    const next_links = empty_links(data.links);
    const next_skills = empty_skills(data.skills);
    const next_experiences = empty_experiences(data.experiences);
    const next_projects = empty_projects(data.projects);
    const next_achievements = empty_achievements(data.achievements);
    set_links(next_links);
    set_saved_links(next_links);
    set_skills(next_skills);
    set_saved_skills(next_skills);
    set_experiences(next_experiences);
    set_saved_experiences(next_experiences);
    set_projects(next_projects);
    set_saved_projects(next_projects);
    set_achievements(next_achievements);
    set_saved_achievements(next_achievements);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await get_student_profile();
        if (!alive) return;
        set_student(data.student || null);
        set_form(empty_form(data.student));
        apply_lists(data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        if (alive) set_loading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!photo_open) return undefined;
    function on_key(event) {
      if (event.key === ENGLISH.escape) set_photo_open(false);
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [photo_open]);

  function apply_payload(data) {
    set_student(data.student || null);
    set_form(empty_form(data.student));
    apply_lists(data);
    set_api_key_draft("");
    set_show_api_key(false);
  }

  function reset_editing() {
    set_form(empty_form(student));
    set_links(empty_links(saved_links));
    set_skills(empty_skills(saved_skills));
    set_experiences(empty_experiences(saved_experiences));
    set_projects(empty_projects(saved_projects));
    set_achievements(empty_achievements(saved_achievements));
    set_editing(false);
    set_career_editing(false);
    set_form_errors({});
  }

  async function save_profile(event) {
    event.preventDefault();
    const dob_error = profile_dob_error(form.date_of_birth);
    if (dob_error) {
      set_form_errors({ date_of_birth: dob_error });
      toast.error(dob_error);
      return;
    }
    set_form_errors({});
    set_saving(true);
    try {
      apply_payload(
        await update_student_profile({
          ...form,
          links,
          skills,
          experiences,
          projects,
          achievements
        })
      );
      set_editing(false);
      set_career_editing(false);
      toast.success(COPY.saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function save_api_key(event) {
    event.preventDefault();
    const value = String(api_key_draft || "").trim();
    if (!value) {
      toast.error(COPY.aiKeyPlaceholder);
      return;
    }
    set_api_key_saving(true);
    try {
      apply_payload(await update_ollama_api_key(value));
      toast.success(COPY.aiKeyOk);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_api_key_saving(false);
    }
  }

  async function clear_api_key() {
    set_api_key_saving(true);
    try {
      apply_payload(await update_ollama_api_key(""));
      toast.success(COPY.aiKeyRemoved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_api_key_saving(false);
    }
  }

  useEffect(() => {
    if (!pending_photo) {
      set_pending_url("");
      return undefined;
    }
    const url = URL.createObjectURL(pending_photo);
    set_pending_url(url);
    return () => URL.revokeObjectURL(url);
  }, [pending_photo]);

  function choose_photo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    set_pending_photo(file);
  }

  function clear_pending_photo() {
    set_pending_photo(null);
  }

  async function save_photo() {
    if (!pending_photo) return;
    set_saving(true);
    try {
      apply_payload(await update_student_photo(pending_photo));
      set_pending_photo(null);
      toast.success(COPY.photoOk);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function remove_saved_photo() {
    set_saving(true);
    try {
      apply_payload(await delete_student_photo());
      set_photo_open(false);
      toast.success(COPY.photoRemoved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }

  async function save_career(changes) {
    set_saving(true);
    try {
      apply_payload(
        await update_student_profile({
          ...empty_form(student),
          links: saved_links,
          skills: saved_skills,
          experiences: saved_experiences,
          projects: saved_projects,
          achievements: saved_achievements,
          ...changes
        })
      );
      set_career_editing(false);
      toast.success(COPY.saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_saving(false);
    }
  }
  if (loading) {
    return (
      <section className="stp_desk">
        <p className="stp_empty">{ENGLISH.loading_your_profile}</p>
      </section>);

  }

  if (!student) {
    return (
      <section className="stp_desk">
        <EmptyState>{COPY.empty}</EmptyState>
      </section>);

  }

  const name = display_name(student);
  const place = [student.district, student.state].filter(Boolean).join(", ");

  return (
    <section className="stp_desk">
      <header className="stp_page">
        <div className="stp_page_copy">
          <h1>{COPY.title}</h1>
          <p>{COPY.subtitle}</p>
        </div>
      </header>

      <article className="stp_banner">
        <div className="stp_photo">
          {pending_url || student.profile_photo_url ?
          <button
            type="button"
            className="stp_photo_view"
            aria-label={COPY.viewPhoto}
            onClick={() => !pending_url && set_photo_open(true)}>
            <img src={pending_url || student.profile_photo_url} alt="" />
          </button> :

          <span>{initials(student.first_name, student.last_name)}</span>
          }
          {pending_photo || student.profile_photo_url ?
          <button
            type="button"
            className="stp_photo_remove"
            aria-label={COPY.removePhoto}
            title={COPY.removePhoto}
            disabled={saving}
            onClick={pending_photo ? clear_pending_photo : remove_saved_photo}>
            <Close_Small_Icon />
          </button> :
          null}
          <button
            type="button"
            className="stp_photo_cam"
            aria-label={COPY.changePhoto}
            disabled={saving}
            onClick={() => file_ref.current?.click()}>
            
            <Camera_Icon />
          </button>
          <input ref={file_ref} type="file" accept="image/*" hidden onChange={choose_photo} />
        </div>
        <div className="stp_banner_copy">
          <div className="stp_banner_name">
            <h2>{name}</h2>
            <span className="stp_tag stp_tag_role">{COPY.role}</span>
            <span className="stp_tag is_live">{COPY.status}</span>
            {pending_photo ?
            <button type="button" className="stp_photo_use" onClick={save_photo} disabled={saving}>
              {saving ? "Saving..." : COPY.usePhoto}
            </button> :
            null}
          </div>
          <ul className="stp_banner_meta">
            <li>
              <Mail_Icon />
              {student.email || "—"}
            </li>
            <li>
              <Phone_Icon />
              {student.mobile_number || "—"}
            </li>
            <li>
              <Pin_Icon />
              {place || "—"}
            </li>
          </ul>
        </div>
        <blockquote>{COPY.quote}</blockquote>
        {editing ? null :
        <button type="button" className="stp_edit" aria-label={COPY.edit} onClick={() => set_editing(true)}>
            <Pen_Icon />
            <span className="stp_edit_label">{COPY.edit}</span>
          </button>
        }
      </article>

      {photo_open && student.profile_photo_url ?
      <div
        className="stp_photo_lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={COPY.viewPhoto}
        onClick={() => set_photo_open(false)}>
        <button
          type="button"
          className="stp_photo_lightbox_close"
          aria-label={COPY.closePhoto}
          onClick={() => set_photo_open(false)}>
          <Close_Small_Icon />
        </button>
        <img
          src={student.profile_photo_url}
          alt={name}
          onClick={(event) => event.stopPropagation()} />
      </div> :
      null}

      <section className={`stp_boost${student.has_ollama_api_key ? " is_ready" : ""}`}>
        <div className="stp_boost_glow" aria-hidden="true" />
        <div className="stp_boost_copy">
          <span className="stp_boost_badge">{student.has_ollama_api_key ? COPY.aiKeyReady : COPY.aiKeyBadge}</span>
          <div>
            <h2>
              {COPY.aiKey}
              {OLLAMA_API_KEY_MANUAL_URL ?
              <a
                className="stp_boost_manual"
                href={OLLAMA_API_KEY_MANUAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={COPY.aiKeyManual}
                title={COPY.aiKeyManual}>
                
                  <Manual_Link_Icon />
                </a> :
              null}
            </h2>
            <p>{COPY.aiKeyHint}</p>
          </div>
          {student.has_ollama_api_key ?
          <div className="stp_boost_status">
              <code className="stp_boost_masked" title={COPY.aiKeySaved}>
                {student.ollama_api_key_masked || COPY.aiKeySaved}
              </code>
              <button
                type="button"
                className="stp_boost_clear"
                aria-label={COPY.aiKeyClear}
                title={COPY.aiKeyClear}
                onClick={clear_api_key}
                disabled={api_key_saving}>
                
                <Close_Small_Icon />
              </button>
            </div> :
          null}
        </div>
        {student.has_ollama_api_key ? null :
        <form className="stp_boost_form" onSubmit={save_api_key}>
            <div className="stp_boost_input">
              <input
                id="ollama_api_key"
                name="ollama_api_key"
                type={show_api_key ? "text" : "password"}
                autoComplete="off"
                value={api_key_draft}
                placeholder={COPY.aiKeyPlaceholder}
                aria-label={COPY.aiKeyLabel}
                onChange={(event) => set_api_key_draft(event.target.value)}
                disabled={api_key_saving} />
              
              <button
                type="button"
                className="stp_boost_eye"
                aria-label={show_api_key ? ENGLISH.hide_api_key : ENGLISH.show_api_key}
                onClick={() => set_show_api_key((open) => !open)}>
                
                {show_api_key ? <Eye_Off_Icon /> : <Eye_Icon />}
              </button>
            </div>
            <button type="submit" className="stp_boost_save" disabled={api_key_saving || !api_key_draft.trim()}>
              {api_key_saving ? "…" : COPY.aiKeySave}
            </button>
          </form>
        }
      </section>

      <div className="stp_layout">
        {editing ?
        <Profile_Form
          values={form}
          errors={form_errors}
          on_change={set_form}
          on_submit={save_profile} /> :


        <section className="stp_card">
            <h2>{COPY.personal}</h2>
            <div className="stp_fields">
              <Field id="view_first" label={ENGLISH.first_name} value={student.first_name} read_only />
              <Field id="view_last" label={ENGLISH.last_name} value={student.last_name} read_only />
              <Field id="view_dob" label={ENGLISH.date_of_birth} value={format_dob(student.date_of_birth)} read_only />
              <Field id="view_blood" label={ENGLISH.blood_group} value={student.blood_group} read_only />
              <Field id="view_email" label={ENGLISH.email_address} value={student.email} read_only wide />
              <Field id="view_phone" label={ENGLISH.phone_number} value={student.mobile_number} read_only />
              <Field id="view_address" label={ENGLISH.address} value={student.address_line} read_only multiline />
              <Field id="view_district" label={ENGLISH.city_district} value={student.district} read_only />
              <Field id="view_state" label={ENGLISH.state} value={student.state} read_only />
              <Field id="view_pin" label={ENGLISH.pincode} value={student.pincode} read_only />
            </div>
            <h2>{COPY.professional}</h2>
            <div className="stp_fields stp_fields_stack">
              <Field id="view_headline" label={COPY.headline} value={student.headline} read_only />
              <Field id="view_summary" label={COPY.professionalSummary} value={student.professional_summary} read_only multiline />
            </div>
          </section>
        }

        <div className="stp_side">
          <section className="stp_card">
            <h2>{COPY.academic}</h2>
            <div className="stp_fields stp_fields_stack">
              {editing ?
              <>
                  <Field id="student_id" label={COPY.studentId} value={student.student_id} read_only />
                  <Field id="higher_study" name="higher_study" label={COPY.program} value={form.higher_study} on_change={(event) => set_form({ ...form, higher_study: event.target.value })} />
                  <Field id="college" name="college" label={COPY.college} value={form.college} on_change={(event) => set_form({ ...form, college: event.target.value })} />
                  <Field id="degree" name="degree" label={COPY.degree} value={form.degree} on_change={(event) => set_form({ ...form, degree: event.target.value })} />
                  <Field id="cgpa" name="cgpa" label={COPY.cgpa} value={form.cgpa} on_change={(event) => set_form({ ...form, cgpa: event.target.value })} />
                </> :

              <>
                  <Field id="student_id" label={COPY.studentId} value={student.student_id} read_only />
                  <Field id="program" label={COPY.program} value={student.higher_study} read_only />
                  <Field id="college_view" label={COPY.college} value={student.college} read_only />
                  {student.degree ? <Field id="degree_view" label={COPY.degree} value={student.degree} read_only /> : null}
                  {student.cgpa ? <Field id="cgpa_view" label={COPY.cgpa} value={student.cgpa} read_only /> : null}
                </>
              }
            </div>
          </section>

          <section className="stp_card">
            <h2>{COPY.links}</h2>
            {editing ?
            <Links_Editor links={links} on_change={set_links} /> :

            <Links_View links={saved_links} />
            }
          </section>

          <section className="stp_card">
            <h2>{COPY.account}</h2>
            <div className="stp_fields stp_fields_stack">
              <Field id="member_since" label={COPY.member} value={format_joined(student.member_since)} read_only />
            </div>
          </section>
        </div>
      </div>
      <Career_Panel
        career_tab={career_tab}
        set_career_tab={set_career_tab}
        editing={editing}
        career_editing={career_editing}
        set_career_editing={set_career_editing}
        saving={saving}
        skills={skills}
        set_skills={set_skills}
        experiences={experiences}
        set_experiences={set_experiences}
        projects={projects}
        set_projects={set_projects}
        achievements={achievements}
        set_achievements={set_achievements}
        saved_skills={saved_skills}
        saved_experiences={saved_experiences}
        saved_projects={saved_projects}
        saved_achievements={saved_achievements}
        save_career={save_career} />

      {editing ?
      <div className="stp_sticky_bar">
          <button type="button" className="stp_save" disabled={saving} onClick={save_profile}>
            {saving ? "Saving…" : COPY.save}
          </button>
          <button type="button" className="stp_ghost" onClick={reset_editing}>
            {COPY.cancel}
          </button>
        </div> :
      null}
    </section>);

}

