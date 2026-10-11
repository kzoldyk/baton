import type { AgentId } from "../../../shared/types";

export type AgentAvatarConfig = {
  color: string;
  shape: number; // 0 (boxy / superellipse n=10) to 100 (circular / superellipse n=2.2)
};

export const AGENT_AVATAR_CONFIGS: Record<string, AgentAvatarConfig> = {
  // Shell / Terminals
  terminal: { color: "#10b981", shape: 0 },
  bash: { color: "#10b981", shape: 0 },
  zsh: { color: "#10b981", shape: 5 },
  sh: { color: "#059669", shape: 0 },

  // OpenAI / Codex
  codex: { color: "#10a37f", shape: 20 },
  "codex-cli": { color: "#10a37f", shape: 20 },

  // Anthropic / Claude
  claude: { color: "#d97757", shape: 75 },
  "claude-code": { color: "#d97757", shape: 75 },
  "claude-engineer": { color: "#c2410c", shape: 70 },
  claurst: { color: "#ea580c", shape: 65 },

  // OpenCode
  opencode: { color: "#7c3aed", shape: 35 },
  "open-code": { color: "#7c3aed", shape: 35 },

  // Google Gemini
  gemini: { color: "#3b82f6", shape: 90 },
  "gemini-cli": { color: "#3b82f6", shape: 90 },
  "gemini-code-assist": { color: "#2563eb", shape: 90 },

  // Kiro
  kiro: { color: "#0d9488", shape: 50 },
  "kiro-cli": { color: "#0d9488", shape: 50 },

  // Cursor & Windsurf
  cursor: { color: "#0284c7", shape: 15 },
  windsurf: { color: "#0891b2", shape: 80 },

  // Aider & Cline
  aider: { color: "#e11d48", shape: 10 },
  cline: { color: "#059669", shape: 45 },

  // Goose
  goose: { color: "#d97706", shape: 65 },

  // Amazon Q
  q: { color: "#ea580c", shape: 55 },
  "amazon-q": { color: "#ea580c", shape: 55 },
  "amazon-q-developer": { color: "#ea580c", shape: 55 },

  // Roo Code
  roo: { color: "#db2777", shape: 30 },
  "roo-code": { color: "#db2777", shape: 30 },

  // GitHub Copilot
  copilot: { color: "#4f46e5", shape: 70 },
  "github-copilot": { color: "#4f46e5", shape: 70 },
  "github-copilot-cli": { color: "#4f46e5", shape: 70 },

  // Trae & Zed
  trae: { color: "#65a30d", shape: 25 },
  "trae-agent": { color: "#65a30d", shape: 25 },
  zed: { color: "#ea580c", shape: 5 },

  // Kilo
  kilo: { color: "#0d9488", shape: 40 },
  "kilo-code": { color: "#0d9488", shape: 40 },
  kilocode: { color: "#0d9488", shape: 40 },

  // OpenHands & Devin
  openhands: { color: "#e11d48", shape: 45 },
  "open-hands": { color: "#e11d48", shape: 45 },
  devin: { color: "#2563eb", shape: 60 },

  // JetBrains Junie
  junie: { color: "#9333ea", shape: 35 },
  "junie-cli": { color: "#9333ea", shape: 35 },

  // Manus, Coze, Dify, n8n
  manus: { color: "#4338ca", shape: 85 },
  coze: { color: "#0284c7", shape: 65 },
  dify: { color: "#1d4ed8", shape: 50 },
  n8n: { color: "#e11d48", shape: 75 },

  // Qwen
  qwen: { color: "#0891b2", shape: 30 },
  "qwen-code": { color: "#0891b2", shape: 30 },

  // Perplexity & Phind
  perplexity: { color: "#0d9488", shape: 55 },
  phind: { color: "#475569", shape: 20 },

  // Antigravity (AGY)
  agy: { color: "#0284c7", shape: 100 },
  antigravity: { color: "#0284c7", shape: 100 },
  "antigravity-cli": { color: "#0284c7", shape: 100 },

  // Grok Build
  grok: { color: "#dc2626", shape: 0 },
  "grok-build": { color: "#dc2626", shape: 0 },

  // Pi & Open Interpreter
  pi: { color: "#10b981", shape: 80 },
  interpreter: { color: "#6b7280", shape: 15 },
  "open-interpreter": { color: "#6b7280", shape: 15 },

  // Continue & Vibe & Kimi
  continue: { color: "#10b981", shape: 60 },
  cn: { color: "#10b981", shape: 60 },
  vibe: { color: "#fb923c", shape: 45 },
  kimi: { color: "#60a5fa", shape: 70 },

  // Plandex & Crush & Deep Agents
  plandex: { color: "#a855f7", shape: 40 },
  crush: { color: "#f43f5e", shape: 85 },
  "deep-agents": { color: "#4338ca", shape: 25 },

  // SWE-agent & Codebuff & Forge
  sweagent: { color: "#047857", shape: 50 },
  "swe-agent": { color: "#047857", shape: 50 },
  codebuff: { color: "#eab308", shape: 65 },
  forge: { color: "#b45309", shape: 10 },

  // Hermes & Claw & Free Code
  hermes: { color: "#c026d3", shape: 55 },
  "hermes-agent": { color: "#c026d3", shape: 55 },
  claw: { color: "#dc2626", shape: 5 },
  "claw-code": { color: "#dc2626", shape: 5 },
  "free-code": { color: "#10b981", shape: 50 },

  // Amp & Droid & Command & Codel & gptme
  amp: { color: "#e11d48", shape: 70 },
  droid: { color: "#22c55e", shape: 90 },
  command: { color: "#475569", shape: 15 },
  "command-code": { color: "#475569", shape: 15 },
  codel: { color: "#2563eb", shape: 40 },
  gptme: { color: "#10a37f", shape: 30 },
  devon: { color: "#6366f1", shape: 60 },
  omp: { color: "#0ea5e9", shape: 25 },
  auggie: { color: "#f59e0b", shape: 50 },
  codebuddy: { color: "#ec4899", shape: 75 },
  tabnine: { color: "#6366f1", shape: 40 },
  mimo: { color: "#8b5cf6", shape: 60 },
  "mimo-code": { color: "#8b5cf6", shape: 60 },
  smol: { color: "#fbbf24", shape: 85 },
  "smol-developer": { color: "#fbbf24", shape: 85 },
  nanocoder: { color: "#06b6d4", shape: 15 },
  groq: { color: "#f97316", shape: 30 },
  "groq-code": { color: "#f97316", shape: 30 },
  letta: { color: "#8b5cf6", shape: 50 },
  "letta-code": { color: "#8b5cf6", shape: 50 },
  opensquilla: { color: "#059669", shape: 45 },
  "ra-aid": { color: "#dc2626", shape: 20 },
  cortex: { color: "#7c3aed", shape: 65 },
  coderabbit: { color: "#f97316", shape: 80 },
  supergate: { color: "#2563eb", shape: 35 },
  superset: { color: "#0d9488", shape: 55 },
  "vibe-kanban": { color: "#d946ef", shape: 70 },
  cmux: { color: "#475569", shape: 0 },
  ralph: { color: "#eab308", shape: 90 },
  ruflo: { color: "#d97757", shape: 75 },
  agentsmesh: { color: "#0ea5e9", shape: 50 },

  // Web generators
  lovable: { color: "#f43f5e", shape: 95 },
  bolt: { color: "#eab308", shape: 30 },
  "bolt-new": { color: "#eab308", shape: 30 },
  v0: { color: "#71717a", shape: 0 },
  emergent: { color: "#10b981", shape: 65 },
  warp: { color: "#06b6d4", shape: 40 },
  augment: { color: "#8b5cf6", shape: 60 },
  augmentcode: { color: "#8b5cf6", shape: 60 },
  dyad: { color: "#3b82f6", shape: 50 },
  void: { color: "#64748b", shape: 10 },
  "void-ai": { color: "#64748b", shape: 10 },
  zencoder: { color: "#14b8a6", shape: 75 },
  cody: { color: "#a855f7", shape: 55 },
  codeium: { color: "#059669", shape: 45 },
  supermaven: { color: "#ef4444", shape: 80 },
  patapim: { color: "#ec4899", shape: 90 },
  bwee: { color: "#f59e0b", shape: 35 },
  replit: { color: "#ea580c", shape: 20 },
  "replit-agent": { color: "#ea580c", shape: 20 },
};

