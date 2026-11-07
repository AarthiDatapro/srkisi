import { useEffect, useState } from "react";
import { APP_ENGLISH as ENGLISH } from "../constants/english/app_constants_english.js";
import { get_language, LANGUAGE_LABEL, set_language, subscribe_language } from "../constants/language.js";

export function Language_Toggle({ fixed = false }) {
  const [language, set_language_state] = useState(get_language);
  useEffect(() => subscribe_language(set_language_state), []);

  return (
    <div
      className={fixed ? "lms_language_toggle lms_language_toggle_fixed" : "lms_language_toggle"}
      role="group"
      aria-label={language === "hindi" ? ENGLISH.switch_to_english : ENGLISH.switch_to_hindi}>
      <button type="button" className={language === "english" ? "is_on" : ""} onClick={() => set_language("english")}>
        {LANGUAGE_LABEL.english}
      </button>
      <button type="button" className={language === "hindi" ? "is_on" : ""} onClick={() => set_language("hindi")}>
        {LANGUAGE_LABEL.hindi}
      </button>
    </div>
  );
}
