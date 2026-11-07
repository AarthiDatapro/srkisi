import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";
import { live_items } from "../constants/live_text.js";

export const REGISTRATION_IMPORT_SECTIONS = [
  { id: "reg_description", get label() { return ENGLISH.module_description; } },
  { id: "reg_methods", get label() { return ENGLISH.supported_import_methods; } },
  { id: "reg_fields", get label() { return ENGLISH.required_and_optional_fields; } },
  { id: "reg_template", get label() { return ENGLISH.sample_template; } },
  { id: "reg_mapping", get label() { return ENGLISH.field_mapping; } },
  { id: "reg_api", get label() { return ENGLISH.api_examples; } },
  { id: "reg_validation", get label() { return ENGLISH.validation_and_troubleshooting; } }
];

export const REGISTRATION_IMPORT_FIELDS = [
  {
    field: "batch_name",
    get headers() { return ENGLISH.batch_name_batch_name_batch; },
    get required() { return ENGLISH.required_with_program_type; },
    stored: "tbl_programs.program_name",
    get notes() { return ENGLISH.each_distinct_batch_becomes_one_program_a_batch; }
  },
  {
    field: "course_name",
    get headers() { return ENGLISH.course_name_course_nme_course_name; },
    get required() { return ENGLISH.required; },
    stored: "course_id",
    get notes() { return ENGLISH.must_already_be_in_tbl_courses_a_missing_2; }
  },
  {
    field: "email",
    get headers() { return ENGLISH.student_email_student_email_email; },
    get required() { return ENGLISH.required; },
    stored: "student_id",
    get notes() { return ENGLISH.must_already_be_in_tbl_students_a_missing; }
  },
  {
    field: "program_type",
    get headers() { return ENGLISH.program_type_program_type; },
    get required() { return ENGLISH.required_for_a_new_batch; },
    stored: "program_type_id",
    get notes() { return ENGLISH.matched_to_mst_program_types_a_new_name; }
  },
  {
    field: "duration",
    get headers() { return ENGLISH.program_duration_program_dureatioon_duration; },
    get required() { return ENGLISH.optional; },
    stored: "duration_months",
    get notes() { return ENGLISH.a_whole_number_of_months_or_a_number; }
  },
  {
    field: "description",
    get headers() { return ENGLISH.program_description_program_description; },
    get required() { return ENGLISH.optional; },
    stored: "description",
    get notes() { return ENGLISH.the_first_description_on_the_batch_is_stored; }
  },
  {
    field: "registration_code",
    get headers() { return ENGLISH.registration_code_regusrtaion_code; },
    get required() { return ENGLISH.optional; },
    stored: "course_student_id",
    get notes() { return ENGLISH.stored_on_the_registration_the_same_code_cannot; }
  },
  {
    field: "start_date",
    get headers() { return ENGLISH.start_date_start_date; },
    get required() { return ENGLISH.optional; },
    stored: "created_at",
    get notes() { return ENGLISH.start_date_sets_the_registration_created_date; }
  }
];

export const REGISTRATION_IMPORT_MAPPING = [
  live_items([() => (ENGLISH.batch_or_class_name), () => ("batch_name")]),
  live_items([() => (ENGLISH.course_already_in_the_lms), () => ("course_name")]),
  live_items([() => (ENGLISH.student_email_already_in_the_lms), () => ("student_email")]),
  live_items([() => (ENGLISH.program_type), () => ("program_type")]),
  live_items([() => ENGLISH.length_of_the_batch, () => ENGLISH.program_duration]),
  live_items([() => (ENGLISH.about_the_batch), () => ("program_description")]),
  live_items([() => (ENGLISH.registration_or_roll_code), () => ("registration_code")]),
  live_items([() => (ENGLISH.when_the_registration_started), () => ("start_date")])
];

export const REGISTRATION_IMPORT_TEMPLATE = [
  live_items([() => ("batch_name"), () => ("course_name"), () => ("student_email"), () => ("program_type"), () => (ENGLISH.program_duration), () => ("program_description"), () => ("registration_code"), () => ("start_date")]),
  live_items([() => (ENGLISH.python_batch_2026), () => (ENGLISH.full_stack_python), () => ("asha.rao@institution.edu"), () => (ENGLISH.certificate), () => (ENGLISH.label_6_months), () => (ENGLISH.evening_batch_for_working_graduates), () => ("PY-2026-001"), () => ("2026-08-01")]),
  live_items([() => (ENGLISH.python_batch_2026), () => (ENGLISH.full_stack_python), () => ("ravi.kumar@institution.edu"), () => (ENGLISH.certificate), () => (ENGLISH.label_6_months), () => (ENGLISH.evening_batch_for_working_graduates), () => ("PY-2026-002"), () => ("2026-08-01")]),
  live_items([() => (""), () => (ENGLISH.full_stack_python), () => ("meera.shah@institution.edu"), () => (""), () => (""), () => (""), () => ("OPEN-001"), () => ("")])
];

export const REGISTRATION_IMPORT_RECORD = `{
  "cohort_name": "City College",
  "program_name": "Python Batch 2026",
  "course_id": 12,
  "student_id": "STU00018",
  "program_id": 4,
  "course_student_id": "PY-2026-001",
  "status": "registered",
  "created_at": "2026-08-01 00:00:00"
}`;

export const REGISTRATION_IMPORT_REPORT = `========== COURSE NAME NOT FOUND (1) ==========
  row 4 | batch: Python Batch 2026 | course: Unknown Course | email: asha.rao@institution.edu

========== STUDENT EMAIL NOT FOUND (1) ==========
  row 5 | batch: Python Batch 2026 | course: Full Stack Python | email: missing.person@institution.edu

========== RESULT ==========
To register                         : 2`;

export const REGISTRATION_IMPORT_CHECKS = [
  {
    get rule() { return ENGLISH.the_institution_name_is_entered_before_the_workbook; },
    get result() { return ENGLISH.that_name_is_the_cohort_a_cohort_with; }
  },
  {
    get rule() { return ENGLISH.the_course_name_is_not_in_tbl_courses; },
    get result() { return ENGLISH.that_row_is_skipped_the_report_lists_the_5; }
  },
  {
    get rule() { return ENGLISH.the_email_is_not_in_tbl_students; },
    get result() { return ENGLISH.that_row_is_skipped_the_report_lists_the_6; }
  },
  {
    get rule() { return ENGLISH.the_batch_is_not_in_tbl_programs; },
    get result() { return ENGLISH.a_program_is_added_with_the_type_duration; }
  },
  {
    get rule() { return ENGLISH.the_program_type_is_not_in_mst_program; },
    get result() { return ENGLISH.the_type_is_added_and_its_id_is; }
  },
  {
    get rule() { return ENGLISH.the_student_is_already_registered_for_that_course; },
    get result() { return ENGLISH.that_row_is_skipped; }
  },
  {
    get rule() { return ENGLISH.batch_and_program_type_must_be_filled_together; },
    get result() { return ENGLISH.that_row_is_skipped_fill_both_or_leave_both; }
  },
  {
    get rule() { return ENGLISH.both_batch_name_and_program_type_are_blank; },
    get result() { return ENGLISH.the_student_is_registered_with_no_program; }
  },
  {
    get rule() { return ENGLISH.the_start_date_is_missing_or_not_a_real_date; },
    get result() { return ENGLISH.that_row_is_skipped_the_registration_date_is_not_saved; }
  }
];
