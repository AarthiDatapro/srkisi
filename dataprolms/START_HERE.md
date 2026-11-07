# Start here — build a feature in Datapro LMS

Hand this file to a new developer.  
It is the **process** guide. Naming rules live in `../CODING_STANDARD.md`. Product scope lives in `../REQUIREMENTS.md`.

---

## 1. Read these first (in this order)

| # | File | Why |
|---|---|---|
| 1 | This file (`dataprolms/START_HERE.md`) | How to start and what to create |
| 2 | `../CODING_STANDARD.md` | How to name everything |
| 3 | `../REQUIREMENTS.md` | Who / Screen / Must do / Done for each module |
| 4 | `src/design_system/requirements.md` | Shell padding, breakpoints, tokens, package CSS classes |
| 5 | `src/screen_starter/` | Template folder you copy for a new screen |

Do **not** invent a new folder layout. Copy an existing pattern.

---

## 2. Restrictions — keep other modules safe

Your feature must stay **isolated**. If you ignore these, other screens break (blank pages, wrong padding, dead icons, shared API failures).

### 2.1 Where you may edit

| Allowed | Examples |
|---|---|
| Your feature folder only (frontend) | `dataprolms/src/<feature_name>/**` |
| Your feature folder only (backend) | `server/<feature_name>/**` |
| Tiny wire-up lines (add import + route/mount only) | `src/app.jsx`, `server/server.js` |
| Admin menu ids (add your screen id only) | `server/utils/admin_screens.js`, `src/employee_authentication/screen_access.js` |
| Student/employee menu entry for your screen only | The dashboard menu file that lists links |
| Your module docs + root index row | `requirements.md` (both sides), one section in `../REQUIREMENTS.md` |
| New SQL for **your** tables/columns | `server/sqls/` — new files or additive alters only |

### 2.2 Where you must NOT edit (unless lead asks)

| Do not touch | Why |
|---|---|
| Another feature’s folder (`my_courses`, `programs_control`, …) | Breaks that module |
| `src/design_system/*` for feature look-and-feel | Shared by every screen |
| `src/design_system/shell.css` padding values “just for my screen” | Use `--lms-shell-pad` on `.dpm-dash:has(.your_desk)` instead |
| `src/admin_ui/` except **using** shared form CSS | Platform shell for all admin screens |
| `src/validation/` / `server/utils/` / `server/services/` | Shared; change only with lead approval |
| `src/api_client.js` behavior | Every feature depends on it |
| `@datapromr/*` package files / `node_modules` | Not our code |
| Another feature’s API paths or DB tables “while I’m here” | Side effects across modules |
| Global renames across the repo | Causes SVG/package/class collisions |

**Rule:** open a PR that only contains your feature folder + the minimal wire-up lines above. If the diff touches three other features, stop and split the work.

### 2.3 Frontend isolation

| Restriction | Detail |
|---|---|
| No cross-feature CSS import | Do not `@import` or import `../other_feature/theme/...`. Shared admin forms → `admin_ui/theme/admin_forms.css` only. |
| Unique CSS prefix | Your classes start with your prefix (`.rpt_…`). Never reuse `.myc_`, `.crg_`, `.crs_`, `.prg_`, `.ccm_`, `.emp_`, `.ddm_`, `.lrn_`, `.shd_`, `.stp_`. |
| No global element restyles | Do not style bare `h1`, `button`, `input`, `body`, `html` in feature CSS. Scope under `.your_desk`. |
| No `.dpm-dash__main { padding }` | Shell pad is global. Override only with `--lms-shell-pad` on your desk. |
| Do not rename package classes | `.dpm-dash`, `.dpm-select`, `.ui-*`, `.gds-*`, `.ub-*`, `.gff-*` stay as shipped — in CSS **and** JSX. |
| Do not rename package props | `onClick`, `onChange`, `variant` on `@datapromr/*` components stay camelCase. `on_click` on `Action_Button` makes row actions dead. |
| Do not import another feature’s `ui/` or `utils` casually | Prefer duplicate small helpers in your `utils.js`, or ask lead to move a true shared helper to `validation` / `admin_ui`. |
| One desk root | Root element like `<section className="rpt_desk">`. Shell `:has(.rpt_desk)` and your CSS both key off that. |

### 2.4 Backend isolation

