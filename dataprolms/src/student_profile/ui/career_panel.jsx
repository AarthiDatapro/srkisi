import { useState } from "react";
import { Link_Text } from "../../design_system/link_text.jsx";
import {
  COPY,
  empty_achievement,
  empty_achievements,
  empty_experience,
  empty_experiences,
  empty_project,
  empty_projects,
  empty_skill,
  empty_skills
} from "../constants.js";
import {
  detect_tech,
  is_current_role,
  monogram,
  split_lines,
  split_list,
  tech_base,
  tech_logo_urls,
  tile_tone
} from "../utils.js";
import { Pen_Icon } from "./icons.jsx";
import {
  Achievements_Editor,
  Experience_Editor,
  Projects_Editor,
  Skills_Editor
} from "./resume_panels.jsx";
import {
  Briefcase_Icon,
  Calendar_Icon,
  Code_Icon,
  CONCEPT_ICONS,
  External_Icon,
  Folder_Icon,
  Gear_Icon,
  Layers_Icon,
  Plus_Icon,
  Trash_Icon,
  Trophy_Icon
} from "./career_icons.jsx";
import { STUDENT_PROFILE_ENGLISH as ENGLISH } from "../../constants/english/student_profile_constants_english.js";


const CAREER_TABS = [
{
  id: "skills",
  get label() { return COPY.skills; },
  tab_icon: Layers_Icon,
  section_icon: Code_Icon,
  get hint() { return ENGLISH.add_programming_languages_frameworks_and_tools_you_are; },
  get add_label() { return ENGLISH.add_skill; },
  get empty_label() { return COPY.skillsEmpty; }
},
{
  id: "experience",
  get label() { return COPY.experience; },
  get panel_title() { return ENGLISH.work_experience; },
  tab_icon: Briefcase_Icon,
  section_icon: Briefcase_Icon,
  get hint() { return ENGLISH.add_your_professional_work_experience_and_key_achievements; },
  get add_label() { return ENGLISH.add_experience; },
  get empty_label() { return COPY.experienceEmpty; }
},
{
  id: "projects",
  get label() { return COPY.projects; },
  tab_icon: Folder_Icon,
  section_icon: Folder_Icon,
  get hint() { return ENGLISH.showcase_your_key_projects_technologies_used_and_achievements; },
  get add_label() { return ENGLISH.add_project; },
  get empty_label() { return COPY.projectsEmpty; }
},
{
  id: "achievements",
  get label() { return COPY.achievements; },
  tab_icon: Trophy_Icon,
  section_icon: Trophy_Icon,
  get hint() { return ENGLISH.add_awards_certifications_and_milestones_you_are_proud; },
  get add_label() { return ENGLISH.add_achievement; },
  get empty_label() { return COPY.achievementsEmpty; }
}];

function concept_icon(name) {
  const base = tech_base(name);
  const match = CONCEPT_ICONS.find(([, keys]) => keys.includes(base));
  return match ? match[0] : null;
}

function Tech_Logo({ name, label, class_name = "stp_cr_tile" }) {
  const Concept_Icon = concept_icon(name);
  const urls = Concept_Icon ? [] : tech_logo_urls(name);
  const [attempt, set_attempt] = useState(0);
  const text = label || name;
  if (Concept_Icon) {
    return (
      <span className={class_name} style={tile_tone(text)}>
        <Concept_Icon />
      </span>);

  }
  if (attempt >= urls.length) {
    return (
      <span className={class_name} style={tile_tone(text)}>
        {monogram(text)}
      </span>);

  }
  return (
    <span className={`${class_name} is_logo`}>
      <img src={urls[attempt]} alt="" loading="lazy" onError={() => set_attempt(attempt + 1)} />
    </span>);

}

