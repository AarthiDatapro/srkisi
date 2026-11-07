import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Confirm_Modal } from "../../admin_ui/confirm_modal.jsx";
import { CERTIFICATE_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/certificate_manager_constants_english.js";
import {
  create_certificate,
  delete_certificate,
  list_certificates,
  list_value_sources,
  preview_certificate,
  replace_certificate_image,
  save_certificate
} from "../api.js";
import { ALIGNMENTS, ALIAS_PATTERN, FONT_FAMILIES, GRID_SPACINGS } from "../constants.js";
import { fresh_field } from "../utils.js";
import { VALUE_SOURCES, column_name, field_type, field_value_label, group_columns, type_label } from "../value_sources.js";

function Stepper({ label, value, min, max, disabled, on_focus, on_change, plain = false }) {
  const [draft, set_draft] = useState(null);
  const showing = draft === null ? String(value ?? "") : draft;

  function clamp(next_value) {
    if (!Number.isFinite(next_value)) return min;
    return Math.min(max, Math.max(min, next_value));
  }

  function commit(next_value) {
    on_change(clamp(next_value));
  }

  function start_edit() {
    on_focus?.();
    set_draft(String(value ?? ""));
  }

  function finish_edit() {
    const next_value = draft === "" || draft === "-" ? min : Number(draft);
    commit(next_value);
    set_draft(null);
  }

  function type_value(raw) {
    set_draft(raw);
    if (raw === "" || raw === "-" || raw === "." || raw === "-.") return;
    const next_value = Number(raw);
    if (!Number.isFinite(next_value)) return;
    on_change(clamp(next_value));
  }

  const next = (step) => {
    set_draft(null);
    commit(Number(value || 0) + step);
  };

  const number_input = (
    <input
      type="number"
      aria-label={label}
      value={showing}
      min={min}
      max={max}
      disabled={disabled}
      onFocus={start_edit}
      onBlur={finish_edit}
      onChange={(event) => type_value(event.target.value)} />
  );

  if (plain) {
    return (
      <label className="ctb_step is_plain">
        <span className="ctb_step_chip">
          <em>{label}</em>
          {number_input}
        </span>
      </label>
    );
  }
  return (
    <label className="ctb_step">
      <span>{label}</span>
      <div>
        <button type="button" aria-label={label} disabled={disabled} onClick={() => { on_focus?.(); next(-1); }}>−</button>
        {number_input}
        <button type="button" aria-label={label} disabled={disabled} onClick={() => { on_focus?.(); next(1); }}>+</button>
      </div>
    </label>
  );
}

function Align_Icon({ kind }) {
  if (kind === "center") {
    return <svg viewBox="0 0 16 12" aria-hidden="true"><path d="M2 2h12M4 6h8M2 10h12" /></svg>;
  }
  if (kind === "right") {
    return <svg viewBox="0 0 16 12" aria-hidden="true"><path d="M4 2h10M7 6h7M4 10h10" /></svg>;
  }
  if (kind === "justify") {
    return <svg viewBox="0 0 16 12" aria-hidden="true"><path d="M2 2h12M2 6h12M2 10h12" /></svg>;
  }
  return <svg viewBox="0 0 16 12" aria-hidden="true"><path d="M2 2h10M2 6h7M2 10h10" /></svg>;
}

export function Builder({ can_edit, toast }) {
  const [items, set_items] = useState([]);
  const [loading, set_loading] = useState(true);
  const [open_id, set_open_id] = useState("");
  const [name, set_name] = useState("");
  const [fields, set_fields] = useState([]);
  const [active_key, set_active_key] = useState("");
  const [file, set_file] = useState(null);
  const [local_url, set_local_url] = useState("");
  const [image_url, set_image_url] = useState("");
  const [width, set_width] = useState(0);
  const [height, set_height] = useState(0);
  const [alias, set_alias] = useState("");
  const [adding, set_adding] = useState(false);
  const [advanced, set_advanced] = useState(false);
  const [zoom, set_zoom] = useState(1);
  const [zoom_draft, set_zoom_draft] = useState(null);
  const [show_grid, set_show_grid] = useState(true);
  const [grid_spacing, set_grid_spacing] = useState(20);
  const [menu, set_menu] = useState(false);
  const [busy, set_busy] = useState(false);
  const [preview_url, set_preview_url] = useState("");
  const [confirm_delete, set_confirm_delete] = useState(false);
  const [source_groups, set_source_groups] = useState(VALUE_SOURCES);
  const [key_draft, set_key_draft] = useState("");
  const [history_tick, set_history_tick] = useState(0);
  const [assigned_for, set_assigned_for] = useState("");
  const stage_ref = useRef(null);
  const file_ref = useRef(null);
  const menu_ref = useRef(null);
  const local_url_ref = useRef("");
  const preview_url_ref = useRef("");
  const drag_ref = useRef(null);
  const fields_ref = useRef([]);
  const past_ref = useRef([]);
  const future_ref = useRef([]);

  fields_ref.current = fields;
  const active = fields.find((field) => field.field_key === active_key) || null;
  const active_type = field_type(active);
  const picture = local_url || image_url;
  const saved = items.find((item) => String(item.certificate_id) === String(open_id)) || null;

  useEffect(() => () => {
    if (local_url_ref.current) URL.revokeObjectURL(local_url_ref.current);
    if (preview_url_ref.current) URL.revokeObjectURL(preview_url_ref.current);
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all([list_certificates(), list_value_sources().catch(() => ({ groups: VALUE_SOURCES }))])
      .then(([data, sources]) => {
        if (!live) return;
        if (sources?.groups?.length) set_source_groups(sources.groups);
        const next = data.items || [];
        set_items(next);
        if (next[0]) open_item(next[0]);
        else blank();
      })
      .catch((err) => { if (live) toast.error(err.message); })
      .finally(() => { if (live) set_loading(false); });
    return () => { live = false; };
    // Load once when the builder opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function close_menu(event) {
      if (!menu_ref.current?.contains(event.target)) set_menu(false);
    }
    document.addEventListener("mousedown", close_menu);
    return () => document.removeEventListener("mousedown", close_menu);
  }, []);

  useEffect(() => {
    fit();
  }, [width, height, picture]);

  useEffect(() => {
    set_key_draft(active?.field_key || "");
  }, [active?.field_key]);

  useEffect(() => {
    function nudge(event) {
      if (!can_edit || !active_key) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (event.repeat) return;
        past_ref.current = [...past_ref.current, JSON.stringify(fields_ref.current)].slice(-40);
        future_ref.current = [];
        set_history_tick((tick) => tick + 1);
        set_fields((current) => current.filter((field) => field.field_key !== active_key));
        set_active_key("");
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const delta = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }[event.key];
      if (!delta) return;
      event.preventDefault();
      if (!event.repeat) {
        past_ref.current = [...past_ref.current, JSON.stringify(fields_ref.current)].slice(-40);
        future_ref.current = [];
        set_history_tick((tick) => tick + 1);
      }
      set_fields((current) => current.map((field) => {
        if (field.field_key !== active_key) return field;
        return {
          ...field,
          x_position: Math.max(0, Math.min(Math.max(0, width - 1), field.x_position + delta[0])),
          y_position: Math.max(0, Math.min(Math.max(0, height - 1), field.y_position + delta[1]))
        };
      }));
    }
    window.addEventListener("keydown", nudge);
    return () => window.removeEventListener("keydown", nudge);
  }, [can_edit, active_key, width, height]);

  function remember_local(url) {
    if (local_url_ref.current) URL.revokeObjectURL(local_url_ref.current);
    local_url_ref.current = url;
    set_local_url(url);
  }

  function remember_preview(url) {
    if (preview_url_ref.current) URL.revokeObjectURL(preview_url_ref.current);
    preview_url_ref.current = url;
    set_preview_url(url);
  }

  useEffect(() => {
    if (!preview_url) return undefined;
    function on_key(event) {
      if (event.key === "Escape") remember_preview("");
    }
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [preview_url]);

  function clear_history() {
    past_ref.current = [];
    future_ref.current = [];
    set_history_tick((tick) => tick + 1);
  }

  function open_item(item) {
    set_open_id(item.certificate_id);
    set_name(item.certificate_name || "");
    set_fields(item.fields || []);
    set_active_key(item.fields?.[0]?.field_key || "");
    set_image_url(item.image_url || "");
    set_width(Number(item.image_width || 0));
    set_height(Number(item.image_height || 0));
    set_file(null);
    set_adding(false);
    set_alias("");
    set_menu(false);
    set_assigned_for(item.assigned_for || "");
    remember_local("");
    clear_history();
  }

  function blank() {
    set_open_id("new");
    set_name("");
    set_fields([]);
    set_active_key("");
    set_image_url("");
    set_width(0);
    set_height(0);
    set_file(null);
    set_adding(true);
    set_alias("");
    set_menu(false);
    set_assigned_for("");
    remember_local("");
    clear_history();
  }

  function push_history() {
    past_ref.current = [...past_ref.current, JSON.stringify(fields)].slice(-40);
    future_ref.current = [];
    set_history_tick((tick) => tick + 1);
  }

  function undo() {
    const past = past_ref.current;
    if (!past.length) return;
    future_ref.current = [JSON.stringify(fields), ...future_ref.current];
    past_ref.current = past.slice(0, -1);
    set_fields(JSON.parse(past[past.length - 1]));
    set_history_tick((tick) => tick + 1);
  }

  function redo() {
    const later = future_ref.current;
    if (!later.length) return;
    past_ref.current = [...past_ref.current, JSON.stringify(fields)];
    future_ref.current = later.slice(1);
    set_fields(JSON.parse(later[0]));
    set_history_tick((tick) => tick + 1);
  }

  function clamp_zoom(next_value) {
    return Math.min(2, Math.max(0.25, Number(Number(next_value).toFixed(2)) || 1));
  }

  function set_zoom_percent(raw) {
    set_zoom_draft(raw);
    if (raw === "") return;
    const percent = Number(raw);
    if (!Number.isFinite(percent)) return;
    set_zoom(clamp_zoom(percent / 100));
  }

  function finish_zoom_percent() {
    const percent = zoom_draft === "" || zoom_draft === null ? zoom * 100 : Number(zoom_draft);
    set_zoom(clamp_zoom((Number.isFinite(percent) ? percent : zoom * 100) / 100));
    set_zoom_draft(null);
  }

  function fit() {
    const stage = stage_ref.current;
    if (!stage || !width || !height) return;
    const next = Math.min((stage.clientWidth - 64) / width, (stage.clientHeight - 64) / height, 1);
    set_zoom_draft(null);
    set_zoom(clamp_zoom(next));
  }

  function take_file(next) {
    if (!next || !can_edit) return;
    if (!["image/png", "image/jpeg"].includes(next.type)) {
      toast.error(ENGLISH.picture_required);
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      toast.error(ENGLISH.picture_too_big);
      return;
    }
    const url = URL.createObjectURL(next);
    const image = new Image();
    image.onload = () => {
      const next_width = image.naturalWidth || 0;
      const next_height = image.naturalHeight || 0;
      set_width(next_width);
      set_height(next_height);
      if (next_width && next_height) {
        set_fields((current) => current.map((field) => ({
          ...field,
          x_position: Math.min(field.x_position, next_width - 1),
          y_position: Math.min(field.y_position, next_height - 1)
        })));
      }
    };
    image.src = url;
    set_file(next);
    remember_local(url);
  }

  function patch_field(field_key, next) {
    set_fields((current) => current.map((field) => field.field_key === field_key ? { ...field, ...next } : field));
  }

  function rename_field(old_key, next_name) {
    const field_key = String(next_name || "").trim().replace(/\s+/g, " ");
    if (field_key === old_key) return;
    if (!ALIAS_PATTERN.test(field_key)) {
      set_key_draft(old_key);
      toast.error(ENGLISH.alias_invalid);
      return;
    }
    if (fields_ref.current.some((field) => field.field_key !== old_key && field.field_key.toLowerCase() === field_key.toLowerCase())) {
      set_key_draft(old_key);
      toast.error(ENGLISH.alias_taken);
      return;
    }
    push_history();
    set_fields((current) => current.map((field) => field.field_key === old_key ? { ...field, field_key } : field));
    set_active_key(field_key);
  }

  function set_field_type(field_key, type_id) {
    push_history();
    if (type_id === "manual") {
      patch_field(field_key, { value_mode: "static", value_type: "manual", value_source: "", static_value: "" });
      return;
    }
    const current = fields_ref.current.find((field) => field.field_key === field_key);
    const keep = type_id && current?.value_source?.startsWith(`${type_id}.`) ? current.value_source : "";
    patch_field(field_key, { value_mode: "table", value_type: type_id, value_source: keep, static_value: "" });
  }

  function add_alias(event) {
    event.preventDefault();
    const field_key = alias.trim().replace(/\s+/g, " ");
    if (!width || !height) {
      toast.error(ENGLISH.picture_required);
      return;
    }
    if (!ALIAS_PATTERN.test(field_key)) {
      toast.error(ENGLISH.alias_invalid);
      return;
    }
    if (fields.some((field) => field.field_key.toLowerCase() === field_key.toLowerCase())) {
      toast.error(ENGLISH.alias_taken);
      return;
    }
    push_history();
    const next = fresh_field(field_key, width, height, fields.length);
    if (width > 0) next.x_position = Math.min(next.x_position, width - 1);
    if (height > 0) next.y_position = Math.min(next.y_position, height - 1);
    set_fields((current) => [...current, next]);
    set_active_key(field_key);
    set_alias("");
    set_adding(false);
  }

  function remove_field(field_key) {
    push_history();
    set_fields((current) => current.filter((field) => field.field_key !== field_key));
    if (active_key === field_key) set_active_key("");
  }

  async function persist() {
    const certificate_name = name.trim();
    if (!certificate_name) throw new Error(ENGLISH.name_required);
    if ((!open_id || open_id === "new") && !file) throw new Error(ENGLISH.picture_required);
    let certificate_id = open_id;
    if (!certificate_id || certificate_id === "new") {
      const created = await create_certificate(file, certificate_name);
      certificate_id = created.item.certificate_id;
      set_open_id(certificate_id);
      set_file(null);
      set_image_url(created.item.image_url || "");
      set_width(Number(created.item.image_width || 0));
      set_height(Number(created.item.image_height || 0));
      remember_local("");
      set_items((current) => [created.item, ...current.filter((item) => item.certificate_id !== created.item.certificate_id)]);
    } else if (file) {
      const replaced = await replace_certificate_image(certificate_id, file);
      set_file(null);
      set_image_url(replaced.item.image_url || "");
      set_width(Number(replaced.item.image_width || 0));
      set_height(Number(replaced.item.image_height || 0));
      remember_local("");
    }
    const saved_row = await save_certificate(certificate_id, { certificate_name, fields, assigned_for });
    const claimed = saved_row.item.assigned_for;
    set_items((current) => [
      saved_row.item,
      ...current
        .filter((item) => item.certificate_id !== saved_row.item.certificate_id)
        .map((item) => claimed && item.assigned_for === claimed ? { ...item, assigned_for: "" } : item)
    ]);
    open_item(saved_row.item);
    return saved_row.item;
  }

  async function save() {
    set_busy(true);
    try {
      await persist();
      toast.success(ENGLISH.saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy(false);
    }
  }

  async function preview() {
    set_busy(true);
    try {
      if (!picture) throw new Error(ENGLISH.picture_required);
      const blob = await preview_certificate({
        file: file || undefined,
        image_url: file ? undefined : image_url,
        image_width: width,
        image_height: height,
        fields
      });
      remember_preview(URL.createObjectURL(blob));
    } catch (err) {
      toast.error(err.message || ENGLISH.preview_failed);
    } finally {
      set_busy(false);
    }
  }

  async function remove() {
    if (!saved) {
      blank();
      set_confirm_delete(false);
      return;
    }
    set_busy(true);
    try {
      await delete_certificate(saved.certificate_id);
      const rest = items.filter((item) => item.certificate_id !== saved.certificate_id);
      set_items(rest);
      toast.success(ENGLISH.deleted);
      set_confirm_delete(false);
      if (rest[0]) open_item(rest[0]);
      else blank();
    } catch (err) {
      toast.error(err.message);
    } finally {
      set_busy(false);
    }
  }

  function on_drag_start(event, field) {
    if (!can_edit) return;
    push_history();
    set_active_key(field.field_key);
    drag_ref.current = {
      key: field.field_key,
      x: event.clientX,
      y: event.clientY,
      origin_x: field.x_position,
      origin_y: field.y_position
    };
    window.addEventListener("pointermove", on_drag_move);
    window.addEventListener("pointerup", on_drag_end);
    event.stopPropagation();
  }

  function on_drag_move(event) {
    const drag = drag_ref.current;
    if (!drag) return;
    const dx = (event.clientX - drag.x) / zoom;
    const dy = (event.clientY - drag.y) / zoom;
    patch_field(drag.key, {
      x_position: Math.max(0, Math.min((width || 1) - 1, Math.round(drag.origin_x + dx))),
      y_position: Math.max(0, Math.min((height || 1) - 1, Math.round(drag.origin_y + dy)))
    });
  }

  function on_drag_end() {
    drag_ref.current = null;
    window.removeEventListener("pointermove", on_drag_move);
    window.removeEventListener("pointerup", on_drag_end);
  }

  const can_undo = history_tick >= 0 && past_ref.current.length > 0;
  const can_redo = future_ref.current.length > 0;

  return (
    <section className="ctb">
      <header className="ctb_bar">
        <div className="ctb_menu" ref={menu_ref}>
          <button type="button" className="ctb_icon" aria-label={ENGLISH.back} aria-expanded={menu} onClick={() => set_menu((open) => !open)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="2" />
              <path d="M8 10h8M8 14h5" />
            </svg>
          </button>
          {menu ?
            <div className="ctb_menu_list" role="menu">
              <header className="ctb_menu_head">
                <strong>{ENGLISH.back}</strong>
                <span>{items.length}</span>
              </header>
              {can_edit ?
                <button type="button" className="ctb_menu_new" role="menuitem" onClick={blank}>
                  <i aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                  </i>
                  <span>{ENGLISH.new_certificate}</span>
                </button> :
                null}
              <p className="ctb_menu_label">{ENGLISH.saved_certificates}</p>
              <div className="ctb_menu_items">
                {!items.length ?
                  <p className="ctb_menu_empty">{ENGLISH.no_saved_certificates}</p> :
                  null}
                {items.map((item) =>
                  <button
                    key={item.certificate_id}
                    type="button"
                    role="menuitem"
                    className={String(item.certificate_id) === String(open_id) ? "is_on" : undefined}
                    onClick={() => open_item(item)}>
                    <i aria-hidden="true">
                      <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 10h8M8 14h5" /></svg>
                    </i>
                    <span>
                      <b>{item.certificate_name || ENGLISH.builder_title}</b>
                      <small>
                        {item.assigned_for === "mock_interview" ? ENGLISH.assign_mock_interview : item.image_width && item.image_height ? `${item.image_width} × ${item.image_height}` : "—"}
                      </small>
                    </span>
                  </button>
                )}
              </div>
            </div> :
            null}
        </div>
        <div className="ctb_brand">
          <span className="ctb_gear" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M4.8 6.2l1.6 1.6M17.6 16.2l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.8l1.6-1.6M17.6 7.8l1.6-1.6" /></svg>
          </span>
          <h1>{ENGLISH.builder_title}</h1>
        </div>
        <label className="ctb_name">
          <span>{ENGLISH.template_name} <i>*</i></span>
          <input
            value={name}
            disabled={!can_edit || busy}
            placeholder={ENGLISH.builder_title}
            onChange={(event) => set_name(event.target.value)} />
        </label>
        <button type="button" className="ctb_ghost" disabled={busy || !picture} onClick={preview}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.6" /></svg>
          {ENGLISH.preview}
        </button>
        {can_edit ?
          <button type="button" className="ctb_save" disabled={busy} onClick={save}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5V4Z" /><path d="M8 4v5h8V4M8 20v-6h8v6" /></svg>
            {ENGLISH.save_template}
          </button> :
          null}
      </header>
      {can_edit ? null : <p className="ctb_note">{ENGLISH.view_only}</p>}

      <div className="ctb_work">
        <aside className="ctb_side">
          <section className="ctb_card">
            <header className="ctb_section_head">
              <span>1</span>
              <h2>{ENGLISH.upload_certificate}</h2>
            </header>
            <div className="ctb_section_body">
            <div
              className={picture ? "ctb_thumb" : "ctb_thumb is_empty"}
              role={!picture && can_edit ? "button" : undefined}
              tabIndex={!picture && can_edit ? 0 : undefined}
              onClick={!picture && can_edit ? () => file_ref.current?.click() : undefined}
              onKeyDown={!picture && can_edit ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  file_ref.current?.click();
                }
              } : undefined}>
              {picture ? <img src={picture} alt="" /> : <span>{ENGLISH.picture_hint}</span>}
              {picture ? <i className="ctb_check" aria-hidden="true">✓</i> : null}
              {picture && can_edit ?
                <button
                  type="button"
                  className="ctb_thumb_delete"
                  aria-label={ENGLISH.delete_certificate}
                  onClick={(event) => {
                    event.stopPropagation();
                    set_confirm_delete(true);
                  }}>
                  <span className="ctb_thumb_delete_chip">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5h6v2M8 7l1 13h6l1-13" /></svg>
                    {ENGLISH.delete}
                  </span>
                </button> :
                null}
            </div>
            {picture && can_edit ?
              <div className="ctb_file_row">
                <button type="button" className="ctb_ghost" onClick={() => file_ref.current?.click()}>{ENGLISH.change_image}</button>
              </div> :
              null}
            <input
              ref={file_ref}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={(event) => {
                take_file(event.target.files?.[0]);
                event.target.value = "";
              }} />
            </div>
          </section>

          <section className="ctb_card ctb_vars">
            <header className="ctb_section_head">
              <span>2</span>
              <h2>{ENGLISH.add_variables}</h2>
            </header>
            <div className="ctb_section_body">
            <div className="ctb_var_list">
              {fields.map((field) =>
                <div key={field.field_key} className={field.field_key === active_key ? "ctb_var is_on" : "ctb_var"}>
                  <button type="button" onClick={() => set_active_key(field.field_key)}>
                    <i>T</i>
                    <span>
                      <b>{field.field_key}</b>
                      <small>{field_value_label(field, field.value_mode === "static" ? ENGLISH.manual : ENGLISH.choose_a_column)}</small>
                    </span>
                  </button>
                  {can_edit ?
                    <button
                      type="button"
                      className="ctb_var_x"
                      aria-label={ENGLISH.remove_variable}
                      onClick={() => remove_field(field.field_key)}>
                      ×
                    </button> :
                    null}
                </div>
              )}
            </div>
            {adding && can_edit ?
              <form className="ctb_alias" onSubmit={add_alias}>
                <input
                  autoFocus
                  aria-label={ENGLISH.variable_alias}
                  placeholder={ENGLISH.variable_alias}
                  value={alias}
                  onChange={(event) => set_alias(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" || ((event.key === "Delete" || event.key === "Backspace") && !alias)) {
                      event.preventDefault();
                      set_alias("");
                      set_adding(false);
                    }
                  }} />
                <button
                  type="button"
                  className="ctb_var_x"
                  aria-label={ENGLISH.remove_variable}
                  onClick={() => { set_alias(""); set_adding(false); }}>
                  ×
                </button>
              </form> :
              null}
            {can_edit ?
              <button type="button" className="ctb_add" onClick={() => set_adding(true)}>
                + {ENGLISH.add_variable}
              </button> :
              null}
            </div>
          </section>

          <section className="ctb_card">
            <header className="ctb_section_head">
              <span>3</span>
              <h2>{ENGLISH.assign_to}</h2>
            </header>
            <div className="ctb_section_body">
              <label className="ctb_field">
                <span>{ENGLISH.assign_to}</span>
                <select
                  value={assigned_for}
                  disabled={!can_edit || busy}
                  onChange={(event) => set_assigned_for(event.target.value)}>
                  <option value="">{ENGLISH.not_assigned}</option>
                  <option value="mock_interview">{ENGLISH.assign_mock_interview}</option>
                </select>
                <small>{ENGLISH.assign_mock_interview_hint}</small>
              </label>
            </div>
          </section>
        </aside>

        <main className="ctb_stage_wrap">
          <div className="ctb_tools">
            <button type="button" className="is_on" aria-label={ENGLISH.select_tool} title={ENGLISH.select_tool}>
              <svg viewBox="0 0 24 24"><path d="M6 4l11 8-5 .4 2.2 6.2-2.2.8-2.2-6.2L6 16V4Z" /></svg>
            </button>
            <button type="button" aria-label={ENGLISH.text_tool} title={ENGLISH.text_tool} disabled={!can_edit} onClick={() => set_adding(true)}>
              <svg viewBox="0 0 24 24"><path d="M6 6h12M12 6v12" /></svg>
            </button>
            <button type="button" aria-label={ENGLISH.image_tool} title={ENGLISH.image_tool} disabled={!can_edit} onClick={() => file_ref.current?.click()}>
              <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.4" /><path d="m7 16 3.2-3.2L16 17" /></svg>
            </button>
            <button type="button" className={show_grid ? "is_on" : undefined} aria-label={ENGLISH.grid_tool} title={ENGLISH.grid_tool} onClick={() => set_show_grid((value) => !value)}>
              <svg viewBox="0 0 24 24"><path d="M5 5h14v14H5zM12 5v14M5 12h14" /></svg>
            </button>
            <div className="ctb_tools_end">
            <button type="button" aria-label={ENGLISH.undo} title={ENGLISH.undo} disabled={!can_undo} onClick={undo}>
              <svg viewBox="0 0 24 24"><path d="M8 8H4V4" /><path d="M4 8a8 8 0 1 1 2 6" /></svg>
            </button>
            <button type="button" aria-label={ENGLISH.redo} title={ENGLISH.redo} disabled={!can_redo} onClick={redo}>
              <svg viewBox="0 0 24 24"><path d="M16 8h4V4" /><path d="M20 8a8 8 0 1 0-2 6" /></svg>
            </button>
            <i className="ctb_split" />
            <button type="button" aria-label={ENGLISH.zoom_out} disabled={zoom <= 0.25} onClick={() => { set_zoom_draft(null); set_zoom((value) => clamp_zoom(value - 0.1)); }}>−</button>
            <label className="ctb_zoom">
              <input
                type="number"
                aria-label={ENGLISH.zoom}
                min={25}
                max={200}
                value={zoom_draft === null ? Math.round(zoom * 100) : zoom_draft}
                onFocus={() => set_zoom_draft(String(Math.round(zoom * 100)))}
                onBlur={finish_zoom_percent}
                onChange={(event) => set_zoom_percent(event.target.value)} />
              <span>%</span>
            </label>
            <button type="button" aria-label={ENGLISH.zoom_in} disabled={zoom >= 2} onClick={() => { set_zoom_draft(null); set_zoom((value) => clamp_zoom(value + 0.1)); }}>+</button>
            <button type="button" aria-label={ENGLISH.fit} onClick={fit}>
              <svg viewBox="0 0 24 24"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></svg>
            </button>
            </div>
          </div>
          <div className="ctb_stage" ref={stage_ref}>
            {loading ? <p>{ENGLISH.loading}</p> : null}
            {!loading && !picture ? <p className="ctb_empty">{ENGLISH.empty_canvas}</p> : null}
            {picture ?
              <div className="ctb_board" style={{ width: Math.max(1, width) * zoom, height: Math.max(1, height) * zoom }}>
                <img src={picture} alt={name || ENGLISH.builder_title} draggable="false" />
                {show_grid ?
                  <span
                    className="ctb_grid"
                    style={{ backgroundSize: `${grid_spacing * zoom}px ${grid_spacing * zoom}px` }} /> :
                  null}
                {fields.map((field) =>
                  <div
                    key={field.field_key}
                    className={field.field_key === active_key ? "ctb_box is_on" : "ctb_box"}
                    style={{
                      left: field.x_position * zoom,
                      top: field.y_position * zoom,
                      width: field.box_width * zoom,
                      height: field.box_height * zoom,
                      color: field.font_color,
                      fontFamily: field.font_family,
                      fontSize: field.font_size * zoom,
                      fontWeight: field.bold ? 700 : 400,
                      fontStyle: field.italic ? "italic" : "normal",
                      textDecoration: field.underline ? "underline" : "none",
                      letterSpacing: `${field.letter_spacing * zoom}px`
                    }}
                    onPointerDown={(event) => on_drag_start(event, field)}>
                    <span className={`ctb_box_label is_${field.text_alignment}`}>
                      {field.value_mode === "static" && field.static_value ? field.static_value : `{${field.field_key}}`}
                    </span>
                    {field.field_key === active_key && can_edit ?
                      <span className="ctb_box_tools">
                        <button type="button" aria-label={ENGLISH.remove_variable} onPointerDown={(event) => event.stopPropagation()} onClick={() => remove_field(field.field_key)}>
                          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                      </span> :
                      null}
                  </div>
                )}
              </div> :
              null}
          </div>
          <footer className="ctb_foot">
            <span>{ENGLISH.canvas}: {width || "—"} × {height || "—"} px</span>
            <div className="ctb_foot_end">
              <label>
                <input type="checkbox" checked={show_grid} onChange={(event) => set_show_grid(event.target.checked)} />
                {ENGLISH.show_grid}
              </label>
              <label>
                {ENGLISH.grid_spacing}
                <select value={grid_spacing} onChange={(event) => set_grid_spacing(Number(event.target.value))}>
                  {GRID_SPACINGS.map((spacing) => <option key={spacing} value={spacing}>{spacing} px</option>)}
                </select>
              </label>
            </div>
          </footer>
        </main>

        <aside className="ctb_props">
          <div className="ctb_prop_body">
              {!active ?
                <div className="ctb_prop_empty">
                  <span className="ctb_prop_empty_icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M6 6h12M12 6v12" /><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
                  </span>
                  <strong>{fields.length ? ENGLISH.select_variable : ENGLISH.no_variables_yet}</strong>
                  <p>{fields.length ? ENGLISH.select_variable_hint : ENGLISH.no_variables_hint}</p>
                </div> :
                null}
              {active ?
                <>
                  <section className="ctb_prop_block">
                    <header className="ctb_section_head">
                      <span>1</span>
                      <h3>{ENGLISH.selected_element}</h3>
                    </header>
                    <div className="ctb_section_body">
                      <label className="ctb_field">
                        <span>{ENGLISH.key}</span>
                        <input
                          value={key_draft}
                          disabled={!can_edit}
                          onChange={(event) => set_key_draft(event.target.value)}
                          onFocus={push_history}
                          onBlur={() => rename_field(active.field_key, key_draft)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                          }} />
                      </label>
                      <label className="ctb_field">
                        <span>{ENGLISH.type_field}</span>
                        <select
                          value={active_type}
                          disabled={!can_edit}
                          onChange={(event) => set_field_type(active.field_key, event.target.value)}>
                          <option value="">{ENGLISH.choose_a_type}</option>
                          {source_groups.map((group) =>
                            <option key={group.id} value={group.id}>{type_label(group)}</option>
                          )}
                          <option value="manual">{ENGLISH.manual}</option>
                        </select>
                      </label>
                      {active_type === "manual" ?
                        <label className="ctb_field">
                          <span>{ENGLISH.mapped_value}</span>
                          <input
                            value={active.static_value || ""}
                            disabled={!can_edit}
                            maxLength={200}
                            placeholder={ENGLISH.manual_value_hint}
                            onChange={(event) => patch_field(active.field_key, { value_mode: "static", static_value: event.target.value })}
                            onFocus={push_history} />
                          <small>{ENGLISH.manual_value_hint}</small>
                        </label> :
                        <label className="ctb_field">
                          <span>{ENGLISH.mapped_value}</span>
                          <select
                            value={active.value_source || ""}
                            disabled={!can_edit || !active_type}
                            onChange={(event) => {
                              const value_source = event.target.value;
                              push_history();
                              patch_field(active.field_key, {
                                value_mode: "table",
                                value_type: value_source.split(".")[0] || active_type,
                                value_source,
                                static_value: ""
                              });
                            }}>
                            <option value="">{ENGLISH.choose_a_column}</option>
                            {group_columns(source_groups, active_type).map((item) =>
                              <option key={item.id} value={item.id}>{column_name(item.id)}</option>
                            )}
                          </select>
                        </label>}
                    </div>
                  </section>

                  <section className="ctb_prop_block">
                    <header className="ctb_section_head">
                      <span>2</span>
                      <h3>{ENGLISH.text_style}</h3>
                    </header>
                    <div className="ctb_section_body ctb_text_style">
                      <Stepper
                        label={ENGLISH.font_size}
                        value={active.font_size}
                        min={8}
                        max={200}
                        disabled={!can_edit}
                        on_focus={push_history}
                        on_change={(font_size) => patch_field(active.field_key, { font_size })} />
                      <div className="ctb_style_row" role="group" aria-label={ENGLISH.text_style}>
                        {[["bold", ENGLISH.bold, "B"], ["italic", ENGLISH.italic, "I"], ["underline", ENGLISH.underline, "U"]].map(([key, label, mark]) =>
                          <button
                            key={key}
                            type="button"
                            className={active[key] ? "is_on" : undefined}
                            aria-label={label}
                            disabled={!can_edit}
                            onClick={() => { push_history(); patch_field(active.field_key, { [key]: !active[key] }); }}>
                            {mark}
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="ctb_prop_block">
                    <header className="ctb_section_head">
                      <span>3</span>
                      <h3>{ENGLISH.position_size}</h3>
                    </header>
                    <div className="ctb_section_body">
                      <div className="ctb_grid2">
                        <Stepper plain label={ENGLISH.x_px} value={active.x_position} min={0} max={Math.max(0, width - 1)} disabled={!can_edit} on_focus={push_history} on_change={(x_position) => patch_field(active.field_key, { x_position })} />
                        <Stepper plain label={ENGLISH.y_px} value={active.y_position} min={0} max={Math.max(0, height - 1)} disabled={!can_edit} on_focus={push_history} on_change={(y_position) => patch_field(active.field_key, { y_position })} />
                        <Stepper plain label={ENGLISH.width_px} value={active.box_width} min={40} max={4000} disabled={!can_edit} on_focus={push_history} on_change={(box_width) => patch_field(active.field_key, { box_width })} />
                        <Stepper plain label={ENGLISH.height_px} value={active.box_height} min={24} max={800} disabled={!can_edit} on_focus={push_history} on_change={(box_height) => patch_field(active.field_key, { box_height })} />
                      </div>
                    </div>
                  </section>

                  <section className="ctb_prop_block is_advanced">
                    <button type="button" className="ctb_advanced ctb_section_head" aria-expanded={advanced} onClick={() => set_advanced((open) => !open)}>
                      <span>4</span>
                      <h3>{ENGLISH.advanced}</h3>
                      <span className="ctb_advanced_caret">{advanced ? "▴" : "▾"}</span>
                    </button>
                    {advanced ?
                      <div className="ctb_advanced_body">
                        <label className="ctb_field">
                          <span>{ENGLISH.font_family}</span>
                          <select
                            value={active.font_family}
                            disabled={!can_edit}
                            onFocus={push_history}
                            onChange={(event) => patch_field(active.field_key, { font_family: event.target.value })}>
                            {FONT_FAMILIES.map((family) => <option key={family} value={family}>{family}</option>)}
                          </select>
                        </label>
                        <label className="ctb_color">
                          <span>{ENGLISH.text_color}</span>
                          <span className="ctb_color_row">
                            <input
                              type="color"
                              value={/^#[0-9a-fA-F]{6}$/.test(active.font_color) ? active.font_color : "#0D1B3F"}
                              disabled={!can_edit}
                              onFocus={push_history}
                              onChange={(event) => patch_field(active.field_key, { font_color: event.target.value })} />
                            <input
                              value={active.font_color}
                              disabled={!can_edit}
                              onFocus={push_history}
                              onChange={(event) => patch_field(active.field_key, { font_color: event.target.value })} />
                          </span>
                        </label>
                        <div className="ctb_align" role="group" aria-label={ENGLISH.alignment}>
                          <span>{ENGLISH.alignment}</span>
                          <div className="ctb_align_row">
                            {ALIGNMENTS.map((alignment) =>
                              <button
                                key={alignment}
                                type="button"
                                className={active.text_alignment === alignment ? "is_on" : undefined}
                                aria-label={ENGLISH[`align_${alignment}`]}
                                disabled={!can_edit}
                                onClick={() => { push_history(); patch_field(active.field_key, { text_alignment: alignment }); }}>
                                <Align_Icon kind={alignment} />
                              </button>
                            )}
                          </div>
                        </div>
                        <Stepper
                          label={ENGLISH.letter_spacing}
                          value={active.letter_spacing}
                          min={-5}
                          max={40}
                          disabled={!can_edit}
                          on_focus={push_history}
                          on_change={(letter_spacing) => patch_field(active.field_key, { letter_spacing })} />
                      </div> :
                      null}
                  </section>
                </> :
                null}
            </div>
        </aside>
      </div>

      {preview_url ?
        createPortal(
          <div className="ctb_preview" role="dialog" aria-modal="true" aria-label={ENGLISH.preview}>
            <div className="ctb_preview_bar">
              <button type="button" className="ctb_preview_close" onClick={() => remember_preview("")} aria-label={ENGLISH.close_preview}>✕</button>
              <div className="ctb_preview_title">
                <b>{name.trim() || ENGLISH.builder_title}</b>
                <small>{ENGLISH.preview_hint}</small>
              </div>
              <button
                type="button"
                className="ctb_preview_download"
                onClick={() => {
                  if (!preview_url) return;
                  const stem = String(name.trim() || "certificate").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
                  const link = document.createElement("a");
                  link.href = preview_url;
                  link.download = `${stem || "certificate"}-preview.png`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}>
                {ENGLISH.download_preview}
              </button>
            </div>
            <div
              className="ctb_preview_stage"
              onClick={(event) => {
                if (event.target === event.currentTarget) remember_preview("");
              }}>
              <div className="ctb_preview_paper">
                <img src={preview_url} alt={ENGLISH.preview} />
              </div>
            </div>
          </div>,
          document.body
        ) :
        null}
      <Confirm_Modal
        open={confirm_delete}
        title={ENGLISH.delete_certificate}
        message={ENGLISH.delete_confirm}
        confirm_label={ENGLISH.delete_certificate}
        cancel_label={ENGLISH.cancel}
        loading={busy}
        on_confirm={remove}
        on_cancel={() => set_confirm_delete(false)} />
    </section>
  );
}
