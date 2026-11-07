# employee_manager — requirements (backend)

**Pair:** `dataprolms/src/employee_manager`  
Update this file in the same PR when this module changes.

## Who

Employee with `employees` **view**. Mutations need **edit**.

## APIs

Employee list/get/create/update/delete, photo, screen permissions (see `employee_routes.js`).

## Must do

- CRUD employees and photos.
- Save which admin screens each person may `view` or `edit`.
- Activate / deactivate.

## Done when

- Access list persists and comes back on login (`/api/auth/employee/me`).
- View-only cannot write.
- Validation errors (email, password, required fields) are returned clearly.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

