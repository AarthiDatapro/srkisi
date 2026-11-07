# admin_home — requirements (backend)

**Pair:** `dataprolms/src/admin_home`  
Update this file in the same PR when this module changes.

## Who

Employee session.

## APIs

`GET /api/admin_home`

## Must do

- Return home KPIs and recent activity for the signed-in employee.
- Numbers must respect assignment scope (non-admin staff only see their assigned programs/courses where that rule applies).

## Done when

- Employee session can load home JSON.
- Guest cannot.
- Empty datasets are valid (zeros / empty lists), not a crash.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

