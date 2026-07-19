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
  codex: "Codex",
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
  q: "Amazon Q",
  "amazon-q": "Amazon Q",
  roo: "Roo Code",
  "roo-code": "Roo Code",
  "github-copilot-cli": "GitHub Copilot CLI",
  "github-copilot": "GitHub Copilot CLI",
  copilot: "GitHub Copilot CLI",
  trae: "Trae",
  zed: "Zed",
  kilo: "Kilo",
  kilocode: "KiloCode",
  openhands: "OpenHands",
  "open-hands": "OpenHands",
  devin: "Devin",
  junie: "Junie",
  manus: "Manus",
  coze: "Coze",
  dify: "Dify",
  n8n: "n8n",
  "qwen-code": "Qwen Code",
  qwen: "Qwen",
  perplexity: "Perplexity",
  phind: "Phind"
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
