import axios from "axios";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extract_html_package, is_zip_buffer } from "./html_package_extract.js";
import mammoth from "mammoth";
import { extractText, extractTextItems, getDocumentProxy } from "unpdf";
import { log } from "@datapromr/log";

const LMS_NOTES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "lms_notes");

function local_notes_file(file_path) {
  const value = String(file_path || "").replace(/\\/g, "/").trim();
  if (!value.startsWith("lms_notes/")) return "";
  const name = path.posix.basename(value);
  if (!name || name.includes("..")) return "";
  return path.join(LMS_NOTES_DIR, name);
}

function drive_file_id(url) {
  const value = String(url || "");
  const file = value.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
  if (file) return file[1];
  if (/drive\.google\.com|docs\.google\.com/.test(value)) {
    const open = value.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (open) return open[1];
  }
  return "";
}

function decode(text) {
  return String(text || "").
  replace(/&nbsp;/gi, " ").
  replace(/&amp;/gi, "&").
  replace(/&lt;/gi, "<").
  replace(/&gt;/gi, ">").
  replace(/&quot;/gi, '"').
  replace(/&#39;/gi, "'").
  replace(/\s+/g, " ").
  trim();
}

function strip_tags(html) {
  return decode(
    String(html || "").
    replace(/<br\s*\/?>/gi, "\n").
    replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n").
    replace(/<[^>]+>/g, " ")
  );
}

function is_bullet(line) {
  return /^[-•*o]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
}

function is_code_line(line) {
  const value = String(line || "").trim();
  if (!value) return false;
  if (/^<\/?[a-zA-Z][\w:-]*[\s>/]/.test(value)) return true;
  if (/[{};<>]|=>|::/.test(value) && !/[.?!]$/.test(value) && value.length < 160) return true;
  return false;
}

function heading_level(line, fontSize, median_size) {
  const value = String(line || "").trim();
  if (/^page\s+\d+\b/i.test(value)) return 2;
  const numbered = value.match(/^(\d+(?:\.\d+)*)\s+\S/);
  if (numbered) return Math.min(numbered[1].split(".").length + 1, 4);
  if (fontSize && median_size && fontSize >= median_size * 1.18) {
    return fontSize >= median_size * 1.5 ? 2 : 3;
  }
  if (value === value.toUpperCase() && /[A-Z]/.test(value) && value.length <= 70) return 2;
  if (!/[.!?]$/.test(value) && value.split(/\s+/).length <= 12 && value.length <= 90) return 3;
  return 0;
}

function lines_from_items(items = []) {
  const rows = new Map();
  for (const item of items) {
    const y = Math.round(Number(item.y || 0) / 4) * 4;
    const list = rows.get(y) || [];
    list.push(item);
    rows.set(y, list);
  }
  return [...rows.entries()].
  sort((a, b) => b[0] - a[0]).
  map(([, parts]) => {
    parts.sort((a, b) => Number(a.x || 0) - Number(b.x || 0));
    return {
      text: parts.map((part) => part.str || "").join(" ").replace(/\s+/g, " ").trim(),
      fontSize: Math.max(...parts.map((part) => Number(part.fontSize || 0)))
    };
  }).
  filter((line) => line.text);
}

function structure_lines(lines, title) {
  const sizes = lines.map((line) => line.fontSize).filter((size) => size > 0).sort((a, b) => a - b);
  const median = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 0;
  const sections = [];
  let current = {
    title: title || "Lesson",
    pageNumber: lines[0]?.pageNumber || 1,
    startPage: lines[0]?.pageNumber || 1,
    endPage: lines[0]?.pageNumber || 1,
    blocks: []
  };

  function push_section() {
    if (!current.blocks.length && current.title === (title || "Lesson") && sections.length) return;
    sections.push(current);
  }

  function add_block(block) {
    const last = current.blocks[current.blocks.length - 1];
    if (block.type === "list" && last?.type === "list" && Boolean(last.ordered) === Boolean(block.ordered)) {
      last.items.push(...block.items);
      return;
    }
    if (block.type === "code" && last?.type === "code") {
      last.text = `${last.text}\n${block.text}`;
      return;
    }
    if (block.type === "paragraph" && last?.type === "paragraph") {
      last.text = `${last.text} ${block.text}`;
      return;
    }
    current.blocks.push(block);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const text = line.text;
    const page_number = line.pageNumber || 1;
    current.endPage = page_number;
    const level = heading_level(text, line.fontSize, median);

    const page_title = /^page\s+\d+\b/i.test(text);
    const numbered = /^\d+(\.\d+)*\s+\S/.test(text);
    const large = Boolean(line.fontSize && median && line.fontSize >= median * 1.18);
    const caps = text === text.toUpperCase() && /[A-Z]/.test(text) && text.length <= 70;
    if (level && (page_title || numbered || large || caps) && !is_bullet(text) && !is_code_line(text)) {
      if (current.blocks.length) {
        push_section();
        current = { title: text, page_number, startPage: page_number, endPage: page_number, blocks: [] };
      } else {
        current.title = text;
        current.pageNumber = page_number;
        current.startPage = page_number;
      }
      add_block({ type: "heading", level, text });
      continue;
    }

    if (is_bullet(text)) {
      add_block({
        type: "list",
        ordered: /^\d+[.)]\s+/.test(text),
        items: [text.replace(/^[-•*o]\s+/, "").replace(/^\d+[.)]\s+/, "")]
      });
      continue;
    }

    if (is_code_line(text)) {
      add_block({ type: "code", language: "", text });
      continue;
    }

    add_block({ type: "paragraph", text });
  }

  push_section();
  return sections.filter((section) => section.title || section.blocks.length);
}

