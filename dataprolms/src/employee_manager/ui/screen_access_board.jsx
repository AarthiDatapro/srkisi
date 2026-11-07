import { ACCESS, ADMIN_SCREENS, SCREEN } from "../../employee_authentication/screen_access.js";
import { EMPLOYEE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/employee_manager_constants_english.js";

const LEVELS = [
{ value: "", get label() { return ENGLISH.off; }, get note() { return ENGLISH.hidden_from_their_navbar; } },
{ get value() { return ACCESS.view; }, get label() { return ENGLISH.view; }, get note() { return ENGLISH.can_open_cannot_change; } },
{ get value() { return ACCESS.edit; }, get label() { return ENGLISH.edit; }, get note() { return ENGLISH.full_create_change_and_delete; } }];


function Performance_Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 18V8M10 18V5M15 18v-7M20 18V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>);

}

function Programs_Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Courses_Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 6.5h11.5A2.5 2.5 0 0 1 19 9v10.5H7.5A2.5 2.5 0 0 1 5 17V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6" />
      
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Employees_Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.2 18.5c.6-3 2.5-4.7 4.8-4.7s4.2 1.7 4.8 4.7" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Jobs_Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

function Dropdowns_Mark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h10" stroke="currentColor" strokeWidth="1.6" />
    </svg>);

}

const SCREEN_MARKS = {
  [SCREEN.performance]: Performance_Mark,
  [SCREEN.programs]: Programs_Mark,
  [SCREEN.courses]: Courses_Mark,
  [SCREEN.employees]: Employees_Mark,
  [SCREEN.jobs]: Jobs_Mark,
  [SCREEN.dropdowns]: Dropdowns_Mark
};

function level_for(access) {
  return LEVELS.find((level) => level.value === access) || LEVELS[0];
}

function set_screen(values, screen_id, access) {
  return {
    ...values,
    screens: {
      ...values.screens,
      [screen_id]: access
    }
  };
}

export function Screen_Access_Board({ values, on_change }) {
  const assigned = ADMIN_SCREENS.filter((screen) => values.screens?.[screen.id]);
  const edit_count = assigned.filter((screen) => values.screens?.[screen.id] === ACCESS.edit).length;
  const view_count = assigned.length - edit_count;

  function grant_all(access) {
    on_change({
      ...values,
      screens: Object.fromEntries(ADMIN_SCREENS.map((screen) => [screen.id, access]))
    });
  }

  return (
    <section className="emp_access">
      <div className="emp_access_bar">
        <p>
          {assigned.length ?
          ENGLISH.open_edit_view(assigned.length, edit_count, view_count) :
          ENGLISH.no_screens_in_their_navbar_yet}
        </p>
        <div className="emp_access_presets">
          <button type="button" onClick={() => grant_all("")}>{ENGLISH.none}</button>
          <button type="button" onClick={() => grant_all(ACCESS.view)}>{ENGLISH.view_all}</button>
          <button type="button" onClick={() => grant_all(ACCESS.edit)}>{ENGLISH.edit_all}</button>
        </div>
      </div>

      <ul className="emp_access_board">
        {ADMIN_SCREENS.map((screen) => {
          const access = values.screens?.[screen.id] || "";
          const level = level_for(access);
          const Mark = SCREEN_MARKS[screen.id];
          const tone = access === ACCESS.edit ? "edit" : access === ACCESS.view ? "view" : "off";
          return (
            <li key={screen.id} className={`emp_access_card is-${tone}`}>
              <div className="emp_access_head">
                <span className="emp_access_mark">{Mark ? <Mark /> : screen.label.slice(0, 1)}</span>
                <div>
                  <strong>{screen.label}</strong>
                  <small>{level.note}</small>
                </div>
              </div>
              <div className="emp_access_levels" role="radiogroup" aria-label={ENGLISH.access(screen.label)}>
                {LEVELS.map((item) => {
                  const on = item.value === access;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={on ? "is_on" : undefined}
                      onClick={() => on_change(set_screen(values, screen.id, item.value))}>
                      
                      {item.label}
                    </button>);

                })}
              </div>
            </li>);

        })}
      </ul>
    </section>);

}

export function Screen_Access_Summary({ screens = [], empty_label = ENGLISH.no_admin_screens_assigned }) {
  const list = Array.isArray(screens) ? screens : [];
  const rows = ADMIN_SCREENS.map((screen) => {
    const access = list.find((item) => item.id === screen.id)?.access;
    return { ...screen, access };
  }).filter((screen) => screen.access);

  if (!rows.length) {
    return <p className="emp_access_empty">{empty_label}</p>;
  }

  return (
    <ul className="emp_access_summary">
      {rows.map((screen) =>
      <li key={screen.id} className={screen.access === ACCESS.edit ? "is_edit" : "is_view"}>
          <b>{screen.label}</b>
          <span>{screen.access === ACCESS.edit ? ENGLISH.edit : ENGLISH.view}</span>
        </li>
      )}
    </ul>);

}
