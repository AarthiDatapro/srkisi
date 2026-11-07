import path from "node:path";
import AdmZip from "adm-zip";
import { log } from "@datapromr/log";
import { STORAGE_BUCKETS, upload_to_bucket } from "../utils/storage_buckets.js";

const MAX_FILES = 250;
const MAX_HTML = 80;
const MAX_UNCOMPRESSED = 80 * 1024 * 1024;
const MAX_ENTRY = 8 * 1024 * 1024;
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const HTML_EXT = new Set([".html", ".htm"]);
const SKIP_DIR = /(^|\/)(__macosx|\.ds_store|thumbs\.db)(\/|$)/i;

const SVG_TAGS = new Set([
"svg",
"g",
"path",
"circle",
"ellipse",
"rect",
"line",
"polyline",
"polygon",
"text",
"tspan",
"defs",
"clippath",
"mask",
"pattern",
"lineargradient",
"radialgradient",
"stop",
"use",
"symbol",
"marker",
"title",
"desc",
"image"
]);

const SVG_VOID = new Set([
"path",
"circle",
"ellipse",
"rect",
"line",
"polyline",
"polygon",
"stop",
"use",
"image"
]);

const ALLOWED_TAGS = new Set([
"p",
"h1",
"h2",
"h3",
"h4",
"h5",
"h6",
"ul",
"ol",
"li",
"pre",
"code",
"table",
"thead",
"tbody",
"tfoot",
"tr",
"th",
"td",
"img",
"a",
"strong",
"b",
"em",
"i",
"u",
"blockquote",
"hr",
"br",
"span",
"div",
"figure",
"figcaption",
"caption",
"sup",
"sub",
"kbd",
"mark",
"section",
"article",
"header",
"main",
...SVG_TAGS]
);

const ALLOWED_ATTR = new Set([
"src",
"href",
"alt",
"title",
"width",
"height",
"colspan",
"rowspan",
"class",
"id",
"target",
"rel",
"data_package_page",
"viewbox",
"xmlns",
"xmlns:xlink",
"fill",
"stroke",
"stroke-width",
"stroke-linecap",
"stroke-linejoin",
"stroke-dasharray",
"stroke-opacity",
"fill-opacity",
"opacity",
"d",
"cx",
"cy",
"r",
"rx",
"ry",
"x",
"y",
"x1",
"y1",
"x2",
"y2",
"points",
"transform",
"font-size",
"font-family",
"font-weight",
"text-anchor",
"dominant-baseline",
"preserveaspectratio",
"gradientunits",
"gradienttransform",
"offset",
"stop-color",
"stop-opacity",
"clip-path",
"mask",
"marker-start",
"marker-mid",
"marker-end",
"xlink:href",
"role",
"aria-hidden",
"aria-label",
"focusable"
]);

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function posix_path(value) {
  return String(value || "").
  replace(/\\/g, "/").
  replace(/^\/+/, "").
  replace(/\/{2,}/g, "/");
}

function safe_entry_name(name) {
  const normalized = posix_path(name);
  if (!normalized || normalized.includes("..") || path.isAbsolute(name)) return "";
  if (SKIP_DIR.test(normalized)) return "";
  return normalized;
}

function ext_of(file_path) {
  const ext = path.posix.extname(file_path).toLowerCase();
  return ext;
}

function strip_tags(value) {
  return String(value || "").
  replace(/<[^>]+>/g, " ").
  replace(/&nbsp;/gi, " ").
  replace(/&amp;/gi, "&").
  replace(/&lt;/gi, "<").
  replace(/&gt;/gi, ">").
  replace(/&quot;/gi, '"').
  replace(/\s+/g, " ").
  trim();
}

