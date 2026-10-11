export const CUTE_AGENT_NAMES = [
  "Mochi",
  "Boba",
  "Pip",
  "Sparky",
  "Nori",
  "Pixel",
  "Luna",
  "Milo",
  "Bento",
  "Kiko",
  "Ziggy",
  "Cosmo",
  "Peanut",
  "Pebble",
  "Sprout",
  "Clover",
  "Toast",
  "Waffles",
  "Oreo",
  "Biscuit",
  "Coco",
  "Noodle",
  "Pickle",
  "Tofu",
  "Matcha",
  "Yuki",
  "Bean",
  "Penny",
  "Archie",
  "Sunny",
  "Fable",
  "Button",
  "Otter",
  "Puffin",
  "Barnaby",
  "Finley",
  "Gidget",
  "Gizmo",
  "Nacho",
  "Widget"
];

const GENERIC_AGENT_NAMES = new Set([
  "antigravity",
  "kiro",
  "claude code",
  "claude",
  "opencode",
  "gemini",
  "gemini cli",
  "codex",
  "codex cli",
  "cursor",
  "windsurf",
  "aider",
  "cline",
  "goose",
  "amazon q developer",
  "q",
  "terminal"
]);

export function isGenericAgentName(name?: string): boolean {
  if (!name || !name.trim()) return true;
  const clean = name.trim().toLowerCase().replace(/ #\d+$/, "");
  return GENERIC_AGENT_NAMES.has(clean);
}

export function generateCuteSessionName(): string {
  return CUTE_AGENT_NAMES[Math.floor(Math.random() * CUTE_AGENT_NAMES.length)];
}
