import fs from "fs";
import path from "path";
import { parse } from "./node_modules/@babel/parser/lib/index.js";

const src = path.resolve("src");

function walk_files(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "constants" && path.dirname(full) === src) continue;
      walk_files(full, found);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

function is_english_member(node) {
  return node &&
    node.type === "MemberExpression" &&
    !node.computed &&
    node.object.type === "Identifier" &&
    node.object.name === "ENGLISH" &&
    node.property.type === "Identifier";
}

function walk(node, in_function, visit) {
  if (!node || typeof node.type !== "string") return;
  const opens_function = node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "ObjectMethod" ||
    node.type === "ClassMethod";
  visit(node, in_function);
  const next = opens_function ? true : in_function;
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach((child) => walk(child, next, visit));
    } else if (value && typeof value.type === "string") {
      walk(value, next, visit);
    }
  }
}

function key_code(source, prop) {
  if (prop.key.type === "Identifier" && !prop.computed) return prop.key.name;
  return `[${source.slice(prop.key.start, prop.key.end)}]`;
}

let changed_files = 0;
const leftovers = [];

for (const file of walk_files(src)) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("ENGLISH.")) continue;
  let ast;
  try {
    ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  } catch (error) {
    console.error("parse fail", file, error.message);
    continue;
  }
  const replacements = [];
  walk(ast, false, (node, in_function) => {
    if (in_function) return;
    if (node.type === "ObjectProperty" && !node.computed && !node.method && node.value.type === "MemberExpression" && !node.value.computed) {
      const key = key_code(source, node);
      replacements.push({
        start: node.start,
        end: node.end,
        text: `get ${key}() { return ${source.slice(node.value.start, node.value.end)}; }`
      });
    }
    if (node.type === "ObjectProperty" && !node.computed && !node.method && node.value.type === "CallExpression" && is_english_member(node.value.callee)) {
      const key = key_code(source, node);
      replacements.push({
        start: node.start,
        end: node.end,
        text: `get ${key}() { return ${source.slice(node.value.start, node.value.end)}; }`
      });
    }
    if (node.type === "ArrayExpression" && node.elements.length && node.elements.some(is_english_member)) {
      const reads = node.elements.map((element) => `() => (${source.slice(element.start, element.end)})`).join(", ");
      replacements.push({
        start: node.start,
        end: node.end,
        text: `live_items([${reads}])`
      });
    }
  });
  if (!replacements.length) continue;
  replacements.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  for (const item of replacements) {
    if (kept.some((other) => other.start <= item.start && other.end >= item.end)) continue;
    kept.push(item);
  }
  replacements.length = 0;
  replacements.push(...kept);
  replacements.sort((a, b) => b.start - a.start);
  let next = source;
  for (const replacement of replacements) {
    next = `${next.slice(0, replacement.start)}${replacement.text}${next.slice(replacement.end)}`;
  }
  if (next.includes("live_items(") && !source.includes("live_items")) {
    const relative = path.relative(path.dirname(file), path.join(src, "constants", "live_text.js")).replaceAll("\\", "/");
    const spec = relative.startsWith(".") ? relative : `./${relative}`;
    const import_line = `import { live_items } from "${spec}";\n`;
    const ast2 = parse(source, { sourceType: "module", plugins: ["jsx"] });
    const last_import = [...ast2.program.body].reverse().find((node) => node.type === "ImportDeclaration");
    if (last_import) {
      next = `${next.slice(0, last_import.end)}\n${import_line}${next.slice(last_import.end)}`;
    } else {
      next = import_line + next;
    }
  }
  try {
    parse(next, { sourceType: "module", plugins: ["jsx"] });
  } catch (error) {
    console.error("rewrite fail", file, error.message);
    continue;
  }
  fs.writeFileSync(file, next);
  changed_files += 1;
}

function scan(node, in_function, file, source) {
  if (!node || typeof node.type !== "string") return;
  const opens_function = node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "ObjectMethod" ||
    node.type === "ClassMethod";
  if (!in_function && is_english_member(node)) {
    const parent_is_getter = false;
    leftovers.push(`${path.relative(src, file)}:${node.loc.start.line} ${source.slice(node.start, node.end)}`);
    void parent_is_getter;
  }
  const next = opens_function ? true : in_function;
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    const value = node[key];
    if (Array.isArray(value)) value.forEach((child) => scan(child, next, file, source));
    else if (value && typeof value.type === "string") scan(value, next, file, source);
  }
}

for (const file of walk_files(src)) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("ENGLISH.")) continue;
  let ast;
  try {
    ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  } catch {
    continue;
  }
  scan(ast, false, file, source);
}

const outside = leftovers.filter((line) => !line.includes("get ") );
console.log(`updated ${changed_files} files`);
console.log(`module english reads left ${leftovers.length}`);
console.log(leftovers.slice(0, 40).join("\n"));
