import { HACKATHON_MANAGER_ENGLISH as ENGLISH } from "../constants/english/hackathon_manager_constants_english.js";
export const COPY = {
  get kicker() { return ENGLISH.hackathons; },
  get title() { return ENGLISH.hackathon_management; },
  get lede() { return ENGLISH.build_a_hackathon_from_a_quiz_a_coding; },
  get empty() { return ENGLISH.create_a_quiz_a_coding_challenge_a_project; },
  get loading() { return ENGLISH.loading_hackathons; }
};

export const TYPES = [
  {
    id: "mcq",
    get label() { return ENGLISH.mcq_quiz; },
    get hint() { return ENGLISH.multiple_choice_questions_generated_the_same_way_as; }
  },
  {
    id: "coding",
    get label() { return ENGLISH.coding_challenge; },
    get hint() { return ENGLISH.coding_questions_with_an_online_editor_generated_like; }
  },
  {
    id: "project",
    get label() { return ENGLISH.project; },
    get hint() { return ENGLISH.a_project_brief_made_of_tasks_the_participants; }
  }
];

export const AUDIENCES = [
  {
    id: "program",
    get label() { return ENGLISH.program_specific; },
    get hint() { return ENGLISH.assign_to_one_program_in_a_cohort; }
  },
  {
    id: "open",
    get label() { return ENGLISH.open_hackathon; },
    get hint() { return ENGLISH.anyone_can_participate_including_people_outside_those_programs; }
  }
];

export const TYPE_LABEL = Object.fromEntries(TYPES.map((type) => [type.id, type.label]));
export const AUDIENCE_LABEL = Object.fromEntries(AUDIENCES.map((item) => [item.id, item.label]));
