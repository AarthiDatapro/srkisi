# student_authentication — requirements (frontend)

**Pair:** `server/student_authentication`  
Update this file in the same PR when this module changes.

## Who

- Guest: login, register, forgot password.
- Student: dashboard shell after login.

## Screen

`#/login` · `#/register` · `#/forgot_password` · shell `#/dashboard`

## Must do

- Register (optional photo). Show the new student ID.
- Sign in with email and password.
- Reset password by email.
- After login, show Home / My Courses / Programs & Courses / Profile / Logout.
- Package UI classes on auth screens stay as shipped (for example `.dpm-login-submit__link`, `.ui-field`). Do not snake_case them in JSX or CSS.

## Done when

- Good login goes to `#/dashboard`.
- Bad input shows an error (not a blank page).
- Register shows the new student ID.
- Logout returns to `#/login`.
- Forgot-password / secondary links keep package styles (not unstyled text).
