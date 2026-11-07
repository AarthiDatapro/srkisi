const REFRESH_PATH = "/api/auth/refresh";
const RENEW_MS = 10 * 60 * 1000;
const GUEST_HASHES = new Set(["/", "/login", "/register", "/forgot_password", "/employee_login"]);

const native_fetch = window.__lmsNativeFetch || window.fetch.bind(window);
window.__lmsNativeFetch = native_fetch;

let refresh_wait = null;

function request_url(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return String(input?.url || "");
}

function is_auth_url(url) {
  return /\/api\/(csrf-token|auth\/(refresh|logout|student\/login|employee\/login|student\/register))/.test(
    url
  );
}

function is_guest_screen() {
  const hash = String(window.location.hash || "#/").replace(/^#/, "") || "/";
  const path = (hash.startsWith("/") ? hash : `/${hash}`).replace(/\/+$/, "") || "/";
  return GUEST_HASHES.has(path);
}

async function csrf_header() {
  const response = await native_fetch("/api/csrf-token", { credentials: "include" });
  const data = await response.json().catch(() => ({}));
  return response.ok ? String(data.csrfToken || "") : "";
}

async function renew_session() {
  if (refresh_wait) return refresh_wait;
  refresh_wait = (async () => {
    try {
      const csrf_token = await csrf_header();
      if (!csrf_token) return false;
      const response = await native_fetch(REFRESH_PATH, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": csrf_token }
      });
      return response.ok;
    } catch (err) {
      console.error("[session] refresh failed", err?.message || err);
      return false;
    } finally {
      refresh_wait = null;
    }
  })();
  return refresh_wait;
}

if (!window.__lmsFetchWrapped) {
  window.__lmsFetchWrapped = true;
  window.fetch = async (input, init) => {
    const response = await native_fetch(input, init);
    if (response.status !== 401 || is_auth_url(request_url(input))) return response;
    const renewed = await renew_session();
    if (!renewed) return response;
    return native_fetch(input, init);
  };
}

export function start_session_keep_alive() {
  if (window.__lmsKeepAliveStarted) return;
  window.__lmsKeepAliveStarted = true;

  const tick = () => {
    if (!is_guest_screen()) renew_session();
  };

  tick();
  window.setInterval(tick, RENEW_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tick();
  });
  window.addEventListener("hashchange", tick);
}
