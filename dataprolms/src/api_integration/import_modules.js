import {
  STUDENT_IMPORT_CHECKS,
  STUDENT_IMPORT_FIELDS,
  STUDENT_IMPORT_MAPPING,
  STUDENT_IMPORT_RECORD,
  STUDENT_IMPORT_SECTIONS,
  STUDENT_IMPORT_TEMPLATE } from
"./student_import_doc.js";
import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";

const QUIET_STUDENTS = [
  [ENGLISH.workbook, ENGLISH.the_upload_is_an_xlsx_file_and_the],
  [ENGLISH.required_cells, ENGLISH.every_kept_row_has_a_valid_email_and],
  [ENGLISH.already_in_the_lms, ENGLISH.a_large_already_in_lms_count_means_those],
  [ENGLISH.import_stays_closed, ENGLISH.import_opens_only_after_check_file_finishes_cleanly]
];

export const IMPORT_SECTIONS = STUDENT_IMPORT_SECTIONS;

export const IMPORT_MODULES = [
  {
    id: "students",
    get label() { return ENGLISH.students; },
    get title() { return ENGLISH.student_import; },
    chips: [ENGLISH.excel_xlsx, ENGLISH.email_and_mobile_required, ENGLISH.passwords_encrypted],
    live: true,
    file_name: "students_import_template.xlsx",
    get description() { return ENGLISH.each_accepted_row_becomes_one_student_sign_in; },
    facts: [
      [ENGLISH.identity, ENGLISH.email_and_mobile_number_are_required_on_every],
      [ENGLISH.password, ENGLISH.a_value_in_the_file_is_encrypted_before],
      [ENGLISH.profile, ENGLISH.name_gender_date_of_birth_college_study_and]
    ],
    get methods() { return ENGLISH.one_method_is_published_an_excel_workbook_header; },
    get fields_lead() { return ENGLISH.keep_the_columns_you_have_email_and_mobile; },
    fields: STUDENT_IMPORT_FIELDS,
    get template_lead() { return ENGLISH.the_second_row_keeps_a_name_email_and; },
    template: STUDENT_IMPORT_TEMPLATE,
    get mapping_lead() { return ENGLISH.export_one_row_per_student_rename_columns_to; },
    mapping_steps: [
      ENGLISH.export_one_row_per_student_from_the_other,
      ENGLISH.rename_each_column_to_the_header_on_the,
      ENGLISH.keep_email_and_mobile_exactly_as_the_person,
      ENGLISH.return_to_supported_import_methods_check_the_file
    ],
    mapping: STUDENT_IMPORT_MAPPING,
    get api_lead() { return ENGLISH.both_calls_need_an_employee_session_with_edit_6; },
    get record_caption() { return ENGLISH.one_accepted_row; },
    record: STUDENT_IMPORT_RECORD,
    get record_note() { return ENGLISH.the_password_in_this_example_is_the_value; },
    checks: STUDENT_IMPORT_CHECKS,
    get quiet_title() { return ENGLISH.if_the_file_seems_to_do_nothing; },
    quiet: QUIET_STUDENTS
  },
  {
    id: "courses",
    get label() { return ENGLISH.courses; },
    get title() { return ENGLISH.course_import; },
    chips: [ENGLISH.excel_xlsx, ENGLISH.name_and_code_required, ENGLISH.match_dropdown_names],
    file_name: "courses_import_template.xlsx",
    get description() { return ENGLISH.each_accepted_row_becomes_one_course_use_the; },
    facts: [
      [ENGLISH.course_code, ENGLISH.required_and_unique_this_is_the_key_the],
      [ENGLISH.names_not_ids, ENGLISH.type_domain_level_language_and_tag_are_the],
      [ENGLISH.the_rest, ENGLISH.tagline_is_required_description_hours_fee_and_the]
    ],
    get methods() { return ENGLISH.excel_workbook_xlsx_one_row_per_course_headers; },
    get fields_lead() { return ENGLISH.course_code_course_name_type_domain_level_language; },
    fields: [
      { field: "course_code", get headers() { return ENGLISH.course_code_code; }, get required() { return ENGLISH.required; }, stored: "course_code", notes: ENGLISH.unique_later_registrations_and_attendance_use_this_code },
      { field: "course_name", get headers() { return ENGLISH.course_name_name_title; }, get required() { return ENGLISH.required; }, stored: "course_name", notes: ENGLISH.up_to_150_characters },
      { field: "course_type", get headers() { return ENGLISH.course_type_type; }, get required() { return ENGLISH.required; }, stored: "course_type", notes: ENGLISH.must_match_a_course_type_in_dropdowns },
      { field: "domain", get headers() { return ENGLISH.domain_course_domain; }, get required() { return ENGLISH.required; }, stored: "course_domain", notes: ENGLISH.must_match_a_domain_in_dropdowns },
      { field: "level", get headers() { return ENGLISH.level; }, get required() { return ENGLISH.required; }, stored: "level", notes: ENGLISH.must_match_a_level_in_dropdowns },
      { field: "language", get headers() { return ENGLISH.language; }, get required() { return ENGLISH.required; }, stored: "language", notes: ENGLISH.must_match_a_course_language_in_dropdowns_one },
      { field: "tag", get headers() { return ENGLISH.tag; }, get required() { return ENGLISH.required; }, stored: "tag", notes: ENGLISH.must_match_a_tag_in_dropdowns },
      { field: "tagline", get headers() { return ENGLISH.tagline; }, get required() { return ENGLISH.required; }, stored: "course_tagline", notes: ENGLISH.short_line_shown_with_the_course_up_to },
      { field: "description", get headers() { return ENGLISH.description; }, get required() { return ENGLISH.optional; }, stored: "course_description", notes: ENGLISH.leave_blank_to_skip },
      { field: "duration_hours", get headers() { return ENGLISH.duration_hours_hours; }, get required() { return ENGLISH.optional; }, stored: "duration_hours", notes: ENGLISH.a_number_of_hours_leave_blank_to_skip },
      { field: "fee_amount", get headers() { return ENGLISH.fee_fee_amount; }, get required() { return ENGLISH.optional; }, stored: "fee_amount", notes: ENGLISH.leave_blank_when_the_course_is_not_priced },
      { field: "is_open", get headers() { return ENGLISH.open_is_open; }, get required() { return ENGLISH.optional; }, stored: "is_open", notes: ENGLISH.yes_or_no_blank_means_the_course_is },
      { field: "is_offline", get headers() { return ENGLISH.offline_is_offline; }, get required() { return ENGLISH.optional; }, stored: "is_offline", notes: ENGLISH.yes_or_no_blank_means_the_course_is_2 },
      { field: "enroll_passkey", get headers() { return ENGLISH.passkey_enroll_passkey; }, get required() { return ENGLISH.optional; }, stored: "enroll_passkey", notes: ENGLISH.leave_blank_when_enrolment_does_not_need_a }
    ],
    get template_lead() { return ENGLISH.the_second_row_keeps_only_the_required_columns; },
    template: [
      [ENGLISH.course_code, ENGLISH.course_name, ENGLISH.course_type, ENGLISH.domain, ENGLISH.level, ENGLISH.language, ENGLISH.tag, ENGLISH.tagline, ENGLISH.description, ENGLISH.duration_hours, ENGLISH.fee, ENGLISH.open, ENGLISH.offline, ENGLISH.passkey],
      ["PY100", ENGLISH.python, ENGLISH.certificate, ENGLISH.software, ENGLISH.beginner, ENGLISH.english, ENGLISH.programming, ENGLISH.python_for_beginners, ENGLISH.core_python, "40", "", ENGLISH.no, ENGLISH.no, ""],
      ["SQL100", ENGLISH.sql_database, ENGLISH.certificate, ENGLISH.software, ENGLISH.beginner, ENGLISH.english, ENGLISH.database, ENGLISH.sql_for_analysts, "", "", "", "", "", ""]
    ],
    get mapping_lead() { return ENGLISH.export_one_row_per_course_rename_columns_to; },
    mapping_steps: [
      ENGLISH.export_one_row_per_course,
      ENGLISH.use_the_labels_already_stored_in_dropdowns_for,
      ENGLISH.keep_the_course_code_stable_do_not_invent
    ],
    mapping: [
      [ENGLISH.erp_course_id_or_subject_code, ENGLISH.course_code],
      [ENGLISH.subject_or_paper_name, ENGLISH.course_name],
      [ENGLISH.programme_type_or_category, ENGLISH.course_type],
      [ENGLISH.department_or_domain, ENGLISH.domain],
      [ENGLISH.difficulty, ENGLISH.level],
      [ENGLISH.medium_of_instruction, ENGLISH.language],
      [ENGLISH.short_pitch, ENGLISH.tagline]
    ],
    get api_lead() { return ENGLISH.one_course_row_has_this_shape_codes_and; },
    get record_caption() { return ENGLISH.one_course_row; },
    record: `{
  "course_code": "PY100",
  "course_name": "Python",
  "course_type": "Certificate",
  "domain": "Software",
  "level": "Beginner",
  "language": "English",
  "tag": "Programming",
  "tagline": "Python for beginners"
}`,
    get record_note() { return ENGLISH.a_repeated_course_code_is_the_same_course; },
    checks: [
      { get rule() { return ENGLISH.course_code_or_course_name_is_missing; }, result: ENGLISH.that_row_is_skipped },
      { get rule() { return ENGLISH.type_domain_level_language_or_tag_is_not; }, result: ENGLISH.that_row_is_skipped_until_the_label_exists },
      { get rule() { return ENGLISH.the_course_code_already_exists; }, result: ENGLISH.that_row_is_skipped_the_existing_course_is },
      { get rule() { return ENGLISH.open_offline_fee_or_hours_is_blank; }, result: ENGLISH.the_row_is_still_accepted_those_values_stay }
    ],
    get quiet_title() { return ENGLISH.if_a_course_row_is_skipped; },
    quiet: [
      [ENGLISH.code, ENGLISH.course_code_is_filled_and_has_not_been],
      [ENGLISH.dropdowns, ENGLISH.type_domain_level_language_and_tag_match_the],
      [ENGLISH.tagline, ENGLISH.tagline_is_present_description_can_be_blank],
      [ENGLISH.later_sheets, ENGLISH.registrations_and_attendance_use_this_same_course_code]
    ]
  },
  {
    id: "programs",
    get label() { return ENGLISH.programs; },
    get title() { return ENGLISH.program_import; },
    chips: [ENGLISH.excel_xlsx, ENGLISH.name_type_and_dates_required, ENGLISH.code_is_the_stable_key],
    file_name: "programs_import_template.xlsx",
    get description() { return ENGLISH.each_accepted_row_becomes_one_program_courses_are; },
    facts: [
      [ENGLISH.program_name, ENGLISH.required_this_is_the_name_staff_and_students],
      [ENGLISH.type_and_dates, ENGLISH.program_type_start_date_and_end_date_are],
      [ENGLISH.code, ENGLISH.optional_when_you_supply_a_code_later_cohort]
    ],
    get methods() { return ENGLISH.excel_workbook_xlsx_one_row_per_program_program; },
    get fields_lead() { return ENGLISH.name_type_start_date_and_end_date_are; },
    fields: [
      { field: "program_name", get headers() { return ENGLISH.program_name_name; }, get required() { return ENGLISH.required; }, stored: "program_name", notes: ENGLISH.up_to_150_characters },
      { field: "program_type", get headers() { return ENGLISH.program_type_type; }, get required() { return ENGLISH.required; }, stored: "program_type", notes: ENGLISH.must_match_a_program_type_in_dropdowns },
      { field: "start_date", get headers() { return ENGLISH.start_date_start; }, get required() { return ENGLISH.required; }, stored: "start_date", notes: ENGLISH.yyyy_mm_dd_or_dd_mm_yyyy },
      { field: "end_date", get headers() { return ENGLISH.end_date_end; }, get required() { return ENGLISH.required; }, stored: "end_date", notes: ENGLISH.on_or_after_the_start_date },
      { field: "program_code", get headers() { return ENGLISH.program_code_code; }, get required() { return ENGLISH.optional; }, stored: "program_code", notes: ENGLISH.unique_when_present_cohorts_and_registrations_use_it },
      { field: "duration_months", get headers() { return ENGLISH.duration_months_duration; }, get required() { return ENGLISH.optional; }, stored: "duration_months", notes: ENGLISH.whole_number_of_months_leave_blank_to_skip },
      { field: "description", get headers() { return ENGLISH.description; }, get required() { return ENGLISH.optional; }, stored: "description", notes: ENGLISH.leave_blank_to_skip }
    ],
    get template_lead() { return ENGLISH.the_second_row_leaves_the_code_duration_and; },
    template: [
      [ENGLISH.program_name, ENGLISH.program_type, ENGLISH.start_date, ENGLISH.end_date, ENGLISH.program_code, ENGLISH.duration_months, ENGLISH.description],
      [ENGLISH.full_stack_python, ENGLISH.certificate, "2024-10-01", "2025-03-31", "FS-PY-2024", "6", ENGLISH.campus_batch],
      [ENGLISH.soft_skills, ENGLISH.workshop, "2024-11-01", "2024-11-30", "", "", ""]
    ],
    get mapping_lead() { return ENGLISH.export_one_row_per_program_extra_columns_are; },
    mapping_steps: [
      ENGLISH.export_one_row_per_program_not_one_row,
      ENGLISH.use_a_program_type_that_already_exists_in,
      ENGLISH.keep_a_program_code_when_other_files_must
    ],
    mapping: [
      [ENGLISH.batch_or_programme_title, ENGLISH.program_name],
      [ENGLISH.certificate_diploma_degree, ENGLISH.program_type],
      [ENGLISH.batch_start, ENGLISH.start_date],
      [ENGLISH.batch_end, ENGLISH.end_date],
      [ENGLISH.erp_programme_id, ENGLISH.program_code]
    ],
    get api_lead() { return ENGLISH.one_program_row_has_this_shape; },
    get record_caption() { return ENGLISH.one_program_row; },
    record: `{
  "program_name": "Full Stack Python",
  "program_type": "Certificate",
  "start_date": "2024-10-01",
  "end_date": "2025-03-31",
  "program_code": "FS-PY-2024",
  "duration_months": 6
}`,
    get record_note() { return ENGLISH.a_repeated_program_code_is_the_same_program; },
    checks: [
      { get rule() { return ENGLISH.name_type_or_either_date_is_missing; }, result: ENGLISH.that_row_is_skipped },
      { get rule() { return ENGLISH.program_type_is_not_in_dropdowns; }, result: ENGLISH.that_row_is_skipped_until_the_type_exists },
      { get rule() { return ENGLISH.end_date_is_before_the_start_date; }, result: ENGLISH.that_row_is_skipped },
      { get rule() { return ENGLISH.program_code_already_exists; }, result: ENGLISH.that_row_is_skipped_the_existing_program_is }
    ],
    get quiet_title() { return ENGLISH.if_a_program_row_is_skipped; },
    quiet: [
      [ENGLISH.type, ENGLISH.program_type_matches_a_label_in_dropdowns],
      [ENGLISH.dates, ENGLISH.both_dates_are_present_and_the_end_date],
      [ENGLISH.code, ENGLISH.if_you_send_a_code_it_is_unique],
      [ENGLISH.courses, ENGLISH.this_file_does_not_enrol_courses_use_the]
    ]
  },
  {
    id: "cohorts",
    get label() { return ENGLISH.cohorts; },
    get title() { return ENGLISH.cohort_import; },
    chips: [ENGLISH.excel_xlsx, ENGLISH.cohort_name_required, ENGLISH.program_code_links_a_batch],
    file_name: "cohorts_import_template.xlsx",
    get description() { return ENGLISH.each_accepted_row_is_a_cohort_or_another; },
    facts: [
      [ENGLISH.cohort_name, ENGLISH.required_the_same_name_on_another_row_is],
      [ENGLISH.program, ENGLISH.optional_a_program_code_attaches_that_program_to],
      [ENGLISH.description, ENGLISH.optional_leave_it_blank_to_skip]
    ],
    get methods() { return ENGLISH.excel_workbook_xlsx_repeat_the_cohort_name_when; },
    get fields_lead() { return ENGLISH.only_the_cohort_name_is_required_add_a; },
    fields: [
      { field: "cohort_name", get headers() { return ENGLISH.cohort_name_cohort_name; }, get required() { return ENGLISH.required; }, stored: "cohort_name", notes: ENGLISH.up_to_150_characters_the_same_name_updates },
      { field: "program_code", get headers() { return ENGLISH.program_code_program; }, get required() { return ENGLISH.optional; }, stored: "program link", notes: ENGLISH.must_match_a_program_code_already_in_the },
      { field: "description", get headers() { return ENGLISH.description; }, get required() { return ENGLISH.optional; }, stored: "description", notes: ENGLISH.leave_blank_to_skip }
    ],
    get template_lead() { return ENGLISH.the_first_two_rows_share_a_cohort_name; },
    template: [
      [ENGLISH.cohort_name, ENGLISH.program_code, ENGLISH.description],
      [ENGLISH.october_2024, "FS-PY-2024", ENGLISH.first_campus_cohort],
      [ENGLISH.october_2024, "SS-2024", ""],
      [ENGLISH.january_2025, "", ""]
    ],
    get mapping_lead() { return ENGLISH.export_one_row_per_cohort_and_program_pair; },
    mapping_steps: [
      ENGLISH.import_programs_first_when_the_row_names_a,
      ENGLISH.use_one_cohort_name_for_every_program_that,
      ENGLISH.leave_program_code_blank_when_the_cohort_should
    ],
    mapping: [
      [ENGLISH.batch_or_intake_name, ENGLISH.cohort_name],
      [ENGLISH.programme_code_inside_that_intake, ENGLISH.program_code],
      [ENGLISH.notes, ENGLISH.description]
    ],
    get api_lead() { return ENGLISH.one_cohort_row_has_this_shape; },
    get record_caption() { return ENGLISH.one_cohort_row; },
    record: `{
  "cohort_name": "October 2024",
  "program_code": "FS-PY-2024",
  "description": "First campus cohort"
}`,
    get record_note() { return ENGLISH.a_second_row_with_the_same_cohort_name; },
    checks: [
      { get rule() { return ENGLISH.cohort_name_is_missing; }, result: ENGLISH.that_row_is_skipped },
      { get rule() { return ENGLISH.program_code_is_not_in_the_lms; }, result: ENGLISH.that_row_is_skipped_import_the_program_first },
      { get rule() { return ENGLISH.the_same_cohort_and_program_appear_twice; }, result: ENGLISH.the_later_row_is_skipped },
      { get rule() { return ENGLISH.description_is_blank; }, result: ENGLISH.the_row_is_still_accepted }
    ],
    get quiet_title() { return ENGLISH.if_a_cohort_row_is_skipped; },
    quiet: [
      [ENGLISH.name, ENGLISH.cohort_name_is_filled],
      [ENGLISH.program, ENGLISH.any_program_code_already_exists_on_the_programs],
      [ENGLISH.repeat, ENGLISH.the_same_name_plus_the_same_program_is],
      [ENGLISH.order, ENGLISH.import_programs_before_cohorts_that_point_at_them]
    ]
  },
  {
    id: "registrations",
    get label() { return ENGLISH.registrations; },
    get title() { return ENGLISH.registration_import; },
    chips: [ENGLISH.excel_xlsx, ENGLISH.email_and_course_code_required, ENGLISH.student_and_course_must_exist],
    file_name: "registrations_import_template.xlsx",
    get description() { return ENGLISH.each_accepted_row_enrols_an_existing_student_on; },
    facts: [
      [ENGLISH.student, ENGLISH.email_is_required_and_must_already_be_a],
      [ENGLISH.course, ENGLISH.course_code_is_required_and_must_already_be],
      [ENGLISH.program, ENGLISH.optional_when_set_the_student_is_registered_on]
    ],
    get methods() { return ENGLISH.excel_workbook_xlsx_one_row_per_student_and; },
    get fields_lead() { return ENGLISH.email_and_course_code_are_required_program_code; },
    fields: [
      { field: "email", get headers() { return ENGLISH.email_email; }, get required() { return ENGLISH.required; }, stored: "student", notes: ENGLISH.must_match_a_student_already_in_the_lms },
      { field: "course_code", get headers() { return ENGLISH.course_code_course; }, get required() { return ENGLISH.required; }, stored: "course", notes: ENGLISH.must_match_a_course_code_already_in_the },
      { field: "program_code", get headers() { return ENGLISH.program_code_program; }, get required() { return ENGLISH.optional; }, stored: "program_id", notes: ENGLISH.blank_registers_the_student_on_the_course_without },
      { field: "status", get headers() { return ENGLISH.status; }, get required() { return ENGLISH.optional; }, stored: "status", notes: ENGLISH.blank_is_stored_as_registered },
      { field: "course_student_id", get headers() { return ENGLISH.course_student_id_roll_no; }, get required() { return ENGLISH.optional; }, stored: "course_student_id", notes: ENGLISH.the_id_shown_for_that_student_on_the }
    ],
    get template_lead() { return ENGLISH.the_second_row_has_no_program_and_no; },
    template: [
      ["email", ENGLISH.course_code, ENGLISH.program_code, ENGLISH.status, ENGLISH.course_student_id],
      ["asha.rao@institution.edu", "PY100", "FS-PY-2024", "registered", "PY100-001"],
      ["ravi.kumar@institution.edu", "SQL100", "", "", ""]
    ],
    get mapping_lead() { return ENGLISH.export_one_row_per_enrolment; },
    mapping_steps: [
      ENGLISH.import_students_and_courses_first,
      ENGLISH.use_the_student_email_and_the_course_code,
      ENGLISH.add_a_program_code_only_when_the_enrolment
    ],
    mapping: [
      [ENGLISH.student_email, "email"],
      [ENGLISH.subject_or_course_code, ENGLISH.course_code],
      [ENGLISH.batch_or_programme_code, ENGLISH.program_code],
      [ENGLISH.roll_number_on_that_course, ENGLISH.course_student_id]
    ],
    get api_lead() { return ENGLISH.one_registration_row_has_this_shape; },
    get record_caption() { return ENGLISH.one_registration_row; },
    record: `{
  "email": "asha.rao@institution.edu",
  "course_code": "PY100",
  "program_code": "FS-PY-2024",
  "status": "registered",
  "course_student_id": "PY100-001"
}`,
    get record_note() { return ENGLISH.the_same_email_and_course_code_on_a; },
    checks: [
      { get rule() { return ENGLISH.email_or_course_code_is_missing; }, result: ENGLISH.that_row_is_skipped },
      { get rule() { return ENGLISH.the_email_is_not_a_student_yet; }, result: ENGLISH.that_row_is_skipped_import_the_student_first },
      { get rule() { return ENGLISH.the_course_code_is_not_a_course_yet; }, result: ENGLISH.that_row_is_skipped_import_the_course_first },
      { get rule() { return ENGLISH.that_student_is_already_registered_on_that_course; }, result: ENGLISH.that_row_is_skipped }
    ],
    get quiet_title() { return ENGLISH.if_a_registration_row_is_skipped; },
    quiet: [
      [ENGLISH.student, ENGLISH.the_email_already_exists_on_the_student_list],
      [ENGLISH.course, ENGLISH.the_course_code_already_exists_2],
      [ENGLISH.program, ENGLISH.a_program_code_when_present_already_exists],
      [ENGLISH.duplicate, ENGLISH.the_same_student_and_course_are_not_already]
    ]
  },
  {
    id: "attendance",
    get label() { return ENGLISH.attendance; },
    get title() { return ENGLISH.attendance_import; },
    chips: [ENGLISH.excel_xlsx, ENGLISH.email_course_and_date_required, ENGLISH.one_row_per_student_per_day],
    file_name: "attendance_import_template.xlsx",
    get description() { return ENGLISH.each_accepted_row_marks_one_student_present_or; },
    facts: [
      [ENGLISH.who_and_where, ENGLISH.email_and_course_code_are_required],
      [ENGLISH.when, ENGLISH.attendance_date_is_required_one_row_is_one],
      [ENGLISH.status, ENGLISH.present_or_absent_a_blank_status_is_stored]
    ],
    get methods() { return ENGLISH.excel_workbook_xlsx_one_row_per_student_course; },
    get fields_lead() { return ENGLISH.email_course_code_and_date_are_required_status; },
    fields: [
      { field: "email", get headers() { return ENGLISH.email_email; }, get required() { return ENGLISH.required; }, stored: "student", notes: ENGLISH.must_match_a_student_registered_on_the_course },
      { field: "course_code", get headers() { return ENGLISH.course_code_course; }, get required() { return ENGLISH.required; }, stored: "course", notes: ENGLISH.must_match_a_course_the_student_is_registered },
      { field: "attendance_date", get headers() { return ENGLISH.date_attendance_date; }, get required() { return ENGLISH.required; }, stored: "attendance_date", notes: ENGLISH.yyyy_mm_dd_or_dd_mm_yyyy },
      { field: "status", get headers() { return ENGLISH.status; }, get required() { return ENGLISH.optional; }, stored: "status", notes: ENGLISH.present_or_absent_blank_is_stored_as_present },
      { field: "remarks", get headers() { return ENGLISH.remarks_note; }, get required() { return ENGLISH.optional; }, stored: "remarks", notes: ENGLISH.up_to_500_characters_leave_blank_to_skip }
    ],
    get template_lead() { return ENGLISH.the_second_row_has_no_status_and_no; },
    template: [
      ["email", ENGLISH.course_code, ENGLISH.date, ENGLISH.status, ENGLISH.remarks],
      ["asha.rao@institution.edu", "PY100", "2024-10-24", "present", ""],
      ["ravi.kumar@institution.edu", "PY100", "2024-10-24", "", ""]
    ],
    get mapping_lead() { return ENGLISH.export_one_row_per_student_per_class_day; },
    mapping_steps: [
      ENGLISH.register_the_student_on_the_course_before_importing,
      ENGLISH.use_the_student_email_and_the_course_code_2,
      ENGLISH.use_present_or_absent_leave_status_blank_to
    ],
    mapping: [
      [ENGLISH.student_email, "email"],
      [ENGLISH.subject_or_course_code, ENGLISH.course_code],
      [ENGLISH.class_date, ENGLISH.date],
      [ENGLISH.present_or_absent, ENGLISH.status],
      [ENGLISH.teacher_note, ENGLISH.remarks]
    ],
    get api_lead() { return ENGLISH.one_attendance_row_has_this_shape; },
    get record_caption() { return ENGLISH.one_attendance_row; },
    record: `{
  "email": "asha.rao@institution.edu",
  "course_code": "PY100",
  "attendance_date": "2024-10-24",
  "status": "present",
  "remarks": ""
}`,
    get record_note() { return ENGLISH.the_same_email_course_code_and_date_on; },
    checks: [
      { get rule() { return ENGLISH.email_course_code_or_date_is_missing; }, result: ENGLISH.that_row_is_skipped },
      { get rule() { return ENGLISH.the_student_is_not_registered_on_that_course; }, result: ENGLISH.that_row_is_skipped },
      { get rule() { return ENGLISH.status_is_not_present_or_absent; }, result: ENGLISH.that_row_is_skipped_leave_the_cell_blank },
      { get rule() { return ENGLISH.that_student_already_has_a_mark_on_that; }, result: ENGLISH.that_row_is_skipped }
    ],
    get quiet_title() { return ENGLISH.if_an_attendance_row_is_skipped; },
    quiet: [
      [ENGLISH.registration, ENGLISH.the_student_is_already_registered_on_that_course],
      [ENGLISH.date, ENGLISH.the_date_can_be_read_as_a_calendar],
      [ENGLISH.status, ENGLISH.the_cell_is_blank_present_or_absent],
      [ENGLISH.day, ENGLISH.that_student_does_not_already_have_a_mark]
    ]
  }
];