| Restriction | Detail |
|---|---|
| Own URL prefix | Only mount paths for your feature (e.g. `/api/reports_manager/...`). Do not add handlers onto another feature’s paths. |
| Own service / controller | Do not edit `program_service.js` to “quickly” serve your screen. Call their **HTTP API** from the frontend, or ask lead for a shared util. |
| No drive-by schema edits | Do not alter columns used by other modules. Add new tables/columns in `server/sqls/` with clear names; document in your `requirements.md`. |
| Auth stays correct | Student routes → student session. Employee routes → employee + `view_access` / `edit_access` for **your** screen id. Do not weaken another screen’s middleware. |
| Mount only your router | In `server.js`, add one `mount_…(app)` line. Do not rearrange other mounts. |

### 2.5 Shared files — how to touch them safely

When you must edit a shared file, change **only** the lines for your feature:

| File | Allowed change | Forbidden |
|---|---|---|
| `src/app.jsx` | Import your screen + one route branch | Refactor routing, rename other screens |
| `server/server.js` | One import + one `mount_…(app)` | Reorder/remove other mounts |
| `admin_screens.js` / `screen_access.js` | Append your screen id/label | Rename/remove existing ids |
| `../REQUIREMENTS.md` | Add/update **your** section | Rewrite unrelated modules |
| `server/sqls/*` | Additive SQL for your need | Drop/rename columns other features use |

### 2.6 Before you open a PR — isolation check

- [ ] `git diff` shows almost only `dataprolms/src/<feature_name>/` and `server/<feature_name>/`
- [ ] Shared files only gained lines for this feature (no unrelated deletions)
- [ ] No other feature’s CSS classes or API routes changed
- [ ] AppShell / package class names untouched
- [ ] Another screen (e.g. My Courses or Programs) still loads after your change

---

## 3. Only places to look for reference

Use these — do not copy random files from every feature.

| Look here | For |
|---|---|
| `src/screen_starter/` | Blank screen template (copy this first) |
| `src/design_system/` | Tokens, shell pad, responsive CSS (shared — do not put feature CSS here) |
| `src/my_courses/` | Simple **student** screen (jsx + api + theme + ui + constants) |
| `src/course_manager/` | Typical **admin** screen (table, form, details, columns) |
| `../server/programs_control/` | Typical backend feature (`routes` → `controller` → `service`) |
| `src/api_client.js` | How every feature calls the API (always import this) |
| `../server/utils/send_error.js` | How controllers return errors |

**Reference means read / copy pattern — not edit.** Looking at `my_courses` does not mean changing `my_courses`.

Platform folders (do **not** put your feature logic inside them):

- `src/design_system/` — shared CSS only  
- `src/admin_ui/` — shared admin shell / forms CSS  
- `src/validation/` — shared validators  
- `../server/utils/` — shared server helpers  
- `../server/sqls/` — SQL schema files  
- `../server/services/` — shared services  

---

## 4. Naming (short)

Full rules: `../CODING_STANDARD.md`.

- Feature folder (frontend **and** backend): `snake_case` — same name both sides, e.g. `reports_manager`
- Screen file: `reports_manager.jsx`
- Component: `Reports_Manager`
- Functions / variables: `load_reports`, `course_id`
- Constants: `COPY`, `TABS`, `MAX_ROWS`
- Our CSS classes: `.rpt_desk`, `.rpt_title` (pick a short prefix **unused by other features**)
- Routes we own: `#/dashboard/reports_manager`, `/api/reports_manager`
- **Never rename** package / browser names: `useState`, `setTimeout`, `.dpm-dash`, `.dpm-select`, SVG path numbers like `5-5`

---

## 5. Where to start developing

```text
Repo root
├── dataprolms/          ← frontend (React + Vite) — YOU START IN src/
│   └── src/
│       └── your_feature/   ← create your feature folder here
└── server/              ← backend (Node) — same feature folder name
    └── your_feature/
```

1. Work under **`dataprolms/src/`** for UI.  
2. Work under **`server/`** for APIs (same folder name).  
3. Do not create a parallel tree under `dataprolms/components/` or similar — features live as **one folder per feature**.

---

## 6. Create the frontend feature folder

### Step A — copy the template

```text
Copy:  dataprolms/src/screen_starter/
To:    dataprolms/src/<feature_name>/
```

Example: `dataprolms/src/reports_manager/`

Rename every leftover `screen_starter` / `scr_` name to your feature / prefix.

### Step B — folders inside a feature

#### Must create (every screen)

| Folder / file | Purpose |
|---|---|
| `<feature_name>/` | Feature root. Name matches backend. |
| `<feature_name>.jsx` | Main screen component. Start the UI here. |
| `index.js` | Re-exports the screen for `app.jsx`. |
| `api.js` | All HTTP calls for this feature (uses `../api_client.js`). |
| `theme/` | Feature CSS only. |
| `theme/<feature_name>.css` | Styles for this screen. Import from the jsx. |
| `requirements.md` | Who / Screen / Must do / Done. Update in the same PR. |

