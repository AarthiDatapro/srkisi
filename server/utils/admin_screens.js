export const ADMIN_SCREENS = [
{ id: "performance", label: "Performance" },
{ id: "programs", label: "Programs" },
{ id: "cohorts", label: "Cohorts" },
{ id: "courses", label: "All courses" },
{ id: "course_content", label: "Content" },
{ id: "course_students", label: "Student List" },
{ id: "course_attendance", label: "Attendance" },
{ id: "course_feedback", label: "Feedback Qs" },
{ id: "course_reports", label: "Daily Reports" },
{ id: "quiz_analytics", label: "Quiz Analytics" },
{ id: "attendance_analytics", label: "Attendance Analytics" },
{ id: "hackathon_analytics", label: "Hackathon Analytics" },
{ id: "employees", label: "Employees" },
{ id: "students", label: "Students" },
{ id: "jobs", label: "Jobs" },
{ id: "hackathons", label: "Hackathons" },
{ id: "mock_interviews", label: "Mock Interviews" },
{ id: "resume_analyser", label: "Resume Analyser" },
{ id: "chatbot_usage", label: "Chatbot Usage" },
{ id: "dropdowns", label: "Dropdowns" },
{ id: "api_integration", label: "API integration" },
{ id: "certificates", label: "Certificates" }];


export const ADMIN_SCREEN_IDS = ADMIN_SCREENS.map((screen) => screen.id);

export const SCREEN = Object.freeze(
  Object.fromEntries(ADMIN_SCREENS.map((screen) => [screen.id, screen.id]))
);

export const ACCESS = Object.freeze({
  view: "view",
  edit: "edit"
});
