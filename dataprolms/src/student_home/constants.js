import { STUDENT_HOME_ENGLISH as ENGLISH } from "../constants/english/student_home_constants_english.js";
export const COPY = {
  get searchPlaceholder() { return ENGLISH.search_for_courses_lessons_or_resources; },
  get welcomeBack() { return ENGLISH.good_to_see_you_back_keep_learning_keep; },
  get streak() { return ENGLISH.your_learning_streak; },
  get streakHint() { return ENGLISH.open_a_course_today_to_keep_it_going; },
  get enrolled() { return ENGLISH.enrolled_courses; },
  get inProgress() { return ENGLISH.in_progress; },
  get completed() { return ENGLISH.completed; },
  get hours() { return ENGLISH.learning_hours; },
  get certificates() { return ENGLISH.certificate_earned; },
  get continue() { return ENGLISH.continue_learning; },
  get continueBtn() { return ENGLISH.label_continue; },
  get startBtn() { return ENGLISH.start; },
  get lastAccessed() { return ENGLISH.last_accessed; },
  get never() { return ENGLISH.not_accessed_yet; },
  get recommended() { return ENGLISH.recommended_for_you; },
  get viewCourse() { return ENGLISH.view_course; },
  get schedule() { return ENGLISH.recent_activity; },
  get goals() { return ENGLISH.your_goals; },
  goalHint: "completed",
  get emptyContinue() { return ENGLISH.you_have_no_courses_in_progress_yet; },
  get emptyReco() { return ENGLISH.browse_programs_to_find_your_next_course; },
  get emptySchedule() { return ENGLISH.no_course_activity_yet; }
};

export const ART = ["#3d2b8c", "#1f4d7a", "#0f6b5c", "#8a3d5c", "#4a3d8c", "#b45a1e"];
