import { api_request as request } from "../api_client.js";

export function list_screen_starter(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
  ).toString();
  return request(`/api/screen_starter${query ? `?${query}` : ""}`);
}
