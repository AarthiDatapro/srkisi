import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_manager_constants_english.js";
export const EMPTY_COURSE = {
  course_name: "",
  course_tagline: "",
  course_type_id: "",
  duration_hours: "",
  course_description: "",
  created_by_display: "",
  real_world_project_count: "",
  has_completion_certificate: false,
  learn_points: [""],
  audience_points: [""],
  is_paid: false,
  fee_amount: "",
  discount_percent: "",
  course_domain_id: "",
  course_level_id: "",
  language_ids: [],
  course_tag_id: "",
  is_open: false,
  is_offline: false,
  enroll_passkey: "",
  program_passkeys: {},
  student_id_format: "",
  is_active: true
};

export const COPY = {
  get title() { return ENGLISH.courses; },
  get subtitle() { return ENGLISH.build_the_catalog_then_attach_each_course_to; },
  get create() { return ENGLISH.new_course; },
  get empty() { return ENGLISH.no_courses_yet; },
  get emptyHint() { return ENGLISH.add_the_first_course_to_start_this_catalog; },
  get details() { return ENGLISH.course_details; },
  get edit() { return ENGLISH.edit_course; },
  get assign() { return ENGLISH.assign_to_programs; }
};
