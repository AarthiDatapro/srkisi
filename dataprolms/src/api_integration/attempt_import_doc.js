import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";
import { live_items } from "../constants/live_text.js";

export const ATTEMPT_IMPORT_SECTIONS = [
  { id: "attempt_description", get label() { return ENGLISH.module_description; } },
  { id: "attempt_methods", get label() { return ENGLISH.supported_import_methods; } },
  { id: "attempt_fields", get label() { return ENGLISH.required_and_optional_fields; } },
  { id: "attempt_template", get label() { return ENGLISH.sample_template; } },
  { id: "attempt_mapping", get label() { return ENGLISH.field_mapping; } },
  { id: "attempt_api", get label() { return ENGLISH.api_examples; } },
  { id: "attempt_validation", get label() { return ENGLISH.validation_and_troubleshooting; } }
];

export const ATTEMPT_IMPORT_FIELDS = [
  {
    field: "course_name",
    get headers() { return ENGLISH.course_name_course_nme_course_name; },
    get required() { return ENGLISH.required; },
    stored: "course_id",
    get notes() { return ENGLISH.must_already_be_in_tbl_courses_the_attempt; }
  },
  {
    field: "quiz_name",
    get headers() { return ENGLISH.quiz_name_quiz_names_quiz_title; },
    get required() { return ENGLISH.required; },
    stored: "quiz_id",
    get notes() { return ENGLISH.must_already_be_a_quiz_on_that_course; }
  },
  {
    field: "email",
    get headers() { return ENGLISH.student_email_student_email_email; },
    get required() { return ENGLISH.required; },
    stored: "student_id",
    get notes() { return ENGLISH.must_already_be_an_active_student_the_attempt; }
  },
  {
    field: "program_name",
    get headers() { return ENGLISH.batch_name_program_name_program; },
    get required() { return ENGLISH.optional; },
    stored: "registration_id",
    get notes() { return ENGLISH.the_student_must_be_registered_on_the_course; }
  },
  {
    field: "question",
    get headers() { return ENGLISH.question_question_text; },
    get required() { return ENGLISH.required; },
    stored: "question_id",
    get notes() { return ENGLISH.must_match_a_question_on_that_quiz_one; }
  },
  {
    field: "selected_answer",
    get headers() { return ENGLISH.selected_answer_selected_answer_answer; },
    get required() { return ENGLISH.required; },
    stored: "selected_answer",
    get notes() { return ENGLISH.the_option_text_a_letter_a_f_or; }
  },
  {
    field: "duration_seconds",
    get headers() { return ENGLISH.duration_seconds_duration_seconds_time_taken; },
    get required() { return ENGLISH.optional; },
    stored: "duration_seconds",
    get notes() { return ENGLISH.whole_seconds_from_0_to_86400_the_first; }
  },
  {
    field: "submitted_at",
    get headers() { return ENGLISH.submitted_at_submitted_at_attempt_date; },
    get required() { return ENGLISH.optional; },
    stored: "submitted_at",
    get notes() { return ENGLISH.a_date_and_time_such_as_2026_10; }
  }
];

export const ATTEMPT_IMPORT_MAPPING = [
  live_items([() => (ENGLISH.course_already_in_the_lms), () => ("course_name")]),
  live_items([() => (ENGLISH.quiz_already_on_that_course), () => ("quiz_name")]),
  live_items([() => (ENGLISH.student_email_already_in_the_lms), () => ("student_email")]),
  live_items([() => (ENGLISH.batch_when_the_student_has_more_than_one), () => ("batch_name")]),
  live_items([() => (ENGLISH.question_already_on_that_quiz), () => ("question")]),
  live_items([() => (ENGLISH.the_option_the_student_chose), () => ("selected_answer")])
];

export const ATTEMPT_IMPORT_TEMPLATE = [
  ["course_name", "quiz_name", "student_email", "batch_name", "question", "selected_answer", "duration_seconds", "submitted_at"],
  live_items([() => (ENGLISH.full_stack_python), () => (ENGLISH.python_check), () => ("asha.rao@institution.edu"), () => (ENGLISH.python_batch_2026), () => (ENGLISH.what_does_print_do), () => (ENGLISH.writes_text), () => ("180"), () => ("2026-10-15 10:30:00")]),
  live_items([() => (ENGLISH.full_stack_python), () => (ENGLISH.python_check), () => ("asha.rao@institution.edu"), () => (ENGLISH.python_batch_2026), () => (ENGLISH.which_symbol_starts_a_comment), () => ("A"), () => (""), () => ("")])
];

export const ATTEMPT_IMPORT_RECORD = `{
  "quiz_id": 8,
  "course_id": 12,
  "student_id": "STU00018",
  "registration_id": 44,
  "score": 2,
  "total_questions": 2,
  "correct_count": 2,
  "percent": 100,
  "status": "submitted",
  "duration_seconds": 180,
  "answers": [
    { "question_id": 31, "selected_answer": "Writes text", "is_correct": true }
  ]
}`;

export const ATTEMPT_IMPORT_REPORT = `QUIZ NAME NOT FOUND (2)
  row 2 | course: Full Stack Python | quiz: Missing Quiz | email: asha.rao@institution.edu | question: What does print() do?

ANSWER COUNT DOES NOT MATCH QUESTIONS SHOWN (1)
  row 4 | course: Full Stack Python | quiz: Python check | email: ravi.kumar@institution.edu | question: What does print() do? | answers 1, quiz shows 2

RESULT
To add                              : 1
  answers to add                   : 2`;

export const ATTEMPT_IMPORT_CHECKS = [
  {
    get rule() { return ENGLISH.the_course_the_quiz_and_the_student_email; },
    get result() { return ENGLISH.a_missing_name_is_skipped_the_report_names; }
  },
  {
    get rule() { return ENGLISH.the_student_must_be_registered_on_that_course; },
    get result() { return ENGLISH.registration_id_is_taken_from_that_registration_when; }
  },
  {
    get rule() { return ENGLISH.the_question_text_must_match_one_question_on; },
    get result() { return ENGLISH.question_id_is_taken_from_tbl_quiz_questions; }
  },
  {
    get rule() { return ENGLISH.the_number_of_answers_must_equal_the_number; },
    get result() { return ENGLISH.a_short_or_long_attempt_is_skipped_the; }
  },
  {
    get rule() { return ENGLISH.an_attempt_already_saved_for_that_student_quiz; },
    get result() { return ENGLISH.those_rows_are_listed_under_attempt_already_in; }
  },
  {
    get rule() { return ENGLISH.check_does_not_insert_an_attempt_or_an; },
    get result() { return ENGLISH.import_runs_scripts_importquizattempts_js_import_it_writes; }
  }
];
