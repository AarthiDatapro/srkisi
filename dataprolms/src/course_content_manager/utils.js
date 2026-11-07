import { validateOptionalText, validateRequiredText } from "@datapromr/validation";
import { format_date, pretty_date } from "../design_system/format.js";
import { face_tone, initials_from_name } from "../design_system/people.js";
import { TEXT_TYPES } from "./constants.js";
import { COURSE_CONTENT_MANAGER_ENGLISH as ENGLISH } from "../constants/english/course_content_manager_constants_english.js";

export { face_tone, format_date, initials_from_name, pretty_date };

export function get_module_errors(values) {
  return {
    module_title: validateRequiredText(values.module_title, ENGLISH.module_title, 200),
    module_description: validateOptionalText(values.module_description, ENGLISH.description, 2000)
  };
}

export function get_lesson_errors(values, { require_module = false } = {}) {
  const minutes = String(values.duration_minutes ?? "").trim();
  return {
    lesson_title: validateRequiredText(values.lesson_title, ENGLISH.lesson_title, 200),
    lesson_description: validateOptionalText(values.lesson_description, ENGLISH.description, 2000),
    duration_minutes:
    minutes && (!/^\d+$/.test(minutes) || Number(minutes) <= 0) ?
    ENGLISH.enter_minutes_as_a_whole_number :
    "",
    module_id: require_module && !values.module_id ? ENGLISH.select_a_module : ""
  };
}

export function is_text_type(type) {
  return TEXT_TYPES.includes(String(type || "").trim());
}

