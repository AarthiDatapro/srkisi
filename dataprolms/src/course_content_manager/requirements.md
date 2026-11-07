# course_content_manager — requirements (frontend)

**Pair:** `server/course_content_manager`  
Update this file in the same PR when this module changes.

## Who

Employee with admin screen `courses` **view**. Mutations need **edit**.

## Screen

`#/admin_dashboard/courses/{course_id}/content`

## Must do

- **Content:** modules, lessons, items (video / material / notes / overview / announcement), reorder, preview.
- Notes items accept a ZIP of HTML files only (no link, PDF, or typed body). English and Telugu each have their own ZIP. English pages stay in `learning_json`. Telugu pages stay in `telugu_learning_json`, with `telugu_file_name` and `telugu_file_path` for the ZIP. The upload form toggles which language the ZIP is saved as.
- Create/edit/delete quizzes (including AI generate).
- **Course details:** show the cohort and the program (name, code, type, duration, dates) for each program this course belongs to.
- **Course details. Students:** pick a program first, then list, generate course student IDs, edit course id, remove (scoped to that program). Opening a course from a program locks that program.
- **Attendance:** view and save.
- **Analytics:** course and quiz sheet.
- **Daily reports:** create/edit/delete, photos, PDF.
- When building dynamic state classes, use snake_case to match feature CSS: `` `is_${status}` `` → `is_present`, not `` `is-${status}` `` → `is-present`.
- Main padding from `design_system/shell.css` only. Package `Select` / UI / shell classes stay as shipped.
- When renaming BEM to snake_case, keep modifiers distinct from elements (quiz card = `ccm_block_is_quiz`, quiz icon mark = `ccm_block_quiz`). Do not rewrite hyphens inside SVG path `d` values.

## Done when

- Empty modules explained.
- View-only cannot change structure.
- Quiz create confirms. Attendance saves.
- Reports and analytics have empty and error states.
- Back returns to the course list.
