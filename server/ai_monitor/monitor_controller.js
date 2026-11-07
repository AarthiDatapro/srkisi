import { send_error } from "../utils/send_error.js";
import {
  chatbot_detail,
  chatbot_report,
  list_monitor_options,
  mock_interview_certificate,
  mock_interview_detail,
  mock_interview_report,
  save_mock_interview_certificate,
  resume_detail,
  resume_report
} from "./monitor_service.js";

function handle(work, message) {
  return async function monitor_handler(req, res) {
    try {
      return res.json(await work(req));
    } catch (err) {
      return send_error(res, err, message, "ai_monitor", req);
    }
  };
}

export const monitor_options = handle((req) => list_monitor_options(req.user || {}), "Unable to load filters");
export const mock_interviews_report = handle((req) => mock_interview_report(req.query || {}, req.user || {}), "Unable to load mock interview activity");
export const mock_interviews_certificate = handle(() => mock_interview_certificate(), "Unable to load certificate templates");
export const mock_interviews_certificate_save = handle((req) => save_mock_interview_certificate(req.body || {}), "Unable to assign this certificate");
export const mock_interviews_detail = handle((req) => mock_interview_detail(req.params.id), "Unable to load this interview");
export const resumes_report = handle((req) => resume_report(req.query || {}, req.user || {}), "Unable to load resume analyser activity");
export const resumes_detail = handle((req) => resume_detail(req.params.id), "Unable to load this analysis");
export const chats_report = handle((req) => chatbot_report(req.query || {}, req.user || {}), "Unable to load chatbot usage");
export const chats_detail = handle((req) => chatbot_detail(req.params.id), "Unable to load this chat");
