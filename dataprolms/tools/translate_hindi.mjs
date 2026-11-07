import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";

const hindi_dir = path.resolve("src/constants/hindi");
const KEEP = new Set([
  "Escape", "Enter", "Tab", "Video", "Material", "Notes", "Overview", "Announcement",
  "Active", "english", "telugu", "link", "ASK", "API", "JSON", "PDF", "ZIP", "LMS"
]);

function keep(value) {
  const text = String(value ?? "");
  const trimmed = text.trim();
  if (!/[A-Za-z]/.test(text)) return true;
  if (KEEP.has(trimmed)) return true;
  if (/^(https?:|data:|\/|\.\/|#)/.test(trimmed)) return true;
  if (/\.(xlsx|csv|png|svg|jpe?g|js|css|pdf)$/i.test(trimmed)) return true;
  if (/^[a-z0-9_]+$/.test(trimmed)) return true;
  if (trimmed.includes("(?:") || trimmed.includes("\\d") || trimmed.includes("admin_dashboard")) return true;
  return false;
}

function mask(text) {
  return text.replaceAll("Datapro", "__DP__").replace(/\s+/g, " ").trim();
}

function unmask(text) {
  return text.replaceAll("__DP__", "Datapro").replaceAll("__ dp __", "Datapro").replaceAll("__DP __", "Datapro");
}

function read_translation(body) {
  if (Array.isArray(body) && typeof body[0] === "string") return body[0];
  if (Array.isArray(body) && Array.isArray(body[0])) return body[0].map((part) => part[0] || "").join("");
  return "";
}

async function translate_one(text) {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=hi&q=${encodeURIComponent(mask(text))}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    if (!response.ok) return text;
    return unmask(read_translation(await response.json())) || text;
  }
  return text;
}

async function translate_many(texts) {
  const map = new Map();
  const pending = [];
  for (const text of texts) {
    if (map.has(text)) continue;
    if (keep(text)) map.set(text, text);
    else pending.push(text);
  }
  const size = 12;
  for (let index = 0; index < pending.length; index += size) {
    const chunk = pending.slice(index, index + size);
    const joined = chunk.map(mask).join("\n");
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=hi&q=${encodeURIComponent(joined)}`;
    let translated = "";
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      if (!response.ok) break;
      translated = unmask(read_translation(await response.json()));
      break;
    }
    const lines = translated.split("\n");
    if (lines.length === chunk.length && translated) {
      chunk.forEach((text, line) => map.set(text, lines[line] || text));
    } else {
      for (const text of chunk) map.set(text, await translate_one(text));
    }
    if ((index / size) % 10 === 0) console.log("translated", Math.min(index + size, pending.length), "/", pending.length);
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return map;
}

function walk(node, parent, visit) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (["loc", "start", "end", "leadingComments", "trailingComments"].includes(key)) continue;
    const value = node[key];
    if (Array.isArray(value)) value.forEach((item) => walk(item, node, visit));
    else if (value && typeof value.type === "string") walk(value, node, visit);
  }
}

function sentence_of(node) {
  let sentence = "";
  node.quasis.forEach((quasi, index) => {
    sentence += quasi.value.cooked || "";
    if (index < node.expressions.length) sentence += `{{${index}}}`;
  });
  return sentence;
}

function split_parts(translated, count) {
  let rest = translated;
  const parts = [];
  for (let index = 0; index < count; index += 1) {
    const token = `{{${index}}}`;
    const at = rest.indexOf(token);
    if (at < 0) return null;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at + token.length);
  }
  parts.push(rest);
  return parts;
}

function escape_quasi(part) {
  return part.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function js_string(text) {
  return JSON.stringify(text).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

const jobs = [];
for (const name of fs.readdirSync(hindi_dir)) {
  if (!name.endsWith(".js")) continue;
  const file = path.join(hindi_dir, name);
  const source = fs.readFileSync(file, "utf8");
  const ast = parse(source, { sourceType: "module" });
  const pieces = [];
  walk(ast, null, (node, parent) => {
    if (node.type === "StringLiteral" && parent?.type === "ObjectProperty" && parent.value === node) {
      pieces.push({ kind: "string", start: node.start, end: node.end, text: node.value });
    }
    if (node.type === "TemplateLiteral" && node.expressions.length) {
      pieces.push({ kind: "template", start: node.start, end: node.end, text: sentence_of(node), node });
    }
  });
  jobs.push({ file, source, pieces });
}

const dictionary = await translate_many(jobs.flatMap((job) => job.pieces.map((piece) => piece.text)));

for (const job of jobs) {
  let next = job.source;
  const ordered = [...job.pieces].sort((a, b) => b.start - a.start);
  for (const piece of ordered) {
    const translated = dictionary.get(piece.text) ?? piece.text;
    if (piece.kind === "string") {
      next = next.slice(0, piece.start) + js_string(translated) + next.slice(piece.end);
      continue;
    }
    const parts = split_parts(translated, piece.node.expressions.length);
    if (!parts) continue;
    let code = "`";
    parts.forEach((part, index) => {
      code += escape_quasi(part);
      const expression = piece.node.expressions[index];
      if (expression) code += `\${${job.source.slice(expression.start, expression.end)}}`;
    });
    code += "`";
    next = next.slice(0, piece.start) + code + next.slice(piece.end);
  }
  parse(next, { sourceType: "module" });
  fs.writeFileSync(job.file, next);
  console.log("wrote", path.basename(job.file));
}
console.log("done");
