# employee_manager — requirements (frontend)

**Pair:** `server/employee_manager`  
Update this file in the same PR when this module changes.

## Who

Employee with admin screen `employees` **view**. Mutations need **edit**.

## Screen

`#/admin_dashboard/employees`

## Must do

- Staff directory: create, edit, details, photo.
- Set per-screen access (`view` / `edit`).
- Activate / deactivate / delete.
- Main padding from `design_system/shell.css` only. Package `Select` / shell / DataGrid classes stay as shipped (`.dpm-select`, `.dpm-dash`, `.gds-toolbar__search`, `.ub-table-wrap` — never snake_case them).
- Compact/mobile toolbar: search must expand (`flex: 1` on `.gds-toolbar__search`).

## Done when

- Empty directory explained.
- Validation errors show.
- Access saved on the employee.
- View-only cannot change records.
- On phone/compact width, DataGrid search fills the toolbar (not a narrow stub with empty space).
