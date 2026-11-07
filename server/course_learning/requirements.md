# course_learning — requirements (backend)

**Pair:** `dataprolms/src/course_learning`  
Update this file in the same PR when this module changes.

## Who

Student session. Student must be enrolled in the course.

## APIs (main)

- `GET /api/student/learn/:courseId`
- complete lesson, save feedback
- get / submit quiz

## Must do

- Return the course outline and lesson content for an enrolled student.
- Notes HTML pages come from extracted ZIP content on each lesson.
- Record lesson complete and lesson feedback.
- Serve quiz questions and accept a submit; return a score.
- Reject students who are not enrolled.

## Done when

- Enrolled student can load, complete, feedback, and quiz.
- Unenrolled student gets an error, not another student's data.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

