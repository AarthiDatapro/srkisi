import { API_INTEGRATION_ENGLISH as ENGLISH } from "../constants/english/api_integration_constants_english.js";
import { live_items } from "../constants/live_text.js";

export const COURSE_IMPORT_SECTIONS = [
  { id: "crs_description", get label() { return ENGLISH.module_description; } },
  { id: "crs_methods", get label() { return ENGLISH.supported_import_methods; } },
  { id: "crs_fields", get label() { return ENGLISH.required_and_optional_fields; } },
  { id: "crs_template", get label() { return ENGLISH.sample_template; } },
  { id: "crs_mapping", get label() { return ENGLISH.field_mapping; } },
  { id: "crs_api", get label() { return ENGLISH.api_examples; } },
  { id: "crs_validation", get label() { return ENGLISH.validation_and_troubleshooting; } }
];

export const COURSE_IMPORT_FIELDS = [
  {
    field: "course_code",
    get headers() { return ENGLISH.course_code_course_code_code; },
    get required() { return ENGLISH.required; },
    stored: "course_code",
    get notes() { return ENGLISH.unique_a_code_already_in_the_lms_is; }
  },
  {
    field: "course_name",
    get headers() { return ENGLISH.course_name_cour_name_course_name; },
    get required() { return ENGLISH.required; },
    stored: "course_name",
    get notes() { return ENGLISH.the_course_title_up_to_150_characters; }
  },
  {
    field: "description",
    get headers() { return ENGLISH.description_course_description; },
    get required() { return ENGLISH.optional; },
    stored: "course_description",
    get notes() { return ENGLISH.stored_when_the_cell_is_filled; }
  },
  {
    field: "type",
    get headers() { return ENGLISH.type_course_type; },
    get required() { return ENGLISH.required; },
    stored: "course_type_id",
    get notes() { return ENGLISH.matched_to_mst_course_types_a_new_name; }
  },
  {
    field: "duration_hours",
    get headers() { return ENGLISH.duration_in_hours_duration_hours; },
    get required() { return ENGLISH.optional; },
    stored: "duration_hours",
    get notes() { return ENGLISH.a_number_of_hours_a_blank_cell_is; }
  },
  {
    field: "level",
    get headers() { return ENGLISH.level_course_level; },
    get required() { return ENGLISH.required; },
    stored: "course_level_id",
    get notes() { return ENGLISH.matched_to_mst_course_levels_a_new_name; }
  },
  {
    field: "fee",
    get headers() { return ENGLISH.fee_fee_amount_amount; },
    get required() { return ENGLISH.optional; },
    stored: "fee_amount, is_paid",
    get notes() { return ENGLISH.label_0_or_a_blank_cell_is_not_paid; }
  },
  {
    field: "thumbnail_url",
    get headers() { return ENGLISH.thumbnail_url_thumbnail; },
    get required() { return ENGLISH.optional; },
    stored: "thumbnail_url",
    get notes() { return ENGLISH.a_web_address_up_to_500_characters; }
  },
  {
    field: "discount",
    get headers() { return ENGLISH.discount_discout_discount_percent; },
    get required() { return ENGLISH.optional; },
    stored: "discount_percent",
    get notes() { return ENGLISH.a_percent_from_0_to_100_a_blank; }
  },
  {
    field: "created_by",
    get headers() { return ENGLISH.created_by_craeted_by; },
    get required() { return ENGLISH.optional; },
    stored: "created_by_display",
    get notes() { return ENGLISH.the_name_shown_as_the_course_author_up; }
  },
  {
    field: "learn_points",
    get headers() { return ENGLISH.learning_points_learn_points; },
    get required() { return ENGLISH.optional; },
    stored: "learn_points",
    get notes() { return ENGLISH.separate_points_with_a_new_line_or_at; }
  },
  {
    field: "audience_points",
    get headers() { return ENGLISH.key_points_audience_points; },
    get required() { return ENGLISH.optional; },
    stored: "audience_points",
    get notes() { return ENGLISH.who_the_course_is_for_same_separators_as; }
  },
  {
    field: "domain",
    get headers() { return ENGLISH.course_domain_domain; },
    get required() { return ENGLISH.required; },
    stored: "course_domain_id",
    get notes() { return ENGLISH.matched_to_mst_course_domains_a_new_name; }
  },
  {
    field: "tag",
    get headers() { return ENGLISH.tag_course_tag; },
    get required() { return ENGLISH.required; },
    stored: "course_tag_id",
    get notes() { return ENGLISH.matched_to_mst_course_tags_a_new_name; }
  },
  {
    field: "module_title",
    get headers() { return ENGLISH.module_modules_module_title; },
    get required() { return ENGLISH.optional; },
    stored: "tbl_course_modules.module_title",
    get notes() { return ENGLISH.a_blank_cell_does_not_block_the_course; }
  },
  {
    field: "lesson_title",
    get headers() { return ENGLISH.lesson_lessons_lesson_title; },
    get required() { return ENGLISH.optional; },
    stored: "tbl_course_lessons.lesson_title",
    get notes() { return ENGLISH.a_blank_cell_does_not_block_the_course_2; }
  },
  {
    field: "material_urls",
    get headers() { return ENGLISH.lesson_material_urls_material_url; },
    get required() { return ENGLISH.optional; },
    stored: "tbl_lesson_contents.content_url",
    get notes() { return ENGLISH.web_addresses_for_that_lesson_separated_by_a; }
  }
];

