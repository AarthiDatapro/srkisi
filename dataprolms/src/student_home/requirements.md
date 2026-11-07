# student_home — requirements

**Where:** `dataprolms/src/student_home` only. Data comes from `my_courses` and `student_profile` APIs.  
Update this file in the same PR when this module changes.

## Who

Student (signed in).

## Screen

`#/dashboard`

## Must do

- Show enrolled courses, continue learning, and simple progress.
- Recommend up to three open jobs by matching the signed-in student's profile skills and career details to existing jobs.
- Open a course, the catalog, or profile.
- Welcome / header naming (`.shd_header`) keeps a left inset (`padding-left: 8px`).
- Main padding comes from `design_system/shell.css` only (do not set `.dpm-dash__main` padding in `theme/home.css`).

## Done when

- Data or empty messages show (for example no enrolled courses).
- A failed load shows an error.
- Recommendations include only existing open jobs and link to the student jobs screen.
- Continue opens `#/dashboard/learn/{course_id}`.
