import fs from "fs";
import path from "path";

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (/\.(js|jsx)$/.test(entry.name)) found.push(full);
  }
  return found;
}

const pattern = /ENGLISH\.get ([A-Za-z0-9_]+)\(\) \{ return ENGLISH\.([A-Za-z0-9_]+); \}/g;
let count = 0;
for (const file of walk("src")) {
  const source = fs.readFileSync(file, "utf8");
  const next = source.replace(pattern, "ENGLISH.$1 : ENGLISH.$2");
  if (next !== source) {
    fs.writeFileSync(file, next);
    count += 1;
    console.log(path.relative("src", file));
  }
}
console.log("fixed", count);
