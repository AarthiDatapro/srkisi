import { send_error } from "../utils/send_error.js";
import { analytics_scope, attendance_analytics, quiz_analytics } from "./analytics_service.js";
import { hackathon_analytics, hackathon_analytics_detail, hackathon_analytics_export } from "./hackathon_analytics_service.js";

function handle(work, message) {
  return async function analytics_handler(req, res) {
    try {
      return res.json(await work(req));
    } catch (err) {
      return send_error(res, err, message, "analytics_center", req);
    }
  };
}

export const analytics_scope_get = handle((req) => analytics_scope(req.user || {}), "Unable to load cohorts and programs");
export const quiz_analytics_get = handle((req) => quiz_analytics(req.query || {}, req.user || {}), "Unable to load quiz analytics");
export const hackathon_analytics_get = handle((req) => hackathon_analytics(req.query || {}, req.user || {}), "Unable to load hackathon analytics");
export const hackathon_detail_get = handle((req) => hackathon_analytics_detail({ ...(req.query || {}), hackathon_id: req.params.hackathonId }, req.user || {}), "Unable to load this hackathon");
export const hackathon_export_get = handle((req) => hackathon_analytics_export(req.query || {}, req.user || {}), "Unable to export hackathon analytics");
export const attendance_analytics_get = handle((req) => attendance_analytics(req.query || {}, req.user || {}), "Unable to load attendance analytics");
