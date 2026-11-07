import { log } from "@datapromr/log";

const AI_BACKEND =
  process.env.AI_BACKEND || "http://127.0.0.1:8000";

const AI_CHAT_URL = `${AI_BACKEND.replace(/\/+$/, "")}/api/ai/chat`;

/**
 * Streams AI tokens from the Python AIPipe backend.
 *
 * Node remains the authentication/session boundary.
 * Python owns prompt construction, security, LLM calls and streaming.
 */
export async function* stream_ai_chat({
  question,
  course_name,
  topic,
  lesson_content,
  conversation_history = [],
  ollama_api_key = ""
}) {
  const text = String(question || "").trim();

  if (!text) {
    const error = new Error("Question parameter is required");
    error.status = 400;
    throw error;
  }

  const request_body = {
    question: text,
    course_name: course_name || null,
    topic: topic || null,
    lesson_content: lesson_content || null,
    conversation_history: Array.isArray(conversation_history)
      ? conversation_history
      : [],
    ollama_api_key: String(ollama_api_key || "").trim() || null
  };

  log.info(
    "aiService",
    `Forwarding AI chat request to Python backend: ${AI_CHAT_URL}`
  );

  let response;

  try {
    response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream"
      },
      body: JSON.stringify(request_body)
    });
  } catch (err) {
    log.fail(
      "aiService",
      `Python AI backend connection failed: ${err.message}`
    );

    const error = new Error("Unable to connect to the AI backend");
    error.status = 502;
    throw error;
  }

  if (!response.ok) {
    let error_message =
      `Python AI backend returned HTTP ${response.status}`;

    try {
      const error_body = await response.text();

      if (error_body) {
        log.fail(
          "aiService",
          `Python AI backend error: ${error_body}`
        );
      }
    } catch {
      // Keep the generic error message.
    }

    const error = new Error(error_message);
    error.status = 502;
    throw error;
  }

  if (!response.body) {
    const error = new Error(
      "Python AI backend returned an empty response stream"
    );
    error.status = 502;
    throw error;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let has_content = false;

  try {
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);

      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split(/\r?\n/);

        for (const line of lines) {
          if (!line.startsWith("data:")) {
            continue;
          }

          const data = line.slice(5).trim();

          if (!data || data === "[DONE]") {
            continue;
          }

          let parsed;

          try {
            parsed = JSON.parse(data);
          } catch {
            log.fail(
              "aiService",
              `Invalid SSE data received from Python: ${data}`
            );
            continue;
          }

          if (parsed.error) {
            const error = new Error(parsed.error);
            error.status = 502;
            throw error;
          }

          const token = String(parsed.token || "");

          if (token) {
            has_content = true;
            yield token;
          }
        }
      }
    }

    // Process any final buffered SSE event.
    if (buffer.trim()) {
      const lines = buffer.split(/\r?\n/);

      for (const line of lines) {
        if (!line.startsWith("data:")) {
          continue;
        }

        const data = line.slice(5).trim();

        if (!data || data === "[DONE]") {
          continue;
        }

        try {
          const parsed = JSON.parse(data);

          if (parsed.error) {
            const error = new Error(parsed.error);
            error.status = 502;
            throw error;
          }

          const token = String(parsed.token || "");

          if (token) {
            has_content = true;
            yield token;
          }
        } catch (err) {
          if (err instanceof Error && err.status === 502) {
            throw err;
          }

          log.fail(
            "aiService",
            `Invalid final SSE data from Python: ${data}`
          );
        }
      }
    }
  } catch (err) {
    log.fail(
      "aiService",
      `Python AI streaming error: ${err.message}`
    );

    if (err.status) {
      throw err;
    }

    const error = new Error(
      err.message || "AI streaming failed"
    );

    error.status = 502;
    throw error;
  }

  if (!has_content) {
    const error = new Error(
      "AI service returned an empty response"
    );

    error.status = 502;
    throw error;
  }
}

