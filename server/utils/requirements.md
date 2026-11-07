# utils — requirements

**Where:** `server/utils`. Shared backend helpers. Not a menu screen.  
Update this file in the same PR when this module changes.

## Who

All backend modules. Frontend also imports `admin_screens.js` (Vite alias `@admin_screens`).

## Must do

- Database pool and connect (`db_setup.js`).
- Admin screen ids and access helpers (`admin_screens.js`, `screen_access.js`).
- Session refresh (`auth_refresh.js`).
- Assignment scope (which courses/programs a staff member may see).
- Storage bucket names and uploads (`storage_buckets.js`).
- AI backend URL and quiz chat proxy.

## Done when

- `GET /health` can ping the database through this pool.
- Frontend and backend use the **same** admin screen ids.
- Bucket names stay snake_case (`course_content`, `daily_reports`) and match Supabase.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