export const COURSE_IMPORT_MAPPING = [
  live_items([() => (ENGLISH.course_code), () => ("course_code")]),
  live_items([() => (ENGLISH.course_title), () => ("course_name")]),
  live_items([() => (ENGLISH.about_the_course), () => ("description")]),
  live_items([() => (ENGLISH.course_type), () => ("type")]),
  live_items([() => ENGLISH.hours, () => ENGLISH.duration_in_hours]),
  live_items([() => (ENGLISH.level_name), () => ("level")]),
  live_items([() => (ENGLISH.fee_amount), () => ("fee")]),
  live_items([() => ENGLISH.thumbnail_address, () => ENGLISH.thumbnail_url]),
  live_items([() => (ENGLISH.discount_percent), () => ("discount")]),
  live_items([() => ENGLISH.author_name, () => ENGLISH.created_by]),
  live_items([() => ENGLISH.what_you_will_learn, () => ENGLISH.learning_points]),
  live_items([() => ENGLISH.who_this_course_is_for, () => ENGLISH.key_points]),
  live_items([() => ENGLISH.domain_name, () => ENGLISH.course_domain]),
  live_items([() => (ENGLISH.catalog_tag), () => ("tag")]),
  live_items([() => (ENGLISH.module_title), () => ("module")]),
  live_items([() => (ENGLISH.lesson_title), () => ("lesson")]),
  live_items([() => ENGLISH.lesson_material_addresses, () => ENGLISH.lesson_material_urls])
];

