# dropdown_manager — requirements (backend)

**Pair:** `dataprolms/src/dropdown_manager`  
Update this file in the same PR when this module changes.

## Who

Employee with `dropdowns` **view**. Mutations need **edit**. Other employee screens **read** these lists for forms.

## APIs

Dropdown catalog read + item create/update/activate/deactivate/delete (see `dropdown_routes.js`).

## Must do

- Serve the option catalogs used by program, course, and employee forms.
- Let an editor add/edit/activate/deactivate/delete options.

## Done when

- Catalog read works for allowed staff.
- Writes require `dropdowns` **edit**.
- Inactive options are not offered as new choices (existing records may still show the old label).

## Naming

Follow root `CODING_STANDARD.md`. Leave browser APIs and third-party names unchanged (for example `setTimeout`, `ResizeObserver`, Intl `"2-digit"`).

