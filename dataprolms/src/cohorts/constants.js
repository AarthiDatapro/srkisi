import { COHORTS_ENGLISH as ENGLISH } from "../constants/english/cohorts_constants_english.js";
export const EMPTY_COHORT = {
  cohort_name: "",
  description: ""
};

export const EMPTY_PROGRAM = {
  program_name: "",
  program_type_id: "",
  duration_months: "",
  description: "",
  start_date: "",
  end_date: "",
  program_id: ""
};

export const COPY = {
  get title() { return ENGLISH.cohort_programs_management; },
  get subtitle() { return ENGLISH.create_cohorts_add_multiple_programs_and_manage_everything; },
  get cohorts() { return ENGLISH.cohorts; },
  get createCohort() { return ENGLISH.create_cohort_2; },
  get editCohort() { return ENGLISH.edit_cohort; },
  get deleteCohort() { return ENGLISH.delete_cohort_2; },
  get createProgram() { return ENGLISH.create_program_2; },
  get addProgram() { return ENGLISH.add_program; },
  get addNew() { return ENGLISH.add_new_program; },
  get addNewHint() { return ENGLISH.create_another_program_under_this_cohort_the_cohort; },
  get programs() { return ENGLISH.programs; },
  get details() { return ENGLISH.cohort_details; },
  get emptyCohorts() { return ENGLISH.no_cohorts_yet; },
  get emptyCohortsHint() { return ENGLISH.create_a_cohort_then_add_the_programs_that; },
  get emptyPrograms() { return ENGLISH.no_programs_in_this_cohort; },
  get searchCohorts() { return ENGLISH.search_cohorts; },
  get searchPrograms() { return ENGLISH.search_programs; },
  get savedCohort() { return ENGLISH.cohort_saved; },
  get savedProgram() { return ENGLISH.program_saved; },
  get removedCohort() { return ENGLISH.cohort_deleted; },
  get removedProgram() { return ENGLISH.program_deleted; },
  get imageSaved() { return ENGLISH.cohort_image_applied_to_every_program; },
  get imageRemoved() { return ENGLISH.cohort_image_removed_from_every_program; },
  get needCohort() { return ENGLISH.create_or_select_a_cohort_first; }
};
