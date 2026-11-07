import { api_request as request, api_url, csrf_headers } from "../api_client.js";
import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../constants/english/course_learning_constants_english.js";

function with_registration(path, registration_id) {
  const id = Number(registration_id);
  if (!Number.isInteger(id) || id < 1) return path;
  const join = path.includes("?") ? "&" : "?";
  return ENGLISH.registration_id(path, join, id);
}

export function get_learn_course(course_id, registration_id) {
  return request(with_registration(`/api/student/learn/${course_id}`, registration_id));
}

export function get_learn_lesson(course_id, lesson_id, registration_id) {
  return request(with_registration(`/api/student/learn/${course_id}/lessons/${lesson_id}`, registration_id));
}

export function complete_lesson(course_id, lesson_id, registration_id) {
  return request(with_registration(`/api/student/learn/${course_id}/lessons/${lesson_id}/complete`, registration_id), {
    method: "POST"
  });
}

export function save_lesson_feedback(course_id, lesson_id, body, registration_id) {
  return request(with_registration(`/api/student/learn/${course_id}/lessons/${lesson_id}/feedback`, registration_id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function get_learn_quiz(course_id, quiz_id, registration_id) {
  return request(with_registration(`/api/student/learn/${course_id}/quizzes/${quiz_id}`, registration_id));
}

export function run_learn_code(course_id, exercise_id, student_code, registration_id) {
  return request(with_registration(`/api/student/learn/${course_id}/exercises/${exercise_id}/run`, registration_id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_code })
  });
}

export function submit_learn_code(course_id, exercise_id, student_code, registration_id) {
  return request(with_registration(`/api/student/learn/${course_id}/exercises/${exercise_id}/submit`, registration_id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student_code })
  });
}

export function submit_learn_quiz(course_id, quiz_id, answers, duration_seconds, registration_id) {
  return request(with_registration(`/api/student/learn/${course_id}/quizzes/${quiz_id}/submit`, registration_id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, duration_seconds: duration_seconds })
  });
}

export async function stream_ai_chat_api(
{ question, course_name, topic, lesson_content, conversation_history, use_fast_responses },
on_token,
signal)
{
  const headers = await csrf_headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream"
  });

  const body = JSON.stringify({
    question,
    course_name,
    topic,
    lesson_content,
    conversation_history,
    use_fast_responses: Boolean(use_fast_responses)
  });

  let response = await fetch(api_url("/api/student/ai/chat"), {
    method: "POST",
    credentials: "include",
    headers,
    body,
    signal
  });

  if (response.status === 401 || response.status === 404) {
    response = await fetch(api_url("/api/ai/chat"), {
      method: "POST",
      credentials: "include",
      headers,
      body,
      signal
    });
  }

  if (response.status === 401 || response.status === 404) {
    response = await fetch(api_url("/api/quiz/chat"), {
      method: "POST",
      credentials: "include",
      headers,
      body,
      signal
    });
  }

  if (!response.ok) {
    const error_data = await response.json().catch(() => ({}));
    throw new Error(error_data.detail || error_data.error || error_data.message || ENGLISH.ai_service_request_failed);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data_str = trimmed.slice(5).trim();
      if (data_str === "[DONE]") return;

      try {
        const parsed = JSON.parse(data_str);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.token) on_token(parsed.token);
      } catch (err) {
        if (err.message.includes(ENGLISH.is_not_valid_json) || err.message.includes(ENGLISH.unexpected_end)) {
          continue;
        }
        throw err;
      }
    }
  }
}
