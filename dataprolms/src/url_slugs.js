import { useEffect, useRef } from "react";
import { APP_ENGLISH as ENGLISH } from "./constants/english/app_constants_english.js";

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, ENGLISH.and)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function course_slug(course = {}) {
  const name = slugify(course.course_name || course.title || "");
  const code = slugify(course.course_code || "");
  if (name && code && !name.endsWith(`-${code}`) && name !== code) return `${name}-${code}`;
  return name || code || String(course.course_id || course.id || "");
}

export function project_slug(project = {}) {
  return slugify(project.title || "") || slugify(project.id || "") || String(project.id || "");
}

export function hash_parts() {
  const raw = String(window.location.hash || "").replace(/^#/, "") || "/";
  const cut = raw.indexOf("?");
  const path = (cut === -1 ? raw : raw.slice(0, cut)).replace(/\/+$/, "") || "/";
  const query = new URLSearchParams(cut === -1 ? "" : raw.slice(cut + 1));
  return { path, query };
}

function path_matches(match, path) {
  if (typeof match === "function") return match(path);
  const list = Array.isArray(match) ? match : [match];
  return list.some((item) => {
    const text = String(item || "");
    if (text.endsWith("*")) return path.startsWith(text.slice(0, -1));
    return path === text;
  });
}

export function read_slug_query(defaults) {
  const { query } = hash_parts();
  const next = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const value = query.get(key);
    if (value != null) next[key] = value;
  }
  return next;
}

export function write_slug_query(values, defaults) {
  const { path, query } = hash_parts();
  for (const key of Object.keys(defaults)) {
    const value = values?.[key];
    const fallback = defaults[key];
    if (value == null || value === "" || String(value) === String(fallback)) query.delete(key);
    else query.set(key, String(value));
  }
  const text = query.toString();
  const hash = text ? `${path}?${text}` : path;
  const current = String(window.location.hash || "").replace(/^#/, "") || "/";
  if (current === hash) return;
  const url = `${window.location.pathname}${window.location.search}#${hash}`;
  window.history.replaceState(window.history.state, "", url);
}

function query_has_keys(defaults) {
  const { query } = hash_parts();
  return Object.keys(defaults).some((key) => query.has(key));
}

export function use_slug_mirror(match, values, defaults, apply) {
  const apply_ref = useRef(apply);
  apply_ref.current = apply;
  const hydrated_path = useRef("");
  const values_key = JSON.stringify(values);
  const defaults_key = JSON.stringify(defaults);
  const match_key = typeof match === "function" ? "fn" : JSON.stringify(match);

  useEffect(() => {
    function sync(from_navigation) {
      const path = hash_parts().path;
      if (!path_matches(match, path)) return;
      const from_url = read_slug_query(defaults);
      const url_has = query_has_keys(defaults);
      const first_visit = hydrated_path.current !== path;
      if ((from_navigation || first_visit) && url_has && JSON.stringify(from_url) !== values_key) {
        hydrated_path.current = path;
        apply_ref.current(from_url);
        return;
      }
      hydrated_path.current = path;
      write_slug_query(JSON.parse(values_key), defaults);
    }

    sync(false);

    function on_navigation() {
      sync(true);
    }

    window.addEventListener("popstate", on_navigation);
    window.addEventListener("hashchange", on_navigation);
    window.addEventListener("lms-navigate", on_navigation);
    return () => {
      window.removeEventListener("popstate", on_navigation);
      window.removeEventListener("hashchange", on_navigation);
      window.removeEventListener("lms-navigate", on_navigation);
    };
  }, [values_key, defaults_key, match_key]);
}

export function screen_paths(screen_id) {
  return [`/admin_dashboard/${screen_id}`, `/employee_dashboard/${screen_id}`];
}

export function content_paths(course_id) {
  return [
    `/admin_dashboard/courses/${course_id}/content`,
    `/employee_dashboard/courses/${course_id}/content`
  ];
}

export function catalog_slug(key) {
  return String(key || "").replace(/_/g, "-");
}

export function catalog_key(slug) {
  return String(slug || "").replace(/-/g, "_");
}

export function value_for_slug(list, slug) {
  const text = String(slug || "").trim();
  if (!text || text === "all") return "all";
  const found = (list || []).find((item) => slugify(item) === text || String(item) === text);
  return found == null ? "all" : found;
}

export function slug_by_id(list, id, id_key, name_key) {
  if (id == null || id === "") return "";
  const found = (list || []).find((item) => String(item?.[id_key]) === String(id));
  return slugify(found?.[name_key] || "") || String(id);
}

export function slug_with_id(name, id) {
  if (id == null || id === "") return "";
  const text = slugify(name || "");
  return text ? `${text}-${id}` : String(id);
}

export function id_from_named_slug(list, slug, id_key, name_key) {
  const named = id_by_name(list, slug, id_key, name_key);
  if (named) return named;
  const match = String(slug || "").match(/-(\d+)$/);
  if (match) return match[1];
  return /^\d+$/.test(String(slug || "")) ? String(slug) : "";
}

export function id_by_name(list, slug, id_key, name_key) {
  const text = String(slug || "").trim();
  if (!text) return "";
  const found = (list || []).find((item) => {
    const name = slugify(item?.[name_key] || "");
    return name === text || String(item?.[id_key]) === text;
  });
  return found ? String(found[id_key]) : "";
}

export function id_for_slug(list, slug) {
  const text = String(slug || "").trim();
  if (!text || text === "all") return "all";
  const found = (list || []).find((item) => {
    const name = slugify(item.name || item.label || "");
    return name === text || String(item.id) === text;
  });
  return found ? String(found.id) : "all";
}

export function slug_for_id(list, id) {
  if (id == null || id === "" || id === "all") return "all";
  const found = (list || []).find((item) => String(item.id) === String(id));
  return slugify(found?.name || found?.label || id) || "all";
}
