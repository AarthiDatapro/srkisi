import { COPY, empty_achievement, empty_experience, empty_project, empty_skill } from "../constants.js";
import { Close_Small_Icon } from "./icons.jsx";

function Remover({ label, on_click }) {
  return (
    <button type="button" className="stp_icon_btn" aria-label={label} title={label} onClick={on_click}>
      <Close_Small_Icon />
    </button>
  );
}

export function Skills_Editor({ skills = [], on_change }) {
  function update_row(index, key, value) {
    on_change(skills.map((item, item_index) => (item_index === index ? { ...item, [key]: value } : item)));
  }

  return (
    <div className="stp_resume_edit">
      {skills.length ? (
        <ul className="stp_resume_rows">
          {skills.map((item, index) => (
            <li key={item.skill_id || `skill_${index}`} className="stp_resume_row is_skill">
              <input
                type="text"
                className="stp_flat_input"
                value={item.skill_category || ""}
                placeholder={COPY.skillCategoryPlaceholder}
                aria-label={COPY.skillCategory}
                maxLength={100}
                onChange={(event) => update_row(index, "skill_category", event.target.value)}
              />
              <input
                type="text"
                className="stp_flat_input"
                value={item.skill_items || ""}
                placeholder={COPY.skillItemsPlaceholder}
                aria-label={COPY.skillItems}
                maxLength={2000}
                onChange={(event) => update_row(index, "skill_items", event.target.value)}
              />
              <Remover label={COPY.removeSkill} on_click={() => on_change(skills.filter((_, i) => i !== index))} />
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="stp_text_add" onClick={() => on_change([...skills, empty_skill()])}>
        + {COPY.addSkill}
      </button>
    </div>
  );
}

export function Experience_Editor({ experiences = [], on_change }) {
  function update_row(index, key, value) {
    on_change(experiences.map((item, item_index) => (item_index === index ? { ...item, [key]: value } : item)));
  }

  return (
    <div className="stp_resume_edit">
      {experiences.length ? (
        <ul className="stp_resume_cards">
          {experiences.map((item, index) => (
            <li key={item.experience_id || `exp_${index}`} className="stp_resume_card">
              <div className="stp_resume_grid2">
                <input
                  type="text"
                  className="stp_flat_input"
                  value={item.role_title || ""}
                  placeholder={COPY.rolePlaceholder}
                  aria-label={COPY.roleTitle}
                  maxLength={200}
                  onChange={(event) => update_row(index, "role_title", event.target.value)}
                />
                <input
                  type="text"
                  className="stp_flat_input"
                  value={item.company || ""}
                  placeholder={COPY.companyPlaceholder}
                  aria-label={COPY.company}
                  maxLength={200}
                  onChange={(event) => update_row(index, "company", event.target.value)}
                />
                <input
                  type="text"
                  className="stp_flat_input"
                  value={item.start_label || ""}
                  placeholder={COPY.startPlaceholder}
                  aria-label={COPY.startLabel}
                  maxLength={50}
                  onChange={(event) => update_row(index, "start_label", event.target.value)}
                />
                <div className="stp_inline_end">
                  <input
                    type="text"
                    className="stp_flat_input"
                    value={item.end_label || ""}
                    placeholder={COPY.endPlaceholder}
                    aria-label={COPY.endLabel}
                    maxLength={50}
                    onChange={(event) => update_row(index, "end_label", event.target.value)}
                  />
                  <Remover
                    label={COPY.removeExperience}
                    on_click={() => on_change(experiences.filter((_, i) => i !== index))}
                  />
                </div>
              </div>
              <textarea
                className="stp_flat_area"
                rows={3}
                value={item.description || ""}
                placeholder={COPY.bulletsPlaceholder}
                aria-label={COPY.description}
                maxLength={8000}
                onChange={(event) => update_row(index, "description", event.target.value)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="stp_text_add"
        onClick={() => on_change([...experiences, empty_experience()])}>
        + {COPY.addExperience}
      </button>
    </div>
  );
}

export function Projects_Editor({ projects = [], on_change }) {
  function update_row(index, key, value) {
    on_change(projects.map((item, item_index) => (item_index === index ? { ...item, [key]: value } : item)));
  }

  return (
    <div className="stp_resume_edit">
      {projects.length ? (
        <ul className="stp_resume_cards">
          {projects.map((item, index) => (
            <li key={item.project_id || `proj_${index}`} className="stp_resume_card">
              <div className="stp_resume_grid2">
                <input
                  type="text"
                  className="stp_flat_input"
                  value={item.project_name || ""}
                  placeholder={COPY.projectNamePlaceholder}
                  aria-label={COPY.projectName}
                  maxLength={200}
                  onChange={(event) => update_row(index, "project_name", event.target.value)}
                />
                <div className="stp_inline_end">
                  <input
                    type="text"
                    className="stp_flat_input"
                    value={item.role_title || ""}
                    placeholder={COPY.projectRolePlaceholder}
                    aria-label={COPY.roleTitle}
                    maxLength={200}
                    onChange={(event) => update_row(index, "role_title", event.target.value)}
                  />
                  <Remover
                    label={COPY.removeProject}
                    on_click={() => on_change(projects.filter((_, i) => i !== index))}
                  />
                </div>
                <input
                  type="url"
                  className="stp_flat_input"
                  value={item.live_url || ""}
                  placeholder={COPY.liveUrlPlaceholder}
                  aria-label={COPY.liveUrl}
                  maxLength={500}
                  onChange={(event) => update_row(index, "live_url", event.target.value)}
                />
                <input
                  type="text"
                  className="stp_flat_input"
                  value={item.tech_stack || ""}
                  placeholder={COPY.techStackPlaceholder}
                  aria-label={COPY.techStack}
                  maxLength={500}
                  onChange={(event) => update_row(index, "tech_stack", event.target.value)}
                />
              </div>
              <textarea
                className="stp_flat_area"
                rows={3}
                value={item.description || ""}
                placeholder={COPY.bulletsPlaceholder}
                aria-label={COPY.description}
                maxLength={8000}
                onChange={(event) => update_row(index, "description", event.target.value)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="stp_text_add" onClick={() => on_change([...projects, empty_project()])}>
        + {COPY.addProject}
      </button>
    </div>
  );
}

export function Achievements_Editor({ achievements = [], on_change }) {
  function update_row(index, value) {
    on_change(
      achievements.map((item, item_index) =>
        item_index === index ? { ...item, achievement_text: value } : item
      )
    );
  }

  return (
    <div className="stp_resume_edit">
      {achievements.length ? (
        <ul className="stp_resume_rows">
          {achievements.map((item, index) => (
            <li key={item.achievement_id || `ach_${index}`} className="stp_resume_row is_achievement">
              <input
                type="text"
                className="stp_flat_input"
                value={item.achievement_text || ""}
                placeholder={COPY.achievementPlaceholder}
                aria-label={COPY.achievementText}
                maxLength={500}
                onChange={(event) => update_row(index, event.target.value)}
              />
              <Remover
                label={COPY.removeAchievement}
                on_click={() => on_change(achievements.filter((_, i) => i !== index))}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="stp_text_add"
        onClick={() => on_change([...achievements, empty_achievement()])}>
        + {COPY.addAchievement}
      </button>
    </div>
  );
}

