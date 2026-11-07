import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";
import { live_items } from "../constants/live_text.js";

export const ATTENDANCE_IMPORT_SECTIONS = [
  { id: "att_description", get label() { return ENGLISH.module_description; } },
  { id: "att_methods", get label() { return ENGLISH.supported_import_methods; } },
  { id: "att_fields", get label() { return ENGLISH.required_and_optional_fields; } },
  { id: "att_template", get label() { return ENGLISH.sample_template; } },
  { id: "att_mapping", get label() { return ENGLISH.field_mapping; } },
  { id: "att_api", get label() { return ENGLISH.api_examples; } },
  { id: "att_validation", get label() { return ENGLISH.validation_and_troubleshooting; } }
];

export const ATTENDANCE_IMPORT_FIELDS = [
  {
    field: "course_name",
    get headers() { return ENGLISH.course_name_course_name_course; },
    get required() { return ENGLISH.required; },
    stored: "course_id",
    get notes() { return ENGLISH.matched_to_tbl_courses_course_name_a_name; }
  },
  {
    field: "email",
    get headers() { return ENGLISH.student_email_email_email_id; },
    get required() { return ENGLISH.required; },
    stored: "student_id",
    get notes() { return ENGLISH.matched_to_tbl_students_email_an_email_that; }
  },
  {
    field: "is_present",
    get headers() { return ENGLISH.is_present_is_present_present; },
    get required() { return ENGLISH.required; },
    stored: "status",
    get notes() { return ENGLISH.label_1_is_stored_as_present_0_is_stored_2; }
  }
];

export const ATTENDANCE_IMPORT_MAPPING = [
  live_items([() => (ENGLISH.course_or_class_name), () => ("course_name")]),
  live_items([() => ENGLISH.student_email, () => ENGLISH.student_email_2]),
  live_items([() => ENGLISH.present_flag_1_or_0, () => ENGLISH.is_present])
];

export const ATTENDANCE_IMPORT_TEMPLATE = [
  live_items([() => ("course_name"), () => (ENGLISH.student_email_2), () => (ENGLISH.is_present)]),
  live_items([() => (ENGLISH.full_stack_python), () => ("asha.rao@institution.edu"), () => ("1")]),
  live_items([() => (ENGLISH.full_stack_python), () => ("ravi.kumar@institution.edu"), () => ("0")])
];

export const ATTENDANCE_IMPORT_RECORD = `{
  "course_name": "Full Stack Python",
  "email": "asha.rao@institution.edu",
  "is_present": 1,
  "status": "present"
}`;

export const ATTENDANCE_IMPORT_REPORT = `========== COURSE NAME NOT FOUND (1) ==========
  row 4 | course: Unknown Course | email: asha.rao@institution.edu

========== STUDENT EMAIL NOT FOUND (1) ==========
  row 5 | course: Full Stack Python | email: missing.person@institution.edu

========== RESULT ==========
To save                             : 2
  present                           : 1
  absent                            : 1`;

export const ATTENDANCE_IMPORT_CHECKS = [
  {
    get rule() { return ENGLISH.the_course_name_is_not_in_tbl_courses; },
    get result() { return ENGLISH.that_row_is_skipped_the_report_lists_the; }
  },
  {
    get rule() { return ENGLISH.the_email_is_not_in_tbl_students; },
    get result() { return ENGLISH.that_row_is_skipped_the_report_lists_the_2; }
  },
  {
    get rule() { return ENGLISH.more_than_one_course_uses_that_name; },
    get result() { return ENGLISH.that_row_is_skipped_the_report_lists_the_3; }
  },
  {
    get rule() { return ENGLISH.is_present_is_1; },
    get result() { return ENGLISH.the_row_is_saved_with_status_present; }
  },
  {
    get rule() { return ENGLISH.is_present_is_0; },
    get result() { return ENGLISH.the_row_is_saved_with_status_absent_the; }
  },
  {
    get rule() { return ENGLISH.is_present_is_blank_or_not_1_or; },
    get result() { return ENGLISH.that_row_is_skipped_the_report_lists_the_3; }
  }
];
