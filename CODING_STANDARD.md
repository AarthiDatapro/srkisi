# Datapro LMS coding standard

**Style: `snake_case` only.**  
This is the company naming rule. One format. Do not mix.

**New screen / new joinee process:** `dataprolms/START_HERE.md` (folders to create, frontend + backend order). This file is naming only.

If a name has more than one word, join the words with `_` and use lowercase letters: `course_manager`, `get_student`, `daily_reports`. 

---

## 1. Folders

Use `snake_case`. Never kebab-case. Never mash words together.

| Wrong | Right |
|---|---|
| `performance-dashboard` | `performance_dashboard` |
| `hero-landing` | `hero_landing` |
| `studentprofile` | `student_profile` |
| `design-system` | `design_system` |
| `admin-home` | `admin_home` |

Frontend folder and backend folder for the same feature must have the **same name**.

---

## 2. Files

Use `snake_case` plus the normal extension.

| Wrong | Right |
|---|---|
| `CourseManager.jsx` | `course_manager.jsx` |
| `sessionKeepAlive.js` | `session_keep_alive.js` |
| `adminScreens.js` | `admin_screens.js` |
| `student-responsive.css` | `student_responsive.css` |
| `register-students.js` | `register_students.js` |

Keep these tool names unchanged (the tools will not run if you rename them): `package.json`, `package-lock.json`, `vite.config.js`, `eslint.config.js`, `index.html`, `index.js`, `index.css`, `server.js`, `.env`, `env.example`.

---

## 3. Variables and functions

Use `snake_case`. This includes parameters, helpers, and handlers.

```js
// wrong
const courseId = 12;
function getStudentProfile() {}
function handleSubmit() {}

// right
const course_id = 12;
function get_student_profile() {}
function handle_submit() {}
```

---

## 4. React components

React will not treat a name as a component unless it starts with a **capital letter**. So a component is `snake_case` with a capital on each part:

```jsx
// wrong
function CourseManager() {}
function course_manager() {}   // React thinks this is an HTML tag

// right
function Course_Manager() {}
<Course_Manager />
```

File: `course_manager.jsx`. Component: `Course_Manager`.

---

## 5. Constants

Use `SCREAMING_SNAKE_CASE` (still snake_case, only louder).

```js
const ADMIN_SCREEN_IDS = [];
const MAX_FILE_SIZE = 8;
const STORAGE_BUCKETS = { COURSE_CONTENT: "course_content" };
```

---

## 6. CSS

- **Our class names:** `snake_case` — `.hero_landing`, `.course_card`, `.myc_title`
- **CSS properties:** must stay kebab-case — `font-size`, `background-color` (this is the CSS language, not our choice)
- **Package class names in selectors and `className`:** leave exactly as `@datapromr/*` ships them (often kebab-case). Never snake_case them in our CSS or JSX.
- **AppShell main padding:** only in `design_system/shell.css` (`--lms-shell-pad`). Feature CSS must not set `padding` on `.dpm-dash__main`.
- **Breakpoints, tokens, shell, one file per feature:** `dataprolms/src/design_system/requirements.md`

```css
/* wrong — our class */
.hero-landing__preview { font-size: 16px; }

/* right — our class */
.hero_landing_preview { font-size: 16px; }

/* wrong — package class renamed (styles stop matching) */
.crg_block_head .dpm_select { width: 168px; }

/* right — package class kept */
.crg_block_head .dpm-select { width: 168px; }
```

---

## 7. URLs and hashes we own

Use `snake_case` in our own routes.

| Wrong | Right |
|---|---|
| `#/admin-dashboard` | `#/admin_dashboard` |
| `#/forgot-password` | `#/forgot_password` |
| `/api/performance-dashboard` | `/api/performance_dashboard` |
| `/api/student/my-courses` | `/api/student/my_courses` |

Do **not** rename routes that belong to a package we do not own, for example `/api/csrf-token` from `@datapromr/auth`.

---

## 8. What you must not rename

These are not our names. Leave them as the owner wrote them:

1. **npm packages** — `@datapromr/app-shell`, `react-dom`, `@designdaddy/datagrid`
2. **React and browser APIs** — `useState`, `useEffect`, `onClick`, `className`, `fetch`, `document`, `setTimeout`, `clearTimeout`, `ResizeObserver`, `Intl` option values such as `"2-digit"`
3. **HTTP headers** — `Content-Type`, `X-CSRF-Token`
4. **HTML autocomplete values** — `given-name`, `new-password` (browser spec)
5. **SQL / CSS keywords** — `CREATE TABLE`, `font-size`
6. **Names imported from a package** — `ToastProvider`, `Select`, `applySecurity`, `log.fail`
7. **Package DOM / CSS classes** — `.dpm-dash`, `.dpm-dash__main`, `.dpm-select`, `.ui-field`, `.gds-toolbar__search`, `.ub-table-wrap`, `.gff-input`, and any other class `@datapromr/*` or `@designdaddy/*` documents
8. **SVG path coordinates** — hyphens in path `d` values are negative numbers (`5-5`, `6-6`), not separators. Never turn them into underscores.
9. **External asset IDs / URLs** — Unsplash ids use hyphens (`photo-1561070791-2526d30994b5`). Never snake_case them to `photo_…`.

If you wrap a package component, keep **their** prop names (`onClick`, `variant`, `onChange`). Your own props still use snake_case.

Example: `@datapromr/action-button` `Action_Button` must use `onClick={...}`, never `on_click={...}` — otherwise row actions do nothing.

Renaming any of the above breaks the UI (blank pages, missing padding, stretched controls, dead links, slash icons, crushed cards, **broken landing images**).

When converting BEM (`block__el`, `block--mod`) to snake_case, keep **element** and **modifier** as different names (for example `ccm_block_quiz` vs `ccm_block_is_quiz`). Collapsing both to one name breaks layout.

Dynamic state classes we own also use snake_case: `` className={`is_${status}`} `` → `is_present`, never `` `is-${status}` `` → `is-present`.

---

## 9. How to add a new screen

1. Create the same folder name on frontend and backend: `dataprolms/src/reports_manager` and `server/reports_manager`
2. Files inside: `reports_manager.jsx`, `reports_controller.js`, `reports_service.js`, `reports_routes.js`
3. Component: `function Reports_Manager()`
4. Helpers: `function load_reports()`
5. Route: `/api/reports_manager` and `#/admin_dashboard/reports_manager`
6. Add `requirements.md` in the new folder (who, must do, done). Update the root `REQUIREMENTS.md` index.
7. Open a pull request. Naming is checked in review against this standard.

---

## 10. Pull request check

A PR is not ready if it contains:

- a folder with `-` or mashed words (`studentprofile`)
- a source file named `SomethingLikeThis.jsx`
- a new function named `likeThis`
- a new CSS class named `.like-this` (our classes only — package classes stay as shipped)
- `padding` on `.dpm-dash__main` inside a feature CSS file
- a package selector snake_cased (for example `.dpm_select` instead of `.dpm-select`, or `.gds_toolbar_search` instead of `.gds-toolbar__search`)
- a new module folder with no `requirements.md`

Fix the name before merge. Do not “fix it later”.
