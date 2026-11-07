import fs from "fs";
import path from "path";
import { parse } from "./node_modules/@babel/parser/lib/index.js";

const root = path.resolve("src/constants");
const cache_path = path.resolve("tools/hindi_cache.json");
const cache = fs.existsSync(cache_path) ? JSON.parse(fs.readFileSync(cache_path, "utf8")) : {};

function keep_english(text) {
  if (typeof text !== "string") return false;
  if (text.trim() === "") return true;
  if ([...text].length === 1) return true;
  if (/^(Escape|Enter|Tab)$/.test(text)) return true;
  if (/^(Video|Material|Notes|Overview|Announcement|Active|Required)$/.test(text)) return true;
  if (/<!doctype|<!DOCTYPE|<html|<head|<body/i.test(text)) return true;
  if (/minmax\(|repeat\(/.test(text)) return true;
  if (/registration_id=/.test(text)) return true;
  if (/\\d|\\\^|\(\?:/.test(text)) return true;
  if (/^https?:\/\//.test(text.trim())) return true;
  if (/\.xlsx$/i.test(text.trim())) return true;
  if (/^[a-z0-9_]+$/.test(text)) return true;
  return false;
}

function protect(text) {
  const edges = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  let core = edges[2];
  const tokens = [];
  function park(match) {
    const token = `PH${tokens.length}PH`;
    tokens.push(match);
    return token;
  }
  core = core.replace(/\$\{arg_\d+\}/g, park);
  core = core.replace(/\b(Datapro|PDF|CSV|MCQ|API|LMS)\b/g, park);
  return { lead: edges[1], core, tail: edges[3], tokens };
}

function restore(text, tokens) {
  return text.replace(/PH(\d+)PH/gi, (_, index) => tokens[Number(index)] ?? "");
}

function needs_translation(text) {
  if (keep_english(text)) return false;
  const { core } = protect(text);
  return /[A-Za-z]/.test(core);
}

async function translate_one(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`translate ${response.status}`);
  const data = await response.json();
  return data[0].map((part) => part[0]).join("");
}

async function translate_batch(cores) {
  const sep = "\n<|/>\n";
  const joined = cores.join(sep);
  try {
    const translated = await translate_one(joined);
    const parts = translated.split(/\s*<\|\/>\s*/);
    if (parts.length === cores.length) return parts;
  } catch {
    /* fall through */
  }
  const parts = [];
  for (const core of cores) {
    parts.push(await translate_one(core));
    await delay(80);
  }
  return parts;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translate_string(text) {
  if (!needs_translation(text)) return text;
  if (Object.prototype.hasOwnProperty.call(cache, text)) return cache[text];
  return null;
}

function remember(text, translated) {
  cache[text] = translated;
}

function escape_template(text) {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function function_source(source, node, quasis) {
  if (node.type !== "ArrowFunctionExpression" || node.body.type !== "TemplateLiteral") {
    return source.slice(node.start, node.end);
  }
  const params = node.params.map((param) => source.slice(param.start, param.end)).join(", ");
  let body = "";
  node.body.quasis.forEach((quasi, index) => {
    body += escape_template(quasis[index]);
    if (index < node.body.expressions.length) {
      body += `\${${source.slice(node.body.expressions[index].start, node.body.expressions[index].end)}}`;
    }
  });
  return `(${params}) => \`${body}\``;
}

function collect_units(source, node, units) {
  if (node.type === "StringLiteral") {
    units.push({ kind: "string", text: node.value, node });
    return;
  }
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    units.push({ kind: "string", text: node.quasis[0].value.cooked, node });
    return;
  }
  if (node.type === "ArrowFunctionExpression" && node.body.type === "TemplateLiteral") {
    const raw = source.slice(node.start, node.end);
    if (keep_english(raw) || /registration_id=|<!doctype|<!DOCTYPE|minmax\(|repeat\(|\\\\d|\\\^/.test(raw)) {
      units.push({ kind: "keep", node });
      return;
    }
    const parts = node.body.quasis.map((quasi) => quasi.value.cooked);
    units.push({ kind: "function", node, parts });
    return;
  }
  units.push({ kind: "keep", node });
}

function print_value(source, unit, translated_parts) {
  if (unit.kind === "keep") return source.slice(unit.node.start, unit.node.end);
  if (unit.kind === "string") return JSON.stringify(translated_parts[0]);
  return function_source(source, unit.node, translated_parts);
}

const files = fs.readdirSync(root).filter((name) => name.endsWith("_constants_english.js"));
const jobs = [];

for (const name of files) {
  const file = path.join(root, name);
  const source = fs.readFileSync(file, "utf8");
  const ast = parse(source, { sourceType: "module" });
  const decl = ast.program.body.find((node) => node.type === "ExportNamedDeclaration");
  const variable = decl.declaration.declarations[0];
  const export_name = variable.id.name;
  const properties = [];
  for (const prop of variable.init.properties) {
    if (prop.type !== "ObjectProperty" || prop.computed) {
      throw new Error(`unsupported property in ${name}`);
    }
    const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
    const units = [];
    collect_units(source, prop.value, units);
    properties.push({ key, units });
    for (const unit of units) {
      if (unit.kind === "string" && needs_translation(unit.text)) jobs.push(unit.text);
      if (unit.kind === "function") {
        for (const part of unit.parts) {
          if (needs_translation(part)) jobs.push(part);
        }
      }
    }
  }
  jobs.file = jobs.file || [];
  jobs.push({ file_job: true, name, source, export_name, properties });
}

const texts = jobs.filter((job) => typeof job === "string");
const unique = [...new Set(texts)].filter((text) => !Object.prototype.hasOwnProperty.call(cache, text));
console.log(`files ${files.length}, strings to translate ${unique.length}, cached ${texts.length - unique.length}`);

const batch_size = 12;
for (let index = 0; index < unique.length; index += batch_size) {
  const batch = unique.slice(index, index + batch_size);
  const protected_batch = batch.map((text) => protect(text));
  let translated;
  try {
    translated = await translate_batch(protected_batch.map((item) => item.core));
  } catch (error) {
    console.error("batch failed", error.message);
    translated = protected_batch.map((item) => item.core);
  }
  batch.forEach((text, offset) => {
    const item = protected_batch[offset];
    const core = translated[offset] ?? item.core;
    const restored = `${item.lead}${restore(core, item.tokens)}${item.tail}`;
    const missing = item.tokens.some((_, token_index) => !new RegExp(`PH${token_index}PH`, "i").test(core) && item.tokens.length);
    remember(text, missing ? text : restored);
  });
  if ((index / batch_size) % 10 === 0) {
    fs.writeFileSync(cache_path, JSON.stringify(cache));
    console.log(`translated ${Math.min(index + batch.length, unique.length)} / ${unique.length}`);
  }
  await delay(120);
}
fs.writeFileSync(cache_path, JSON.stringify(cache));

let written = 0;
for (const job of jobs) {
  if (!job || !job.file_job) continue;
  const hindi_name = job.export_name.replace(/_ENGLISH$/, "_HINDI");
  const strings_name = job.export_name.replace(/_ENGLISH$/, "_STRINGS");
  const lines = [`export const ${hindi_name} = {`];
  for (const prop of job.properties) {
    const pieces = [];
    for (const unit of prop.units) {
      if (unit.kind === "string") {
        const value = Object.prototype.hasOwnProperty.call(cache, unit.text) ? cache[unit.text] : unit.text;
        pieces.push(value);
        unit.printed = JSON.stringify(value);
      } else if (unit.kind === "function") {
        const quasis = unit.parts.map((part) => (Object.prototype.hasOwnProperty.call(cache, part) ? cache[part] : part));
        unit.printed = function_source(job.source, unit.node, quasis);
      } else {
        unit.printed = job.source.slice(unit.node.start, unit.node.end);
      }
      pieces.push(unit.printed);
    }
    lines.push(`  ${prop.key}: ${prop.units.map((unit) => unit.printed).join("")},`);
  }
  lines.push("};", "");
  const hindi_file = path.join(root, job.name.replace("_english.js", "_hindi.js"));
  fs.writeFileSync(hindi_file, lines.join("\n"));

  const english_next = [
    `import { live_text } from "./live_text.js";`,
    `import { ${hindi_name} } from "./${path.basename(hindi_file)}";`,
    "",
    job.source.replace(`export const ${job.export_name} =`, `const ${strings_name} =`).replace(/\s*$/, "\n"),
    `export const ${job.export_name} = live_text(${strings_name}, ${hindi_name});`,
    ""
  ].join("\n");
  fs.writeFileSync(path.join(root, job.name), english_next);
  written += 1;
}

console.log(`wrote ${written} hindi files`);
