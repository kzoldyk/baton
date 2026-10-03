export type Project = {
  id: string;
  name: string;
  path: string;
  appStoragePath: string;
  currentBranch?: string;
  activeTaskId?: string;
  createdAt: string;
  updatedAt: string;
};

export type BatonTask = {
  id: string;
  projectId: string;
  title: string;
  status: "active" | "paused" | "completed";
  goal?: string;
  createdAt: string;
  updatedAt: string;
};

export type Todo = {
  text: string;
  done: boolean;
};

export type AgentId = string;

export const AGENT_LABELS: Record<string, string> = {
  any: "Any Agent",
  developer: "Developer",
  terminal: "Terminal Shell",
  bash: "Bash",
  zsh: "Zsh",
  sh: "Shell",
  codex: "Codex",
  "codex-cli": "Codex CLI",
  claude: "Claude Code",
  "claude-code": "Claude Code",
  opencode: "OpenCode",
  "open-code": "OpenCode",
  gemini: "Gemini CLI",
  "gemini-cli": "Gemini CLI",
  kiro: "Kiro",
  "kiro-cli": "Kiro",
  aider: "Aider",
  cline: "Cline",
  cursor: "Cursor",
  windsurf: "Windsurf",
  goose: "Goose",
  q: "Amazon Q Developer",
  "amazon-q": "Amazon Q Developer",
  "amazon-q-developer": "Amazon Q Developer",
  roo: "Roo Code",
  "roo-code": "Roo Code",
  "github-copilot-cli": "GitHub Copilot CLI",
  "github-copilot": "GitHub Copilot CLI",
  copilot: "GitHub Copilot CLI",
  trae: "Trae",
  "trae-agent": "Trae Agent",
  zed: "Zed",
  kilo: "Kilo",
  "kilo-code": "Kilo Code",
  kilocode: "KiloCode",
  openhands: "OpenHands",
  "open-hands": "OpenHands",
  devin: "Devin",
  junie: "Junie",
  "junie-cli": "Junie CLI",
  manus: "Manus",
  coze: "Coze",
  dify: "Dify",
  n8n: "n8n",
  "qwen-code": "Qwen Code",
  qwen: "Qwen",
  perplexity: "Perplexity",
  phind: "Phind",
  agy: "Antigravity",
  antigravity: "Antigravity",
  "antigravity-cli": "Antigravity CLI",
  grok: "Grok Build",
  "grok-build": "Grok Build",
  pi: "Pi",
  interpreter: "Open Interpreter",
  "open-interpreter": "Open Interpreter",
  cn: "Continue",
  continue: "Continue",
  vibe: "Mistral Vibe",
  kimi: "Kimi CLI",
  plandex: "Plandex",
  crush: "Crush",
  "deep-agents": "Deep Agents Code",
  sweagent: "SWE-agent",
  "swe-agent": "SWE-agent",
  codebuff: "Codebuff",
  forge: "ForgeCode",
  hermes: "Hermes Agent",
  "hermes-agent": "Hermes Agent",
  claw: "Claw Code",
  "claw-code": "Claw Code",
  "claude-engineer": "Claude Engineer",
  claurst: "Claurst",
  "free-code": "Free Code",
  amp: "Amp",
  droid: "Droid",
  command: "Command Code",
  "command-code": "Command Code",
  codel: "Codel",
  gptme: "gptme",
  devon: "Devon",
  omp: "Omp",
  auggie: "Auggie CLI",
  codebuddy: "CodeBuddy",
  tabnine: "Tabnine CLI",
  mimo: "MiMo Code",
  "mimo-code": "MiMo Code",
  smol: "Smol Developer",
  "smol-developer": "Smol Developer",
  nanocoder: "Nanocoder",
  groq: "Groq Code CLI",
  "groq-code": "Groq Code CLI",
  letta: "Letta Code",
  "letta-code": "Letta Code",
  opensquilla: "OpenSquilla",
  "ra-aid": "RA.Aid",
  cortex: "Cortex Code CLI",
  coderabbit: "CodeRabbit",
  supergate: "SuperGate",
  superset: "Superset",
  "vibe-kanban": "Vibe Kanban",
  cmux: "cmux",
  ralph: "Ralph",
  ruflo: "Ruflo (formerly Claude Flow)",
  agentsmesh: "AgentsMesh",
  lovable: "Lovable",
  bolt: "Bolt.new",
  "bolt-new": "Bolt.new",
  v0: "v0",
  emergent: "Emergent",
  warp: "Warp",
  augment: "Augment",
  augmentcode: "Augment",
  dyad: "Dyad",
  void: "Void AI",
  "void-ai": "Void AI",
  zencoder: "Zencoder",
  cody: "Cody",
  codeium: "Codeium",
  supermaven: "Supermaven",
  "gemini-code-assist": "Gemini Code Assist",
  patapim: "PATAPIM",
  bwee: "Bwee",
  replit: "Replit",
  "replit-agent": "Replit Agent",
};

export function agentLabel(agentId: string): string {
  return AGENT_LABELS[agentId.toLowerCase()] ?? agentId;
}

export type AgentStatus = {
  id: AgentId;
  displayName: string;
  description?: string;
  command: string;
  installed: boolean;
  path?: string;
  supportedModes: Array<"run" | "handoff" | "continue">;
};

export type AgentSession = {
  id: string;
  projectId: string;
  taskId?: string;
  agent: AgentId;
  status: "idle" | "running" | "completed" | "failed";
  startedAt: string;
  endedAt?: string;
  logPath?: string;
};

export type HandoffQuality = {
  useful: boolean;
  tooLong: boolean;
  charCount: number;
  missing: string[];
  warnings: string[];
};

export type Handoff = {
  id: string;
  projectId: string;
  taskId?: string;
  fromAgent: AgentId;
  toAgent?: AgentId;
  filePath: string;
  summary?: string;
  createdAt: string;
  content?: string;
  quality?: HandoffQuality;
};

export type ChangedFile = {
  path: string;
  additions: number;
  deletions: number;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked";
};

export type GitStatus = {
  isRepo: boolean;
  branch: string;
  statusShort: string;
  diffStat: string;
  nameStatus: string;
  changedFiles: ChangedFile[];
  additions: number;
  deletions: number;
  omittedFileCount?: number;
  head?: string;
};

export type AddProjectResult = {
  project: Project;
  gitignoreUpdated: boolean;
};

export type TerminalSession = {
  id: string;
  projectId: string;
  agentId: AgentId;
  taskId?: string;
  name?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  logPath?: string;
};

export type CreateFallbackHandoffInput = {
  projectId: string;
  taskId?: string;
  sessionId?: string;
  fromAgent: AgentId;
  toAgent?: AgentId;
  nextSteps?: string;
  constraints?: string;
};

export type UseHandoffInput = {
  projectId: string;
  agentId: AgentId;
};

export type SettingsMap = Record<string, string>;

export type McpServer = {
  name: string;
  status: "running" | "failed" | "unknown";
  detail: string;
  source?: string;
};

export type GuiAgentTarget = "cursor" | "windsurf" | "instructions";

export type ExportRulesResult = {
  success: boolean;
  filePath: string;
};

