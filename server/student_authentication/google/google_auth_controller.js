// Step 4. HTTP handlers.
// start: send the Google address and remember a short-lived state cookie.
// finish: check that state, read the Google profile, save the student, set the same session cookies as email login.

import { log } from "@datapromr/log";
import {
  setAuthCookies,
  signAccessToken,
  signRefreshToken } from
"@datapromr/auth/server";
import { send_error } from "../../utils/send_error.js";
import { google_config } from "./google_config.js";
import {
  begin_google_oauth,
  clear_google_state,
  exchange_google_code,
  read_google_state } from
"./google_oauth.js";
import { find_or_create_google_student } from "./google_student.js";

function not_configured() {
  const error = new Error("Google sign-in is not configured yet. Add the Google client id and secret on the server.");
  error.status = 503;
  return error;
}

export async function google_start(req, res) {
  try {
    const config = google_config();
    if (!config.ready) throw not_configured();
    const url = begin_google_oauth(res, config, req.query?.intent);
    log.pass("googleStart", "authorization url ready", req);
    return res.json({ url });
  } catch (err) {
    return send_error(res, err, "Unable to start Google sign-in", "googleStart", req);
  }
}

const finishing = new Map();

async function complete_google(req) {
  const config = google_config();
  if (!config.ready) throw not_configured();
  const intent = read_google_state(req, req.body?.state);
  const profile = await exchange_google_code(config, req.body?.code);
  return find_or_create_google_student(profile, intent);
}

export async function google_finish(req, res) {
  const code = String(req.body?.code || "");
  let run = code ? finishing.get(code) : null;
  if (!run) {
    run = complete_google(req).finally(() => {
      if (code && finishing.get(code) === run) finishing.delete(code);
    });
    if (code) finishing.set(code, run);
  }

  try {
    const student = await run;

    const payload = {
      sub: student.student_id,
      email: student.email,
      role: "student"
    };
    setAuthCookies(res, {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload)
    });
    clear_google_state(res);

    log.pass("googleFinish", `${student.created ? "created" : "signed in"} ${student.student_id}`, req);
    return res.json(student);
  } catch (err) {
    clear_google_state(res);
    return send_error(res, err, "Unable to sign in with Google", "googleFinish", req);
  }
}
