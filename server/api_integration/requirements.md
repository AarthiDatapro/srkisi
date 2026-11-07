# api_integration — requirements (backend)

**Pair:** `dataprolms/src/api_integration`  
Update this file in the same PR when this module changes.

## Who

Employee with `api_integration` **view** can download the sample workbook. **Edit** is required to check a workbook and to import it.

## APIs

- `GET /api/api_integration/students/template` — sample `.xlsx`.
- `POST /api/api_integration/students/check` — saves the upload as `scripts/students.xlsx` and runs `node scripts/importStudents.js` with no `--import`. Email and mobile are required. Other profile columns may be blank. A password in the file is hashed before insert.
- `POST /api/api_integration/students/import` — runs `node scripts/importStudents.js --import` for the workbook that just passed the check.
- `GET /api/api_integration/attendance/template` — sample `.xlsx` with course name, student email, and is present.
- `POST /api/api_integration/attendance/check` — saves the upload as `scripts/attendance.xlsx` and runs `node scripts/importAttendance.js` with no `--import`.
- `POST /api/api_integration/attendance/import` — runs `node scripts/importAttendance.js --import` for the workbook that just passed the attendance check.
- `GET /api/api_integration/courses/template` — sample `.xlsx` for a course row.
- `POST /api/api_integration/courses/check` — saves the upload as `scripts/courses.xlsx` and runs `node scripts/importCourses.js` with no `--import`. A blank module or lesson does not reject the course.
- `POST /api/api_integration/courses/import` — runs `node scripts/importCourses.js --import` for the workbook that just passed the course check.
- `GET /api/api_integration/registrations/template` — sample `.xlsx` for a batch registration. The institution name is not a column.
- `POST /api/api_integration/registrations/check` — saves the upload as `scripts/registrations.xlsx` and runs `node scripts/importRegistrations.js --cohort "<institution>"` with no `--import`.
- `POST /api/api_integration/registrations/import` — runs the same script with `--import` for the institution from that check.
- `GET /api/api_integration/quizzes/template` — sample `.xlsx` with one question per row.
- `POST /api/api_integration/quizzes/check` — saves the upload as `scripts/quizzes.xlsx` and runs `node scripts/importQuizzes.js` with no `--import`.
- `POST /api/api_integration/quizzes/import` — runs `node scripts/importQuizzes.js --import` for the workbook that just passed the quiz check.
- `GET /api/api_integration/quiz_attempts/template` — sample `.xlsx` with one answer per row.
- `POST /api/api_integration/quiz_attempts/check` — saves the upload as `scripts/quiz_attempts.xlsx` and runs `node scripts/importQuizAttempts.js` with no `--import`.
- `POST /api/api_integration/quiz_attempts/import` — runs `node scripts/importQuizAttempts.js --import` for the workbook that just passed the attempt check.

## Must do

- The check must not insert students, attendance, courses, registrations, quizzes, questions, or quiz attempts. Writes happen only when Import is confirmed and the script is started with `--import`.
- Import is refused until that same workbook has a successful check. A check for one import does not authorize another.
- The script path and arguments are fixed. The uploaded file name is not passed to the shell.

## Done when

- A fitting workbook returns the script’s report and a `check_id`.
- Import runs `scripts/importStudents.js` and returns its log.
- A second import without a new check is refused.

## Naming

Follow root `CODING_STANDARD.md`. The existing script files keep the names `scripts/importStudents.js`, `scripts/importAttendance.js`, `scripts/importCourses.js`, `scripts/importRegistrations.js`, `scripts/importQuizzes.js`, and `scripts/importQuizAttempts.js`.
