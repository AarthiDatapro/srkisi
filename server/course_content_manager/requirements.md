# course_content_manager — requirements (backend)

**Pair:** `dataprolms/src/course_content_manager`  
Update this file in the same PR when this module changes.

## Who

Employee with `courses` **view**. Mutations need **edit**.

## APIs

Content, modules, lessons, items, quizzes, daily reports, photos, PDF (see `content_routes.js`).

## Must do

- Persist course structure (modules, lessons, lesson items, files).
- Notes items must be a ZIP containing HTML files. `notes_language=telugu` stores that ZIP in `telugu_file_path` and the extracted pages in `telugu_learning_json` on the lesson notes item. English stays in `learning_json`.
- Save the Notes ZIP in the repo-root `lms_notes` folder. If that folder is missing, fail with “storage location not existing”. Do not create the folder.
- CRUD quizzes; optional generate-from-text via aipipe.
- Daily reports with photos and PDF.
- Enforce view vs edit.

## Done when

- Structure round-trips (save then get matches).
- View-only cannot POST/PUT/DELETE.
- Quiz generate returns questions or a clear security/validation error.
- Missing course id returns an error, not an empty 200 that looks like success.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

