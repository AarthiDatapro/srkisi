import fs from "fs";
import path from "path";
import { parse } from "./node_modules/@babel/parser/lib/index.js";

const root = path.resolve("src/constants");
const english_files = fs.readdirSync(root).filter((name) => name.endsWith("_constants_english.js"));
let wrapped = 0;
const missing = [];

for (const name of english_files) {
  const english_path = path.join(root, name);
  const source = fs.readFileSync(english_path, "utf8");
  if (source.includes("live_text(")) {
    wrapped += 1;
    continue;
  }
  const hindi_name = name.replace("_english.js", "_hindi.js");
  const hindi_path = path.join(root, hindi_name);
  if (!fs.existsSync(hindi_path)) {
    missing.push(hindi_name);
    continue;
  }
  const ast = parse(source, { sourceType: "module" });
  const decl = ast.program.body.find((node) => node.type === "ExportNamedDeclaration");
  const export_name = decl.declaration.declarations[0].id.name;
  const strings_name = export_name.replace(/_ENGLISH$/, "_STRINGS");
  const hindi_export = export_name.replace(/_ENGLISH$/, "_HINDI");
  const hindi_ast = parse(fs.readFileSync(hindi_path, "utf8"), { sourceType: "module" });
  const hindi_decl = hindi_ast.program.body.find((node) => node.type === "ExportNamedDeclaration");
  const actual_hindi = hindi_decl.declaration.declarations[0].id.name;
  if (actual_hindi !== hindi_export) {
    throw new Error(`${hindi_name} exports ${actual_hindi}, expected ${hindi_export}`);
  }
  const english_keys = decl.declaration.declarations[0].init.properties.map((prop) => prop.key.name || prop.key.value);
  const hindi_keys = hindi_decl.declaration.declarations[0].init.properties.map((prop) => prop.key.name || prop.key.value);
  if (english_keys.join("\n") !== hindi_keys.join("\n")) {
    const absent = english_keys.filter((key) => !hindi_keys.includes(key));
    const extra = hindi_keys.filter((key) => !english_keys.includes(key));
    throw new Error(`${hindi_name} key mismatch absent ${absent.slice(0, 8).join(", ")} extra ${extra.slice(0, 8).join(", ")}`);
  }
  const next = [
    `import { live_text } from "./live_text.js";`,
    `import { ${hindi_export} } from "./${hindi_name}";`,
    "",
    source.replace(`export const ${export_name} =`, `const ${strings_name} =`).replace(/\s*$/, "\n"),
    `export const ${export_name} = live_text(${strings_name}, ${hindi_export});`,
    ""
  ].join("\n");
  parse(next, { sourceType: "module" });
  fs.writeFileSync(english_path, next);
  wrapped += 1;
}

console.log(`wrapped ${wrapped}, missing ${missing.length}`);
if (missing.length) console.log(missing.join("\n"));
