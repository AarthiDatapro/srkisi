import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";
import { live_items } from "../constants/live_text.js";

export const QUIZ_IMPORT_SECTIONS = [
  { id: "quiz_description", get label() { return ENGLISH.module_description; } },
  { id: "quiz_methods", get label() { return ENGLISH.supported_import_methods; } },
  { id: "quiz_fields", get label() { return ENGLISH.required_and_optional_fields; } },
  { id: "quiz_template", get label() { return ENGLISH.sample_template; } },
  { id: "quiz_mapping", get label() { return ENGLISH.field_mapping; } },
  { id: "quiz_api", get label() { return ENGLISH.api_examples; } },
  { id: "quiz_validation", get label() { return ENGLISH.validation_and_troubleshooting; } }
];

export const QUIZ_IMPORT_FIELDS = [
  {
    field: "course_name",
    get headers() { return ENGLISH.course_name_course_nme_course_name; },
    get required() { return ENGLISH.required; },
    stored: "course_id",
    get notes() { return ENGLISH.must_already_be_in_tbl_courses_a_missing; }
  },
  {
    field: "course_code",
    get headers() { return ENGLISH.course_code_course_code; },
    get required() { return ENGLISH.optional; },
    stored: "checked against tbl_courses",
    get notes() { return ENGLISH.when_filled_the_course_found_by_name_must; }
  },
  {
    field: "quiz_name",
    get headers() { return ENGLISH.quiz_name_quiz_names_quiz_title; },
    get required() { return ENGLISH.required; },
    stored: "quiz_title",
    get notes() { return ENGLISH.repeat_the_name_on_every_question_row_the; }
  },
  {
    field: "module",
    get headers() { return ENGLISH.module_module_title; },
    get required() { return ENGLISH.optional; },
    stored: "module_id",
    get notes() { return ENGLISH.must_already_be_a_module_on_the_course; }
  },
  {
    field: "lesson",
    get headers() { return ENGLISH.lesson_lesson_title; },
    get required() { return ENGLISH.optional; },
    stored: "lesson_id",
    get notes() { return ENGLISH.must_already_be_a_lesson_in_that_module; }
  },
  {
    field: "quiz_description",
    get headers() { return ENGLISH.quiz_description_description; },
    get required() { return ENGLISH.optional; },
    stored: "quiz_description",
    get notes() { return ENGLISH.the_first_description_on_the_quiz_is_stored; }
  },
  {
    field: "duration",
    get headers() { return ENGLISH.duration_duration_in_minutes; },
    get required() { return ENGLISH.optional; },
    stored: "duration_minutes",
    get notes() { return ENGLISH.a_whole_number_of_minutes_from_1_to; }
  },
  {
    field: "questions_shown",
    get headers() { return ENGLISH.questions_shown_questions_shown_shown; },
    get required() { return ENGLISH.optional; },
    stored: "questions_shown",
    get notes() { return ENGLISH.how_many_questions_a_student_sees_blank_shows; }
  },
  {
    field: "passing_marks",
    get headers() { return ENGLISH.passing_marks_passing_marks; },
    get required() { return ENGLISH.optional; },
    stored: "passing_marks",
    get notes() { return ENGLISH.blank_uses_half_the_question_count_rounded_up; }
  },
  {
    field: "max_attempts",
    get headers() { return ENGLISH.max_attempts_max_attempts; },
    get required() { return ENGLISH.optional; },
    stored: "max_attempts",
    get notes() { return ENGLISH.a_whole_number_from_1_to_100_blank; }
  },
  {
    field: "published",
    get headers() { return ENGLISH.is_published_published; },
    get required() { return ENGLISH.optional; },
    stored: "is_published",
    get notes() { return ENGLISH.label_1_publishes_the_quiz_0_keeps_it_unpublished; }
  },
  {
    field: "question",
    get headers() { return ENGLISH.question_question_text; },
    get required() { return ENGLISH.required; },
    stored: "question_text",
    get notes() { return ENGLISH.one_question_per_row_the_correct_answer_is; }
  },
  {
    field: "options",
    get headers() { return ENGLISH.option_a_to_option_f_or_options; },
    get required() { return ENGLISH.required; },
    stored: "options_json",
    get notes() { return ENGLISH.at_least_two_options_a_packed_options_cell; }
  },
  {
    field: "correct_answer",
    get headers() { return ENGLISH.correct_answer_correct_answer_answer; },
    get required() { return ENGLISH.required; },
    stored: "correct_answer",
    get notes() { return ENGLISH.must_match_an_option_a_letter_or_a; }
  },
  {
    field: "explanation",
    get headers() { return ENGLISH.explanation; },
    get required() { return ENGLISH.optional; },
    stored: "explanation",
    get notes() { return ENGLISH.shown_with_the_answer_after_the_attempt; }
  },
  {
    field: "difficulty",
    get headers() { return ENGLISH.difficulty_2; },
    get required() { return ENGLISH.optional; },
    stored: "difficulty",
    get notes() { return ENGLISH.easy_medium_or_hard_blank_stores_medium; }
  },
  {
    field: "bloom_level",
    get headers() { return ENGLISH.bloom_level_bloom; },
    get required() { return ENGLISH.optional; },
    stored: "bloom_level",
    get notes() { return ENGLISH.remember_understand_apply_analyze_evaluate_or_create_blank; }
  }
];

