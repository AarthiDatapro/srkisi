import { api_request } from "../api_client.js";
import { ADMIN_HOME_ENGLISH as ENGLISH } from "../constants/english/admin_home_constants_english.js";

export function get_admin_home() {
  return api_request("/api/admin_home", { error_message: ENGLISH.unable_to_load_dashboard });
}
