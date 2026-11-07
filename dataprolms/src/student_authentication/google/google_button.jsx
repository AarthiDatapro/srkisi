// The button on Login and Sign up. Both buttons use the same Google account flow.

import { useState } from "react";
import { useToast } from "@datapromr/toast";
import { remember_google_intent, start_google } from "./google_api.js";
import "./google.css";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../../constants/english/student_authentication_constants_english.js";

function Google_Mark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

export function Google_Button({ intent = "login" }) {
  const [loading, set_loading] = useState(false);
  const toast = useToast();
  const label = intent === "signup" ? ENGLISH.sign_up_with_google : ENGLISH.login_with_google;

  async function begin() {
    set_loading(true);
    try {
      const data = await start_google(intent);
      remember_google_intent(intent);
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error.message || ENGLISH.unable_to_start_google_sign_in);
      set_loading(false);
    }
  }

  return (
    <div className="google_sign_in">
      <button type="button" className="google_button" disabled={loading} onClick={begin}>
        <Google_Mark />
        {loading ? ENGLISH.opening_google : label}
      </button>
      <p className="google_or">{ENGLISH.or}</p>
    </div>
  );
}
