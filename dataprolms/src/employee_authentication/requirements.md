# employee_authentication — requirements (frontend)

**Pair:** `server/employee_authentication`  
Update this file in the same PR when this module changes.

## Who

- Guest: staff login.
- Employee: admin workspace after login.

## Screen

`#/employee_login` · `#/admin_dashboard` · `#/admin_dashboard/{screen}`

## Must do

- Staff login.
- Load which admin screens this person may `view` or `edit`.
- Hide menu items they cannot view.
- Block the page if they open a URL they are not allowed to use.
- Package auth / shell classes stay as shipped (do not snake_case them).

## Done when

- Login opens home (`#/admin_dashboard`).
- Menu only lists allowed screens.
- A denied screen says they do not have access.
- Logout returns to `#/employee_login`.
