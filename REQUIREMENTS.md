# Datapro LMS — requirements (index)

**Living document.** One module = one feature folder (same name on frontend and backend when both exist).

**New developer:** start with `dataprolms/START_HERE.md` (how to build a screen), then `CODING_STANDARD.md` (naming), then this index.

Each module also has its own `requirements.md` **inside the folder**. Open that file first when you work on a module.  
When scope changes: update **the folder file and this index** in the same PR as the code.

| Field | Meaning |
|---|---|
| Who | Who is allowed to use it |
| Screen | Hash route the person opens |
| Must do | What the screen must allow |
| Done | The work is finished only when these are true |

**People**

- **Guest** — not signed in  
- **Student** — signed in as student  
- **Employee** — signed in as staff; each admin screen needs `view` or `edit` access  

**Admin screens** (ids): `performance` · `programs` · `cohorts` · `courses` · `employees` · `jobs` · `hackathons` · `dropdowns` · `certificates`  
Path: `#/admin_dashboard/{id}`

---

## 1. hero_landing

| | |
|---|---|
| Folders | `dataprolms/src/hero_landing` |
| Who | Guest |
| Screen | `#/` |
| Must do | Show the public site. Buttons must go to student login, employee login, and create account. |
| Done | Landing loads. Those three buttons open `#/login`, `#/employee_login`, and `#/register`. |

---

## 2. student_authentication

| | |
|---|---|
| Folders | `dataprolms/src/student_authentication` · `server/student_authentication` |
| Who | Guest (login/register/forgot). Student (dashboard shell). |
| Screen | `#/login` · `#/register` · `#/forgot_password` · shell `#/dashboard` |
| Must do | Register (optional photo, show student ID). Sign in. Reset password. After login, show Home / My Courses / Programs & Courses / Profile / Logout. Package auth classes stay as shipped. |
| Done | Good login goes to `#/dashboard`. Bad input shows an error. Register shows the new student ID. Logout returns to `#/login`. Auth links keep package styles. |

---

## 3. employee_authentication

| | |
|---|---|
| Folders | `dataprolms/src/employee_authentication` · `server/employee_authentication` |
| Who | Guest (login). Employee (workspace). |
| Screen | `#/employee_login` · `#/admin_dashboard` · `#/admin_dashboard/{screen}` |
| Must do | Staff login. Load which screens this person may `view` or `edit`. Hide screens they cannot view. Block the page if they open a denied URL. |
| Done | Login opens home. Menu only lists allowed screens. Denied screen says they do not have access. Logout returns to `#/employee_login`. |

---

## 4. student_home

| | |
|---|---|
| Folders | `dataprolms/src/student_home` |
| Who | Student |
| Screen | `#/dashboard` |
| Must do | Show enrolled courses, continue learning, and simple progress. Open a course, the catalog, or profile. Welcome header keeps a left inset. |
| Done | Data or empty messages show (for example no enrolled courses). A failed load shows an error. Continue opens `#/dashboard/learn/{course_id}`. |

---

## 5. my_courses

| | |
|---|---|
| Folders | `dataprolms/src/my_courses` (API lives in `course_registration`) |
| Who | Student |
| Screen | `#/dashboard/courses` |
| Must do | List my enrollments. Filter (all / in progress / completed). Search and sort. Start or continue a course. Title block keeps a 16px left inset. |
| Done | Empty list explains they have not enrolled. Start/continue opens learning. Errors show a toast. Naming aligns with cards (not flush left). |

---

## 6. course_registration

| | |
|---|---|
| Folders | `dataprolms/src/course_registration` · `server/course_registration` |
| Who | Student |
| Screen | `#/dashboard/programs` (also `#/dashboard/course_registration`) |
| Must do | Browse programs and courses. Open details. Register. For offline courses, accept an enroll code. Add/remove wishlist. Level filter CSS targets package `.dpm-select`. |
| Done | Register confirms they are on the course. Empty catalog is explained. Offline course without a valid code cannot enroll. Errors show a toast. Level select stays fixed width beside the course-list naming. |

---

## 7. course_learning

| | |
|---|---|
| Folders | `dataprolms/src/course_learning` · `server/course_learning` |
| Who | Student (must be enrolled) |
| Screen | `#/dashboard/learn/{course_id}` |
| Must do | Open modules and lessons. View video, files, notes, overview, announcements. Tabs: Feedback → Resources → Announcements → Overview → Notes → Discussions. Default Feedback when video exists, else Overview. Mobile shows module number + name. Mark complete, feedback, quiz, AI help. |
| Done | Content loads, or “no lessons yet”. Quiz submit shows a score. Feedback saves. Chat answers or explains failure. Unenrolled / error is visible. Mobile bar shows current module. |

