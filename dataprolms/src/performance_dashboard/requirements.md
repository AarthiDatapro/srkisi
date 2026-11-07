# performance_dashboard — requirements (frontend)

**Pair:** `server/performance_dashboard`  
Update this file in the same PR when this module changes.

## Who

Employee with admin screen `performance` **view**.

## Screen

`#/admin_dashboard/performance`

## Must do

- Filter by program and course.
- Show learners, courses, daily reports, exams, today’s session, announcements.
- Main padding from `design_system/shell.css` only. Package shell classes stay as shipped.

## Component layout

`Performance_Dashboard` (`performance_dashboard.jsx`) is the container: it owns `get_performance_dashboard()` fetching, loading/error toast, program/course filter state, student search filtering, shared derived values (`exam_avg`, `attend_max`), and passes data down as props.

Presentational pieces (snake_case files under `ui/`):

| File | Component | Role |
|---|---|---|
| `ui/performance_header.jsx` | `Performance_Header` | Program title + meta |
| `ui/performance_filters.jsx` | `Performance_Filters` | Program / course selects |
| `ui/performance_kpis.jsx` | `Performance_Kpis` | KPI rail |
| `ui/performance_learners.jsx` | `Performance_Learners` | Learner list + search input |
| `ui/performance_course_health.jsx` | `Performance_Course_Health` | Course health meters |
| `ui/performance_daily_reports.jsx` | `Performance_Daily_Reports` | Daily reports list |
| `ui/performance_exam_score.jsx` | `Performance_Exam_Score` | Exam average + spark |
| `ui/performance_spark.jsx` | `Performance_Spark` | Sparkline SVG |
| `ui/performance_latest_exams.jsx` | `Performance_Latest_Exams` | Latest exams |
| `ui/performance_feedback.jsx` | `Performance_Feedback` | Feedback stars |
| `ui/performance_attendance.jsx` | `Performance_Attendance` | Attendance heat + mini stats |
| `ui/performance_today_schedule.jsx` | `Performance_Today_Schedule` | Today’s sessions |
| `ui/performance_notices.jsx` | `Performance_Notices` | Notices |
| `ui/index.js` | — | Barrel exports |
| `utils/formatters.js` | — | `initials`, `pretty_date`, `short_date`, `week_day`, `course_label` |

CSS remains `theme/dashboard.css` with the same `po_*` classes. No API or UI behavior change — refactor only.

## Done when

- Filters change the numbers.
- Empty states exist (no students, no courses, no reports, no exams).
- Load failure is shown.
- Dashboard sections render via the components above with the same UI.
