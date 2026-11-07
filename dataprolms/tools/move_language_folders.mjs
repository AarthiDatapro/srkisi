import fs from "fs";
import path from "path";

const src = path.resolve("src");
const constants = path.join(src, "constants");
const english_dir = path.join(constants, "english");
const hindi_dir = path.join(constants, "hindi");
fs.mkdirSync(english_dir, { recursive: true });
fs.mkdirSync(hindi_dir, { recursive: true });

for (const name of fs.readdirSync(constants)) {
  const full = path.join(constants, name);
  if (!fs.statSync(full).isFile()) continue;
  if (name.endsWith("_constants_english.js")) fs.renameSync(full, path.join(english_dir, name));
  if (name.endsWith("_constants_hindi.js")) fs.renameSync(full, path.join(hindi_dir, name));
}

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (/\.(js|jsx)$/.test(entry.name)) found.push(full);
  }
  return found;
}

for (const file of walk(src)) {
  if (file.startsWith(english_dir) || file.startsWith(hindi_dir)) continue;
  const source = fs.readFileSync(file, "utf8");
  const next = source.replace(/constants\/([a-z0-9_]+_constants_english\.js)/g, "constants/english/$1");
  if (next !== source) fs.writeFileSync(file, next);
}

for (const name of fs.readdirSync(english_dir)) {
  const file = path.join(english_dir, name);
  let source = fs.readFileSync(file, "utf8");
  if (source.includes("live_text")) {
    source = source.replaceAll('from "./live_text.js"', 'from "../live_text.js"');
    source = source.replace(/from "\.\/([a-z0-9_]+_constants_hindi\.js)"/g, 'from "../hindi/$1"');
    fs.writeFileSync(file, source);
    continue;
  }
  const match = source.match(/^export const ([A-Z0-9_]+) = \{/);
  if (!match) {
    console.log("skip wrap", name);
    continue;
  }
  const export_name = match[1];
  const hindi_name = export_name.replace(/_ENGLISH$/, "_HINDI");
  const strings_name = export_name.replace(/_ENGLISH$/, "_STRINGS");
  const hindi_file = name.replace("_english.js", "_hindi.js");
  source = source.replace(`export const ${export_name} = {`, `const ${strings_name} = {`);
  const end = source.lastIndexOf("\n};");
  source = `${source.slice(0, end)}\n};\n\nexport const ${export_name} = live_text(${strings_name}, ${hindi_name});\n`;
  source = `import { live_text } from "../live_text.js";\nimport { ${hindi_name} } from "../hindi/${hindi_file}";\n\n${source}`;
  fs.writeFileSync(file, source);
  console.log("wrapped", name);
}

let getters = 0;
for (const file of walk(src)) {
  if (file.startsWith(english_dir) || file.startsWith(hindi_dir)) continue;
  const source = fs.readFileSync(file, "utf8");
  const next = source.replace(
    /([ \t]*)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*ENGLISH\.([A-Za-z_][A-Za-z0-9_]*)(\s*,)/g,
    (all, indent, key, prop, comma) => {
      getters += 1;
      return `${indent}get ${key}() { return ENGLISH.${prop}; }${comma}`;
    }
  );
  if (next !== source) fs.writeFileSync(file, next);
}
console.log("getters", getters);
console.log("english", fs.readdirSync(english_dir).length, "hindi", fs.readdirSync(hindi_dir).length);
