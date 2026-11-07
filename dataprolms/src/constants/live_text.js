import { get_language } from "./language.js";

export function live_text(english, hindi) {
  return new Proxy(english, {
    get(target, key) {
      if (typeof key !== "string") return target[key];
      if (get_language() === "hindi" && hindi && Object.prototype.hasOwnProperty.call(hindi, key)) {
        const value = hindi[key];
        if (value !== undefined && value !== "") return value;
      }
      return target[key];
    }
  });
}

export function live_items(reads) {
  function plain() {
    return reads.map((read) => read());
  }

  return new Proxy(reads, {
    get(target, prop) {
      if (prop === "length") return target.length;
      if (prop === Symbol.iterator) {
        return function* iterate() {
          for (let index = 0; index < target.length; index += 1) yield target[index]();
        };
      }
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        const index = Number(prop);
        return target[index] ? target[index]() : undefined;
      }
      const method = Array.prototype[prop];
      if (typeof method === "function") {
        return (...args) => method.apply(plain(), args);
      }
      return undefined;
    }
  });
}
