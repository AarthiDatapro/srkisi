# course_learning — requirements (frontend)

**Pair:** `server/course_learning`  
Update this file in the same PR when this module changes.

## Who

Student who is enrolled in the course.

## Screen

`#/dashboard/learn/{course_id}`

## Must do

- Open modules and lessons.
- View video, files, notes, overview, announcements, resources, feedback.
- Lesson tabs order: Feedback → Resources → Announcements → Overview → Notes.
- Notes: ZIP of HTML files only. Student Notes tab shows those HTML files with Previous / Next, plus view and download icon buttons, and an English / Telugu toggle. Telugu pages come from `telugu_learning_json`. Style tags in the notes page (h1–h4, p, lists, img, pre/code, table, blockquote) so plain HTML reads as a lesson. Inline icons inside a notes page stay icon-sized.
- Default tab: Feedback when the lesson has playable video; otherwise Resources.
- Place marker once on the mobile course locator as compact text (`Mod X/Y · Day X/Y`), not repeated pills on crumb/sidebar/quiz.
- Ask a Question is a floating button with a cartoon study buddy. The same buddy appears in the help chat. Quizzes stay in the course content list.
- Lesson section tabs are text-only (no icons).
- Quiz answers are held until feedback is saved: learner is locked on Feedback; quiz submits only after rating + remarks are saved.
- Mark a lesson complete. Send lesson feedback.
- Take and submit a quiz.
- Ask the AI help chat.
- Main padding from `design_system/shell.css` only; leave `@datapromr/*` classes as shipped.

## Done when

- Content loads, or “no lessons yet”.
- After quiz finish click, learner lands on Feedback; score toast appears only after feedback saves (quiz API runs then).
- Feedback saves.
- Chat answers or explains failure.
- Unenrolled / error is visible, not a blank page.
- On phone, the learner can see Mod/Day place and open the day’s quiz without hunting.
