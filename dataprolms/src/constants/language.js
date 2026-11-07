const STORAGE_KEY = "lms_language";

function read_saved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "hindi" || saved === "english") return saved;
  } catch {
    /* storage can be blocked */
  }
  return "english";
}

let current = read_saved();
const listeners = new Set();

function apply_document_language(language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language === "hindi" ? "hi" : "en";
}

apply_document_language(current);

export function get_language() {
  return current;
}

export function set_language(next) {
  const language = next === "hindi" ? "hindi" : "english";
  if (language === current) return;
  current = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* storage can be blocked */
  }
  apply_document_language(language);
  listeners.forEach((listener) => listener(language));
}

export function subscribe_language(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const LANGUAGE_LABEL = {
  english: "English",
  hindi: "हिन्दी"
};
