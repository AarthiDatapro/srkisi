# course_manager — requirements (frontend)

**Pair:** `server/course_manager`  
Update this file in the same PR when this module changes.

## Who

Employee with admin screen `courses` **view**. Mutations need **edit**.

## Screen

`#/admin_dashboard/courses`

## Must do

- List, search, create, edit courses.
- Upload a course thumbnail image on create/edit.
- Assign to programs. Faculty are assigned on the program.
- Activate / deactivate / delete.
- Open content for a course.
- Main padding from `design_system/shell.css` only. Package `Select` / shell / DataGrid classes stay as shipped (`.gds-*`, `.ub-*`, `.gff-*`).

## Done when

- Empty: no courses yet.
- View-only cannot edit.
- Actions confirm.
- Open content goes to `#/admin_dashboard/courses/{course_id}/content`.
