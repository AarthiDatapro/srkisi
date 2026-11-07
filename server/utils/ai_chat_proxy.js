import { log } from "@datapromr/log";
import { ai_chat_post } from "../ai/ai_controller.js";

export function mount_ai_chat_proxy(app) {
  log.info("ai_chat_proxy", "mounting quiz chat proxy");
  app.post("/api/quiz/chat", ai_chat_post);
}
