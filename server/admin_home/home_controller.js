import { send_error } from "../utils/send_error.js";
import { get_admin_home } from "./home_service.js";

export async function admin_home_get(req, res) {
  try {
    return res.json(await get_admin_home(req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load dashboard", "admin_home", req);
  }
}
