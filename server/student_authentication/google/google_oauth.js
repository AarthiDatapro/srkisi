// Step 2. Talk to Google.
// Start sends the browser to Google. Finish trades the returned code for the person's email.

import { randomBytes } from "node:crypto";
import { SECURITY } from "@datapromr/auth/server";

const STATE_COOKIE = "google_oauth_state";
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PROFILE_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cookie_options() {
  return {
    httpOnly: true,
    secure: SECURITY.COOKIE.SECURE,
    sameSite: SECURITY.COOKIE.SAME_SITE,
    path: "/",
    maxAge: 10 * 60 * 1000
  };
}

export function begin_google_oauth(res, config, intent) {
  const state = randomBytes(24).toString("hex");
  const mode = intent === "signup" ? "signup" : "login";
  res.cookie(STATE_COOKIE, `${state}:${mode}`, cookie_options());

  const query = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: config.redirect_uri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  });

  return `${AUTHORIZE_URL}?${query.toString()}`;
}

export function read_google_state(req, returned_state) {
  const saved = String(req.cookies?.[STATE_COOKIE] || "");
  const [state, intent] = saved.split(":");
  if (!state || state !== String(returned_state || "")) {
    throw fail("Google sign-in expired. Try again.", 400);
  }
  return intent === "signup" ? "signup" : "login";
}

export function clear_google_state(res) {
  res.clearCookie(STATE_COOKIE, {
    httpOnly: true,
    secure: SECURITY.COOKIE.SECURE,
    sameSite: SECURITY.COOKIE.SAME_SITE,
    path: "/"
  });
}

export async function exchange_google_code(config, code) {
  const body = new URLSearchParams({
    code: String(code || ""),
    client_id: config.client_id,
    client_secret: config.client_secret,
    redirect_uri: config.redirect_uri,
    grant_type: "authorization_code"
  });

  const token_response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const token_data = await token_response.json().catch(() => ({}));
  if (!token_response.ok || !token_data.access_token) {
    throw fail("Google did not accept that sign-in. Try again.", 401);
  }

  const profile_response = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${token_data.access_token}` }
  });
  const profile = await profile_response.json().catch(() => ({}));
  if (!profile_response.ok || !profile.email || profile.email_verified === false) {
    throw fail("Google did not share a verified email.", 401);
  }

  return {
    google_sub: String(profile.sub || ""),
    email: String(profile.email).trim().toLowerCase(),
    first_name: String(profile.given_name || profile.name || "Student").trim() || "Student",
    last_name: String(profile.family_name || "").trim()
  };
}