export const QUIZ_IMPORT_MAPPING = [
  live_items([() => (ENGLISH.course_already_in_the_lms), () => ("course_name")]),
  live_items([() => (ENGLISH.quiz_title), () => ("quiz_name")]),
  live_items([() => (ENGLISH.module_already_on_the_course), () => ("module")]),
  live_items([() => (ENGLISH.lesson_already_in_that_module), () => ("lesson")]),
  live_items([() => (ENGLISH.question), () => ("question")]),
  live_items([() => ENGLISH.choices, () => ENGLISH.option_a_option_b_option_c_option_d]),
  live_items([() => (ENGLISH.right_choice), () => ("correct_answer")]),
  live_items([() => (ENGLISH.why_that_choice_is_right), () => ("explanation")])
];

export const QUIZ_IMPORT_TEMPLATE = [
  ["course_name", "quiz_name", "module", "lesson", "question", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation", "difficulty", "bloom_level", "questions_shown", "quiz_description"],
  live_items([() => (ENGLISH.full_stack_python), () => (ENGLISH.python_check), () => (ENGLISH.python_basics), () => (ENGLISH.welcome), () => (ENGLISH.what_does_print_do), () => (ENGLISH.writes_text), () => (ENGLISH.reads_a_file), () => (ENGLISH.deletes_a_file), () => (ENGLISH.stops_the_program), () => (ENGLISH.writes_text), () => (ENGLISH.it_sends_text_to_the_screen), () => ("easy"), () => ("remember"), () => ("2"), () => (ENGLISH.a_short_check_after_the_welcome_lesson)]),
  live_items([() => (ENGLISH.full_stack_python), () => (ENGLISH.python_check), () => (ENGLISH.python_basics), () => (ENGLISH.welcome), () => (ENGLISH.which_symbol_starts_a_comment), () => ("#"), () => ("//"), () => ("/*"), () => ("--"), () => ("A"), () => (ENGLISH.python_comments_start_with), () => ("easy"), () => ("remember"), () => (""), () => ("")])
];

export const QUIZ_IMPORT_RECORD = `{
  "course_id": 12,
  "quiz_title": "Python check",
  "module_id": 4,
  "lesson_id": 9,
  "question_count": 2,
  "questions_shown": 2,
  "total_marks": 2,
  "passing_marks": 1,
  "is_published": true,
  "questions": [
    {
      "question_number": 1,
      "question_text": "What does print() do?",
      "options": ["Writes text", "Reads a file", "Deletes a file", "Stops the program"],
      "correct_answer": "Writes text"
    }
  ]
}`;

export const QUIZ_IMPORT_REPORT = `COURSE NAME NOT FOUND (1)
  row 4 | course: Missing Course | quiz: Python check | question: What does print() do?

QUIZ ALREADY IN LMS (2)
  row 2 | course: Full Stack Python | quiz: Python check | question: What does print() do?

RESULT
To add                              : 1
  questions to add                 : 2`;

export const QUIZ_IMPORT_CHECKS = [
  {
    get rule() { return ENGLISH.the_course_name_must_already_be_in_tbl; },
    get result() { return ENGLISH.a_missing_course_is_skipped_the_report_names; }
  },
  {
    get rule() { return ENGLISH.the_module_and_lesson_must_already_belong_to; },
    get result() { return ENGLISH.a_blank_module_uses_the_first_module_a; }
  },
  {
    get rule() { return ENGLISH.a_quiz_with_the_same_name_on_that; },
    get result() { return ENGLISH.those_rows_are_listed_under_quiz_already_in; }
  },
  {
    get rule() { return ENGLISH.each_question_needs_at_least_two_options_and; },
    get result() { return ENGLISH.that_question_is_skipped_the_quiz_is_still; }
  },
  {
    get rule() { return ENGLISH.the_correct_answer_may_be_the_option_text; },
    get result() { return ENGLISH.the_stored_answer_is_the_option_text_which; }
  },
  {
    get rule() { return ENGLISH.check_does_not_insert_a_quiz_a_question; },
    get result() { return ENGLISH.import_runs_scripts_importquizzes_js_import_it_writes; }
  }
];
