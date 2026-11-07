import { api_request } from "../api_client.js";

export function get_performance_dashboard(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
  ).toString();
  return api_request(`/api/performance_dashboard${query ? `?${query}` : ""}`);
}
