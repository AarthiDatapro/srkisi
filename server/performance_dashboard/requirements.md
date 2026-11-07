# performance_dashboard — requirements (backend)

**Pair:** `dataprolms/src/performance_dashboard`  
Update this file in the same PR when this module changes.

## Who

Employee with `performance` **view**.

## APIs

`GET /api/performance_dashboard`

## Must do

- Return dashboard metrics, filterable by program and course.
- Enforce screen access and assignment scope.

## Done when

- Allowed employee gets JSON.
- Employee without `performance` view is rejected.
- Empty filters still return a valid payload.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

