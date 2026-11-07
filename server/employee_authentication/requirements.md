# employee_authentication — requirements (backend)

**Pair:** `dataprolms/src/employee_authentication`  
Update this file in the same PR when this module changes.

## Who

Guest (login). Employee after a valid session.

## APIs

- `POST /api/auth/employee/login`
- `GET /api/auth/employee/me`

## Must do

- Check employee email + password and start an employee session.
- Return the person plus their screen access (`view` / `edit` per admin screen).
- Reject non-employees and bad credentials.

## Done when

- Valid login sets auth cookies and returns the employee + screens.
- `/me` works only with an employee session.
- Invalid login returns an error, not a crash.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

