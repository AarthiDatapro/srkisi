import { STUDENT_PROFILE_ENGLISH as ENGLISH } from "../constants/english/student_profile_constants_english.js";
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

/** Paste the guide URL for creating an Ollama API key. */
export const OLLAMA_API_KEY_MANUAL_URL = "https://docs.google.com/document/d/1x1-byia-V1nssKA4fJKup5MkF6ROmXSsSiNIfhbWm-g/edit?usp=sharing";

export const COPY = {
  get title() { return ENGLISH.my_profile; },
  get subtitle() { return ENGLISH.manage_your_personal_details_and_academic_information; },
  get edit() { return ENGLISH.edit_profile; },
  get save() { return ENGLISH.save_changes; },
  get cancel() { return ENGLISH.cancel; },
  get changePhoto() { return ENGLISH.change_photo; },
  get removePhoto() { return ENGLISH.remove_photo; },
  get photoRemoved() { return ENGLISH.photo_removed; },
  get usePhoto() { return ENGLISH.use_this_photo; },
  get viewPhoto() { return ENGLISH.view_full_photo; },
  get closePhoto() { return ENGLISH.close_photo; },
  role: "Student",
  get status() { return ENGLISH.active; },
  get personal() { return ENGLISH.personal_information; },
  get professional() { return ENGLISH.professional_profile; },
  get academic() { return ENGLISH.academic_information; },
  get account() { return ENGLISH.account_information; },
  get links() { return ENGLISH.my_links; },
  get linksHint() { return ENGLISH.add_github_linkedin_portfolio_or_any_other_profile; },
  get linksEmpty() { return ENGLISH.no_links_added_yet; },
  get linkTitle() { return ENGLISH.title; },
  get linkUrl() { return ENGLISH.link; },
  get linkTitlePlaceholder() { return ENGLISH.e_g_github; },
  linkUrlPlaceholder: "https://github.com/yourname",
  get addLink() { return ENGLISH.add_link; },
  get removeLink() { return ENGLISH.remove; },
  get career() { return ENGLISH.career; },
  get skills() { return ENGLISH.skills; },
  get skillsHint() { return ENGLISH.category_skills_in_one_row; },
  get skillsEmpty() { return ENGLISH.no_skills_yet; },
  get skillCategory() { return ENGLISH.category; },
  get skillItems() { return ENGLISH.skills; },
  get skillCategoryPlaceholder() { return ENGLISH.languages; },
  get skillItemsPlaceholder() { return ENGLISH.javascript_python_sql; },
  get addSkill() { return ENGLISH.add; },
  get removeSkill() { return ENGLISH.remove; },
  get experience() { return ENGLISH.experience; },
  get experienceHint() { return ENGLISH.one_highlight_per_line; },
  get experienceEmpty() { return ENGLISH.no_experience_yet; },
  get company() { return ENGLISH.company; },
  get roleTitle() { return ENGLISH.role; },
  get startLabel() { return ENGLISH.start; },
  get endLabel() { return ENGLISH.end; },
  get description() { return ENGLISH.description; },
  get companyPlaceholder() { return ENGLISH.company; },
  get rolePlaceholder() { return ENGLISH.role; },
  get startPlaceholder() { return ENGLISH.mar_2025; },
  get endPlaceholder() { return ENGLISH.present; },
  get bulletsPlaceholder() { return ENGLISH.one_highlight_per_line_2; },
  get addExperience() { return ENGLISH.add; },
  get removeExperience() { return ENGLISH.remove; },
  get projects() { return ENGLISH.projects; },
  get projectsHint() { return ENGLISH.name_role_link_stack_highlights; },
  get projectsEmpty() { return ENGLISH.no_projects_yet; },
  get projectName() { return ENGLISH.project; },
  get liveUrl() { return ENGLISH.live_url; },
  get techStack() { return ENGLISH.tech; },
  get projectNamePlaceholder() { return ENGLISH.project; },
  get projectRolePlaceholder() { return ENGLISH.role; },
  liveUrlPlaceholder: "https://…",
  get techStackPlaceholder() { return ENGLISH.react_node_mysql; },
  get addProject() { return ENGLISH.add; },
  get removeProject() { return ENGLISH.remove; },
  get achievements() { return ENGLISH.achievements; },
  get achievementsHint() { return ENGLISH.short_highlights_only; },
  get achievementsEmpty() { return ENGLISH.no_achievements_yet; },
  get achievementText() { return ENGLISH.achievement; },
  get achievementPlaceholder() { return ENGLISH.led_a_client_project_with_a_team_of; },
  get addAchievement() { return ENGLISH.add; },
  get removeAchievement() { return ENGLISH.remove; },
  get headline() { return ENGLISH.headline; },
  get headlinePlaceholder() { return ENGLISH.full_stack_engineer_mern_flutter; },
  get professionalSummary() { return ENGLISH.summary; },
  get degree() { return ENGLISH.degree; },
  cgpa: "CGPA",
  get member() { return ENGLISH.account_created; },
  get aiKey() { return ENGLISH.fast_mentoring; },
  get aiKeyBadge() { return ENGLISH.personal_key; },
  get aiKeyReady() { return ENGLISH.ready; },
  get aiKeyLabel() { return ENGLISH.ollama_api_key; },
  get aiKeyHint() { return ENGLISH.your_own_ollama_key_for_quicker_ai_mentor; },
  get aiKeyPlaceholder() { return ENGLISH.paste_ollama_api_key; },
  get aiKeySaved() { return ENGLISH.key_connected; },
  get aiKeyClear() { return ENGLISH.remove; },
  get aiKeySave() { return ENGLISH.connect; },
  get aiKeyManual() { return ENGLISH.how_to_generate_an_api_key; },
  get quote() { return ENGLISH.keep_learning_keep_growing; },
  get studentId() { return ENGLISH.student_id; },
  get program() { return ENGLISH.higher_study; },
  get college() { return ENGLISH.institution; },
  get empty() { return ENGLISH.your_profile_could_not_be_loaded; },
  get saved() { return ENGLISH.profile_updated; },
  get photoOk() { return ENGLISH.photo_updated; },
  get aiKeyOk() { return ENGLISH.fast_mentoring_connected; },
  get aiKeyRemoved() { return ENGLISH.api_key_removed; }
};

