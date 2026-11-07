# my_courses — requirements

**Where:** `dataprolms/src/my_courses`. API lives in `server/course_registration`.  
Update this file in the same PR when this module changes.

## Who

Student (signed in).

## Screen

`#/dashboard/courses`

## Must do

- List my enrollments.
- Filter (all / in progress / completed).
- Search and sort.
- Start or continue a course.
- Naming block (`.myc_title`) keeps a left inset (`padding-left: 16px`) so the title lines up with cards below — same rhythm as catalog `.crg_top h1`.
- Main padding comes from `design_system/shell.css` only (do not set `.dpm-dash__main` padding in `theme/my_courses.css`).

## Done when

- Empty list explains they have not enrolled.
- Start/continue opens learning (`#/dashboard/learn/{course_id}`).
- Errors show a toast, not a silent blank page.
- Title / subtitle left edge is not flush against the content edge relative to the white cards.
