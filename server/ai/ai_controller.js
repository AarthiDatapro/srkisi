import { log } from "@datapromr/log";
import { start_chat_log } from "../ai_monitor/chat_log.js";
import { stream_ai_chat } from "../services/ai_service.js";
import { get_student_ollama_api_key } from "../student_profile/profile_service.js";

export async function ai_chat_post(req, res) {
  const chat_log = start_chat_log(req, req.body || {});
  try {
    const {
      question,
      course_name,
      topic,
      lesson_content,
      conversation_history,
      use_fast_responses
    } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    let ollama_api_key = "";
    let key_source = "env";
    if (use_fast_responses) {
      ollama_api_key = await get_student_ollama_api_key(req.user);
      if (!ollama_api_key) {
        return res.status(400).json({
          error: "Add your Ollama API key in Profile or under For fast responses first."
        });
      }
      key_source = "profile";
    }

    log.info(
      "aiChatPost",
      key_source === "profile"
        ? "using profile API key (student key from DB)"
        : "using env API key (OLLAMA_API_KEY from .env)"
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let is_disconnected = false;
    req.on("close", () => {
      is_disconnected = true;
    });

    const stream = stream_ai_chat({
      question,
      course_name,
      topic,
      lesson_content,
      conversation_history,
      ollama_api_key
    });

    for await (const token of stream) {
      if (is_disconnected) break;
      chat_log.mark_token(token);
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    chat_log.finish(is_disconnected ? "aborted" : "ok");
    if (!is_disconnected) {
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (err) {
    log.fail("aiChatPost", err.message);
    chat_log.finish("error", err.message);
    if (!res.headersSent) {
      return res.status(err.status || 500).json({
        error: err.message || "Failed to process AI chat request"
      });
    }
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    return res.end();
  }
}
