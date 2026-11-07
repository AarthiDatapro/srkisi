import { COURSE_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_manager_constants_english.js";
export const COURSE_COLUMNS = [
{ id: "course_name", get label() { return ENGLISH.course; }, width: 280 },
{ id: "course_code", get label() { return ENGLISH.code; }, width: 180 },
{ id: "course_type", get label() { return ENGLISH.type; }, width: 140 },
{ id: "level", get label() { return ENGLISH.level; }, width: 130 },
{ id: "duration_hours", get label() { return ENGLISH.hours; }, width: 100 },
{ id: "program_count", get label() { return ENGLISH.programs; }, width: 110 },
{ id: "enrolled_count", get label() { return ENGLISH.enrolled; }, width: 110 },
{ id: "status", get label() { return ENGLISH.status; }, width: 110 }];


export { GRID_THEME } from "../design_system/grid_theme.js";