export function Career_Panel({
  career_tab,
  set_career_tab,
  editing,
  career_editing,
  set_career_editing,
  saving,
  skills,
  set_skills,
  experiences,
  set_experiences,
  projects,
  set_projects,
  achievements,
  set_achievements,
  saved_skills,
  saved_experiences,
  saved_projects,
  saved_achievements,
  save_career
}) {
  function confirm_remove(title, changes) {
    if (!window.confirm(ENGLISH.remove_3(title))) return;
    save_career(changes);
  }

  const career_open = editing || career_editing;

  function edit_career(tab_id) {
    set_career_tab(tab_id);
    set_career_editing(true);
  }

  function add_career_item(tab_id) {
    if (tab_id === "skills") set_skills([...skills, empty_skill()]);
    if (tab_id === "experience") set_experiences([...experiences, empty_experience()]);
    if (tab_id === "projects") set_projects([...projects, empty_project()]);
    if (tab_id === "achievements") set_achievements([...achievements, empty_achievement()]);
    set_career_editing(true);
  }

  function cancel_career() {
    set_skills(empty_skills(saved_skills));
    set_experiences(empty_experiences(saved_experiences));
    set_projects(empty_projects(saved_projects));
    set_achievements(empty_achievements(saved_achievements));
    set_career_editing(false);
  }

  function career_rows(tab_id) {
    if (tab_id === "skills") {
      return saved_skills.flatMap((item, index) => {
        const names = split_list(item.skill_items);
        const titles = names.length ? names : [item.skill_category].filter(Boolean);
        return titles.map((title, title_index) => ({
          key: `${item.skill_id || index}_${title_index}`,
          title,
          logo: title,
          tags: names.length && item.skill_category ? [item.skill_category] : [],
          on_remove: () =>
          confirm_remove(title, {
            skills: saved_skills.
            map((skill, skill_index) =>
            skill_index === index ?
            { ...skill, skill_items: names.filter((name) => name !== title).join(", ") } :
            skill
            ).
            filter((skill, skill_index) => skill_index !== index || skill.skill_items)
          })
        }));
      });
    }
    if (tab_id === "experience") {
      return saved_experiences.map((item, index) => {
        const title = item.role_title || item.company;
        const is_current = is_current_role(item.start_label, item.end_label);
        const end = item.end_label || (is_current ? ENGLISH.present : "");
        return {
          key: item.experience_id || `exp_${index}`,
          index: String(index + 1).padStart(2, "0"),
          title,
          sub: item.role_title ? item.company : "",
          meta: [item.start_label, end].filter(Boolean).join(" - "),
          is_current,
          tile_text: item.company || item.role_title,
          points: split_lines(item.description),
          techs: detect_tech(`${item.role_title} ${item.description}`),
          on_remove: () => confirm_remove(title, { experiences: saved_experiences.filter((_, i) => i !== index) })
        };
      });
    }
    if (tab_id === "projects") {
      return saved_projects.map((item, index) => ({
        key: item.project_id || `proj_${index}`,
        index: String(index + 1).padStart(2, "0"),
        badge: index === 0 ? ENGLISH.main_project : ENGLISH.project,
        title: item.project_name,
        sub: item.role_title,
        stack: split_list(item.tech_stack).length ?
        split_list(item.tech_stack).map((label) => ({ label, slug: label })) :
        detect_tech(item.description),
        link: item.live_url,
        points: split_lines(item.description),
        on_remove: () => confirm_remove(item.project_name, { projects: saved_projects.filter((_, i) => i !== index) })
      }));
    }
    return saved_achievements.map((item, index) => ({
      key: item.achievement_id || `ach_${index}`,
      title: item.achievement_text,
      tile_icon: Trophy_Icon,
      on_remove: () =>
      confirm_remove(item.achievement_text, { achievements: saved_achievements.filter((_, i) => i !== index) })
    }));
  }

  return (
      <section className="stp_cr">
        <div className="stp_cr_head">
          <div className="stp_cr_brand">
            <span className="stp_cr_badge">
              <Briefcase_Icon />
            </span>
            <div className="stp_cr_brand_copy">
              <p className="stp_cr_eyebrow">{ENGLISH.profile}</p>
              <h2 className="stp_cr_title">{COPY.career}</h2>
              <p className="stp_cr_subtitle">{ENGLISH.showcase_your_skills_experience_projects_and_achievements}</p>
            </div>
          </div>
          <div className="stp_cr_tabs" role="tablist" aria-label={COPY.career}>
            {CAREER_TABS.map(({ id, label, tab_icon: Tab_Icon }) =>
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={career_tab === id}
              className={`stp_cr_tab${career_tab === id ? " is_on" : ""}`}
              onClick={() => set_career_tab(id)}>
                <Tab_Icon />
                {label}
              </button>
            )}
          </div>
        </div>

        <div className="stp_cr_body">
          {CAREER_TABS.filter(({ id }) => id === career_tab).map((tab) => {
            const Section_Icon = tab.section_icon;
            const rows = career_open ? [] : career_rows(tab.id);
            return (
              <div key={tab.id} className="stp_cr_panel" role="tabpanel">
                <div className="stp_cr_panel_head">
                  <div className="stp_cr_panel_title">
                    <span className="stp_cr_panel_icon">
                      <Section_Icon />
                    </span>
                    <div className="stp_cr_panel_copy">
                      <h3>
                        {tab.panel_title || tab.label}
                        {rows.length ? <span className="stp_cr_count">{rows.length}</span> : null}
                      </h3>
                      <p>{tab.hint}</p>
                    </div>
                  </div>
                  {career_editing && !editing ?
                  <div className="stp_cr_edit_actions">
                    <button
                      type="button"
                      className="stp_cr_cancel"
                      disabled={saving}
                      onClick={cancel_career}>
                      {COPY.cancel}
                    </button>
                    <button
                      type="button"
                      className="stp_cr_add"
                      disabled={saving}
                      onClick={() => save_career({ skills, experiences, projects, achievements })}>
                      {saving ? "Saving…" : COPY.save}
                    </button>
                  </div> :
                  <button type="button" className="stp_cr_add" disabled={saving} onClick={() => add_career_item(tab.id)}>
                    <Plus_Icon />
                    {tab.add_label}
                  </button>
                  }
                </div>

                {career_open ?
                <>
                    {tab.id === "skills" ? <Skills_Editor skills={skills} on_change={set_skills} /> : null}
                    {tab.id === "experience" ?
                  <Experience_Editor experiences={experiences} on_change={set_experiences} /> :
                  null}
                    {tab.id === "projects" ? <Projects_Editor projects={projects} on_change={set_projects} /> : null}
                    {tab.id === "achievements" ?
                  <Achievements_Editor achievements={achievements} on_change={set_achievements} /> :
                  null}
                  </> :
                rows.length && tab.id === "experience" ?
                <ol className="stp_cr_exp_list">
                    {rows.map((row) =>
                  <li key={row.key} className="stp_cr_exp">
                        <aside className="stp_cr_exp_rail">
                          <span className="stp_cr_exp_index">{row.index}</span>
                          {row.meta ? <span className="stp_cr_exp_when">{row.meta}</span> : null}
                          <span className="stp_cr_exp_track" aria-hidden="true" />
                          {row.is_current ? <span className="stp_cr_exp_now">{ENGLISH.current}</span> : null}
                        </aside>
                        <div className="stp_cr_exp_main">
                          <div className="stp_cr_exp_head">
                            <span className="stp_cr_tile" style={tile_tone(row.tile_text)}>
                              {monogram(row.tile_text)}
                            </span>
                            <div className="stp_cr_exp_title">
                              <h4>{row.title}</h4>
                              {row.sub ? <p>{row.sub}</p> : null}
                              {row.meta ?
                          <div className="stp_cr_exp_chips">
                                  <span>
                                    <Calendar_Icon />
                                    {row.meta}
                                  </span>
                                </div> :
                          null}
                            </div>
                            <div className="stp_cr_actions">
                              <button
                            type="button"
                            className="stp_cr_icon_btn is_edit"
                            aria-label={ENGLISH.edit_2(row.title)}
                            title={ENGLISH.edit}
                            disabled={saving}
                            onClick={() => edit_career(tab.id)}>
                                <Pen_Icon />
                              </button>
                              <button
                            type="button"
                            className="stp_cr_icon_btn is_remove"
                            aria-label={ENGLISH.remove_2(row.title)}
                            title={ENGLISH.remove}
                            disabled={saving}
                            onClick={row.on_remove}>
                                <Trash_Icon />
                              </button>
                            </div>
                          </div>
                          {row.points.length || row.techs.length ?
                      <div className={`stp_cr_exp_body${row.techs.length ? " has_tech" : ""}`}>
                              {row.points.length ?
                        <ol className="stp_cr_exp_points">
                                  {row.points.map((point, point_index) =>
                          <li key={`${point_index}_${point}`}>
                                      <span>{String(point_index + 1).padStart(2, "0")}</span>
                                      <p><Link_Text text={point} /></p>
                                    </li>
                          )}
                                </ol> :
                        <span />}
                              {row.techs.length ?
                        <div className="stp_cr_exp_tech">
                                  <h5>
                                    <Gear_Icon />{ENGLISH.technologies_used}</h5>
                                  <div className="stp_cr_tech_grid">
                                    {row.techs.map((tech) =>
                            <span key={tech.slug} className="stp_cr_tech">
                                        <Tech_Logo name={tech.slug} label={tech.label} class_name="stp_cr_tech_mark" />
                                        <span>{tech.label}</span>
                                      </span>
                            )}
                                  </div>
                                </div> :
                        null}
                            </div> :
                      null}
                        </div>
                      </li>
                  )}
                  </ol> :
                rows.length && tab.id === "projects" ?
                <ol className="stp_cr_exp_list">
                    {rows.map((row) =>
                  <li key={row.key} className="stp_cr_exp is_project">
                        <aside className="stp_cr_exp_rail">
                          <span className="stp_cr_exp_index">{row.index}</span>
                          <span className="stp_cr_exp_tag">{row.badge}</span>
                        </aside>
                        <div className="stp_cr_exp_main">
                          <div className="stp_cr_exp_head">
                            <div className="stp_cr_exp_title">
                              <h4>{row.title}</h4>
                              {row.sub ? <p>{row.sub}</p> : null}
                              {row.stack.length ?
                          <div className="stp_cr_proj_stack">
                                  {row.stack.map((tech, tech_index) =>
                            <span key={`${tech.label}_${tech_index}`} className="stp_cr_tech">
                                      <Tech_Logo name={tech.slug} label={tech.label} class_name="stp_cr_tech_mark" />
                                      <span>{tech.label}</span>
                                    </span>
                            )}
                                </div> :
                          null}
                            </div>
                            <div className="stp_cr_actions">
                              {row.link ?
                          <a className="stp_cr_live" href={row.link} target="_blank" rel="noopener noreferrer" title={ENGLISH.open_live_site}>
                                  <External_Icon />
                                  <span className="stp_cr_live_label">{ENGLISH.live_site}</span>
                                </a> :
                          null}
                              <button
                            type="button"
                            className="stp_cr_icon_btn is_edit"
                            aria-label={ENGLISH.edit_2(row.title)}
                            title={ENGLISH.edit}
                            disabled={saving}
                            onClick={() => edit_career(tab.id)}>
                                <Pen_Icon />
                              </button>
                              <button
                            type="button"
                            className="stp_cr_icon_btn is_remove"
                            aria-label={ENGLISH.remove_2(row.title)}
                            title={ENGLISH.remove}
                            disabled={saving}
                            onClick={row.on_remove}>
                                <Trash_Icon />
                              </button>
                            </div>
                          </div>
                          {row.points.length ?
                      <div className="stp_cr_exp_body">
                              <ol className="stp_cr_exp_points">
                                {row.points.map((point, point_index) =>
                          <li key={`${point_index}_${point}`}>
                                    <span>{String(point_index + 1).padStart(2, "0")}</span>
                                    <p><Link_Text text={point} /></p>
                                  </li>
                          )}
                              </ol>
                            </div> :
                      null}
                        </div>
                      </li>
                  )}
                  </ol> :
                rows.length ?
                <ul className="stp_cr_rows">
                    {rows.map((row) => {
                    const Tile_Icon = row.tile_icon;
                    const tile_text = row.tile_text || row.title;
                    return (
                      <li key={row.key} className="stp_cr_row">
                          {row.logo ?
                          <Tech_Logo key={row.logo} name={row.logo} /> :

                          <span className="stp_cr_tile" style={tile_tone(tile_text)}>
                              {Tile_Icon ? <Tile_Icon /> : monogram(tile_text)}
                            </span>
                          }
                          <div className="stp_cr_row_main">
                            <div className="stp_cr_row_top">
                              <h4>{row.title}</h4>
                              {row.meta ? <span className="stp_cr_meta">{row.meta}</span> : null}
                            </div>
                            {row.sub ? <p className="stp_cr_sub">{row.sub}</p> : null}
                            {row.tags?.length ?
                          <div className="stp_cr_tags">
                                {row.tags.map((tag, tag_index) =>
                            <span key={`${tag}_${tag_index}`}>{tag}</span>
                            )}
                              </div> :
                          null}
                            {row.points?.length ?
                          <ul className="stp_cr_points">
                                {row.points.map((point, point_index) =>
                            <li key={`${point_index}_${point}`}><Link_Text text={point} /></li>
                            )}
                              </ul> :
                          null}
                          </div>
                          <div className="stp_cr_actions">
                            {row.link ?
                          <a
                            className="stp_cr_icon_btn is_link"
                            href={row.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={ENGLISH.open_live_site}
                            title={ENGLISH.open_live_site}>
                                <External_Icon />
                              </a> :
                          null}
                            <button
                            type="button"
                            className="stp_cr_icon_btn is_remove"
                            aria-label={ENGLISH.remove_2(row.title)}
                            title={ENGLISH.remove}
                            disabled={saving}
                            onClick={row.on_remove}>
                              <Trash_Icon />
                            </button>
                          </div>
                        </li>);

                  })}
                  </ul> :

                <div className="stp_cr_empty">
                    <Section_Icon />
                    {tab.empty_label}
                  </div>
                }
              </div>);

          })}
        </div>
      </section>
  );
}
