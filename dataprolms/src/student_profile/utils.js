import { STUDENT_PROFILE_ENGLISH as ENGLISH } from "../constants/english/student_profile_constants_english.js";
import { live_items } from "../constants/live_text.js";

export { display_name, initials } from "../design_system/people.js";

export function format_joined(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function latest_birth_date() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setFullYear(date.getFullYear() - 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function profile_dob_error(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return ENGLISH.enter_a_valid_date_of_birth;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return ENGLISH.enter_a_valid_date_of_birth;
  }
  if (text > latest_birth_date()) return ENGLISH.date_of_birth_must_be_at_least_10;
  return "";
}

export function format_dob(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function address_line(student) {
  return [
  student?.address_line,
  [student?.district, student?.state].filter(Boolean).join(", "),
  student?.pincode].

  filter(Boolean).
  join(" · ");
}

export const TILE_TONES = [
["#e0f2fe", "#0369a1"],
["#ede9fe", "#6d28d9"],
["#dcfce7", "#15803d"],
["#ffedd5", "#c2410c"],
["#fce7f3", "#be185d"],
["#e0e7ff", "#4338ca"],
["#ccfbf1", "#0f766e"]];

export function split_list(text) {
  return String(text || "").
  split(/[,|;/]+/).
  map((part) => part.trim()).
  filter(Boolean);
}

export function split_lines(text) {
  return String(text || "").
  split(/\r?\n/).
  map((line) => line.replace(/^[-•*]\s*/, "").trim()).
  filter(Boolean);
}

export function tile_tone(text) {
  let hash = 0;
  for (const char of String(text || "")) hash = hash * 31 + char.charCodeAt(0) >>> 0;
  const [background, color] = TILE_TONES[hash % TILE_TONES.length];
  return { background, color };
}

export function monogram(text) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const TECH_ALIASES = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  html: "html5",
  css: "css3",
  reactjs: "react",
  reactnative: "react",
  node: "nodejs",
  expressjs: "express",
  vue: "vuejs",
  next: "nextjs",
  angularjs: "angular",
  golang: "go",
  tailwind: "tailwindcss",
  postgres: "postgresql",
  mongo: "mongodb",
  k8s: "kubernetes",
  springboot: "spring",
  scss: "sass",
  tf: "tensorflow",
  torch: "pytorch",
  sklearn: "scikitlearn",
  jupyternotebook: "jupyter",
  hf: "huggingface",
  gemini: "googlegemini",
  claude: "anthropic",
  aws: "amazonwebservices",
  gcp: "googlecloud",
  kafka: "apachekafka",
  net: "dot-net",
  dotnet: "dot-net",
  mssql: "microsoftsqlserver",
  sqlserver: "microsoftsqlserver"
};

export const DETECT_TECH = [
live_items([() => (ENGLISH.python), () => ("python"), () => ("python")]),
live_items([() => (ENGLISH.java), () => ("java"), () => ("java")]),
["JavaScript", "javascript", "javascript"],
["TypeScript", "typescript", "typescript"],
live_items([() => (ENGLISH.react), () => ("react"), () => ("react(?:\\.?js)?")]),
live_items([() => (ENGLISH.angular), () => ("angular"), () => ("angular(?:js)?")]),
["Vue.js", "vuejs", "vue(?:\\.?js)?"],
["Next.js", "nextjs", "next\\.?js"],
["Node.js", "nodejs", "node\\.?js"],
live_items([() => (ENGLISH.express), () => ("express"), () => ("express\\.?js")]),
live_items([() => (ENGLISH.django), () => ("django"), () => ("django")]),
live_items([() => (ENGLISH.flask), () => ("flask"), () => ("flask")]),
["FastAPI", "fastapi", "fast\\s?api"],
live_items([() => (ENGLISH.spring_boot), () => ("spring"), () => ("spring\\s?boot")]),
[".NET", "dot-net", "asp\\.net|\\.net|dotnet"],
["C++", "cplusplus", "c\\+\\+"],
["C#", "csharp", "c#"],
["PHP", "php", "php"],
live_items([() => (ENGLISH.laravel), () => ("laravel"), () => ("laravel")]),
live_items([() => (ENGLISH.kotlin), () => ("kotlin"), () => ("kotlin")]),
live_items([() => (ENGLISH.swift), () => ("swift"), () => ("swift")]),
live_items([() => (ENGLISH.flutter), () => ("flutter"), () => ("flutter")]),
live_items([() => (ENGLISH.dart), () => ("dart"), () => ("dart")]),
["HTML", "html5", "html5?"],
["CSS", "css3", "css3?"],
live_items([() => (ENGLISH.tailwind_css), () => ("tailwindcss"), () => ("tailwind(?:\\s?css)?")]),
live_items([() => (ENGLISH.bootstrap), () => ("bootstrap"), () => ("bootstrap")]),
["MySQL", "mysql", "mysql"],
["PostgreSQL", "postgresql", "postgres(?:ql)?"],
["MongoDB", "mongodb", "mongo(?:db)?"],
live_items([() => (ENGLISH.sql_server), () => ("microsoftsqlserver"), () => ("sql\\s?server|mssql")]),
live_items([() => (ENGLISH.redis), () => ("redis"), () => ("redis")]),
live_items([() => (ENGLISH.firebase), () => ("firebase"), () => ("firebase")]),
["GraphQL", "graphql", "graphql"],
live_items([() => (ENGLISH.docker), () => ("docker"), () => ("docker(?:ized|ised)?")]),
live_items([() => (ENGLISH.kubernetes), () => ("kubernetes"), () => ("kubernetes|k8s")]),
["AWS", "amazonwebservices", "aws|amazon\\s?web\\s?services"],
live_items([() => (ENGLISH.azure), () => ("azure"), () => ("azure")]),
live_items([() => (ENGLISH.google_cloud), () => ("googlecloud"), () => ("gcp|google\\s?cloud")]),
live_items([() => (ENGLISH.git), () => ("git"), () => ("git")]),
["GitHub", "github", "github"],
["GitLab", "gitlab", "gitlab"],
live_items([() => (ENGLISH.jenkins), () => ("jenkins"), () => ("jenkins")]),
live_items([() => (ENGLISH.terraform), () => ("terraform"), () => ("terraform")]),
live_items([() => (ENGLISH.nginx), () => ("nginx"), () => ("nginx")]),
live_items([() => (ENGLISH.linux), () => ("linux"), () => ("linux")]),
live_items([() => (ENGLISH.kafka), () => ("apachekafka"), () => ("kafka")]),
["RabbitMQ", "rabbitmq", "rabbitmq"],
live_items([() => (ENGLISH.power_bi), () => ("powerbi"), () => ("power\\s?bi")]),
live_items([() => (ENGLISH.tableau), () => ("tableau"), () => ("tableau")]),
live_items([() => (ENGLISH.pandas), () => ("pandas"), () => ("pandas")]),
["NumPy", "numpy", "numpy"],
["TensorFlow", "tensorflow", "tensorflow"],
["PyTorch", "pytorch", "pytorch"],
live_items([() => (ENGLISH.keras), () => ("keras"), () => ("keras")]),
["scikit-learn", "scikitlearn", "scikit[-\\s]?learn|sklearn"],
["OpenCV", "opencv", "opencv"],
["LangChain", "langchain", "langchain"],
live_items([() => (ENGLISH.hugging_face), () => ("huggingface"), () => ("hugging\\s?face")]),
live_items([() => (ENGLISH.ollama), () => ("ollama"), () => ("ollama")]),
["OpenAI", "openai", "openai"],
live_items([() => (ENGLISH.jira), () => ("jira"), () => ("jira")]),
live_items([() => (ENGLISH.figma), () => ("figma"), () => ("figma")]),
live_items([() => (ENGLISH.postman), () => ("postman"), () => ("postman")]),
live_items([() => (ENGLISH.selenium), () => ("selenium"), () => ("selenium")])].
map(([label, slug, pattern]) => ({
  label,
  slug,
  matcher: new RegExp(`(?<![a-z0-9])(?:${pattern})(?![a-z0-9])`, "i")
}));

export function detect_tech(text) {
  const source = String(text || "");
  if (!source.trim()) return [];
  return DETECT_TECH.filter(({ matcher }) => matcher.test(source)).map(({ label, slug }) => ({ label, slug }));
}

export function is_current_role(start_label, end_label) {
  const end = String(end_label || "").trim();
  if (!end) return Boolean(String(start_label || "").trim());
  return /\b(present|current|now|ongoing|till)\b/i.test(end);
}

export function tech_base(name) {
  return String(name || "").
  toLowerCase().
  replace(/\+/g, "plus").
  replace(/#/g, "sharp").
  replace(/[^a-z0-9]/g, "");
}

export function tech_slug(name) {
  const base = tech_base(name);
  return TECH_ALIASES[base] || base;
}

export function tech_logo_urls(name) {
  const slug = tech_slug(name);
  if (!slug) return [];
  const devicon = `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${slug}/${slug}`;
  return [
  `${devicon}-original.svg`,
  `${devicon}-plain.svg`,
  `${devicon}-original-wordmark.svg`,
  `https://cdn.simpleicons.org/${slug}`];

}

