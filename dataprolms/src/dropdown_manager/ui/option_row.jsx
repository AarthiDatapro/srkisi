import {
  Action_Button,
  Edit_Icon,
  Power_Icon,
  Trash_Icon } from
"../../admin_ui/row_actions.jsx";
import { Link_Text } from "../../design_system/link_text.jsx";
import { Type_Glyph } from "./type_glyph.jsx";
import { DROPDOWN_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/dropdown_manager_constants_english.js";

function tag_ink(hex) {
  const value = String(hex || "").replace("#", "");
  if (value.length !== 6) return "#ffffff";
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  if ([red, green, blue].some((part) => Number.isNaN(part))) return "#ffffff";
  return (red * 299 + green * 587 + blue * 114) / 1000 > 170 ? "#1C140C" : "#ffffff";
}

function format_added(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function Option_Row({ option, usage_noun = "item", on_edit, on_toggle, on_delete }) {
  const used = Number(option.used_count || 0);
  const added = format_added(option.created_at);
  const sample = option.code_letters ?
    `DP-${option.code_letters}-${option.number_next === "" || option.number_next == null ? "—" : option.number_next}` :
    "";
  const detail = [sample, option.description, added ? ENGLISH.added(added) : ""].
  filter(Boolean).
  join(" · ");

  return (
    <article
      className={option.is_active ? "ddm_row" : "ddm_row ddm_row_muted"}
      onClick={on_edit ? () => on_edit(option) : undefined}>
      
      <div className="ddm_identity">
        <span
          className="ddm_mark"
          style={option.color ? { background: option.color, color: tag_ink(option.color) } : undefined}>
          <Type_Glyph name={option.name} />
        </span>
        <div className="ddm_row_copy">
          <h3>{option.name}</h3>
          {detail ? <p><Link_Text text={detail} /></p> : null}
        </div>
      </div>

      <span className="ddm_usage">
        {used} {used === 1 ? usage_noun : `${usage_noun}s`}
      </span>

      <span className={option.is_active ? "ddm_live" : "ddm_live ddm_live_off"}>
        {option.is_active ? ENGLISH.active_2 : ENGLISH.inactive}
      </span>

      <div className="ddm_row_actions" onClick={(event) => event.stopPropagation()}>
        {on_edit ?
        <Action_Button label={ENGLISH.edit_2} onClick={() => on_edit(option)}>
            <Edit_Icon />
          </Action_Button> :
        null}
        {on_toggle ?
        <Action_Button
          label={option.is_active ? ENGLISH.deactivate : ENGLISH.activate}
          tone={option.is_active ? "neutral" : "success"}
          onClick={(event) => on_toggle(event, option)}>
          
            <Power_Icon />
          </Action_Button> :
        null}
        {on_delete ?
        <Action_Button
          label={ENGLISH.label_delete}
          tone="danger"
          onClick={(event) => on_delete(event, option)}>
          
            <Trash_Icon />
          </Action_Button> :
        null}
      </div>
    </article>);

}
