import { getCsrfToken } from "@datapromr/auth/client";
import { APP_ENGLISH as ENGLISH } from "./constants/english/app_constants_english.js";

const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

export function api_url(path) {
  if (!path) return API_BASE || "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

export async function read_json(response) {
  return response.json().catch(() => ({}));
}

async function read_error_body(response) {
  const text = await response.text().catch(() => "");
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    return { message: trimmed.slice(0, 500) };
  }
  return {};
}

function message_from_status(status) {
  if (status === 413) {
    return ENGLISH.file_size_exceeds_the_allowed_limit;
  }
  if (status === 401) {
    return ENGLISH.your_session_expired_sign_in_again;
  }
  if (status === 403) {
    return ENGLISH.you_do_not_have_permission_for_this_action;
  }
  if (status === 503) {
    return ENGLISH.upload_storage_is_not_available_contact_your_administrator;
  }
  if (status >= 500) {
    return ENGLISH.server_error_please_try_again;
  }
  return "";
}

export function api_error_message(data, response, fallback) {
  const from_body =
    data?.detail ||
    data?.error ||
    data?.message ||
    (typeof data?.errors === "string" ? data.errors : "");
  if (from_body) return String(from_body);

  const from_status = message_from_status(response?.status);
  if (from_status) return from_status;

  return fallback;
}

export async function csrf_headers(headers = {}) {
  return {
    ...headers,
    "X-CSRF-Token": await getCsrfToken(),
  };
}

export async function api_request(path, options = {}) {
  const { error_message = ENGLISH.request_failed, parse = "json", ...fetch_options } = options;
  const method = String(fetch_options.method || "GET").toUpperCase();
  const headers = { ...(fetch_options.headers || {}) };

  if (method !== "GET" && method !== "HEAD" && !headers["X-CSRF-Token"]) {
    headers["X-CSRF-Token"] = await getCsrfToken();
  }

  const response = await fetch(api_url(path), {
    credentials: "include",
    ...fetch_options,
    headers,
  });

  if (parse === "response") {
    if (!response.ok) {
      const data = await read_error_body(response);
      const message = api_error_message(data, response, error_message);
      console.error(`[api] ${method} ${path} ${response.status}: ${message}`);
      throw new Error(message);
    }
    return response;
  }

  const data = response.ok ? await read_json(response) : await read_error_body(response);
  if (!response.ok) {
    const message = api_error_message(data, response, error_message);
    console.error(`[api] ${method} ${path} ${response.status}: ${message}`);
    const error = new Error(message);
    error.status = response.status;
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data;
}
