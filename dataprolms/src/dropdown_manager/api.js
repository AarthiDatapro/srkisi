import { api_request as request } from "../api_client.js";

export function list_dropdowns() {
  return request("/api/dropdowns");
}

export function list_dropdown_options(key, params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/dropdowns/${key}${query ? `?${query}` : ""}`);
}

export function create_dropdown_option(key, body) {
  return request(`/api/dropdowns/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_dropdown_option(key, id, body) {
  return request(`/api/dropdowns/${key}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function activate_dropdown_option(key, id) {
  return request(`/api/dropdowns/${key}/${id}/activate`, { method: "POST" });
}

export function deactivate_dropdown_option(key, id) {
  return request(`/api/dropdowns/${key}/${id}/deactivate`, { method: "POST" });
}

export function delete_dropdown_option(key, id) {
  return request(`/api/dropdowns/${key}/${id}`, { method: "DELETE" });
}
