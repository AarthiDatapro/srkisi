import { log } from "@datapromr/log";
import {
  readRefreshToken,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken } from
"@datapromr/auth/server";

export function refresh_session(req, res) {
  const token = readRefreshToken(req);
  if (!token) {
    log.fail("refreshSession", "no refresh token", req);
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = verifyRefreshToken(token);
    const next = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role
    };
    setAuthCookies(res, {
      accessToken: signAccessToken(next),
      refreshToken: signRefreshToken(next)
    });
    log.pass("refreshSession", `renewed ${next.sub || next.email || ""}`, req);
    return res.status(200).json({ ok: true });
  } catch (err) {
    log.fail("refreshSession", err.message, req);
    return res.status(401).json({ error: "Authentication required" });
  }
}

export function mount_auth_refresh(app) {
  log.info("auth_refresh", "mounting session refresh route");
  app.post("/api/auth/refresh", refresh_session);
}
