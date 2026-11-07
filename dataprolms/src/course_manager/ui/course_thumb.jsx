import { useState } from "react";

export function Course_Thumb({ url, course_name, className = "" }) {
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

  return (
    <span className={`${className} crs_desk_avatar_empty`.trim()}>
      {course_name?.slice(0, 1) || "C"}
    </span>
  );
}
