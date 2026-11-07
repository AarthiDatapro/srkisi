export const DROPDOWN_CATALOG = {
  "program_types": {
    key: "program_types",
    label: "Program types",
    table: "mst_program_types",
    idColumn: "program_type_id",
    nameColumn: "program_type_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_programs",
      column: "program_type_id",
      blockMessage: "This type is used by a program. Deactivate it instead."
    }
  },
  "course_types": {
    key: "course_types",
    label: "Course types",
    table: "mst_course_types",
    idColumn: "course_type_id",
    nameColumn: "course_type_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_courses",
      column: "course_type_id",
      blockMessage: "This type is used by a course. Deactivate it instead."
    }
  },
  "course_domains": {
    key: "course_domains",
    label: "Course domains",
    table: "mst_course_domains",
    idColumn: "course_domain_id",
    nameColumn: "course_domain_name",
    descriptionColumn: "description",
    codeFormat: true,
    usage: {
      table: "tbl_courses",
      column: "course_domain_id",
      blockMessage: "This domain is used by a course. Deactivate it instead."
    }
  },
  "course_levels": {
    key: "course_levels",
    label: "Course levels",
    table: "mst_course_levels",
    idColumn: "course_level_id",
    nameColumn: "course_level_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_courses",
      column: "course_level_id",
      blockMessage: "This level is used by a course. Deactivate it instead."
    }
  },
  "programming_languages": {
    key: "programming_languages",
    label: "Programming languages",
    table: "mst_programming_languages",
    idColumn: "programming_language_id",
    nameColumn: "programming_language_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_lesson_coding_sets",
      column: "programming_language_id",
      blockMessage: "This language is used by a coding exercise. Deactivate it instead."
    }
  },
  "course_languages": {
    key: "course_languages",
    label: "Course languages",
    table: "mst_course_languages",
    idColumn: "course_language_id",
    nameColumn: "course_language_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_course_languages",
      column: "course_language_id",
      blockMessage: "This language is used by a course. Deactivate it instead."
    }
  },
  "course_tags": {
    key: "course_tags",
    label: "Course tags",
    table: "mst_course_tags",
    idColumn: "course_tag_id",
    nameColumn: "course_tag_name",
    descriptionColumn: "description",
    colorColumn: "tag_color",
    usage: {
      table: "tbl_courses",
      column: "course_tag_id",
      blockMessage: "This tag is used by a course. Deactivate it instead."
    }
  },
  departments: {
    key: "departments",
    label: "Departments",
    table: "mst_departments",
    idColumn: "department_id",
    nameColumn: "department_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_employees",
      column: "department_id",
      blockMessage: "This department is used by an employee. Deactivate it instead."
    }
  },
  designations: {
    key: "designations",
    label: "Designations",
    table: "mst_designations",
    idColumn: "designation_id",
    nameColumn: "designation_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_employees",
      column: "designation_id",
      blockMessage: "This designation is used by an employee. Deactivate it instead."
    }
  },
  "employee_types": {
    key: "employee_types",
    label: "Employee types",
    table: "mst_employee_types",
    idColumn: "employee_type_id",
    nameColumn: "employee_type_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_employees",
      column: "employee_type_id",
      blockMessage: "This employee type is used by an employee. Deactivate it instead."
    }
  },
  "employment_types": {
    key: "employment_types",
    label: "Employment types",
    table: "mst_employment_types",
    idColumn: "employment_type_id",
    nameColumn: "employment_type_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_employees",
      column: "employment_type_id",
      blockMessage: "This employment type is used by an employee. Deactivate it instead."
    }
  },
  genders: {
    key: "genders",
    label: "Genders",
    table: "mst_genders",
    idColumn: "gender_id",
    nameColumn: "gender_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_employees",
      column: "gender_id",
      blockMessage: "This gender is used by an employee. Deactivate it instead."
    }
  },
  locations: {
    key: "locations",
    label: "Locations",
    table: "mst_locations",
    idColumn: "location_id",
    nameColumn: "location_name",
    descriptionColumn: "description",
    usage: {
      table: "tbl_employees",
      column: "location_id",
      blockMessage: "This location is used by an employee. Deactivate it instead."
    }
  }
};

export function list_dropdown_catalog() {
  return Object.values(DROPDOWN_CATALOG).map(({ key, label }) => ({ key, label }));
}

export function get_dropdown_def(key) {
  return DROPDOWN_CATALOG[key] || null;
}
