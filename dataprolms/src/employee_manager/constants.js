import { empty_screen_access } from "../employee_authentication/screen_access.js";
import { EMPLOYEE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/employee_manager_constants_english.js";

export const EMPTY_EMPLOYEE = {
  first_name: "",
  middle_name: "",
  last_name: "",
  gender_id: "",
  date_of_birth: "",
  email: "",
  mobile_number: "",
  alternate_phone: "",
  employee_type_id: "",
  department_id: "",
  designation_id: "",
  employment_type_id: "",
  joining_date: "",
  location_id: "",
  reporting_manager_id: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",
  is_active: true,
  password: "",
  confirm_password: "",
  screens: empty_screen_access()
};

export const COPY = {
  get title() { return ENGLISH.employees; },
  get subtitle() { return ENGLISH.add_and_run_the_people_who_deliver_every; },
  get create() { return ENGLISH.new_employee; },
  get search() { return ENGLISH.search_name_code_or_email; },
  get empty() { return ENGLISH.no_employees_yet; },
  get emptyHint() { return ENGLISH.add_the_first_employee_to_start_this_directory; },
  get details() { return ENGLISH.employee_details; },
  get edit() { return ENGLISH.edit_employee; }
};