export function normalize_http_url(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function link_host_label(url) {
  try {
    const host = new URL(normalize_http_url(url) || url).hostname.replace(/^www\./, "");
    if (host.includes("drive.google") || host === "docs.google.com") return ENGLISH.google_drive;
    if (host.includes("dropbox")) return ENGLISH.dropbox;
    if (host.includes("onedrive") || host.includes("sharepoint") || host.includes("1drv.ms")) {
      return "OneDrive";
    }
    if (host.includes("youtube") || host === "youtu.be") return "YouTube";
    if (host.includes("vimeo")) return ENGLISH.vimeo;
    return host || ENGLISH.link;
  } catch {
    return ENGLISH.link;
  }
}

function is_zip_file(file) {
  const name = String(file?.name || file?.originalname || "").toLowerCase();
  const mime = String(file?.type || file?.mimetype || "").toLowerCase();
  return name.endsWith(".zip") || mime.includes("zip");
}

export function get_item_errors(values, file) {
  const type = String(values.content_type || "").trim();
  if (type === ENGLISH.overview) {
    const body = String(values.content_description || "").trim();
    return {
      content_type: "",
      content_title: "",
      content_description: body ? validateOptionalText(values.content_description, ENGLISH.body, 8000) : ENGLISH.body_is_required,
      content_url: "",
      file: ""
    };
  }
  if (type === ENGLISH.announcement) {
    const body = String(values.content_description || "").trim();
    return {
      content_type: "",
      content_title: "",
      content_description: body ? validateOptionalText(values.content_description, ENGLISH.message, 8000) : ENGLISH.message_is_required,
      content_url: "",
      file: ""
    };
  }
  if (type === ENGLISH.notes) {
    return {
      content_type: "",
      content_title: validateRequiredText(values.content_title, ENGLISH.title, 200),
      content_description: "",
      content_url: "",
      file: is_zip_file(file) ? "" : ENGLISH.upload_a_zip_of_html_files
    };
  }
  const mode = values.source_mode === "file" ? "file" : "link";
  const url = normalize_http_url(values.content_url);
  const raw_url = String(values.content_url || "").trim();
  const body = String(values.content_description || "").trim();
  const text_type = is_text_type(type);
  let description_error = validateOptionalText(values.content_description, ENGLISH.body, 8000);
  let url_error = "";
  let file_error = "";

  if (mode === "link") {
    if (raw_url && !url) url_error = ENGLISH.enter_a_valid_http_s_link;else
    if (!url && !file) {
      if (text_type && !body) description_error = ENGLISH.add_text_a_link_or_a_file;else
      if (!text_type) url_error = ENGLISH.paste_a_drive_dropbox_youtube_or_other_file;
    }
  } else if (!file) {
    if (text_type && !body) description_error = ENGLISH.add_text_or_choose_a_file;else
    if (!text_type) file_error = ENGLISH.choose_a_file_from_this_device;
  }

  return {
    content_type: type ? "" : ENGLISH.select_a_type,
    content_title: validateRequiredText(values.content_title, ENGLISH.title, 200),
    content_description: description_error,
    content_url: url_error,
    file: file_error
  };
}

export const DIFFICULTY_KEYS = ["easy", "medium", "hard"];
export const BLOOM_KEYS = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

export function mix_total(mix = {}) {
  return Object.values(mix).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export function default_difficulty_mix(count) {
  const n = Math.max(0, Number(count) || 0);
  const easy = Math.floor(n * 0.4);
  const hard = Math.floor(n * 0.2);
  return { easy: String(easy), medium: String(Math.max(0, n - easy - hard)), hard: String(hard) };
}

export function default_bloom_mix(count) {
  const n = Math.max(0, Number(count) || 0);
  const keys = ["remember", "understand", "apply", "analyze", "evaluate"];
  const base = Math.floor(n / keys.length);
  let rest = n - base * keys.length;
  const mix = { create: "0" };
  for (const key of keys) {
    const extra = rest > 0 ? 1 : 0;
    rest -= extra;
    mix[key] = String(base + extra);
  }
  return mix;
}

export function get_coding_errors(values, { require_module = false, require_lesson = true } = {}) {
  const prompt = String(values.prompt || "").trim();
  return {
    set_title: validateRequiredText(values.set_title, ENGLISH.exercise_name, 200),
    module_id: require_module && !values.module_id ? ENGLISH.select_a_module : "",
    lesson_id: require_lesson && !values.lesson_id ? ENGLISH.select_a_lesson : "",
    programming_language_id: values.programming_language_id ? "" : ENGLISH.select_a_programming_language,
    prompt: prompt.length < 10 ? ENGLISH.describe_the_exercise_in_at_least_10_characters : ""
  };
}

export function get_quiz_errors(values, { require_module = false, require_lesson = false, editing = false } = {}) {
  const count = String(values.count ?? "").trim();
  const shown = String(values.questions_shown ?? "").trim();
  const text = String(values.text || "").trim();
  const shown_number = Number(shown);
  const placement = {
    module_id: require_module && !values.module_id ? ENGLISH.select_a_module : "",
    lesson_id: require_lesson && !values.lesson_id ? ENGLISH.select_a_lesson : ""
  };
  if (editing) {
    const bank = Array.isArray(values.questions) ? values.questions.length : 0;
    return {
      quiz_name: validateRequiredText(values.quiz_name, ENGLISH.quiz_name, 200),
      ...placement,
      questions: get_questions_error(values.questions),
      questions_shown:
      !/^\d+$/.test(shown) || shown_number < 1 || shown_number > 100 ?
      ENGLISH.enter_1_to_100_questions :
      bank && shown_number > bank ?
      ENGLISH.cannot_exceed_questions_in_this_quiz(bank) :
      ""
    };
  }
  const generated = Number(count);
  const difficulty_total = mix_total(values.difficulty_mix);
  const bloom_total = mix_total(values.bloom_mix);
  return {
    quiz_name: validateRequiredText(values.quiz_name, ENGLISH.quiz_name, 200),
    text: text.length < 20 ? ENGLISH.paste_at_least_20_characters_of_source_text : "",
    count: !/^\d+$/.test(count) || generated < 1 || generated > 100 ?
    ENGLISH.enter_1_to_100_questions :
    "",
    questions_shown:
    !/^\d+$/.test(shown) || shown_number < 1 || shown_number > 100 ?
    ENGLISH.enter_1_to_100_questions :
    /^\d+$/.test(count) && shown_number > generated ?
    ENGLISH.cannot_exceed_the_number_of_generated_questions :
    "",
    difficulty_mix:
    /^\d+$/.test(count) && difficulty_total !== generated ?
    ENGLISH.difficulty_counts_must_add_up_to_currently(generated, difficulty_total) :
    "",
    bloom_mix:
    /^\d+$/.test(count) && bloom_total !== generated ?
    ENGLISH.bloom_counts_must_add_up_to_currently(generated, bloom_total) :
    "",
    ...placement
  };
}

function get_questions_error(questions) {
  if (!Array.isArray(questions) || !questions.length) return ENGLISH.add_at_least_one_question;
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const text = String(question.question_text || "").trim();
    const options = (question.options || []).map((item) => String(item || "").trim()).filter(Boolean);
    const correct = String(question.correct_answer || "").trim();
    if (!text) return ENGLISH.question_needs_text(index + 1);
    if (options.length < 2) return ENGLISH.question_needs_at_least_two_options(index + 1);
    if (!correct || !options.includes(correct)) {
      return ENGLISH.question_needs_a_marked_correct_answer(index + 1);
    }
  }
  return "";
}

export function form_from_quiz(quiz) {
  const questions = (quiz?.questions || []).map((question) => ({
    question_id: question.question_id,
    question_text: question.question_text || "",
    options: pad_options(question.options),
    correct_answer: question.correct_answer || "",
    explanation: question.explanation || "",
    difficulty: question.difficulty || "medium",
    bloom_level: question.bloom_level || "understand"
  }));
  return {
    module_id: quiz?.module_id || "",
    lesson_id: quiz?.lesson_id || "",
    quiz_name: quiz?.quiz_title || "",
    text: "",
    count: String(quiz?.question_count || questions.length || 10),
    questions_shown: String(quiz?.questions_shown || quiz?.question_count || questions.length || 10),
    is_published: quiz?.is_published !== false,
    questions: questions.length ? questions : [empty_question()]
  };
}

export function empty_question() {
  return {
    question_id: null,
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    explanation: "",
    difficulty: "medium",
    bloom_level: "understand"
  };
}

export function pad_options(options) {
  const list = Array.isArray(options) ? options.map((item) => String(item || "")) : [];
  while (list.length < 4) list.push("");
  return list.slice(0, Math.max(4, list.length));
}

export function has_errors(errors) {
  return Object.values(errors).some(Boolean);
}

export function format_minutes(value) {
  if (!value) return "";
  const minutes = Number(value);
  if (!minutes) return "";
  if (minutes < 60) return ENGLISH.min(minutes);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function format_clock(seconds) {
  const total = Number(seconds);
  if (!total) return "";
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function format_bytes(bytes) {
  const size = Number(bytes);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function format_course_hours(value) {
  if (value === 0 || value) return ENGLISH.hours(value);
  return "";
}

export function format_hours(value) {
  if (value === 0 || value) return ENGLISH.hours(value);
  return "—";
}

export function format_fee(value) {
  if (value == null || value === "") return ENGLISH.free;
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function format_date_time(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function item_hint(item) {
  if (item.content_url) {
    return [link_host_label(item.content_url), format_clock(item.duration_seconds)].filter(Boolean).join(" · ");
  }
  if (item.content_type === ENGLISH.video) {
    return [ENGLISH.video_file, format_clock(item.duration_seconds)].filter(Boolean).join(" · ");
  }
  if (is_text_type(item.content_type) && !item.file_name) {
    return item.content_description ? ENGLISH.text : item.content_type;
  }
  return [item.file_name ? item.file_name.split(".").pop()?.toUpperCase() : item.content_type, format_bytes(item.file_size_bytes)].
  filter(Boolean).
  join(" · ");
}

export function lesson_item_count(lesson) {
  return lesson?.items?.length || 0;
}

export function reorder_payload(modules = []) {
  return {
    module_ids: modules.map((module) => module.module_id),
    blocks: modules.flatMap((module) =>
    (module.blocks || []).map((block) => ({
      content_id: block.content_id,
      module_id: module.module_id,
      lesson_id: block.lesson?.lesson_id,
      quiz_id: block.quiz?.quiz_id,
      coding_set_id: block.coding?.coding_set_id
    }))
    )
  };
}

export function content_stats(modules = []) {
  const blocks = modules.flatMap((module) => module.blocks || []);
  const lessons = blocks.filter((block) => block.content_type === "lesson" && block.lesson);
  const quizzes = blocks.filter((block) => block.content_type === "quiz");
  const minutes = lessons.reduce((sum, block) => sum + (Number(block.lesson.duration_minutes) || 0), 0);
  return {
    total: blocks.length,
    modules: modules.length,
    lessons: lessons.length,
    quizzes: quizzes.length,
    duration: format_minutes(minutes) || ENGLISH.label_0_min
  };
}