---

## 8. student_profile

| | |
|---|---|
| Folders | `dataprolms/src/student_profile` · `server/student_profile` |
| Who | Student |
| Screen | `#/dashboard/profile` |
| Must do | View and edit profile fields. Change photo. Save. |
| Done | Save says profile updated. Photo says photo updated. Load failure shows the profile could not be loaded. |

---

## 9. admin_home

| | |
|---|---|
| Folders | `dataprolms/src/admin_home` · `server/admin_home` |
| Who | Any signed-in employee |
| Screen | `#/admin_dashboard` |
| Must do | Show the header, welcome line, and KPI cards. Show quick jumps to screens this person can view. The search box filters those jumps. |
| Done | Home loads. Jumps respect view access. A search with no match is explained. Load error is shown. |

---

## 10. performance_dashboard

| | |
|---|---|
| Folders | `dataprolms/src/performance_dashboard` · `server/performance_dashboard` |
| Who | Employee with `performance` **view** |
| Screen | `#/admin_dashboard/performance` |
| Must do | Filter by program and course. Show learners, courses, daily reports, exams, today’s session, announcements. |
| Done | Filters change the numbers. Empty states exist (no students, no courses, no reports, no exams). Load failure is shown. |

---

## 11. programs_control

| | |
|---|---|
| Folders | `dataprolms/src/programs_control` · `server/programs_control` |
| Who | Employee with `programs` **view** (mutations need **edit**) |
| Screen | `#/admin_dashboard/programs` |
| Must do | List, search programs. Activate / deactivate / delete. Assign courses. See students and faculty. Upload a thumbnail. Open a course’s content. Create, edit, and assign faculty from a cohort. |
| Done | Empty: no programs yet. View-only cannot change data. Create/update/delete confirm. Assigned courses, students, and faculty lists can be empty and still be clear. |

---

## 12. course_manager

| | |
|---|---|
| Folders | `dataprolms/src/course_manager` · `server/course_manager` |
| Who | Employee with `courses` **view** (mutations need **edit**) |
| Screen | `#/admin_dashboard/courses` |
| Must do | List, search, create, edit courses. Upload a course thumbnail. Assign to programs. Activate / deactivate / delete. Open content for a course. |
| Done | Empty: no courses yet. View-only cannot edit. Actions confirm. Open content goes to `#/admin_dashboard/courses/{course_id}/content`. |

---

## 13. course_content_manager

| | |
|---|---|
| Folders | `dataprolms/src/course_content_manager` · `server/course_content_manager` |
| Who | Employee with `courses` **view** (mutations need **edit**) |
| Screen | `#/admin_dashboard/courses/{course_id}/content` |
| Must do | **Content:** modules, lessons, items (video / material / notes / overview / announcement), reorder, preview. Create/edit/delete quizzes (including AI generate). **Course details.** **Students:** list, generate course student IDs, edit course id, remove. **Attendance:** view and save. **Analytics:** course and quiz sheet. **Daily reports:** create/edit/delete, photos, PDF. |
| Done | Empty modules explained. View-only cannot change structure. Quiz create confirms. Attendance saves. Reports and analytics have empty and error states. Back returns to the course list. |

---

## 14. employee_manager

| | |
|---|---|
| Folders | `dataprolms/src/employee_manager` · `server/employee_manager` |
| Who | Employee with `employees` **view** (mutations need **edit**) |
| Screen | `#/admin_dashboard/employees` |
| Must do | Staff directory: create, edit, details, photo. Set per-screen access (`view` / `edit`). Activate / deactivate / delete. |
| Done | Empty directory explained. Validation errors show. Access saved on the employee. View-only cannot change records. |

---

## 15. dropdown_manager

| | |
|---|---|
| Folders | `dataprolms/src/dropdown_manager` · `server/dropdown_manager` |
| Who | Employee with `dropdowns` **view** (mutations need **edit**) |
| Screen | `#/admin_dashboard/dropdowns` |
| Must do | Maintain option lists used by forms: program types, course types, departments, designations, employee types, employment types, genders, locations. Add, edit, activate, deactivate, delete. |
| Done | Empty list explained. Other admin forms can pick these options. View-only cannot change options. |

---

## 16. ai (server) and aipipe

| | |
|---|---|
| Folders | `server/ai` · `aipipe/` |
| Who | Student (lesson chat). Employee/system (quiz generate from content manager). |
| Screen | No own page. Used inside learning and content. |
| Must do | Stream a course-aware help answer. Generate a quiz from lesson text (and reject unsafe prompts). |
| Done | Chat returns an answer or a clear failure. Quiz generate returns questions or a security/validation error. Health check works. |

