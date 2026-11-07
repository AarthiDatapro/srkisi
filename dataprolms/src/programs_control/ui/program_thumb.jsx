import { useState } from "react";
import { Type_Glyph } from "../../dropdown_manager/ui/type_glyph.jsx";

export function Program_Thumb({
  url,
  program_type,
  program_name,
  className = "",
  fallback = "glyph"
}) {
  const [broken, set_broken] = useState(false);
  const show_image = Boolean(url) && !broken;

  if (show_image) {
    return (
      <img
        className={className || undefined}
        src={url}
        alt=""
        onError={() => set_broken(true)}
      />
    );
  }

  if (fallback === "initial") {
    return (
      <span className={className || undefined}>
        {program_name?.slice(0, 1) || "P"}
      </span>
    );
  }

  if (fallback === "empty_mark") {
    return (
      <span className={`${className} prg_mark_empty`.trim()}>
        {program_name?.slice(0, 1) || "P"}
      </span>
    );
  }

  return <Type_Glyph name={program_type} />;
}
