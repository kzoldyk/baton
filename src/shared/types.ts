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

export type AgentId = "codex" | "claude" | "opencode" | "gemini" | "kiro" | "cursor" | "agy" | "kilo" | "terminal";

export const AGENT_LABELS: Record<AgentId, string> = {
  codex: "Codex",
  claude: "Claude Code",
  opencode: "OpenCode",
  gemini: "Gemini CLI",
  kiro: "Kiro",
  cursor: "Cursor",
  agy: "Antigravity",
  kilo: "Kilo",
  terminal: "Terminal"
};

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
  stagedDiffStat?: string;
  nameStatus: string;
  stagedNameStatus?: string;
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
