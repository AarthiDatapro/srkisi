// Step 6. Google sends the browser back to /auth/google/callback?code=...&state=...
// This page posts that code to the server, then opens the student dashboard.

import { useEffect, useRef } from "react";
import { useToast } from "@datapromr/toast";
import { finish_google, google_return_path, save_google_error } from "./google_api.js";
import "./google.css";
import { STUDENT_AUTHENTICATION_ENGLISH as ENGLISH } from "../../constants/english/student_authentication_constants_english.js";

const finished_callbacks = new Set();

export function Google_Callback({ on_done }) {
  const toast = useToast();
  const done_ref = useRef(on_done);
  const toast_ref = useRef(toast);
  done_ref.current = on_done;
  toast_ref.current = toast;

  useEffect(() => {
    const key = window.location.search || "google_callback";
    if (finished_callbacks.has(key)) return undefined;
    finished_callbacks.add(key);

    const params = new URLSearchParams(window.location.search);
    const google_error = params.get("error");
    const code = params.get("code");
    const state = params.get("state");

    function fail(message) {
      save_google_error(message);
      window.history.replaceState({}, "", "/");
      done_ref.current?.(google_return_path());
    }

    if (google_error || !code || !state) {
      fail(google_error === "access_denied" ? ENGLISH.google_sign_in_was_cancelled : ENGLISH.google_sign_in_did_not_finish);
      return undefined;
    }

    finish_google({ code, state }).
      then(async (student) => {
        sessionStorage.removeItem("google_auth_intent");
        window.history.replaceState({}, "", "/");
        await done_ref.current?.("/dashboard", student);
        toast_ref.current.success(student.created ? ENGLISH.account_created : ENGLISH.signed_in);
      }).
      catch((error) => {
        fail(error.message || ENGLISH.unable_to_sign_in_with_google);
      });

    return undefined;
  }, []);

  return (
    <section className="google_callback">
      <h1>{ENGLISH.signing_in_with_google}</h1>
    </section>
  );
}
