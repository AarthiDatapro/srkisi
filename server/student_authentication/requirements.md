# student_authentication — requirements (backend)

**Pair:** `dataprolms/src/student_authentication`  
Update this file in the same PR when this module changes.

## Who

Guest (register, login, forgot password). Student session after login.

## APIs

- `POST /api/auth/student/register`
- `POST /api/auth/student/login`
- `/api/auth/student/forgot_password` (package router)

## Must do

- Create a student (optional photo). Return the student ID.
- Check email + password and start a student session.
- Let the student reset a password through the forgot-password flow.
- Reject bad or missing input with a clear error.

## Done when

- Valid register/login works and sets auth cookies.
- Invalid credentials or validation errors return an error body, not a 500 with no message.
- Forgot-password can update the password for a known email.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

