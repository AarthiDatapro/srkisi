import { PowerIcon, TrashIcon } from "@datapromr/action-button";
import { Link_Text } from "../../design_system/link_text.jsx";
import { Program_Thumb } from "./program_thumb.jsx";
import { PROGRAMS_CONTROL_ENGLISH as ENGLISH } from "../../constants/english/programs_control_constants_english.js";

export function Program_Overview({
  program,
  on_back,
  on_toggle,
  on_delete
}) {
  if (!program) return null;
  const description = String(program.description || "").trim();
  const thumb_size = description.length > 220 ? " is_large" : description.length > 90 ? " is_mid" : "";

  return (
    <section className="prg_desk_overview">
      {on_back ?
      <button type="button" className="prg_desk_back" onClick={on_back}>{ENGLISH.programs_2}</button> :
      null}
      <span className={`prg_desk_hero${thumb_size}`}>
        <Program_Thumb
          url={program.thumbnail_url}
          program_type={program.program_type}
          program_name={program.program_name}
          fallback="glyph"
        />
      </span>

      <div className="prg_desk_overview_title">
        <div className="prg_desk_title_row">
          <h2>{program.program_name}</h2>
          <span className={program.is_active ? "prg_desk_pill is_on" : "prg_desk_pill"}>
            {program.is_active ? ENGLISH.active : ENGLISH.inactive_2}
          </span>
        </div>
        <p className="prg_desk_lede"><Link_Text text={program.description || ENGLISH.no_description_yet} /></p>
      </div>

      {on_toggle || on_delete ?
      <div className="prg_desk_overview_actions">
          {on_toggle ?
        <button
          type="button"
          className="prg_desk_icon_btn"
          aria-label={program.is_active ? ENGLISH.deactivate : ENGLISH.activate}
          onClick={on_toggle}>
            <PowerIcon />
          </button> :
        null}
          {on_delete ?
        <button
          type="button"
          className="prg_desk_icon_btn is_danger"
          aria-label={ENGLISH.label_delete}
          onClick={on_delete}>
            <TrashIcon />
          </button> :
        null}
        </div> :
      null}
    </section>);

}
