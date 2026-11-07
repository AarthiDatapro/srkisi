import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";
export const STUDENT_IMPORT_SECTIONS = [
  { id: "description", get label() { return ENGLISH.module_description; }, chip: ENGLISH.overview },
  { id: "methods", get label() { return ENGLISH.supported_import_methods; }, chip: ENGLISH.label_import_2 },
  { id: "fields", get label() { return ENGLISH.required_and_optional_fields; }, chip: ENGLISH.fields },
  { id: "template", get label() { return ENGLISH.sample_template; }, chip: ENGLISH.template },
  { id: "mapping", get label() { return ENGLISH.field_mapping; }, chip: ENGLISH.mapping },
  { id: "api", get label() { return ENGLISH.api_examples; }, chip: ENGLISH.api },
  { id: "validation", get label() { return ENGLISH.validation_and_troubleshooting; }, chip: ENGLISH.rules }
];

export const STUDENT_IMPORT_FIELDS = [
  {
    field: "email",
    get headers() { return ENGLISH.email_email_email_address_email_id; },
    get required() { return ENGLISH.email_or_mobile; },
    stored: "email",
    notes: ENGLISH.must_be_a_real_email_address_and_must
  },
  {
    field: "mobile",
    get headers() { return ENGLISH.mobile_no_mobile_number_mobile_phone; },
    get required() { return ENGLISH.email_or_mobile; },
    stored: "mobile_number",
    notes: ENGLISH.must_be_a_10_digit_number_and_must
  },
  {
    field: "password",
    get headers() { return ENGLISH.password_passcode; },
    get required() { return ENGLISH.optional; },
    stored: "password_hash",
    notes: ENGLISH.leave_this_blank_to_sign_in_with_datapro
  },
  {
    field: "first_name",
    get headers() { return ENGLISH.first_name_or_name_full_name; },
    get required() { return ENGLISH.optional; },
    stored: "first_name",
    notes: ENGLISH.use_first_name_and_last_name_or_one
  },
  {
    field: "last_name",
    get headers() { return ENGLISH.last_name_surname; },
    get required() { return ENGLISH.optional; },
    stored: "last_name",
    notes: ENGLISH.the_last_word_of_name_is_used_when
  },
  {
    field: "gender",
    get headers() { return ENGLISH.gender_sex; },
    get required() { return ENGLISH.optional; },
    stored: "gender",
    notes: ENGLISH.male_female_m_f_boy_and_girl_are
  },
  {
    field: "date_of_birth",
    get headers() { return ENGLISH.date_of_birth_dob_birth_date; },
    get required() { return ENGLISH.optional; },
    stored: "date_of_birth",
    notes: ENGLISH.yyyy_mm_dd_dd_mm_yyyy_or_an
  },
  {
    field: "blood_group",
    get headers() { return ENGLISH.blood_group_blood; },
    get required() { return ENGLISH.optional; },
    stored: "blood_group",
    notes: ENGLISH.stored_as_written_up_to_20_characters_leave
  },
  {
    field: "college",
    get headers() { return ENGLISH.college_institution; },
    get required() { return ENGLISH.optional; },
    stored: "college",
    notes: ENGLISH.up_to_200_characters_leave_blank_to_skip
  },
  {
    field: "higher_study",
    get headers() { return ENGLISH.higher_study_qualification; },
    get required() { return ENGLISH.optional; },
    stored: "higher_study",
    notes: ENGLISH.up_to_200_characters_leave_blank_to_skip
  },
  {
    field: "address",
    get headers() { return ENGLISH.address_address_line; },
    get required() { return ENGLISH.optional; },
    stored: "address_line",
    notes: ENGLISH.up_to_300_characters_leave_blank_to_skip
  },
  {
    field: "pincode",
    get headers() { return ENGLISH.pincode_pin_code_postal_code; },
    get required() { return ENGLISH.optional; },
    stored: "pincode",
    notes: ENGLISH.up_to_12_characters_leave_blank_to_skip
  },
  {
    field: "state",
    get headers() { return ENGLISH.state; },
    get required() { return ENGLISH.optional; },
    stored: "state",
    notes: ENGLISH.up_to_100_characters_leave_blank_to_skip
  },
  {
    field: "district",
    get headers() { return ENGLISH.district_city; },
    get required() { return ENGLISH.optional; },
    stored: "district",
    notes: ENGLISH.up_to_100_characters_leave_blank_to_skip
  }
];

