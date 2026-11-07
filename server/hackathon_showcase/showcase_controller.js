import { send_error } from "../utils/send_error.js";
import { public_hackathon_showcase, share_hackathon_showcase } from "./showcase_service.js";

export async function showcase_share_post(req, res) {
  try {
    return res.json(await share_hackathon_showcase(req.body || {}, req.user || {}));
  } catch (err) {
    return send_error(res, err, "Unable to create the showcase link", "hackathon_showcase", req);
  }
}

export async function showcase_public_get(req, res) {
  try {
    return res.json(await public_hackathon_showcase(req.params.token));
  } catch (err) {
    return send_error(res, err, "Unable to load this showcase", "hackathon_showcase", req);
  }
}