#### Usually create (most features)

| Folder / file | Purpose |
|---|---|
| `constants.js` | Copy text, tabs, labels, fixed option lists. Write these early. |
| `utils.js` | Small helpers used only by this feature. |
| `ui/` | Child components (cards, forms, rows, icons). Keep the main jsx thin. |

#### Create when needed (look at existing features)

| Folder / file | When |
|---|---|
| `ui/icons.jsx` | Screen has custom SVG icons. **Do not** turn hyphens inside path `d` into `_`. |
| `columns.js` | Admin datagrid column config (see `course_manager`, `programs_control`). |
| Extra files under `ui/` | Forms, details panels, tables, pickers. |
| Extra CSS under `theme/` | Only if one file would become huge (rare; prefer one CSS file). |

#### Do **not** create

| Avoid | Why |
|---|---|
| `components/`, `hooks/`, `store/`, `styles/` | Not our layout. Use `ui/`, `theme/`, feature-root files. |
| Feature CSS inside `design_system/` | Shared only — disturbs every module. |
| Padding rules on `.dpm-dash__main` | Owned by `design_system/shell.css`. |
| Importing another feature’s CSS | Disturbs / couples modules. Shared admin forms → `admin_ui/theme/admin_forms.css`. |

### Step C — suggested order of writing frontend code

1. **`requirements.md`** — fill Who / Screen / Must do / Done (even if draft).  
2. **`constants.js`** — titles, empty messages, tab ids, labels.  
3. **`api.js`** — list/get/create/update functions pointing at `/api/...` (can stub until backend exists).  
4. **`<feature_name>.jsx`** — page shell: desk class, title, loading / empty / error.  
5. **`theme/<feature_name>.css`** — layout + prefix classes; use `--lms-*` tokens.  
6. **`ui/*.jsx`** — break out cards / forms when the main file grows.  
7. **`index.js`** — export the screen.  
8. **Wire route** in `src/app.jsx` (and student/employee menu if needed).

### Frontend file map (example: `reports_manager`)

```text
dataprolms/src/reports_manager/
├── requirements.md
├── index.js                 ← export { Reports_Manager } from "./reports_manager.jsx"
├── reports_manager.jsx      ← main screen
├── constants.js             ← COPY, TABS, …
├── api.js                   ← list_reports(), create_report(), …
├── utils.js                 ← format helpers (optional)
├── columns.js               ← admin grid columns (optional)
├── theme/
│   └── reports_manager.css  ← .rpt_desk, .rpt_title, …
└── ui/
    ├── report_card.jsx      ← child UI (optional)
    ├── report_form.jsx
    └── icons.jsx
```

---

## 7. Create the backend feature folder

Same name as the frontend folder.

```text
server/<feature_name>/
```

### Must create (feature with APIs)

| File | Purpose |
|---|---|
| `requirements.md` | Backend Who / APIs / Must do / Done. |
| `*_routes.js` | Mount paths on `app` (`mount_<feature>`). Auth + access middleware. |
| `*_controller.js` | Read `req`, call service, send JSON or `send_error`. |
| `*_service.js` | Business logic + SQL / DB. |

Name pattern examples from the repo:

| Feature folder | Routes | Controller | Service |
|---|---|---|---|
| `programs_control` | `program_routes.js` | `program_controller.js` | `program_service.js` |
| `course_manager` | `course_routes.js` | `course_controller.js` | `course_service.js` |
| `student_profile` | `profile_routes.js` | `profile_controller.js` | `profile_service.js` |

Use a short noun that matches the API (`program_`, `course_`, `profile_`), still snake_case.

### Create when needed

| File | When |
|---|---|
| `schema.js` | Feature needs ensure-table / migration helpers. |
| `*_image.js` / upload helpers | Photos or files (see `employee_manager`, `programs_control`). |
| Extra `*_service.js` | Large domains split (e.g. content has `quiz_service.js`). |

### Do **not** create under the feature

| Avoid | Put it here instead |
|---|---|
| Shared DB pool / CSRF / mail | `server/utils/` (lead approval to change) |
| New SQL table definitions | `server/sqls/` (same PR as code) |
| Random `helpers/` with no name match | Keep helpers next to the service or in `utils.js` only if frontend |

### Backend layers (always this direction)

```text
routes  →  controller  →  service  →  database
              ↓
         send_error() on failure
```

- **Routes:** path, method, `requireRole`, `view_access` / `edit_access`  
- **Controller:** thin — no heavy SQL  
- **Service:** rules + queries  

### Wire the backend