async function extract_pdf(buffer, options = {}) {
  const pdf = await getDocumentProxy(new Uint8_Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  let items = [];
  try {
    const extracted = await extractTextItems(pdf);
    items = extracted.items || [];
  } catch {
    items = [];
  }
  const start = options.startPage >= 1 ? options.startPage : 1;
  const end = options.endPage >= start ? options.endPage : text.length;
  const lines = [];
  for (let page = start; page <= Math.min(end, text.length); page += 1) {
    const from_items = lines_from_items(items[page - 1] || []);
    const page_lines = from_items.length ?
    from_items :
    String(text[page - 1] || "").
    split(/\r?\n/).
    map((value) => ({ text: value.trim(), fontSize: 0 })).
    filter((line) => line.text);
    for (const line of page_lines) lines.push({ ...line, pageNumber: page });
  }
  return structure_lines(lines, options.title);
}

function html_to_sections(html, title) {
  const clean = String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  const chunks = [...clean.matchAll(/<(h[1-6]|p|ul|ol|pre|blockquote|table)[^>]*>([\s\S]*?)<\/\1>/gi)];
  const sections = [];
  let current = { title: title || "Lesson", pageNumber: 1, startPage: 1, endPage: 1, blocks: [] };

  function start_section(name) {
    if (current.blocks.length) sections.push(current);
    current = { title: name, pageNumber: 1, startPage: 1, endPage: 1, blocks: [] };
  }

  for (const match of chunks) {
    const tag = match[1].toLowerCase();
    const inner = match[2];
    if (/^h[1-6]$/.test(tag)) {
      const text = strip_tags(inner);
      if (!text) continue;
      start_section(text);
      current.blocks.push({ type: "heading", level: Number(tag.slice(1)), text });
    } else if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((item) => strip_tags(item[1])).filter(Boolean);
      if (items.length) current.blocks.push({ type: "list", ordered: tag === "ol", items });
    } else if (tag === "pre") {
      current.blocks.push({ type: "code", language: "", text: strip_tags(inner).replace(/\n /g, "\n") });
    } else if (tag === "blockquote") {
      current.blocks.push({ type: "quote", text: strip_tags(inner) });
    } else if (tag === "table") {
      const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
      [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => strip_tags(cell[1]))
      );
      if (rows.length) current.blocks.push({ type: "table", rows });
    } else {
      const text = strip_tags(inner);
      if (text) current.blocks.push({ type: "paragraph", text });
    }
  }
  if (current.blocks.length) sections.push(current);
  return sections;
}