export const COURSE_IMPORT_TEMPLATE = [
  live_items([() => ("course_code"), () => ("course_name"), () => ("description"), () => ("type"), () => (ENGLISH.duration_in_hours), () => ("level"), () => ("fee"), () => (ENGLISH.thumbnail_url), () => ("discount"), () => (ENGLISH.created_by), () => (ENGLISH.learning_points), () => (ENGLISH.key_points), () => (ENGLISH.course_domain), () => ("tag"), () => ("module"), () => ("lesson"), () => (ENGLISH.lesson_material_urls)]),
  live_items([() => ("PY-FS-01"), () => (ENGLISH.full_stack_python), () => (ENGLISH.python_web_and_a_small_project), () => (ENGLISH.core), () => ("40"), () => (ENGLISH.beginner), () => ("0"), () => ("https://cdn.example.edu/courses/python.png"), () => (""), () => (ENGLISH.datapro_faculty), () => (ENGLISH.write_python_build_a_small_api), () => (ENGLISH.career_switchers_final_year_students), () => (ENGLISH.software), () => (ENGLISH.new_launches), () => (ENGLISH.python_basics), () => (ENGLISH.welcome), () => ("https://cdn.example.edu/lessons/welcome")]),
  live_items([() => ("PY-FS-01"), () => (""), () => (""), () => (""), () => (""), () => (""), () => (""), () => (""), () => (""), () => (""), () => (""), () => (""), () => (""), () => (""), () => (ENGLISH.python_basics), () => (ENGLISH.variables), () => ("https://cdn.example.edu/lessons/variables | https://cdn.example.edu/lessons/variables-notes")]),
  live_items([() => ("DS-01"), () => (ENGLISH.data_studio), () => (ENGLISH.charts_and_a_short_project), () => (ENGLISH.elective), () => ("24"), () => (ENGLISH.intermediate), () => ("15000"), () => ("https://cdn.example.edu/courses/data.png"), () => ("10"), () => (ENGLISH.datapro_faculty), () => (ENGLISH.read_a_dataset_publish_a_chart), () => (ENGLISH.working_analysts), () => (ENGLISH.data), () => (ENGLISH.trending), () => (""), () => (""), () => ("")])
];

export const COURSE_IMPORT_RECORD = `{
  "course_code": "PY-FS-01",
  "course_name": "Full Stack Python",
  "course_type_id": 1,
  "course_level_id": 1,
  "course_domain_id": 4,
  "course_tag_id": 3,
  "fee_amount": 0,
  "is_paid": 0,
  "is_active": 1,
  "is_offline": 0,
  "has_completion_certificate": 1
}`;

export const COURSE_IMPORT_REPORT = `========== MATERIAL URL WITHOUT A LESSON (1) ==========
  row 6 | code: DS-01 | name: Data Studio

========== MODULES TO ADD (1) ==========
  row 2 | code: PY-FS-01 | name: Full Stack Python | module: Python basics

========== LESSONS TO ADD (2) ==========
  row 2 | code: PY-FS-01 | name: Full Stack Python | lesson: Welcome | module: Python basics
  row 3 | code: PY-FS-01 | name: Full Stack Python | lesson: Variables | module: Python basics

========== RESULT ==========
To insert                           : 2
  modules                           : 1
  lessons                           : 2`;

export const COURSE_IMPORT_CHECKS = [
  {
    get rule() { return ENGLISH.the_course_code_is_already_in_tbl_courses; },
    get result() { return ENGLISH.that_row_is_skipped_the_report_lists_the_4; }
  },
  {
    get rule() { return ENGLISH.type_level_domain_or_tag_is_not_in; },
    get result() { return ENGLISH.the_name_is_added_to_that_master_table; }
  },
  {
    get rule() { return ENGLISH.type_level_domain_or_tag_is_blank; },
    get result() { return ENGLISH.that_row_is_skipped_the_report_names_the; }
  },
  {
    get rule() { return ENGLISH.fee_is_0_or_blank; },
    get result() { return ENGLISH.the_course_is_stored_as_not_paid; }
  },
  {
    get rule() { return ENGLISH.fee_is_above_0; },
    get result() { return ENGLISH.the_course_is_stored_as_paid_with_that; }
  },
  {
    get rule() { return ENGLISH.module_or_lesson_is_blank; },
    get result() { return ENGLISH.the_course_is_still_inserted_only_the_filled; }
  },
  {
    get rule() { return ENGLISH.the_same_course_code_appears_on_a_later; },
    get result() { return ENGLISH.the_first_complete_course_row_is_kept_the; }
  },
  {
    get rule() { return ENGLISH.a_material_url_has_no_lesson; },
    get result() { return ENGLISH.that_url_is_skipped_the_course_and_any; }
  },
  {
    get rule() { return ENGLISH.every_inserted_course; },
    get result() { return ENGLISH.is_active_is_1_is_offline_is_0; }
  }
];
