import { DESIGN_SYSTEM_ENGLISH as ENGLISH } from "../constants/english/design_system_constants_english.js";
const FIELD_SELECTOR = ENGLISH.input_select_textarea;

function is_field(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (!el.matches(FIELD_SELECTOR)) return false;
  if (el.disabled || el.readOnly) return false;
  const type = el.getAttribute("type");
  if (type === "hidden" || type === "button" || type === "submit" || type === "reset") return false;
  if (el.closest("[hidden]")) return false;
  return el.getClientRects().length > 0;
}

function is_empty(el) {
  if (el.type === "checkbox") return !el.checked;
  if (el.type === "radio") {
    const name = CSS.escape(el.name || "");
    const group = el.form?.querySelectorAll(ENGLISH.input_type_radio_name(name)) || [];
    return ![...group].some((item) => item.checked);
  }
  if (el.type === "file") return !el.files?.length;
  return !String(el.value || "").trim();
}

function group_empty(group) {
  return ![...group.querySelectorAll("input[type='checkbox']")].some((item) => item.checked);
}

function stops_in(form) {
  const controls = [...form.querySelectorAll(FIELD_SELECTOR)].
    filter((el) => is_field(el) && el.required).
    map((el) => ({ el, focus: el, empty: is_empty(el), group: false }));
  const groups = [...form.querySelectorAll("[data-required-group]")].
    filter((el) => el.getClientRects().length > 0).
    map((el) => ({
      el,
      focus: el.querySelector(FIELD_SELECTOR) || el,
      empty: group_empty(el),
      group: true
    }));
  return [...controls, ...groups].sort((left, right) => {
    if (left.el === right.el) return 0;
    return left.el.compareDocumentPosition(right.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
}

function first_empty(form) {
  return stops_in(form).find((stop) => stop.empty) || null;
}

function first_empty_before(form, target) {
  for (const stop of stops_in(form)) {
    if (stop.el === target || stop.el.contains(target) || target.contains(stop.el)) return null;
    if (stop.el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) {
      if (stop.empty) return stop;
    }
  }
  return null;
}

function paint(stop) {
  if (stop.group) stop.el.dataset.empty = "1";
  else stop.focus.dataset.empty = "1";
}

function clear_mark(el) {
  if (!(el instanceof HTMLElement)) return;
  if (el.required && is_empty(el)) return;
  delete el.dataset.empty;
  const group = el.closest("[data-required-group]");
  if (!group) return;
  if (group_empty(group)) return;
  delete group.dataset.empty;
}

let locking = false;

function go_to(stop) {
  if (!stop || locking) return;
  locking = true;
  paint(stop);
  const node = stop.focus;
  if (node instanceof HTMLElement) {
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof node.focus === "function") node.focus({ preventScroll: true });
  }
  window.setTimeout(() => {
    locking = false;
  }, 0);
}

function field_from(target) {
  if (!(target instanceof Element)) return null;
  if (target.closest(ENGLISH.button_a)) return null;
  const direct = target.closest(FIELD_SELECTOR);
  if (direct instanceof HTMLElement && is_field(direct)) return direct;
  const label = target.closest("label");
  const control = label?.querySelector(FIELD_SELECTOR);
  return control instanceof HTMLElement && is_field(control) ? control : null;
}

export function bind_required_fields() {
  if (typeof document === "undefined" || window.__lms_required_bound) return;
  window.__lms_required_bound = true;

  document.addEventListener("pointerdown", (event) => {
    if (locking) return;
    const field = field_from(event.target);
    if (!field) return;
    const form = field.form || field.closest("form");
    if (!form) return;
    const missing = first_empty_before(form, field);
    if (!missing) return;
    event.preventDefault();
    event.stopPropagation();
    go_to(missing);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== ENGLISH.tab || event.shiftKey || locking) return;
    const current = document.activeElement;
    if (!(current instanceof HTMLElement)) return;
    const form = current.closest("form");
    if (!form) return;
    const stop = stops_in(form).find((item) => item.el === current || item.el.contains(current));
    if (!stop?.empty) return;
    event.preventDefault();
    paint(stop);
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const missing = first_empty(form);
    if (!missing) return;
    event.preventDefault();
    event.stopPropagation();
    go_to(missing);
  }, true);

  document.addEventListener("input", (event) => clear_mark(event.target));
  document.addEventListener("change", (event) => clear_mark(event.target));
}
