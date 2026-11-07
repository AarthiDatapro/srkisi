import { log } from "@datapromr/log";

function ai_backend_base() {
  return String(process.env.AI_BACKEND || process.env.ai_backend || "").trim().replace(/\/+$/, "");
}

export function ai_backend_url(pathname) {
  const base = ai_backend_base();
  if (!base) {
    log.fail("ai_backend_url", "AI_BACKEND is not configured");
    const error = new Error("AI_BACKEND is not configured");
    error.status = 500;
    throw error;
  }

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(path, `${base}/`).toString();
}
