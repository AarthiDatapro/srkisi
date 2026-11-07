# course_manager — requirements (backend)

**Pair:** `dataprolms/src/course_manager`  
Update this file in the same PR when this module changes.

## Who

Employee with `courses` **view**. Mutations need **edit**.

## APIs

Course CRUD, activate/deactivate, assign programs/employees, students list, attendance, analytics (see `course_routes.js`).

## Must do

- CRUD courses.
- Upload course thumbnail (`POST /api/courses/:id/thumbnail`).
- Assign programs. Faculty belong to the program. Course detail includes each program’s cohort, type, duration, and dates.
- List course students; generate / edit course student ids; remove a student.
- Get/save attendance for a course.

## Done when

- View vs edit is enforced.
- Assigned staff only see courses they may access (assignment scope).
- Attendance save persists and reloads.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

