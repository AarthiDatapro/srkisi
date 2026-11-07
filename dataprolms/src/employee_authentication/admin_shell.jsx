import "@datapromr/app-shell";
import { MenubarLogo } from "@datapromr/menubar";
import { useEffect, useState } from "react";
import { EMPLOYEE_AUTHENTICATION_ENGLISH as ENGLISH } from "../constants/english/employee_authentication_constants_english.js";

function Menu_Icon({ open }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ?
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> :
        <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="adm_nav_chev" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function holds(item, active_id) {
  return Boolean(item.children?.some((child) => child.id === active_id));
}

function find_label(items, active_id) {
  for (const item of items) {
    if (item.id === active_id) return item.label;
    const child = item.children?.find((entry) => entry.id === active_id);
    if (child) return child.label;
  }
  return ENGLISH.menu;
}

function Nav_Button({ item, active, extra = "", on_pick, children }) {
  return (
    <button
      type="button"
      className={`dpm-menubar__item${active ? " is-active" : ""}${extra ? ` ${extra}` : ""}`}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={on_pick}>
      {item.icon}
      {children}
    </button>
  );
}

export function Admin_Shell({ items = [], footer_items = [], active_id, children }) {
  const [open, set_open] = useState(false);
  const [expanded, set_expanded] = useState(() => new Set(items.filter((item) => holds(item, active_id)).map((item) => item.id)));

  useEffect(() => {
    const owner = items.filter((item) => holds(item, active_id)).map((item) => item.id);
    if (!owner.length) return;
    set_expanded((current) => {
      if (owner.every((id) => current.has(id))) return current;
      const next = new Set(current);
      owner.forEach((id) => next.add(id));
      return next;
    });
  }, [active_id, items]);

  useEffect(() => {
    function on_key(event) {
      if (event.key === ENGLISH.escape) set_open(false);
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, []);

  function pick(item) {
    item.onClick?.();
    set_open(false);
  }

  function toggle(id) {
    set_expanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function render_item(item) {
    if (!item.children?.length) {
      return (
        <li key={item.id}>
          <Nav_Button item={item} active={item.id === active_id} on_pick={() => pick(item)} />
        </li>
      );
    }
    const is_open = expanded.has(item.id);
    const has_active = holds(item, active_id);
    return (
      <li key={item.id} className={`adm_nav_group${is_open ? " is_open" : ""}`}>
        <Nav_Button item={item} active={has_active && !is_open} extra={`adm_nav_parent${has_active ? " has_active" : ""}`} on_pick={() => toggle(item.id)}>
          <Chevron />
        </Nav_Button>
        {is_open ?
          <ul className="adm_nav_sub" aria-label={item.label}>
            {item.children.map((child) =>
              <li key={child.id}>
                <Nav_Button item={child} active={child.id === active_id} extra="adm_nav_child" on_pick={() => pick(child)} />
              </li>
            )}
          </ul> :
          null}
      </li>
    );
  }

  return (
    <div className={open ? "dpm-shell is-nav-open" : "dpm-shell"}>
      <header className="dpm-topbar">
        <button type="button" className="dpm-nav-toggle" aria-label={open ? ENGLISH.close_menu : ENGLISH.open_menu} aria-expanded={open} onClick={() => set_open((value) => !value)}>
          <Menu_Icon open={open} />
        </button>
        <strong className="dpm-topbar__title">{find_label(items, active_id)}</strong>
      </header>
      {open ? <button type="button" className="dpm-nav-mask" aria-label={ENGLISH.close_menu} onClick={() => set_open(false)} /> : null}
      <div className={open ? "dpm-dash is-nav-open" : "dpm-dash"} data-menubar-theme="admin">
        <nav className="dpm-menubar adm_nav" data-menubar-theme="admin" aria-label={ENGLISH.sidebar}>
          <div className="dpm-menubar__logo"><MenubarLogo /></div>
          <ul className="dpm-menubar__items adm_nav_scroll">
            {items.map(render_item)}
          </ul>
          {footer_items.length ?
            <ul className="dpm-menubar__items adm_nav_foot">
              {footer_items.map(render_item)}
            </ul> :
            null}
        </nav>
        <main className="dpm-dash__main">{children}</main>
      </div>
    </div>
  );
}