---

## 17. admin_ui

| | |
|---|---|
| Folders | `dataprolms/src/admin_ui` |
| Who | Platform — used by employee screens, not a menu item |
| Screen | None |
| Must do | Shared admin shell, row actions, and form/details CSS (`theme/admin_forms.css`). |
| Done | Admin screens reuse these without copying markup or importing `programs.css`. |

---

## 18. design_system

| | |
|---|---|
| Folders | `dataprolms/src/design_system` |
| Who | Platform — all screens |
| Screen | None |
| Must do | Shared colors, type, spacing, responsive layout, **AppShell pad / scroll in `shell.css`**, and the CSS style guide (800 / 1100 breakpoints, `--lms-*` tokens, leave `@datapromr/*` class names as shipped). |
| Done | App loads with these styles. Feature CSS does not set `.dpm-dash__main` padding. New screens use tokens. Style rules live in `dataprolms/src/design_system/requirements.md`. |

---

## 19. screen_starter

| | |
|---|---|
| Folders | `dataprolms/src/screen_starter` |
| Who | Platform — copy this folder for a new screen. Not a menu item |
| Screen | None |
| Must do | Template with `api_client`, token CSS, 800 / 1100 breakpoints only, and no feature-level `.dpm-dash__main` padding. |
| Done | New screens are copied from here, then renamed. This folder stays unmounted. |

---

## 20. cohorts

| | |
|---|---|
| Folders | `dataprolms/src/cohorts` · `server/cohorts` |
| Who | Employee with `cohorts` **view** (mutations need **edit**) |
| Screen | `#/admin_dashboard/cohorts` |
| Must do | Create, edit, and delete cohorts. Create programs inside a cohort, or add an existing program. A cohort can hold many programs. Start and end dates belong to each program. Cohorts have no dates and no status. Uploading a cohort image stores that same URL on every program in the cohort. Removing the image clears it in MySQL and deletes the file from storage. Cohort Details shows the program count, enrolled learners, the run dates across those programs, the description, and each program’s type, length, dates, and enrollment. |
| Done | Empty: no cohorts yet. View-only cannot change data. Delete asks for confirmation. Program cards show the cohort image. |

---

## 21. hackathon_manager

| | |
|---|---|
| Folders | `dataprolms/src/hackathon_manager` · `server/hackathon_manager` |
| Who | Employee with `hackathons` **view** (create, edit, delete, and generate need **edit**) |
| Screen | `#/admin_dashboard/hackathons` |
| Must do | Create a hackathon as a multiple choice quiz, a coding challenge, or a project. Quiz questions are generated from source text. Coding questions are generated from a prompt and language. A project is a list of tasks. Program specific hackathons pick a cohort, then programs in that cohort. An open hackathon is not tied to a cohort. |
| Done | Draft saves with a title. Publish requires a description, schedule, audience, and at least one question or task. Programs must belong to the selected cohort. View-only cannot change data. |

---

## 22. certificate_manager

| | |
|---|---|
| Folders | `dataprolms/src/certificate_manager` · `server/certificate_manager` · `aipipe/certificate_manager` |
| Who | Employee with `certificates` **view** (mutations need **edit**) |
| Screen | `#/admin_dashboard/certificates` |
| Must do | Create certificate types and their print fields. Set admin eligibility rules. Upload a template image, place field coordinates, and preview. Issue a certificate and verify a number. Node proxies aipipe; the browser does not call Python directly. |
| Done | Empty lists explained. View-only cannot change data. Failed loads and saves show an error. Preview returns an image. |

---

## Cross-cutting (every module)

These are true for the product, not one folder:

1. Student APIs require a student session. Employee APIs require an employee session plus screen access.  
2. Edit actions are hidden and rejected when the employee only has `view`.  
3. Failures show a message (toast or empty/error state), not a silent blank page.  
4. Naming follows `CODING_STANDARD.md` (our code is snake_case; package / browser / CSS package classes stay as the owner wrote them).  
5. Dashboard main padding comes from `design_system/shell.css` only — not from feature CSS.  
6. `GET /health` on the Node server must report database connected.

---

## How to update this file

| Change | What to edit here |
|---|---|
| New screen / folder | Add `requirements.md` inside the new folder(s) and a numbered section here |
| New button or API on an existing screen | Add a line under **Must do** and **Done** |
| Screen removed | Delete that module section in the same PR |
| Who may use it changed | Update **Who** and the access rule |

A PR that changes behavior without updating the module `requirements.md` (and this index) is not complete.
