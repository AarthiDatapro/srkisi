import { api_request as request } from "../api_client.js";

export function list_certificates() {
  return request("/api/certificate_manager/certificates");
}

export function list_value_sources() {
  return request("/api/certificate_manager/value_sources");
}

export function create_certificate(file, certificate_name) {
  const body = new FormData();
  body.append("certificate_name", certificate_name);
  body.append("file", file);
  return request("/api/certificate_manager/certificates", { method: "POST", body });
}

export function save_certificate(certificate_id, body) {
  return request(`/api/certificate_manager/certificates/${certificate_id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function replace_certificate_image(certificate_id, file) {
  const body = new FormData();
  body.append("file", file);
  return request(`/api/certificate_manager/certificates/${certificate_id}/image`, { method: "POST", body });
}

export function delete_certificate(certificate_id) {
  return request(`/api/certificate_manager/certificates/${certificate_id}`, { method: "DELETE" });
}

export async function preview_certificate({ file, image_url, image_width, image_height, fields }) {
  const body = new FormData();
  body.append("fields", JSON.stringify(fields || []));
  if (file) body.append("file", file);
  if (image_url) body.append("image_url", image_url);
  if (image_width) body.append("image_width", String(image_width));
  if (image_height) body.append("image_height", String(image_height));
  const response = await request("/api/certificate_manager/preview", {
    method: "POST",
    body,
    parse: "response"
  });
  return response.blob();
}
