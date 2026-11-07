import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../constants/english/programs_control_constants_english.js";
export const EMPTY_PROGRAM = {
  program_name: "",
  program_type_id: "",
  duration_months: "",
  description: "",
  start_date: "",
  end_date: ""
};

export const COPY = {
  get title() { return ENGLISH.programs; },
  get subtitle() { return ENGLISH.review_programs_courses_students_and_faculty; },
  get create() { return ENGLISH.add_program; },
  get search() { return ENGLISH.search_programs; },
  get selectCohort() { return ENGLISH.select_a_cohort; },
  get pickCohort() { return ENGLISH.select_a_cohort_to_see_its_programs; },
  get empty() { return ENGLISH.no_programs_in_this_cohort; },
  get emptyHint() { return ENGLISH.programs_are_added_from_a_cohort; },
  get details() { return ENGLISH.program_details; },
  get edit() { return ENGLISH.edit_program; },
  get courses() { return ENGLISH.courses; },
  get noCourses() { return ENGLISH.no_courses_are_linked_yet; },
  get addCourse() { return ENGLISH.add_course; },
  get noStudents() { return ENGLISH.no_students_enrolled_yet; },
  get noFaculty() { return ENGLISH.no_faculty_assigned_yet_assign_them_from_edit; }
};