async function extract_docx(buffer, title) {
  const result = await mammoth.convertToHtml({ buffer });
  return html_to_sections(result.value || "", title);
}

async function fetch_buffer(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
    maxRedirects: 5,
    headers: { Accept: "*/*" },
    validateStatus: (status) => status >= 200 && status < 400
  });
  return Buffer.from(response.data);
}

function source_url(item = {}) {
  const url = String(item.url || item.content_url || "").trim();
  const path = String(item.filePath || item.file_path || "").trim();
  const drive = drive_file_id(url) || drive_file_id(path);
  if (drive) return `https://drive.google.com/uc?export=download&id=${drive}`;
  return path || url;
}

function looks_pdf(buffer, name) {
  const head = Buffer.from(buffer.subarray(0, 8)).toString("utf8");
  return head.startsWith("%PDF") || name.includes(".pdf") || name.includes("application/pdf");
}

function looks_docx(buffer, name) {
  if (name.includes(".docx") || name.includes("wordprocessingml")) return true;
  if (name.includes(".doc") && !name.includes("docx")) return false;
  const bytes = Buffer.from(buffer.subarray(0, 4));
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  const sniff = Buffer.from(buffer.subarray(0, 2500)).toString("utf8");
  return sniff.includes("word/");
}

function looks_zip(buffer, name) {
  return is_zip_buffer(buffer, name);
}

function file_kind(buffer, name) {
  if (looks_pdf(buffer, name) && !String(name || "").includes(".zip")) return "pdf";
  if (looks_docx(buffer, name)) return "docx";
  if (looks_zip(buffer, name)) return "zip";
  if (name.includes(".doc") && !name.includes("docx")) return "skip";
  if (name.includes("ppt")) return "skip";
  return "skip";
}

export async function extract_learning_content(input = {}) {
  const title = String(input.title || "Lesson").trim() || "Lesson";
  const name = `${input.fileName || ""} ${input.mime || ""} ${input.url || ""} ${input.filePath || ""}`.toLowerCase();
  let buffer = input.fileBuffer || input.file_buffer || null;
  if (!buffer) {
    const local = local_notes_file(input.filePath || input.file_path);
    if (local) {
      try {
        buffer = await fs.readFile(local);
      } catch (err) {
        log.warn("extractLearningContent", `local zip failed: ${err.message}`);
        return null;
      }
    }
  }
  if (!buffer) {
    const href = source_url(input);
    if (!href || href.startsWith("lms_notes/")) return null;
    try {
      buffer = await fetch_buffer(href);
    } catch (err) {
      log.warn("extractLearningContent", `download failed: ${err.message}`);
      return null;
    }
  }
  if (!buffer?.length) return null;
  buffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  const kind = file_kind(buffer, name);
  try {
    let sections = [];
    if (kind === "docx") {
      sections = await extract_docx(buffer, title);
    } else if (kind === "pdf") {
      sections = await extract_pdf(buffer, {
        title,
        startPage: Number(input.startPage) || 0,
        endPage: Number(input.endPage) || 0
      });
    } else if (kind === "zip") {
      return extract_html_package({
        title,
        fileBuffer: buffer,
        lessonId: input.lessonId,
        contentId: input.contentId
      });
    } else {
      return null;
    }
    if (!sections.length) return null;
    return { title, sections };
  } catch (err) {
    if (err.status === 400) throw err;
    log.warn("extractLearningContent", err.message);
    return null;
  }
}