function decode_attr(value) {
  return String(value || "").
  replace(/&amp;/g, "&").
  replace(/&quot;/g, '"').
  replace(/&#39;/g, "'").
  replace(/&lt;/g, "<").
  replace(/&gt;/g, ">");
}

function encode_attr(value) {
  return String(value || "").
  replace(/&/g, "&amp;").
  replace(/"/g, "&quot;").
  replace(/</g, "&lt;").
  replace(/>/g, "&gt;");
}

function title_from_file(file_path) {
  const base = path.posix.basename(file_path).replace(/\.html?$/i, "");
  return base.replace(/^\d+[-_\s.]+/, "").replace(/[-_]+/g, " ").trim() || base;
}

function page_title(html, file_path) {
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return strip_tags(heading?.[1] || title?.[1] || "") || title_from_file(file_path);
}

function page_body(html) {
  const match = String(html || "").match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : String(html || "");
}

function image_mime(file_path) {
  const ext = ext_of(file_path);
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

function resolve_asset_url(asset_map, page_dir, value) {
  const resolved = resolve_relative(page_dir, value);
  return (
    asset_map.get(resolved) ||
    asset_map.get(posix_path(value)) ||
    asset_map.get(path.posix.basename(value)) ||
    ""
  );
}

function safe_local_ref(value) {
  const text = String(value || "").trim();
  return text.startsWith("#") && !text.includes("javascript:") ? text : "";
}

function resolve_relative(from_dir, href) {
  const cleaned = posix_path(href.split("#")[0].split("?")[0]);
  if (!cleaned) return "";
  return posix_path(path.posix.normalize(path.posix.join(from_dir || ".", cleaned)));
}

function clean_css(css) {
  return String(css || "").
  replace(/<\/style/gi, "").
  replace(/@import\b[^;]*;?/gi, "").
  replace(/expression\s*\(/gi, "").
  replace(/javascript\s*:/gi, "").
  replace(/behavior\s*:/gi, "").
  replace(/-moz-binding\b[^;]*;?/gi, "");
}

function rewrite_css_urls(css, asset_map, page_dir) {
  return clean_css(css).replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote, raw) => {
    const value = String(raw || "").trim();
    if (!value || /^(https?:|data:|#)/i.test(value)) return full;
    const url = resolve_asset_url(asset_map, page_dir, value);
    return url ? `url("${url.replace(/"/g, "%22")}")` : full;
  });
}

function collect_styles(raw, css_map, asset_map, page_dir) {
  const parts = [];
  const link_re = /<link\b([^>]*)>/gi;
  let link;
  while (link = link_re.exec(String(raw || ""))) {
    const tag = link[1] || "";
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    if (!href) continue;
    if (/^https?:/i.test(href)) {
      if (/stylesheet/i.test(tag) || /\.css(?:$|\?)/i.test(href)) {
        parts.push(`<link rel="stylesheet" href="${encode_attr(href)}">`);
      }
      continue;
    }
    if (!/stylesheet/i.test(tag) && !/\.css(?:$|\?)/i.test(href)) continue;
    const resolved = resolve_relative(page_dir, href);
    const css = css_map.get(resolved) || css_map.get(path.posix.basename(href).toLowerCase()) || "";
    const clean = rewrite_css_urls(css, asset_map, page_dir);
    if (clean.trim()) parts.push(`<style>${clean}</style>`);
  }
  const style_re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let style;
  while (style = style_re.exec(String(raw || ""))) {
    const clean = rewrite_css_urls(style[1], asset_map, page_dir);
    if (clean.trim()) parts.push(`<style>${clean}</style>`);
  }
  return parts.join("");
}

function sanitize_and_rewrite(html, asset_map, page_dir, html_files) {
  const html_set = new Set(html_files.map((file) => path.posix.basename(file).toLowerCase()));
  const without_danger = String(html || "").
  replace(/<script[\s\S]*?<\/script>/gi, "").
  replace(/<style[\s\S]*?<\/style>/gi, "").
  replace(/<link\b[^>]*>/gi, "").
  replace(/<(iframe|object|embed|form|input|button|textarea|select|meta|base|foreignobject|animate|set|handler)[\s\S]*?<\/\1>/gi, "").
  replace(/<(iframe|object|embed|form|input|button|textarea|select|meta|base|link|foreignobject|animate|set|handler)\b[^>]*\/?>/gi, "");

  return without_danger.replace(/<\/?([a-z0-9]+)([^>]*)\/?>/gi, (full, raw_tag, raw_attrs) => {
    const closing = /^<\//.test(full);
    const tag = String(raw_tag || "").toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return `</${tag}>`;
    const self_close = tag === "br" || tag === "hr" || tag === "img" || SVG_VOID.has(tag) || /\/\s*>$/.test(full);
    const attrs = [];
    const attr_re = /([a-zA-Z_:][\w:.-]*)(\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let match;
    while (match = attr_re.exec(raw_attrs || "")) {
      const name = String(match[1] || "").toLowerCase();
      if (name.startsWith("on") || !ALLOWED_ATTR.has(name) && name !== "style") continue;
      const value = decode_attr(match[3] ?? match[4] ?? match[5] ?? "");
      if (name === "style") {
        const clean = clean_css(value).trim();
        if (clean) attrs.push(`style="${encode_attr(clean)}"`);
        continue;
      }
      if ((name === "src" || name === "href" || name === "xlink:href") && /^(javascript:|data:text\/html)/i.test(value)) {
        continue;
      }
      if (name === "src" && (tag === "img" || tag === "image")) {
        if (/^(https?:\/\/|data:image\/)/i.test(value)) {
          attrs.push(`src="${encode_attr(value)}"`);
          continue;
        }
        const url = resolve_asset_url(asset_map, page_dir, value);
        if (url) attrs.push(`src="${encode_attr(url)}"`);
        continue;
      }
      if ((name === "href" || name === "xlink:href") && (tag === "use" || tag === "image")) {
        const local = safe_local_ref(value);
        if (local) {
          attrs.push(`${name}="${encode_attr(local)}"`);
          continue;
        }
        if (tag === "image" && /^(https?:\/\/|data:image\/)/i.test(value)) {
          attrs.push(`${name}="${encode_attr(value)}"`);
          continue;
        }
        if (tag === "image") {
          const url = resolve_asset_url(asset_map, page_dir, value);
          if (url) attrs.push(`${name}="${encode_attr(url)}"`);
        }
        continue;
      }
      if (name === "href" && tag === "a") {
        if (/^(https?:\/\/|mailto:|#)/i.test(value)) {
          const extra = /^https?:\/\//i.test(value) ? ` target="_blank" rel="noopener noreferrer"` : "";
          attrs.push(`href="${encode_attr(value)}"${extra}`);
          continue;
        }
        const file = path.posix.basename(value.split("#")[0]).toLowerCase();
        if (html_set.has(file)) {
          attrs.push(`href="#topic-${encode_attr(file)}" data_package_page="${encode_attr(file)}"`);
        }
        continue;
      }
      if (name === "target") continue;
      attrs.push(`${name}="${encode_attr(value)}"`);
    }
    if (tag === "svg" && !attrs.some((item) => item.startsWith("xmlns="))) {
      attrs.push('xmlns="http://www.w3.org/2000/svg"');
    }
    const open = attrs.length ? `<${tag} ${attrs.join(" ")}>` : `<${tag}>`;
    return self_close ? open.replace(/>$/, " />") : open;
  });
}

function parse_manifest(entries) {
  const file = entries.find((item) => path.posix.basename(item.name).toLowerCase() === "manifest.json");
  if (!file) return null;
  try {
    const parsed = JSON.parse(file.entry.getData().toString("utf8"));
    const pages = Array.isArray(parsed?.pages) ? parsed.pages : Array.isArray(parsed) ? parsed : [];
    return pages.
    map((page) => ({
      file: posix_path(page.file || page.path || page.href || ""),
      title: String(page.title || "").trim()
    })).
    filter((page) => page.file);
  } catch {
    return null;
  }
}

function file_base_name(file_path) {
  return path.posix.basename(file_path).replace(/\.html?$/i, "");
}

function numeric_prefix(value) {
  const match = String(value || "").match(/^(\d{1,3})(?=[A-Za-z._\s-]|$)/);
  return match ? Number(match[1]) : null;
}

function is_overview_file(file_path) {
  return /^(overview|index|contents|toc|home)$/i.test(file_base_name(file_path));
}

function toc_order_from_html(html, html_files) {
  const known = new Set(html_files.map((file) => path.posix.basename(file).toLowerCase()));
  const order = [];
  const seen = new Set();
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while (match = re.exec(String(html || ""))) {
    const href = String(match[1] || "").match(/href=["']([^"']+)["']/i)?.[1] || "";
    const file = path.posix.basename(href.split("#")[0].split("?")[0]).toLowerCase();
    if (!file || !known.has(file) || seen.has(file)) continue;
    seen.add(file);
    order.push(file);
  }
  return order;
}

function sort_html_files(files, entries = []) {
  const list = files.slice();
  const index_file = list.find((file) => is_overview_file(file));
  const index_html = index_file ? entries.find((item) => item.name === index_file)?.entry?.getData?.().toString?.("utf8") : "";
  const toc = index_html ? toc_order_from_html(index_html, list) : [];
  return list.sort((a, b) => {
    const a_over = is_overview_file(a);
    const b_over = is_overview_file(b);
    if (a_over !== b_over) return a_over ? -1 : 1;
    const a_name = path.posix.basename(a).toLowerCase();
    const b_name = path.posix.basename(b).toLowerCase();
    const a_toc = toc.indexOf(a_name);
    const b_toc = toc.indexOf(b_name);
    if (a_toc !== b_toc && (a_toc >= 0 || b_toc >= 0)) {
      if (a_toc < 0) return 1;
      if (b_toc < 0) return -1;
      return a_toc - b_toc;
    }
    const a_num = numeric_prefix(file_base_name(a));
    const b_num = numeric_prefix(file_base_name(b));
    if (a_num != null || b_num != null) return (a_num ?? 9999) - (b_num ?? 9999);
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}

export function is_zip_buffer(buffer, name = "") {
  const label = String(name || "").toLowerCase();
  if (label.includes(".zip") || label.includes("application/zip") || label.includes("application/x_zip")) return true;
  return Boolean(buffer?.[0] === 0x50 && buffer?.[1] === 0x4b);
}

export async function extract_html_package(input = {}) {
  const buffer = Buffer.isBuffer(input.fileBuffer) ? input.fileBuffer : Buffer.from(input.fileBuffer || []);
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw fail("Upload a valid ZIP learning package");
  }

  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw fail("This ZIP file could not be opened");
  }

  const entries = [];
  let uncompressed = 0;
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = safe_entry_name(entry.entryName);
    if (!name) continue;
    const size = Number(entry.header?.size || entry.getData()?.length || 0);
    if (size > MAX_ENTRY) throw fail("A file inside the ZIP is too large");
    uncompressed += size;
    if (uncompressed > MAX_UNCOMPRESSED) throw fail("The ZIP package is too large after extraction");
    if (entries.length >= MAX_FILES) throw fail("The ZIP package has too many files");
    entries.push({ name, entry, size });
  }

  const html_files = sort_html_files(
    entries.filter((item) => HTML_EXT.has(ext_of(item.name))).map((item) => item.name),
    entries
  );
  if (!html_files.length) throw fail("The ZIP must contain HTML lesson files");
  if (html_files.length > MAX_HTML) throw fail("The ZIP has too many HTML pages");

  const lesson_id = input.lessonId || "lesson";
  const content_id = input.contentId || Date.now();
  const prefix = `packages/${lesson_id}/${content_id}`;
  const asset_map = new Map();

  for (const item of entries) {
    if (!IMAGE_EXT.has(ext_of(item.name))) continue;
    try {
      const data = item.entry.getData();
      const stored = `${prefix}/${item.name.replace(/[^a-zA-Z0-9._/-]+/g, "-")}`;
      const url = await upload_to_bucket(STORAGE_BUCKETS.COURSE_CONTENT, stored, data, image_mime(item.name));
      asset_map.set(item.name, url);
      asset_map.set(path.posix.basename(item.name), url);
    } catch (err) {
      log.warn("extractHtmlPackage", `asset upload failed ${item.name}: ${err.message}`);
    }
  }

  const css_map = new Map();
  for (const item of entries) {
    if (ext_of(item.name) !== ".css") continue;
    const text = item.entry.getData().toString("utf8");
    css_map.set(item.name, text);
    css_map.set(path.posix.basename(item.name).toLowerCase(), text);
  }

  const manifest = parse_manifest(entries);
  const ordered = manifest?.length ?
  manifest.map((page) => html_files.find((file) => file === page.file || path.posix.basename(file) === path.posix.basename(page.file))).filter(Boolean) :
  html_files;
  const unique = [...new Set(ordered.length ? ordered : html_files)];

  const by_name = new Map(entries.map((item) => [item.name, item]));
  const sections = [];
  for (const file_path of unique) {
    const item = by_name.get(file_path);
    if (!item) continue;
    const raw = item.entry.getData().toString("utf8");
    const dir = path.posix.dirname(file_path);
    const page_dir = dir === "." ? "" : dir;
    const manifest_title = manifest?.find((page) => path.posix.basename(page.file) === path.posix.basename(file_path))?.title;
    const title = manifest_title || page_title(raw, file_path);
    const styles = collect_styles(raw, css_map, asset_map, page_dir);
    const html = styles + sanitize_and_rewrite(page_body(raw), asset_map, page_dir, unique);
    sections.push({
      title,
      fileName: path.posix.basename(file_path),
      html,
      pageNumber: sections.length + 1,
      startPage: sections.length + 1,
      endPage: sections.length + 1,
      blocks: []
    });
  }

  if (!sections.length) throw fail("No readable HTML pages were found in the ZIP");

  return {
    title: input.title || "Lesson",
    packageType: "html",
    extracted: true,
    sections
  };
}
