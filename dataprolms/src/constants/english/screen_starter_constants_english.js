import { live_text } from "../live_text.js";
import { SCREEN_STARTER_HINDI } from "../hindi/screen_starter_constants_hindi.js";

const SCREEN_STARTER_STRINGS = {
  screen_starter: "Screen starter",
  copy_this_folder_rename_it_then_wire_the: "Copy this folder, rename it, then wire the route and API.",
};

export const SCREEN_STARTER_ENGLISH = live_text(SCREEN_STARTER_STRINGS, SCREEN_STARTER_HINDI);