1. Export `mount_<name>(app)` from `*_routes.js`.  
2. Import and call it from `server/server.js` (same pattern as existing mounts).  
3. Paths use snake_case we own, e.g. `/api/reports_manager`.  
4. Student APIs need a student session; employee APIs need employee session + screen access.

---

## 8. Wire-up checklist (frontend + backend)

### Frontend

- [ ] Folder under `dataprolms/src/<feature_name>/`
- [ ] `index.js` exports the screen component
- [ ] Route registered in `src/app.jsx`
- [ ] Student menu **or** employee menu shows the entry (if it is a menu screen)
- [ ] Admin screen: id added in `server/utils/admin_screens.js` **and** `src/employee_authentication/screen_access.js` (keep them in sync)
- [ ] CSS uses a desk root (e.g. `.rpt_desk`) and `--lms-*` tokens
- [ ] No `.dpm-dash__main { padding: … }` in feature CSS
- [ ] Package classes left as shipped (`.dpm-dash`, `.dpm-select`, `.ui-*`)
- [ ] Checked at ~390px, ~900px, ~1280px
- [ ] Isolation check in §2.6 passed

### Backend

- [ ] Folder `server/<feature_name>/` (same name)
- [ ] `routes` → `controller` → `service`
- [ ] Mounted from `server/server.js`
- [ ] Errors go through `send_error`
- [ ] SQL changes in `server/sqls/` if schema changed
- [ ] No edits inside another feature’s server folder

### Docs (same PR)

- [ ] `dataprolms/src/<feature_name>/requirements.md`
- [ ] `server/<feature_name>/requirements.md` (if backend exists)
- [ ] Root `REQUIREMENTS.md` index section added/updated

---

## 9. What each common frontend file is for

| File | Write here | Do not put here |
|---|---|---|
| `constants.js` | Labels, empty copy, tab ids, fixed enums | API calls, JSX |
| `api.js` | `fetch` via `api_client` only | UI state, CSS |
| `<feature>.jsx` | Screen layout, state, wiring children | Huge markup (move to `ui/`) |
| `utils.js` | Pure helpers (format date, initials) | React components |
| `theme/*.css` | This feature’s look | Global shell pad, other features’ classes |
| `ui/*.jsx` | Reusable pieces for this feature only | Shared across all apps (that belongs in packages / `admin_ui`) |
| `columns.js` | Grid column defs | Fetch logic |

---

## 10. What each common backend file is for

| File | Write here | Do not put here |
|---|---|---|
| `*_routes.js` | `app.get/post/...`, middleware, mount function | SQL |
| `*_controller.js` | Parse params/body, call service, `res.json` / `send_error` | Business rules |
| `*_service.js` | Validation rules, DB queries, transactions | `res` / Express objects |
| `schema.js` | Ensure columns/tables for this feature | HTTP handlers |
| `requirements.md` | API list + done criteria | Implementation notes that belong in code comments |

---

## 11. Student screen vs admin screen

| | Student | Employee (admin) |
|---|---|---|
| Shell | Student dashboard in `student_authentication` | `admin_ui` / employee dashboard |
| Route example | `#/dashboard/<feature>` | `#/admin_dashboard/<screen_id>` |
| Access | Student session | `view` / `edit` per screen id |
| Good reference | `my_courses`, `student_home` | `course_manager`, `programs_control` |
| Extra step | Add item to student menu | Register screen id in `admin_screens` + `screen_access` |

---

## 12. Do / Don’t (quick)

**Do**

- Copy `screen_starter` then rename.  
- Keep frontend and backend folder names identical.  
- Put API calls only in `api.js`.  
- Keep the PR inside your feature folder + minimal wire-up.  
- Use toasts or visible empty/error states (never a silent blank page).  

**Don’t**

- Edit other feature folders “for convenience”.  
- Import another feature’s CSS or depend on their private `ui/` without lead approval.  
- Reuse another screen’s CSS prefix.  
- Snake_case package CSS or browser APIs.  
- Collapse BEM modifier + element into one class (`ccm_block_is_quiz` vs `ccm_block_quiz`).  
- Rewrite SVG path hyphens (`5-5` must stay `5-5`).  
- Set AppShell main padding in feature CSS.  
- Change shared utils / shell / `api_client` without lead approval.  
- Skip `requirements.md` updates.

---

## 13. One-line summary for the new joinee

> Start in `dataprolms/src`, copy `screen_starter` to a snake_case feature folder, add `theme` + `api` + `constants` (+ `ui` as needed), build the matching `server/<same_name>` with routes → controller → service, mount both sides with **minimal shared-file edits**, never touch other modules, and update requirements in the same PR.
