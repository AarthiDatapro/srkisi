import { live_text } from "../live_text.js";
import { ADMIN_UI_HINDI } from "../hindi/admin_ui_constants_hindi.js";

const ADMIN_UI_STRINGS = {
  confirm: "Confirm",
  cancel: "Cancel",
  close: "Close",
};

export const ADMIN_UI_ENGLISH = live_text(ADMIN_UI_STRINGS, ADMIN_UI_HINDI);
