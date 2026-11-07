import { send_error } from "../utils/send_error.js";
import { get_performance_dashboard } from "./dashboard_service.js";

export async function performance_dashboard_get(req, res) {
  try {
    return res.json(await get_performance_dashboard(req.query || {}, req.user));
  } catch (err) {
    return send_error(res, err, "Unable to load performance dashboard", "performance_dashboard", req);
  }
}
