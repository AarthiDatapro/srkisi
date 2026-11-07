# screen_starter — template (not a live screen)

**Copy this folder.** Rename the copy to the new feature name. That name must match the backend folder.

This folder is not mounted in `app.jsx`. Do not ship it as a menu item.

## How to copy

1. Duplicate `dataprolms/src/screen_starter/` to `dataprolms/src/your_feature/`.
2. Rename files: `your_feature.jsx`, `theme/your_feature.css`.
3. Rename the component to `Your_Feature` (capital parts, underscores).
4. Change the CSS prefix from `scr_` to a short prefix for that screen.
5. Point `api.js` at real `/api/...` routes. Keep using `api_client.js`.
6. Add `server/your_feature/` with the same folder name.
7. Write real `requirements.md` on both sides in the same PR.
8. Register the route in `app.jsx` (and admin screen access if it is an employee screen).

## Must do

- CSS uses `--lms-*` tokens only for brand, page, and text.
- `@media` uses only **800px** and **1100px** (`design_system/breakpoints.js`).
- Do not import another feature’s CSS. Shared admin forms use `admin_ui/theme/admin_forms.css`.
- Do **not** set `padding` on `.dpm-dash__main`. Use `--lms-shell-pad` on `.dpm-dash:has(.your_desk)` if this screen needs a different pad (`design_system/shell.css`).
- Leave `@datapromr/*` class names as shipped (`.dpm-dash`, `.dpm-select`, `.ui-*`).
- Check the screen at ~390px, ~900px, and ~1280px (including title / naming left inset).

## Done when

- The copy has no leftover `screen_starter` / `scr_` names.
- Empty, error, and view-only states are defined in requirements.
- Shell pad and package selectors follow `design_system/requirements.md` and `CODING_STANDARD.md`.
