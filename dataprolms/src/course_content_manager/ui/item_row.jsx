import { ActionButton, TrashIcon, ViewIcon } from "@datapromr/action-button";
import { item_hint } from "../utils.js";
import { item_icon } from "./icons.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

const NO_PREVIEW = new Set(["notes", "overview", "announcement"]);

export function Item_Row({ item, on_preview, on_delete }) {
  const type = String(item.content_type || "").toLowerCase();
  const can_preview = !NO_PREVIEW.has(type) && Boolean(
    item.content_url || item.file_path || item.content_description
  );

  return (
    <article className={`ccm_file ccm_file_${type}`} title={item_hint(item)}>
      <span className="ccm_file_mark">{item_icon(item.content_type)}</span>
      <span className="ccm_file_name">{item.content_title || ENGLISH.untitled}</span>
      <span className="ccm_file_tools">
        {can_preview ?
        <ActionButton label={ENGLISH.preview} onClick={() => on_preview(item)}>
            <ViewIcon />
          </ActionButton> :
        null}
        {on_delete ?
        <ActionButton label={ENGLISH.label_delete} tone="danger" onClick={() => on_delete(item)}>
            <TrashIcon />
          </ActionButton> :
        null}
      </span>
    </article>);

}
