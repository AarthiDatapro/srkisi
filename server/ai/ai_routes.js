import { log } from "@datapromr/log";
import { ai_chat_post } from "./ai_controller.js";

function allow_student_or_user(req, res, next) {
  if (req.user && req.user.role && !["student", "employee", "admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden: Invalid user role" });
  }
  next();
}

export function mount_ai_routes(app) {
  log.info("ai_routes", "mounting AI chat routes");
  app.post("/api/ai/chat", allow_student_or_user, ai_chat_post);
  app.post("/api/student/ai/chat", allow_student_or_user, ai_chat_post);
}
