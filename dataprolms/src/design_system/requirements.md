# design_system — requirements

**Where:** `dataprolms/src/design_system` only. Not a menu screen.  
Update this file in the same PR when this module changes.

## Who

Platform — all screens.

## Screen

None.

## Must do

- Shared colors, type, spacing, and responsive layout (desktop, tablet, student mobile).
- Global AppShell main padding and scroll mode in `shell.css`.
- Hold the CSS style guide below. New screens follow it.

## Done when

- App loads with these styles (`app.jsx` / design_system imports include `shell.css`).
- New screens use these tokens instead of one-off colors.
- Feature screens do not re-declare `.dpm-dash__main` padding.

---

## CSS style guide

This is the rule set for every LMS screen. Read it before adding or changing CSS.

### Breakpoints (only these)

| Band | Width | `@media` to copy |
|---|---|---|
| Phone | 800px and below | `(max-width: 800px)` |
| Tablet | 801px–1100px | `(min-width: 801px) and (max-width: 1100px)` |
| Desktop | above 1100px | `(min-width: 1101px)` |

Tokens live in `tokens/breakpoints.css`. Numbers for `window.matchMedia` live in `breakpoints.js`.

CSS cannot use `var()` inside `@media`. Copy **800** and **1100** exactly. Do not add 420, 480, 720, 900, 980, or 1200 in new work.

### Color and font

Use `--lms-*` tokens from `tokens/`. Do not add a new hex for brand, page, or body text.

| Token | Use |
|---|---|
| `--lms-color-brand` | Navy brand |
| `--lms-color-brand-hover` | Darker navy |
| `--lms-color-hero-start` / `--lms-color-hero-end` | Hero gradients |
| `--lms-color-page` | Light page / divider |
| `--lms-page-bg` | Dashboard dotted background |
| `--lms-color-text` | Body text |
| `--lms-color-white` | White |
| `--lms-font` | Outfit |

Hex belongs only in the token files. Feature CSS uses `var(--lms-color-brand)`, not `#1a2f7a`.

Do not restyle Learn, Content, or Hero unless product asks for a new look.

### Shell padding (change once)

AppShell main padding lives in `shell.css` as `--lms-shell-pad`. Default is applied on `.dpm-dash .dpm-dash__main`.

- Do **not** set `padding` on `.dpm-dash__main` in a feature CSS file.
- Do **not** leave empty `.dpm-dash__main { }` rules after removing old padding — delete the selector.
- To tweak one screen, set the variable on that screen’s dash (our desk class is snake_case):

```css
.dpm-dash:has(.myc_desk) {
  --lms-shell-pad: 12px 14px;
}
```

Phone / tablet pads: `--lms-shell-pad-phone`, `--lms-shell-pad-tablet` (used from `mobile.css` / `student_responsive.css` / `admin_tablet.css`).

Scrollable student/admin workspaces (auto height, not fill-viewport) are also declared in `shell.css` via `:has(.myc_desk)`, `:has(.crg_desk)`, and the other desk roots listed there.

### Naming / title inset

Page naming blocks (title + subtitle) should share a left inset with the catalog page title, not sit flush against the content edge:

- Catalog page title: `.crg_top h1` uses `padding-left: 16px`
- My Courses title: `.myc_title` uses `padding-left: 16px`
- Student home header: `.shd_header` uses `padding-left: 8px`

When you add a new student naming section, match one of these insets so titles line up with cards below.

### One CSS file per feature

Put screen styles in `feature_name/theme/feature_name.css`.

Do **not** import another feature’s CSS. Shared form/details styles live in `admin_ui/theme/admin_forms.css` (platform), not in `programs.css`.
Shared shell pad / scroll mode live in `design_system/shell.css`.

### Class names

**Our** classes: `snake_case` plus a screen prefix.

| Screen | Prefix | Example |
|---|---|---|
| Courses | `crs_` | `.crs_desk` |
| Employees | `emp_` | `.emp_form` |
| Programs | `prg_` | `.prg_rail` |
| Dropdowns | `ddm_` | `.ddm_stage` |
| Learn | `lrn_` | `.lrn_desk` |
| My Courses | `myc_` | `.myc_desk`, `.myc_title` |
| Course registration | `crg_` | `.crg_desk`, `.crg_block_head` |
| Student home | `shd_` | `.shd_container` |
| Shared admin form/details | `prg_form`, `prg_details` | in `admin_forms.css` |

CSS **properties** stay kebab-case (`font-size`).

Do **not** rename class names from `@datapromr/*` or `@designdaddy/*`. Keep them exactly as the package ships them in both CSS selectors and JSX `className`, for example:

- App shell: `.dpm-dash`, `.dpm-dash__main`, `.dpm-menubar`, `.dpm-shell`
- Select: `.dpm-select`, `.dpm-select-field`, `.dpm-select--plain`
- UI kit: `.ui-search`, `.ui-input`, `.ui-field`, `.ui-button--primary`, `.ui-modal__panel`
- Auth links: `.dpm-login-submit__link`
- DataGrid (`@designdaddy/datagrid`): `.gds-toolbar`, `.gds-toolbar__search`, `.gds-shell__grid`, `.ub-table-wrap`, `.gff-input`

If those selectors are snake_cased:

- Shell padding falls back to the package default (`36px 40px`) and screens look wrong.
- Feature rules stop matching (for example `.dpm_select` never sizes `@datapromr/select`, so level filters stretch and squeeze the naming block).
- Mobile/compact DataGrid search stays narrow (`.gds_toolbar_search` never gets `flex: 1`).

### New screen checklist

Before you call a screen done, look at it at:

1. Phone ~**390px**
2. Tablet ~**900px** (admin keeps the sidebar)
3. Desktop ~**1280px**

Also check:

- Main content uses shell pad (not double padding, not package 36/40).
- Naming / title left edge aligns with the rest of the page.
- Any `@datapromr/select` width rules target `.dpm-select`, not a snake_cased name.

Copy `dataprolms/src/screen_starter/` when you add a screen. Do not add Bootstrap, Tailwind, or SCSS.
