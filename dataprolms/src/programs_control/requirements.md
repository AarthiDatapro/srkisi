# programs_control — requirements (frontend)

**Pair:** `server/programs_control`  
Update this file in the same PR when this module changes.

## Who

Employee with admin screen `programs` **view**. Create/edit/delete needs **edit**.

## Screen

`#/admin_dashboard/programs`

## Must do

- List, search, create, edit programs.
- Activate / deactivate / delete.
- Assign courses. See students and faculty. Faculty are chosen on Edit Program.
- Upload a thumbnail. Open a course’s content.
- Main padding from `design_system/shell.css` only. Package `Select` / shell classes stay as shipped (`.dpm-select`, `.dpm-dash`).

## Done when

- Empty: no programs yet.
- View-only cannot change data.
- Create/update/delete confirm.
- Assigned courses, students, and faculty lists can be empty and still be clear.
