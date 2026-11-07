# admin_ui — requirements

**Where:** `dataprolms/src/admin_ui` only. Not a menu screen.  
Update this file in the same PR when this module changes.

## Who

Platform — used by employee screens.

## Screen

None.

## Must do

- Shared admin shell (`App_Shell`).
- Shared row actions (view / edit / delete / power icons).
- Shared admin form/details CSS (`theme/admin_forms.css`) used by programs, courses, employees, and dropdowns.
- Main padding comes from `design_system/shell.css` — admin feature themes do not set `.dpm-dash__main` padding.

## Done when

- Admin screens can reuse these without copying markup.
- Feature screens do not import `programs.css` for forms.
- Package prop names and CSS classes on `@datapromr/*` stay as the package defined them.
