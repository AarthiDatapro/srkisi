import { EMPLOYEE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/employee_manager_constants_english.js";
export const EMPLOYEE_COLUMNS = [
{ id: "photo", get label() { return ENGLISH.photo; }, width: 72, sortable: false },
{ id: "employee_code", get label() { return ENGLISH.code; }, width: 220 },
{ id: "full_name", get label() { return ENGLISH.full_name; }, width: 200 },
{ id: "first_name", get label() { return ENGLISH.first_name; }, width: 130 },
{ id: "middle_name", get label() { return ENGLISH.middle_name; }, width: 130 },
{ id: "last_name", get label() { return ENGLISH.last_name; }, width: 130 },
{ id: "gender", get label() { return ENGLISH.gender; }, width: 110 },
{ id: "date_of_birth", get label() { return ENGLISH.date_of_birth; }, width: 130 },
{ id: "employee_type", get label() { return ENGLISH.employee_type; }, width: 150 },
{ id: "employment_type", get label() { return ENGLISH.employment_type; }, width: 160 },
{ id: "department", get label() { return ENGLISH.department; }, width: 140 },
{ id: "designation", get label() { return ENGLISH.designation; }, width: 140 },
{ id: "joining_date", get label() { return ENGLISH.joining_date; }, width: 130 },
{ id: "email", get label() { return ENGLISH.email; }, width: 220 },
{ id: "mobile_number", get label() { return ENGLISH.mobile; }, width: 130 },
{ id: "alternate_phone", get label() { return ENGLISH.alternate_phone; }, width: 140 },
{ id: "address_line_1", get label() { return ENGLISH.address_line_1; }, width: 180 },
{ id: "address_line_2", get label() { return ENGLISH.address_line_2; }, width: 180 },
{ id: "city", get label() { return ENGLISH.city; }, width: 120 },
{ id: "state", get label() { return ENGLISH.state; }, width: 120 },
{ id: "country", get label() { return ENGLISH.country; }, width: 120 },
{ id: "postal_code", get label() { return ENGLISH.postal_code; }, width: 110 },
{ id: "location", get label() { return ENGLISH.location; }, width: 130 },
{ id: "reporting_manager", get label() { return ENGLISH.reporting_manager; }, width: 180 },
{ id: "status", get label() { return ENGLISH.status; }, width: 110 }];


export const COMPACT_EMPLOYEE_COLUMNS = EMPLOYEE_COLUMNS.map((column) => ({
  ...column,
  width: {
    photo: 44,
    employee_code: 96,
    full_name: 112,
    first_name: 84,
    middle_name: 84,
    last_name: 84,
    gender: 72,
    date_of_birth: 88,
    employee_type: 92,
    employment_type: 96,
    department: 96,
    designation: 96,
    joining_date: 88,
    email: 128,
    mobile_number: 100,
    alternate_phone: 100,
    address_line_1: 120,
    address_line_2: 120,
    city: 88,
    state: 88,
    country: 88,
    postal_code: 80,
    location: 88,
    reporting_manager: 112,
    status: 76
  }[column.id] || Math.min(column.width, 100)
}));

export { GRID_THEME } from "../design_system/grid_theme.js";
