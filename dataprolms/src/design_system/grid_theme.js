import { DESIGN_SYSTEM_ENGLISH as ENGLISH } from "../constants/english/design_system_constants_english.js";
export const GRID_THEME = {
  primary: "#EB7828",
  primaryDark: "#C45A12",
  get primarySoft() { return ENGLISH.rgba_26_47_122_0_12; },
  border: "#d7deea",
  text: "#1C140C",
  muted: "#5d6673",
  background: "transparent",
  surface: "#ffffff",
  headerBg: "#F4F1EB",
  radius: "10px",
  get fontFamily() { return ENGLISH.outfit_segoe_ui_sans_serif; },
  fontSize: "14px"
};
