# ai — requirements

**Where:** `server/ai`. Talks to `server/services` and `aipipe`.  
Update this file in the same PR when this module changes.

## Who

Signed-in student or employee (help chat). Not a menu screen.

## APIs

- `POST /api/ai/chat`
- `POST /api/student/ai/chat`

## Must do

- Stream a course-aware help answer for the signed-in user.

## Done when

- Chat returns an answer or a clear failure.
- Guest cannot call these routes.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

