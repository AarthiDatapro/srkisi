# admin_home — requirements (frontend)

**Pair:** `server/admin_home`  
Update this file in the same PR when this module changes.

## Who

Any signed-in employee.

## Screen

`#/admin_dashboard`

## Must do

- Show the header, the welcome line, and the KPI cards.
- Show quick jumps to the screens this person can view, so they can open a screen without the menu.
- Hide a jump when the person does not have **view** access. The search box filters the jumps.
- Main padding from `design_system/shell.css` only. Package shell classes stay as shipped.

## Component layout

`Admin_Home` (`admin_home.jsx`) is the container: it owns `get_admin_home()` fetching, loading/error toast, search filtering, session/access checks, and passes data down as props.

Presentational pieces (snake_case files under `ui/`, matching other feature modules):

| File | Component | Role |
|---|---|---|
| `ui/dashboard_header.jsx` | `Dashboard_Header` | Search + user chip |
| `ui/dashboard_hero.jsx` | `Dashboard_Hero` | Title + live date |
| `ui/kpi_cards.jsx` | `Kpi_Cards` | KPI strip from `kpis` |
| `ui/icons/*` | `Search_Icon`, `Users_Icon`, … | Existing SVG icons |
| `utils/formatters.js` | — | `initials`, `format_count` |

Auth (`can`, `ACCESS`, `SCREEN`, `admin_screen_path`) stays in `Admin_Home`. A jump calls `on_navigate` with that screen path. CSS remains `theme/home.css` with `ah_*` classes.

## Done when

- Home loads with the header, welcome line, and KPI cards.
- Quick jumps open only screens the person can view.
- A search with no match explains that no page matched.
- Load error is shown.
