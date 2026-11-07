import "./theme/screen_starter.css";
import { SCREEN_STARTER_ENGLISH as ENGLISH } from "../constants/english/screen_starter_constants_english.js";

export function Screen_Starter() {
  return (
    <section className="scr_desk">
      <h1>{ENGLISH.screen_starter}</h1>
      <p>{ENGLISH.copy_this_folder_rename_it_then_wire_the}</p>
    </section>
  );
}
