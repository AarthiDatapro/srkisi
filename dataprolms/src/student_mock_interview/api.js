import { api_request as request } from "../api_client.js";
import { STUDENT_MOCK_INTERVIEW_ENGLISH as ENGLISH } from "../constants/english/student_mock_interview_constants_english.js";

export function mock_interview_profile_photo() {
  return request("/api/student/mock_interview/profile_photo", {
    error_message: ENGLISH.unable_to_check_your_profile_photo
  });
}

export async function upload_mock_interview_profile_photo(file) {
  const form = new FormData();
  form.append("photo", file);
  const payload = await request("/api/student/profile/photo", {
    method: "POST",
    body: form,
    error_message: ENGLISH.unable_to_save_your_profile_photo
  });
  const profile_photo_url = payload?.student?.profile_photo_url || "";
  return {
    has_photo: Boolean(profile_photo_url),
    profile_photo_url
  };
}

export function current_mock_interview() {
  return request("/api/student/mock_interview/current", {
    error_message: ENGLISH.unable_to_load_the_interview
  });
}

export function start_previous_interview(language = "en-IN") {
  return request("/api/student/mock_interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role_source: "previous",
      language
    }),
    error_message: ENGLISH.unable_to_start_the_mock_interview
  });
}

export function start_course_interview(
  course_context,
  language = "en-IN"
) {
  return request("/api/student/mock_interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role_source: "course",
      course_context,
      language
    }),
    error_message: ENGLISH.unable_to_start_the_mock_interview
  });
}

export function start_mock_interview({
  file,
  role_source,
  job_id,
  target_role,
  language = "en-IN",
  experience_level = ""
}) {
  const form = new FormData();

  form.append("file", file);
  form.append("role_source", role_source);
  form.append("language", language);
  if (experience_level) form.append("experience_level", experience_level);

  if (job_id) form.append("job_id", String(job_id));
  if (target_role) form.append("target_role", target_role);

  return request("/api/student/mock_interview", {
    method: "POST",
    body: form,
    error_message: ENGLISH.unable_to_start_the_mock_interview
  });
}

function audio_as_file(audio) {
  if (!audio) return null;
  if (audio instanceof File && audio.size) return audio;
  if (!audio.size) return null;
  const type = String(audio.type || "audio/webm").split(";")[0] || "audio/webm";
  const ext = type.includes("mp4") ? "m4a" : "webm";
  return new File([audio], `answer.${ext}`, { type });
}

export function answer_mock_interview(mock_interview_id, answer, audio) {
  if (audio != null) {
    const file = audio_as_file(audio);
    if (!file) {
      return Promise.reject(new Error(ENGLISH.recording_was_not_saved));
    }
    const form = new FormData();
    form.append("answer", answer);
    form.append("has_audio", "1");
    form.append("audio", file, file.name);
    return request(`/api/student/mock_interview/${mock_interview_id}/answer`, {
      method: "POST",
      body: form,
      error_message: ENGLISH.unable_to_save_recording
    });
  }
  return request(`/api/student/mock_interview/${mock_interview_id}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer }),
    error_message: ENGLISH.unable_to_submit_this_answer
  });
}

export function finish_mock_interview(mock_interview_id) {
  return request(`/api/student/mock_interview/${mock_interview_id}/finish`, {
    method: "POST",
    error_message: ENGLISH.unable_to_finish_the_interview
  });
}

export function get_student_fresher_quiz(job_id) {
  return request(`/api/student/jobs/${job_id}/fresher_quiz`, {
    error_message: ENGLISH.unable_to_load_the_fresher_quiz
  });
}

export function start_student_fresher_quiz(job_id, { language = "" } = {}) {
  return request(`/api/student/jobs/${job_id}/fresher_quiz/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
    error_message: ENGLISH.unable_to_start_the_fresher_quiz
  });
}

export function save_student_fresher_progress(job_id, answers) {
  return request(`/api/student/jobs/${job_id}/fresher_quiz/progress`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
    error_message: ENGLISH.unable_to_save_the_fresher_quiz
  });
}

export function submit_student_fresher_quiz(job_id, answers) {
  return request(`/api/student/jobs/${job_id}/fresher_quiz/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
    error_message: ENGLISH.unable_to_submit_the_fresher_quiz
  });
}

export function list_mock_interviews() {
  return request("/api/student/mock_interviews", {
    error_message: ENGLISH.unable_to_load_mock_interviews
  });
}

export function get_mock_interview(mock_interview_id) {
  return request(`/api/student/mock_interview/${mock_interview_id}`, {
    error_message: ENGLISH.unable_to_load_the_interview
  });
}

export function resume_live_mock_interview(mock_interview_id) {
  return request(`/api/student/mock_interview/${mock_interview_id}/resume`, {
    method: "POST",
    error_message: ENGLISH.unable_to_resume_the_interview
  });
}

export function reattempt_mock_interview(mock_interview_id, question_number, answer, audio) {
  if (audio != null) {
    const file = audio_as_file(audio);
    if (!file) {
      return Promise.reject(new Error(ENGLISH.recording_was_not_saved));
    }
    const form = new FormData();
    form.append("question_number", String(question_number));
    form.append("answer", answer);
    form.append("has_audio", "1");
    form.append("audio", file, file.name);
    return request(`/api/student/mock_interview/${mock_interview_id}/reattempt`, {
      method: "POST",
      body: form,
      error_message: ENGLISH.unable_to_save_recording
    });
  }
  return request(`/api/student/mock_interview/${mock_interview_id}/reattempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_number, answer }),
    error_message: ENGLISH.unable_to_reattempt_this_answer
  });
}

export function delete_mock_interview(mock_interview_id) {
  return request(`/api/student/mock_interview/${mock_interview_id}`, {
    method: "DELETE",
    error_message: ENGLISH.unable_to_delete_the_interview
  });
}

export function retry_mock_interview(mock_interview_id, language = "en-IN") {
  return request(`/api/student/mock_interview/${mock_interview_id}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
    error_message: ENGLISH.unable_to_start_the_interview_again
  });
}

export function download_mock_interview_certificate(mock_interview_id) {
  return request(`/api/student/mock_interview/${mock_interview_id}/certificate`, {
    parse: "response",
    error_message: ENGLISH.unable_to_download_this_certificate
  });
}
