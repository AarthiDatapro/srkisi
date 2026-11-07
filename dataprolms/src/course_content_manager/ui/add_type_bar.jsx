import { ITEM_TYPES } from "../constants.js";
import { item_icon, Plus_Icon } from "./icons.jsx";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../../constants/english/course_content_manager_constants_english.js";

const SHORT = {
  get Video() { return ENGLISH.video; },
  get Material() { return ENGLISH.file; },
  get Notes() { return ENGLISH.notes; },
  get Overview() { return ENGLISH.over; },
  get Announcement() { return ENGLISH.post; }
};

export function Add_Type_Bar({ on_pick, compact = false }) {
  return (
    <div className={compact ? "ccm_dock is_chips" : "ccm_dock"}>
      <div className="ccm_dock_fan" role="toolbar" aria-label={ENGLISH.add_resource}>
        {ITEM_TYPES.map((type) =>
        <button
          type="button"
          key={type}
          className={`ccm_dock_btn ccm_item_mark_${type.toLowerCase()}`}
          title={ENGLISH.add(type)}
          aria-label={ENGLISH.add(type)}
          onClick={() => on_pick(type)}>
          
            {item_icon(type)}
            {compact ? <span className="ccm_dock_label">{SHORT[type] || type}</span> : null}
          </button>
        )}
      </div>
      {compact ? null :
      <span className="ccm_dock_plus" aria-hidden="true">
          <Plus_Icon />
        </span>
      }
    </div>);

}
