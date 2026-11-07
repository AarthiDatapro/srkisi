import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_content_manager_constants_english.js";
import { live_items } from "../constants/live_text.js";

export const ITEM_TYPES = live_items([() => ENGLISH.video, () => ENGLISH.material, () => ENGLISH.notes, () => ENGLISH.overview, () => ENGLISH.announcement]);
export const TEXT_TYPES = live_items([() => ENGLISH.overview, () => ENGLISH.announcement]);

export const EMPTY_MODULE = {
  module_title: "",
  module_description: "",
  is_active: true
};

export const EMPTY_LESSON = {
  module_id: "",
  lesson_title: "",
  lesson_description: "",
  duration_minutes: "",
  is_active: true
};

export const EMPTY_ITEM = {
  get content_type() { return ENGLISH.video; },
  content_title: "",
  content_description: "",
  content_url: "",
  source_mode: "link",
  notes_language: "english"
};

export const EMPTY_CODING = {
  module_id: "",
  lesson_id: "",
  set_title: "",
  prompt: "",
  programming_language_id: ""
};

export const EMPTY_QUIZ = {
  module_id: "",
  lesson_id: "",
  quiz_name: "",
  text: "",
  count: "10",
  questions_shown: "10",
  difficulty_mix: { easy: "4", medium: "4", hard: "2" },
  bloom_mix: { remember: "2", understand: "2", apply: "2", analyze: "2", evaluate: "2", create: "0" }
};

export const TABS = [
{ id: "content", get label() { return ENGLISH.content; }, get short() { return ENGLISH.content; } },
{ id: "students", get label() { return ENGLISH.student_list; }, get short() { return ENGLISH.students; } },
{ id: "attendance", get label() { return ENGLISH.attendance; }, get short() { return ENGLISH.attend; } },
{ id: "feedback", get label() { return ENGLISH.feedback_qs; }, get short() { return ENGLISH.feedback; } },
{ id: "reports", get label() { return ENGLISH.daily_reports; }, get short() { return ENGLISH.reports; } }];


export { GRID_THEME } from "../design_system/grid_theme.js";

export const COURSE_STUDENT_COLUMNS = [
{ id: "student_id", get label() { return ENGLISH.student_id; }, width: 140 },
{ id: "course_student_id", get label() { return ENGLISH.course_id; }, width: 180 },
{ id: "full_name", get label() { return ENGLISH.student; }, width: 220 },
{ id: "program_name", get label() { return ENGLISH.program; }, width: 180 },
{ id: "cohort_name", get label() { return ENGLISH.cohort; }, width: 160 },
{ id: "email", get label() { return ENGLISH.email; }, width: 200 },
{ id: "mobile_number", get label() { return ENGLISH.mobile; }, width: 130 },
{ id: "college", get label() { return ENGLISH.college; }, width: 180 },
{ id: "higher_study", get label() { return ENGLISH.higher_study; }, width: 140 },
{ id: "blood_group", get label() { return ENGLISH.blood_group; }, width: 110 },
{ id: "address_line", get label() { return ENGLISH.address; }, width: 220 },
{ id: "pincode", get label() { return ENGLISH.pincode; }, width: 100 },
{ id: "state", get label() { return ENGLISH.state; }, width: 120 },
{ id: "district", get label() { return ENGLISH.district; }, width: 120 },
{ id: "enrolled_at", get label() { return ENGLISH.enrolled; }, width: 120 },
{ id: "learning_status", get label() { return ENGLISH.status; }, width: 120 },
{ id: "progress_percent", get label() { return ENGLISH.progress; }, width: 100 }];


export const COPY = {
  get addContent() { return ENGLISH.add_content; },
  get createModule() { return ENGLISH.create_module; },
  get createLesson() { return ENGLISH.create_lesson; },
  get addLesson() { return ENGLISH.add_lesson; },
  get addQuiz() { return ENGLISH.add_quiz; },
  get addItem() { return ENGLISH.add_item; },
  get expandAll() { return ENGLISH.expand_all; },
  get collapseAll() { return ENGLISH.collapse_all; },
  get reorder() { return ENGLISH.reorder; },
  get doneReorder() { return ENGLISH.done; },
  get deleteLesson() { return ENGLISH.delete_lesson; },
  get deleteModule() { return ENGLISH.delete_module; },
  get deleteQuiz() { return ENGLISH.delete_quiz; },
  get editQuiz() { return ENGLISH.edit_quiz; },
  get empty() { return ENGLISH.no_modules_yet; },
  get emptyHint() { return ENGLISH.create_a_module_add_a_lesson_then_generate; }
};

export const DEFAULT_SESSIONS = [
{ time: "09:00 - 09:15", get session() { return ENGLISH.roll_call; }, topic: "", remarks: "" },
{ time: "09:15 - 10:15", get session() { return ENGLISH.session_1; }, topic: "", remarks: "" },
{ time: "10:15 - 11:15", get session() { return ENGLISH.session_2; }, topic: "", remarks: "" },
{ time: "11:15 - 11:30", get session() { return ENGLISH.label_break; }, get topic() { return ENGLISH.short_break; }, remarks: "" },
{ time: "11:30 - 12:30", get session() { return ENGLISH.session_3; }, topic: "", remarks: "" },
{ time: "12:30 - 01:30", get session() { return ENGLISH.session_4; }, topic: "", remarks: "" },
{ time: "01:30 - 02:15", get session() { return ENGLISH.lunch; }, get topic() { return ENGLISH.lunch_break; }, remarks: "" },
{ time: "02:15 - 03:15", get session() { return ENGLISH.session_5; }, topic: "", remarks: "" },
{ time: "03:15 - 03:30", get session() { return ENGLISH.label_break; }, get topic() { return ENGLISH.short_break; }, remarks: "" },
{ time: "03:30 - 04:30", get session() { return ENGLISH.session_6; }, topic: "", remarks: "" },
{ time: "04:30 - 05:00", session: "Wrap_up", topic: "", remarks: "" }];


function today_stamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function empty_daily_report(course = {}, analytics = {}) {
  const stamp = today_stamp();
  const trainer = course?.employees?.[0]?.full_name || "";
  const enrolled = Number(analytics?.enrolled || 0);
  const present = Number(analytics?.present_today || 0) + Number(analytics?.late_today || 0);
  const absent = Number(analytics?.absent_today || 0);
  const percent = Number(analytics?.attendance_percent || 0);
  return {
    report_date: stamp,
    day_no: "",
    week_no: "",
    trainer_name: trainer,
    teaching_assistant: "",
    module_course: course?.course_name || "",
    session_timings: "9:00 AM - 5:00 PM",
    program_title: course?.programs?.[0]?.program_name || "",
    venue: "",
    association_line: "",
    course_track: "",
    enrolled,
    present_today: present,
    absent_today: absent,
    attendance_percent: percent,
    morning_count: present,
    afternoon_count: present,
    daily_assignment: true,
    daily_attempts: present || "",
    daily_reason: "",
    weekly_assignment: false,
    weekly_attempts: "",
    weekly_reason: "",
    lab_work: "",
    lab_comments: "",
    other_activities: "",
    submitted_by: trainer,
    submitted_date: stamp,
    reviewed_by: "",
    reviewed_date: stamp,
    sessions: DEFAULT_SESSIONS.map((row) => ({ ...row })),
    photos: []
  };
}