export const STUDENT_IMPORT_MAPPING = [
  [ENGLISH.email, "email"],
  [ENGLISH.mobile, ENGLISH.mobile_no],
  [ENGLISH.sign_in_password, ENGLISH.password],
  [ENGLISH.given_name, ENGLISH.first_name],
  [ENGLISH.surname, ENGLISH.last_name],
  [ENGLISH.full_name_in_one_column, "NAME"],
  [ENGLISH.gender, ENGLISH.gender],
  [ENGLISH.date_of_birth, ENGLISH.date_of_birth],
  [ENGLISH.blood_group, ENGLISH.blood_group],
  [ENGLISH.college_or_institute, ENGLISH.college],
  [ENGLISH.qualification, ENGLISH.higher_study],
  [ENGLISH.address, ENGLISH.address],
  [ENGLISH.pin_or_postal_code, ENGLISH.pincode],
  [ENGLISH.state, ENGLISH.state],
  [ENGLISH.district_or_city, ENGLISH.district]
];

export const STUDENT_IMPORT_TEMPLATE = [
  [ENGLISH.first_name, ENGLISH.last_name, "email", ENGLISH.mobile_no, ENGLISH.password, ENGLISH.gender, ENGLISH.date_of_birth, ENGLISH.blood_group, ENGLISH.college, ENGLISH.higher_study, ENGLISH.address, ENGLISH.pincode, ENGLISH.state, ENGLISH.district],
  [ENGLISH.asha, ENGLISH.rao, "asha.rao@institution.edu", "9000000001", "Welcome@123", ENGLISH.female, "2004-05-12", "O+", ENGLISH.government_degree_college, "B.Sc", ENGLISH.label_12_main_road, "530001", ENGLISH.andhra_pradesh, ENGLISH.visakhapatnam],
  [ENGLISH.ravi, ENGLISH.kumar, "ravi.kumar@institution.edu", "9000000002", "", "", "", "", "", "", "", "", "", ""]
];

export const STUDENT_IMPORT_RECORD = `{
  "first_name": "Asha",
  "last_name": "Rao",
  "email": "asha.rao@institution.edu",
  "mobile_number": "9000000001",
  "password": "Welcome@123",
  "gender": "Female",
  "date_of_birth": "2004-05-12",
  "blood_group": "O+",
  "college": "Government Degree College",
  "higher_study": "B.Sc",
  "address_line": "12 Main Road",
  "pincode": "530001",
  "state": "Andhra Pradesh",
  "district": "Visakhapatnam"
}`;

export const STUDENT_IMPORT_CHECKS = [
  {
    get rule() { return ENGLISH.the_email_or_mobile_column_is_missing; },
    result: ENGLISH.the_check_stops_add_both_columns_and_check
  },
  {
    get rule() { return ENGLISH.email_is_missing_and_mobile_is_filled; },
    result: ENGLISH.the_row_is_imported_sign_in_uses_the
  },
  {
    get rule() { return ENGLISH.mobile_is_missing_and_email_is_filled; },
    result: ENGLISH.the_row_is_imported_sign_in_uses_the_2
  },
  {
    get rule() { return ENGLISH.email_is_not_a_valid_address_or_mobile; },
    result: ENGLISH.that_value_is_treated_as_blank_the_row
  },
  {
    get rule() { return ENGLISH.email_and_mobile_are_both_missing; },
    result: ENGLISH.that_row_is_skipped_at_least_one_contact
  },
  {
    get rule() { return ENGLISH.password_cell_is_blank; },
    result: ENGLISH.the_row_is_still_imported_the_sign_in
  },
  {
    get rule() { return ENGLISH.password_cell_has_a_value; },
    result: ENGLISH.that_password_is_encrypted_and_stored_the_plain
  },
  {
    get rule() { return ENGLISH.another_profile_cell_is_blank; },
    result: ENGLISH.the_row_is_still_imported_that_field_stays
  },
  {
    get rule() { return ENGLISH.the_same_email_or_mobile_appears_twice_in; },
    result: ENGLISH.the_lower_row_in_the_sheet_is_kept
  },
  {
    get rule() { return ENGLISH.email_or_mobile_is_already_in_the_lms; },
    result: ENGLISH.that_row_is_skipped_the_existing_student_is
  }
];
