import { api_request as request } from "../api_client.js";
import { HACKATHON_SHOWCASE_ENGLISH as ENGLISH } from "../constants/english/hackathon_showcase_constants_english.js";

export function create_showcase_link(body) {
  return request("/api/hackathon_showcase/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    error_message: ENGLISH.unable_to_create_the_showcase_link
  });
}

export function get_public_showcase(token) {
  return request(`/api/public/hackathon_showcase/${encodeURIComponent(token)}`, { error_message: ENGLISH.unable_to_load_this_showcase });
}

export function showcase_url(token) {
  return `${window.location.origin}${window.location.pathname}#/hackathon_showcase/${token}`;
}
