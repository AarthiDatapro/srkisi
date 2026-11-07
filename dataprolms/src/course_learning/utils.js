import { COURSE_LEARNING_ENGLISH as ENGLISH } from "../constants/english/course_learning_constants_english.js";
export { initials } from "../design_system/people.js";

export function format_clock(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  const mins = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function format_minutes(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return "";
  const total = Math.round(value * 60);
  return format_clock(total) || ENGLISH.min(value);
}

export function youtube_id(url) {
  const value = String(url || "");
  const match = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : "";
}

export function drive_file_id(url) {
  const value = String(url || "");
  const file = value.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
  if (file) return file[1];
  if (/drive\.google\.com|docs\.google\.com/.test(value)) {
    const open = value.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (open) return open[1];
  }
  return "";
}

export function vimeo_id(url) {
  const match = String(url || "").match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : "";
}

function is_direct_media(url) {
  return /\.(mp4|webm|ogg|ogv|mov|m4v|mp3|wav|pdf)(\?|#|$)/i.test(String(url || ""));
}

export function video_source(lesson) {
  const videos = (lesson?.items || []).filter((item) => item.content_type === ENGLISH.video);
  const with_url = videos.find((item) => item.content_url);
  const with_file = videos.find((item) => item.file_path);
  const picked = with_url || with_file || videos[0] || null;
  if (!picked) return { kind: "none", src: "", title: lesson?.lesson_title || ENGLISH.lesson };
  const title = picked.content_title || lesson.lesson_title;
  const yt = youtube_id(picked.content_url);
  if (yt) return { kind: "youtube", src: yt, title };
  const drive = drive_file_id(picked.content_url);
  if (drive) {
    return {
      kind: "embed",
      src: `https://drive.google.com/file/d/${drive}/preview`,
      openUrl: picked.content_url,
      title
    };
  }
  const vimeo = vimeo_id(picked.content_url);
  if (vimeo) return { kind: "embed", src: `https://player.vimeo.com/video/${vimeo}`, title };
  if (picked.content_url && is_direct_media(picked.content_url)) {
    return { kind: "url", src: picked.content_url, title };
  }
  if (picked.content_url) {
    return { kind: "embed", src: picked.content_url, openUrl: picked.content_url, title, page: true };
  }
  if (picked.file_path) return { kind: "file", src: picked.file_path, title };
  return { kind: "none", src: "", title: lesson?.lesson_title || ENGLISH.lesson };
}

export function has_playable_video(lesson_or_source) {
  const source = lesson_or_source?.kind ? lesson_or_source : video_source(lesson_or_source);
  return source.kind !== "none" && Boolean(source.src);
}

export function default_lesson_tab() {
  return "overview";
}

export function note_items(lesson) {
  return (lesson?.items || []).filter((item) => item.content_type === ENGLISH.notes);
}

export function note_html_pages(lesson, language = "english") {
  const field = language === "telugu" ? "telugu_learning_json" : "learning_json";
  const pages = [];
  for (const item of note_items(lesson)) {
    if (item.is_active === false) continue;
    const sections = item[field]?.sections || [];
    for (const section of sections) {
      if (!String(section?.html || "").trim()) continue;
      pages.push({
        title: section.title || item.content_title || ENGLISH.notes,
        html: section.html,
        fileName: section.fileName || ""
      });
    }
  }
  return pages;
}

export function overview_items(lesson) {
  return (lesson?.items || []).filter((item) => item.content_type === ENGLISH.overview);
}

export function announcement_items(lesson) {
  return (lesson?.items || []).filter((item) => item.content_type === ENGLISH.announcement);
}

export function material_items(lesson) {
  return (lesson?.items || []).filter((item) => item.content_type === ENGLISH.material);
}

export function item_href(item) {
  return item?.file_path || item?.content_url || "";
}

export function get_file_extension(item) {
  const blob = `${item?.file_name || ""} ${item?.file_path || ""} ${item?.content_url || ""} ${item?.name || ""} ${item?.href || ""}`;
  const match = String(blob).match(/\.([a-z0-9]{2,5})(?:\?|#|$)/i);
  return match ? match[1].toLowerCase() : "";
}

export function file_kind(name = "", href = "") {
  const ext = get_file_extension({ file_name: name, file_path: href, content_url: href });
  const blob = `${name} ${href}`.toLowerCase();
  if (ext === "pdf" || blob.includes(".pdf") || /exportformat=pdf|mime=.*pdf/i.test(href)) return "pdf";
  if (
  ["doc", "docx", "rtf", "odt"].includes(ext) ||
  /\/document\//.test(href) ||
  /docs\.google\.com\/document/.test(href) ||
  /\.docx?\b/.test(blob) ||
  /exportformat=docx?|mime=.*word/i.test(href))
  {
    return "doc";
  }
  if (
  ["ppt", "pptx", "odp"].includes(ext) ||
  /\/presentation\//.test(href) ||
  /docs\.google\.com\/presentation/.test(href) ||
  /\.pptx?\b/.test(blob) ||
  /exportformat=pptx?|mime=.*powerpoint/i.test(href))
  {
    return "ppt";
  }
  if (
  ["xls", "xlsx", "csv", "ods"].includes(ext) ||
  /spreadsheets/.test(href) ||
  /docs\.google\.com\/spreadsheets/.test(href))
  {
    return "xls";
  }
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "img";
  if (["mp4", "webm", "mov", "mkv", "m4v"].includes(ext)) return "vid";
  return "file";
}

export function file_kind_label(kind) {
  return (
    {
      pdf: "PDF",
      doc: "DOC",
      ppt: "PPT",
      xls: "XLS",
      zip: "ZIP",
      img: "IMG",
      vid: "VID",
      file: "FILE",
      quiz: "QUIZ",
      get help() { return ENGLISH.ask; },
      feedback: "RATE",
      resources: "FILES",
      announcements: "NEWS",
      overview: "INFO"
    }[kind] || "FILE");

}

const OFFICE_EXT = new Set(["doc", "docx", "ppt", "pptx"]);

export function is_html_package(item) {
  return item?.learning_json?.packageType === "html" || Boolean(item?.learning_json?.sections?.some((section) => section?.html));
}

function file_base_name(value) {
  return String(value || "").
  replace(/\\/g, "/").
  split("/").
  pop().
  replace(/\.[^.]+$/, "").
  trim();
}

function numeric_prefix(value) {
  const match = file_base_name(value).match(/^(\d{1,3})(?=[A-Za-z._\s-]|$)/);
  return match ? Number(match[1]) : null;
}

export function clean_package_title(title, file_name = "") {
  let value = String(title || "").trim();
  if (!value) {
    value = file_base_name(file_name).replace(/[-_]+/g, " ");
  }
  value = value.replace(/^[.\s:_-]+/, "");
  value = value.replace(/^(\d{1,3})[\s._-]*([A-Za-z])/, "$2");
  value = value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return value || ENGLISH.topic;
}

function is_overview_section(section) {
  const file = file_base_name(section?.fileName).toLowerCase();
  const title = clean_package_title(section?.title, section?.fileName).toLowerCase();
  return /^(overview|index|contents|toc|home)$/.test(file) || /^(overview|index|contents|table of contents)$/.test(title);
}

function topic_key(value) {
  return clean_package_title(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function section_file_name(section) {
  return String(section?.fileName || "").
  replace(/\\/g, "/").
  split("/").
  pop().
  toLowerCase();
}

function toc_file_order(sections) {
  const by_file = new Set();
  const by_title = new Map();
  for (const section of sections || []) {
    const file = section_file_name(section);
    if (file) by_file.add(file);
    if (file) {
      const title_key = topic_key(section?.title);
      const file_key = topic_key(file_base_name(section?.fileName));
      if (title_key) by_title.set(title_key, file);
      if (file_key) by_title.set(file_key, file);
    }
  }

  let best = [];
  for (const section of sections || []) {
    const html = String(section?.html || "");
    const order = [];
    const seen = new Set();
    const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let match;
    while (match = re.exec(html)) {
      const attrs = match[1] || "";
      const text = String(match[2] || "").replace(/<[^>]+>/g, " ");
      const href = attrs.match(/data-package-page="([^"]+)"/i)?.[1] ||
      attrs.match(/href="#topic-([^"]+)"/i)?.[1] ||
      attrs.match(/href="([^"#?]+\.html?)"/i)?.[1] ||
      "";
      const file = String(href).
      replace(/\\/g, "/").
      split("/").
      pop().
      toLowerCase();
      const resolved = file && by_file.has(file) && file || by_title.get(topic_key(text)) || "";
      if (!resolved || seen.has(resolved)) continue;
      seen.add(resolved);
      order.push(resolved);
    }
    if (order.length > best.length) best = order;
  }
  return best;
}

export function sort_html_sections(sections) {
  const list = (sections || []).filter(Boolean);
  const toc = toc_file_order(list);
  return list.
  map((section, index) => ({ section, index })).
  sort((a, b) => {
    const a_over = is_overview_section(a.section);
    const b_over = is_overview_section(b.section);
    if (a_over !== b_over) return a_over ? -1 : 1;
    const a_file = section_file_name(a.section);
    const b_file = section_file_name(b.section);
    const a_toc = toc.indexOf(a_file);
    const b_toc = toc.indexOf(b_file);
    if (a_toc !== b_toc && (a_toc >= 0 || b_toc >= 0)) {
      if (a_toc < 0) return 1;
      if (b_toc < 0) return -1;
      return a_toc - b_toc;
    }
    const a_num = numeric_prefix(a.section.fileName) ?? numeric_prefix(a.section.title);
    const b_num = numeric_prefix(b.section.fileName) ?? numeric_prefix(b.section.title);
    if (a_num != null || b_num != null) return (a_num ?? 9999) - (b_num ?? 9999);
    return a_file.localeCompare(b_file, undefined, { numeric: true, sensitivity: "base" }) || a.index - b.index;
  }).
  map((item) => item.section);
}

export function package_pages(lesson) {
  const topics = [];
  for (const item of lesson?.items || []) {
    if (item.is_active === false || !is_html_package(item)) continue;
    const sections = sort_html_sections(item.learning_json?.sections || []);
    for (const section of sections) {
      topics.push({
        title: clean_package_title(section.title, section.fileName) || item.content_title || ENGLISH.topic,
        fileName: section.fileName || "",
        section: { ...section, title: clean_package_title(section.title, section.fileName) },
        item
      });
    }
  }
  return topics;
}

export function lesson_duration(lesson) {
  const from_item = (lesson?.items || []).find((item) => item.duration_seconds);
  if (from_item?.duration_seconds) return format_clock(from_item.duration_seconds);
  return format_minutes(lesson?.duration_minutes);
}

export function lesson_ai_context(lesson, topic_index = 0) {
  if (!lesson) return "";
  const parts = [];
  if (lesson.lesson_title) parts.push(ENGLISH.lesson_3(lesson.lesson_title));
  if (lesson.lesson_description) parts.push(String(lesson.lesson_description));
  const pages = package_pages(lesson);
  if (pages.length) {
    const safe = Math.min(Math.max(Number(topic_index) || 0, 0), pages.length - 1);
    const page = pages[safe];
    if (page?.title) parts.push(ENGLISH.current_topic(page.title));
    const html = page?.section?.html || "";
    const text = String(html).
    replace(/<[^>]+>/g, " ").
    replace(/\s+/g, " ").
    trim();
    if (text) parts.push(text);
  }
  for (const item of lesson.items || []) {
    if (item.content_title) parts.push(String(item.content_title));
    if (item.content_description) parts.push(String(item.content_description));
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").slice(0, 2500);
}

function plain_overview(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function lesson_overview(lesson) {
  const parts = [];
  const description = plain_overview(lesson?.lesson_description);
  if (description) parts.push(description);
  for (const item of lesson?.items || []) {
    if (item.content_type !== ENGLISH.overview) continue;
    const body = plain_overview(item.content_description);
    if (body) parts.push(body);
  }
  return parts.join("\n").slice(0, 1500);
}

export function course_interview_context({ course, modules, quiz }) {
  const lesson_id = Number(quiz?.lesson_id) || 0;
  const module_id = Number(quiz?.module_id) || 0;
  const covered = [];
  let current_module = null;
  let current_lesson = null;

  for (const module of modules || []) {
    const lessons = [];
    let reached = false;
    for (const lesson of module.lessons || []) {
      lessons.push({
        lesson_id: lesson.lesson_id,
        lesson_title: lesson.lesson_title || "",
        overview: lesson_overview(lesson)
      });
      if (lesson_id && Number(lesson.lesson_id) === lesson_id) {
        current_lesson = {
          lesson_id: lesson.lesson_id,
          lesson_title: lesson.lesson_title || ""
        };
        current_module = {
          module_id: module.module_id,
          module_title: module.module_title || ""
        };
        reached = true;
        break;
      }
    }
    const is_quiz_module = !lesson_id && module_id && Number(module.module_id) === module_id;
    if (is_quiz_module) {
      current_module = {
        module_id: module.module_id,
        module_title: module.module_title || ""
      };
    }
    if (lessons.length) {
      covered.push({
        module_id: module.module_id,
        module_title: module.module_title || "",
        lessons
      });
    }
    if (reached || is_quiz_module) break;
  }

  return {
    source: "course",
    target_role: course?.course_name || ENGLISH.course_interview,
    course_id: course?.course_id || null,
    course_name: course?.course_name || "",
    current_module,
    current_lesson,
    current_quiz: quiz ?
      { quiz_id: quiz.quiz_id, quiz_title: quiz.quiz_title || "" } :
      null,
    modules: covered
  };
}
