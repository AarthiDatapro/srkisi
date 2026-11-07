import { guess_source } from "./value_sources.js";

export function fresh_field(field_key, width, height, index) {
  const box_width = Math.min(520, Math.max(180, Math.round((width || 1000) * 0.42)));
  const box_height = 70;
  return {
    field_key,
    x_position: Math.max(24, Math.round((width || 1000) * 0.28)),
    y_position: Math.max(24, Math.round((height || 700) * 0.34) + index * 28),
    box_width,
    box_height,
    font_family: "Poppins",
    font_size: 48,
    font_color: "#0D1B3F",
    text_alignment: "center",
    bold: false,
    italic: false,
    underline: false,
    letter_spacing: 0,
    value_mode: "table",
    value_source: guess_source(field_key),
    value_type: guess_source(field_key).split(".")[0] || "",
    static_value: ""
  };
}