const FALLBACK_PALETTE = [
  "#e11d48", "#ea580c", "#d97706", "#65a30d",
  "#059669", "#0d9488", "#0891b2", "#0284c7",
  "#2563eb", "#4f46e5", "#7c3aed", "#9333ea",
  "#c026d3", "#db2777", "#e11d48"
];

const SHAPE_LEVELS = [0, 15, 30, 45, 60, 75, 90, 100];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAgentAvatarConfig(agentId: AgentId | string): AgentAvatarConfig {
  const normalized = (agentId || "").toLowerCase().trim();
  const direct = AGENT_AVATAR_CONFIGS[normalized];
  if (direct) return direct;

  const h = hashString(normalized);
  return {
    color: FALLBACK_PALETTE[h % FALLBACK_PALETTE.length],
    shape: SHAPE_LEVELS[h % SHAPE_LEVELS.length],
  };
}

export function extractAvatarSize(className?: string, explicitSize?: number): number {
  if (explicitSize && explicitSize > 0) return explicitSize;
  if (!className) return 24;

  if (className.includes("h-3.5") || className.includes("w-3.5")) return 18;
  if (className.includes("h-3") || className.includes("w-3")) return 16;
  if (className.includes("h-4") || className.includes("w-4")) return 20;
  if (className.includes("h-4.5") || className.includes("w-4.5")) return 22;
  if (className.includes("h-5") || className.includes("w-5")) return 24;
  if (className.includes("h-6") || className.includes("w-6")) return 28;
  if (className.includes("h-7") || className.includes("w-7")) return 32;
  if (className.includes("h-8") || className.includes("w-8")) return 36;
  if (className.includes("h-9") || className.includes("w-9")) return 40;
  if (className.includes("h-10") || className.includes("w-10")) return 44;
  if (className.includes("h-12") || className.includes("w-12")) return 52;
  if (className.includes("h-16") || className.includes("w-16")) return 68;

  const match = className.match(/[hw]-(\d+(\.\d+)?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return Math.round(val * 4);
  }

  return 24;
}
