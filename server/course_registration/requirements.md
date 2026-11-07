# course_registration — requirements (backend)

**Pair:** `dataprolms/src/course_registration` (catalog UI) and `dataprolms/src/my_courses` (enrollment list).  
Update this file in the same PR when this module changes.

## Who

Student session required.

## APIs (main)

- Catalog / programs / course details / register / wishlist
- `GET /api/student/my_courses`
- `POST /api/student/my_courses/:courseId/access`

## Must do

- List programs and courses a student can browse.
- Enroll a student (offline courses need a valid enroll code).
- Wishlist add/remove.
- Return the student's enrollments and allow access to start learning.

## Done when

- Enroll succeeds only when rules pass (including enroll code for offline).
- My-courses returns this student's list only.
- Failures return an error body.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

