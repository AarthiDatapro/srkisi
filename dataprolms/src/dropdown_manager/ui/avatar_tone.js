export function avatar_tone(name = "") {
  const tones = [
  { bg: "#e8f0fe", fg: "#1967d2" },
  { bg: "#e6f4ea", fg: "#137333" },
  { bg: "#fef7e0", fg: "#b06000" },
  { bg: "#fce8e6", fg: "#c5221f" },
  { bg: "#f3e8fd", fg: "#7627bb" },
  { bg: "#e8f0fe", fg: "#EB7828" }];

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash += name.charCodeAt(index) * (index + 1);
  }
  return tones[hash % tones.length];
}
