import { MY_COURSES_ENGLISH as ENGLISH } from "../constants/english/my_courses_constants_english.js";
export const TABS = [
{ id: "all", get label() { return ENGLISH.all_courses; } },
{ id: "in_progress", get label() { return ENGLISH.in_progress; } },
{ id: "completed", get label() { return ENGLISH.completed; } }];


export const COPY = {
  get title() { return ENGLISH.my_courses; },
  get subtitle() { return ENGLISH.all_the_courses_you_are_enrolled_in; },
  get searchPlaceholder() { return ENGLISH.search_for_courses_lessons; },
  get allStatus() { return ENGLISH.all_status; },
  get sortRecent() { return ENGLISH.sort_by_recent_access; },
  get sortName() { return ENGLISH.sort_by_name; },
  //empty: "You have not enrolled in any courses yet.",
  get empty() { return ENGLISH.no_courses_to_show_here_yet_explore_available; },
  get browse() { return ENGLISH.can_t_find_a_course; },
  get browseLink() { return ENGLISH.browse_all_available_courses; },
  get browseProgramsLink() { return ENGLISH.browse_all_available_programs; },
  get continue() { return ENGLISH.continue_learning; },
  get start() { return ENGLISH.start_learning; },
  get lastAccessed() { return ENGLISH.last_accessed; },
  get never() { return ENGLISH.not_accessed_yet; },
  get enrolled() { return ENGLISH.enrolled_courses; },
  get inProgress() { return ENGLISH.in_progress; },
  get completed() { return ENGLISH.completed; },
  get certificates() { return ENGLISH.certificates_earned; }
};
