import { api_request as request } from "../api_client.js";

export function list_employees(params) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/employees?${query}`);
}

export function get_employee(id) {
  return request(`/api/employees/${id}`);
}

export function create_employee(body) {
  return request("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function update_employee(id, body) {
  return request(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function activate_employee(id) {
  return request(`/api/employees/${id}/activate`, { method: "POST" });
}

export function deactivate_employee(id) {
  return request(`/api/employees/${id}/deactivate`, { method: "POST" });
}

export function delete_employee(id) {
  return request(`/api/employees/${id}`, { method: "DELETE" });
}

export async function upload_employee_photo(id, file) {
  const body = new FormData();
  body.append("photo", file);
  return request(`/api/employees/${id}/photo`, {
    method: "POST",
    body
  });
}

export function delete_employee_photo(id) {
  return request(`/api/employees/${id}/photo`, { method: "DELETE" });
}
