import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../constants/english/programs_control_constants_english.js";
export { GRID_THEME } from "../design_system/grid_theme.js";

export const PROGRAM_COURSE_COLUMNS = [
{ id: "registered_students", get label() { return ENGLISH.students; }, width: 132, className: "prg_students_col", cellClassName: "prg_students_col" },
{ id: "course_code", get label() { return ENGLISH.course_code; } },
{ id: "course_name", get label() { return ENGLISH.course_title; } },
{ id: "course_type", get label() { return ENGLISH.type; } },
{ id: "duration_hours", get label() { return ENGLISH.duration; } },
{ id: "status", get label() { return ENGLISH.status; } },
{ id: "level", get label() { return ENGLISH.level; } }];


export const STUDENT_COLUMNS = [
{ id: "student_id", get label() { return ENGLISH.student_id; }, width: 140 },
{ id: "full_name", get label() { return ENGLISH.student; }, width: 200 },
{ id: "first_name", get label() { return ENGLISH.first_name; }, width: 130 },
{ id: "last_name", get label() { return ENGLISH.last_name; }, width: 130 },
{ id: "email", get label() { return ENGLISH.email; }, width: 220 },
{ id: "mobile_number", get label() { return ENGLISH.mobile; }, width: 140 },
{ id: "date_of_birth", get label() { return ENGLISH.date_of_birth; }, width: 130 },
{ id: "status", get label() { return ENGLISH.account; }, width: 110 },
{ id: "terms", get label() { return ENGLISH.terms; }, width: 130 },
{ id: "terms_at", get label() { return ENGLISH.terms_accepted; }, width: 140 },
{ id: "joined_at", get label() { return ENGLISH.joined; }, width: 130 },
{ id: "updated_at", get label() { return ENGLISH.updated; }, width: 130 },
{ id: "course_count", get label() { return ENGLISH.courses; }, width: 90 },
{ id: "courses", get label() { return ENGLISH.enrolled_courses; }, width: 280 }];


export const FACULTY_COLUMNS = [
{ id: "employee_code", get label() { return ENGLISH.code; }, width: 140 },
{ id: "full_name", get label() { return ENGLISH.faculty; }, width: 200 },
{ id: "first_name", get label() { return ENGLISH.first_name; }, width: 130 },
{ id: "last_name", get label() { return ENGLISH.last_name; }, width: 130 },
{ id: "email", get label() { return ENGLISH.email; }, width: 220 },
{ id: "mobile_number", get label() { return ENGLISH.mobile; }, width: 140 },
{ id: "department", get label() { return ENGLISH.department; }, width: 150 },
{ id: "designation", get label() { return ENGLISH.designation; }, width: 150 },
{ id: "role", get label() { return ENGLISH.role; }, width: 130 }];
