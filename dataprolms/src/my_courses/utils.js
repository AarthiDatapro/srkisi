import { MY_COURSES_ENGLISH as ENGLISH } from "../constants/english/my_courses_constants_english.js";
export { display_name, initials } from "../design_system/people.js";


export function collect_outline_quiz_ids(outline) {
  const ids = new Set();
  for (const module of outline?.modules || []) {
    for (const quiz of module.quizzes || []) {
      if (quiz?.quiz_id != null) ids.add(Number(quiz.quiz_id));
    }
    for (const lesson of module.lessons || []) {
      for (const quiz of lesson.quizzes || []) {
        if (quiz?.quiz_id != null) ids.add(Number(quiz.quiz_id));
      }
    }
  }
  return [...ids];
}

/** Quiz is complete when the student has a submitted attempt (or API marks it done). */
export function quiz_is_completed(quiz, completed_quiz_ids) {
  if (!quiz) return false;
  if (quiz.is_completed === true || quiz.is_done === true) return true;
  if (quiz.attempt) return true;
  const id = Number(quiz.quiz_id);
  return Number.isFinite(id) && completed_quiz_ids?.has(id);
}

export function quiz_needs_attention(quiz, completed_quiz_ids) {
  return !quiz_is_completed(quiz, completed_quiz_ids);
}

export function status_label(status) {
  if (status === "in_progress") return ENGLISH.in_progress;
  if (status === "completed") return ENGLISH.completed;
  return ENGLISH.not_started;
}

export function format_access_date(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
