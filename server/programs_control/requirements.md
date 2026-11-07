# programs_control — requirements (backend)

**Pair:** `dataprolms/src/programs_control`  
Update this file in the same PR when this module changes.

## Who

Employee with `programs` **view**. Mutations need **edit**.

## APIs

Program list/get/create/update/activate/deactivate/delete, image, assign courses (see `program_routes.js`).

## Must do

- CRUD programs and thumbnails.
- Assign courses to a program.
- Assign faculty to a program and return that list. Students stay related through course enrollment.
- Block view-only staff from writes.

## Done when

- View works with `view`. Writes fail without `edit`.
- Delete/activate/deactivate are explicit and confirmed by the client.
- Invalid ids return a clear error.

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

