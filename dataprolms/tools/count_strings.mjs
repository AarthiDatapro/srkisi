import fs from "fs";
import path from "path";

const dir = path.resolve("src/constants");
let chars = 0;
let n = 0;
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith("_hindi.js")) continue;
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  for (const match of text.matchAll(/: "((?:\\.|[^"\\])*)"/g)) {
    n += 1;
    chars += JSON.parse(`"${match[1]}"`).length;
  }
}
console.log("strings", n, "chars", chars);
