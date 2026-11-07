# student_profile — requirements (backend)

**Pair:** `dataprolms/src/student_profile`  
Update this file in the same PR when this module changes.

## Who

Student session. The student may only read/update **their own** profile.

## APIs

Profile get, profile update, photo update (see `profile_routes.js`).

## Must do

- Return the signed-in student's profile.
- Save allowed fields.
- Store a new photo when uploaded.

## Done when

- Get/update/photo work for the session student.
- Another student's id cannot be used to change someone else.
- Validation errors are returned clearly.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