export function empty_link() {
  return { link_title: "", link_url: "" };
}

export function empty_links(links = []) {
  if (!Array.isArray(links) || !links.length) return [];
  return links.map((item) => ({
    link_id: item.link_id,
    link_title: item.link_title || "",
    link_url: item.link_url || ""
  }));
}

export function empty_skill() {
  return { skill_category: "", skill_items: "" };
}

export function empty_skills(skills = []) {
  if (!Array.isArray(skills) || !skills.length) return [];
  return skills.map((item) => ({
    skill_id: item.skill_id,
    skill_category: item.skill_category || "",
    skill_items: item.skill_items || ""
  }));
}

export function empty_experience() {
  return {
    company: "",
    role_title: "",
    start_label: "",
    end_label: "",
    description: ""
  };
}

export function empty_experiences(experiences = []) {
  if (!Array.isArray(experiences) || !experiences.length) return [];
  return experiences.map((item) => ({
    experience_id: item.experience_id,
    company: item.company || "",
    role_title: item.role_title || "",
    start_label: item.start_label || "",
    end_label: item.end_label || "",
    description: item.description || ""
  }));
}

export function empty_project() {
  return {
    project_name: "",
    role_title: "",
    live_url: "",
    tech_stack: "",
    description: ""
  };
}

export function empty_projects(projects = []) {
  if (!Array.isArray(projects) || !projects.length) return [];
  return projects.map((item) => ({
    project_id: item.project_id,
    project_name: item.project_name || "",
    role_title: item.role_title || "",
    live_url: item.live_url || "",
    tech_stack: item.tech_stack || "",
    description: item.description || ""
  }));
}

export function empty_achievement() {
  return { achievement_text: "" };
}

export function empty_achievements(achievements = []) {
  if (!Array.isArray(achievements) || !achievements.length) return [];
  return achievements.map((item) => ({
    achievement_id: item.achievement_id,
    achievement_text: item.achievement_text || ""
  }));
}

export function empty_form(student = {}) {
  return {
    first_name: student.first_name || "",
    last_name: student.last_name || "",
    email: student.email || "",
    mobile_number: student.mobile_number || "",
    date_of_birth: String(student.date_of_birth || "").slice(0, 10),
    college: student.college || "",
    higher_study: student.higher_study || "",
    blood_group: student.blood_group || "",
    address_line: student.address_line || "",
    pincode: student.pincode || "",
    state: student.state || "",
    district: student.district || "",
    headline: student.headline || "",
    professional_summary: student.professional_summary || "",
    degree: student.degree || "",
    cgpa: student.cgpa || ""
  };
}
