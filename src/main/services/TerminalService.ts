import type { BrowserWindow } from "electron";
import * as electron from "electron";
import type { Database } from "better-sqlite3";
import { spawn, execSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createWriteStream, accessSync, chmodSync, constants, type WriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import pty from "node-pty";
import type { AgentId, TerminalSession } from "../../shared/types.ts";
import { generateCuteSessionName, isGenericAgentName } from "../../shared/cuteNames.ts";
import type { AgentService, HandoffPromptGuidance } from "./AgentService.ts";
import { makeId, nowIso } from "./ids.ts";
import type { ProjectService } from "./ProjectService.ts";
import { redactSecrets } from "./redaction.ts";
import { detectTokenAlert, evaluateByteThreshold } from "./tokenAlerts.ts";

export type ExtractedLogContext = {
  commands: string[];
  testResults: string[];
  errors: string[];
};

type ContextTracker = {
  totalBytes: number;
  lastExplicitAlertAt: number;
  lastByteAlertLevel?: "warning" | "critical";
};

type PtyRecord = {
  session: TerminalSession;
  process: TerminalProcess;
  log?: WriteStream;
};

type TerminalProcess = {
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(callback: (data: string) => void): void;
  onExit(callback: (exitCode: number) => void): void;
};

const SHELL_PATHS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin"
];

export function hasTmuxAvailable(): boolean {
  return checkTmux();
}

export class TerminalService {
  private readonly db: Database;
  private readonly projects: ProjectService;
  private readonly agents: AgentService;
  private readonly sessions = new Map<string, PtyRecord>();
  private readonly contextTrackers = new Map<string, ContextTracker>();

  constructor(
    db: Database,
    projects: ProjectService,
    agents: AgentService
  ) {
    this.db = db;
    this.projects = projects;
    this.agents = agents;
  }

  async start(projectId: string, agentId: AgentId, window: BrowserWindow): Promise<TerminalSession> {
    const project = this.projects.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    const adapter = this.agents.getAdapter(agentId);
    const executable = await this.agents.resolveExecutable(agentId);
    if (!executable) {
      throw new Error(`${adapter.displayName} is not installed or is not available on PATH.`);
    }
    const sessionId = makeId("ses");
    const logPath = path.join(project.appStoragePath, "logs", `${agentId}-${sessionId}.log`);
    const taskId = (
      this.db.prepare(`SELECT id FROM tasks WHERE project_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1`).get(projectId) as { id: string } | undefined
    )?.id;
    
    const defaultName = generateCuteSessionName();

    this.db
      .prepare(
        `INSERT INTO agent_sessions (id, project_id, task_id, agent_name, name, status, started_at, log_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(sessionId, projectId, taskId ?? null, agentId, defaultName, "running", nowIso(), logPath);

    return this.launch(sessionId, projectId, agentId, logPath, window);
  }

  async restore(sessionId: string, window: BrowserWindow): Promise<TerminalSession> {
    const row = this.db
      .prepare(`SELECT project_id as projectId, agent_name as agentId, log_path as logPath FROM agent_sessions WHERE id = ?`)
      .get(sessionId) as { projectId: string; agentId: AgentId; logPath: string } | undefined;
    
    if (!row) throw new Error("Session not found.");
    
    this.db.prepare(`UPDATE agent_sessions SET status = ?, ended_at = NULL WHERE id = ?`).run("running", sessionId);
    
    return this.launch(sessionId, row.projectId, row.agentId, row.logPath, window);
  }

  private async launch(sessionId: string, projectId: string, agentId: AgentId, logPath: string, window: BrowserWindow): Promise<TerminalSession> {
    const project = this.projects.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    const executable = await this.agents.resolveExecutable(agentId);
    if (!executable) throw new Error(`Executable for ${agentId} not found.`);

    const launch = buildShellLaunch(executable);
    const terminalProcess = createTerminalProcess(launch, project.path, executable, sessionId);
    const log = createWriteStream(logPath, { flags: "a" });
    
    const session = { id: sessionId, projectId, agentId };

    terminalProcess.onData((data) => {
      log.write(redactSecrets(data));
      window.webContents.send("terminal:data", { sessionId, data });

      if (!window.isDestroyed()) {
        let tracker = this.contextTrackers.get(sessionId);
        if (!tracker) {
          tracker = { totalBytes: 0, lastExplicitAlertAt: 0 };
          this.contextTrackers.set(sessionId, tracker);
        }
        tracker.totalBytes += data.length;

        const explicitAlert = detectTokenAlert(data);
        const now = Date.now();
        if (explicitAlert && now - tracker.lastExplicitAlertAt > 30000) {
          tracker.lastExplicitAlertAt = now;
          window.webContents.send("terminal:contextWarning", {
            sessionId,
            message: explicitAlert.message,
            level: explicitAlert.level
          });
        } else if (!explicitAlert) {
          const byteAlert = evaluateByteThreshold(tracker.totalBytes);
          if (byteAlert && byteAlert.level !== tracker.lastByteAlertLevel) {
            tracker.lastByteAlertLevel = byteAlert.level;
            window.webContents.send("terminal:contextWarning", {
              sessionId,
              message: byteAlert.message,
              level: byteAlert.level
            });
          }
        }
      }
    });
    terminalProcess.onExit((exitCode) => {
      log.end();
      this.db
        .prepare(`UPDATE agent_sessions SET status = ?, ended_at = ? WHERE id = ?`)
        .run(exitCode === 0 ? "completed" : "failed", nowIso(), sessionId);
      if (!window.isDestroyed()) {
        window.webContents.send("terminal:exit", { sessionId, exitCode });
      }
      this.sessions.delete(sessionId);
      this.contextTrackers.delete(sessionId);
    });

    this.sessions.set(sessionId, { session, process: terminalProcess, log });
    return session;
  }

  write(sessionId: string, data: string): void {
    this.sessions.get(sessionId)?.process.write(data);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    this.sessions.get(sessionId)?.process.resize(cols, rows);
  }

  inject(sessionId: string, prompt: string): void {
    this.write(sessionId, `${prompt}\r`);
  }

  async injectContinue(sessionId: string): Promise<void> {
    const record = this.sessions.get(sessionId);
    if (!record) throw new Error("No live terminal for this session. Copy the continue prompt and paste it when the agent is ready.");
    const project = this.projects.getProject(record.session.projectId);
    if (!project) throw new Error("Project not found.");
    this.inject(sessionId, this.continuePrompt(sessionId));
  }

  continuePrompt(sessionId: string): string {
    const live = this.sessions.get(sessionId);
    const row = live
      ? live.session
      : this.db
          .prepare(`SELECT project_id as projectId, agent_name as agentId FROM agent_sessions WHERE id = ?`)
          .get(sessionId) as { projectId: string; agentId: AgentId } | undefined;
    if (!row) throw new Error("Session not found.");
    const project = this.projects.getProject(row.projectId);
    if (!project) throw new Error("Project not found.");
    return this.agents.getAdapter(row.agentId).buildContinuePrompt({ projectPath: project.path });
  }

  injectHandoff(sessionId: string, guidance?: HandoffPromptGuidance): void {
    if (!this.sessions.get(sessionId)) {
      throw new Error("No live terminal for this session. Save a pass from git instead.");
    }
    this.inject(sessionId, this.agents.buildHandoffPrompt(guidance));
  }

  injectUpdateHandoff(sessionId: string): void {
    this.inject(sessionId, this.agents.buildUpdateHandoffPrompt());
  }

  kill(sessionId: string): void {
    const record = this.sessions.get(sessionId);
    if (record) {
      record.process.kill();
      killTmuxSession(sessionId);
    }
  }

  listForProject(projectId: string): TerminalSession[] {
    const rows = this.db
      .prepare(
        `SELECT id, project_id as projectId, task_id as taskId, agent_name as agentId, name, status, started_at as startedAt, ended_at as endedAt, log_path as logPath
         FROM agent_sessions
         WHERE project_id = ?
         ORDER BY started_at DESC`
      )
      .all(projectId) as TerminalSession[];

    for (const row of rows) {
      if (isGenericAgentName(row.name)) {
        const cute = generateCuteSessionName();
        this.db.prepare(`UPDATE agent_sessions SET name = ? WHERE id = ?`).run(cute, row.id);
        row.name = cute;
      }
    }
    return rows;
  }

  async markStaleSessions(): Promise<void> {
    const running = this.db.prepare(`SELECT id FROM agent_sessions WHERE status = ?`).all("running") as { id: string }[];
    const tmuxCmd = resolveTmuxCommand();
    for (const session of running) {
      const tmuxSessionName = `baton_${session.id}`;
      try {
        if (!tmuxCmd) throw new Error("tmux is not available");
        execSync(`${shellQuote(tmuxCmd)} -L baton has-session -t ${shellQuote(tmuxSessionName)} 2>/dev/null`);
        this.db.prepare(`UPDATE agent_sessions SET status = ? WHERE id = ?`).run("detached", session.id);
      } catch {
        this.db.prepare(`UPDATE agent_sessions SET status = ?, ended_at = ? WHERE id = ?`).run("failed", nowIso(), session.id);
      }
    }
  }

  close(sessionId: string): void {
    const record = this.sessions.get(sessionId);
    if (record) {
      record.process.kill();
      this.sessions.delete(sessionId);
    }
    this.contextTrackers.delete(sessionId);
    killTmuxSession(sessionId);
    this.db.prepare(`UPDATE agent_sessions SET status = ?, ended_at = ? WHERE id = ?`).run("completed", nowIso(), sessionId);
  }

  rename(sessionId: string, name: string): TerminalSession | undefined {
    this.db.prepare(`UPDATE agent_sessions SET name = ? WHERE id = ?`).run(name, sessionId);
    const row = this.db
      .prepare(
        `SELECT id, project_id as projectId, agent_name as agentId, name, status, started_at as startedAt, ended_at as endedAt
        FROM agent_sessions WHERE id = ?`
      )
      .get(sessionId) as TerminalSession | undefined;
    return row;
  }

  delete(sessionId: string): void {
    const record = this.sessions.get(sessionId);
    if (record) {
      record.process.kill();
      this.sessions.delete(sessionId);
    }
    this.contextTrackers.delete(sessionId);
    killTmuxSession(sessionId);
    this.db.prepare(`DELETE FROM agent_sessions WHERE id = ?`).run(sessionId);
  }

  async readLog(sessionId: string): Promise<string> {
    const row = this.db
      .prepare(`SELECT log_path as logPath FROM agent_sessions WHERE id = ?`)
      .get(sessionId) as { logPath?: string } | undefined;
    if (!row?.logPath) return "";
    try {
      const { stat, open } = await import("node:fs/promises");
      const stats = await stat(row.logPath);
      const MAX_BYTES = 500_000;
      const readOffset = Math.max(0, stats.size - MAX_BYTES);
      const fd = await open(row.logPath, "r");
      const buffer = Buffer.alloc(Math.min(stats.size, MAX_BYTES));
      await fd.read(buffer, 0, buffer.length, readOffset);
      await fd.close();
      return buffer.toString("utf8");
    } catch {
      return "";
    }
  }

  async extractLogContext(sessionId: string): Promise<ExtractedLogContext> {
    const raw = await this.readLog(sessionId);
    return parseLogContext(raw);
  }
}

export function getBundledTmuxPath(): string | undefined {
  const platform = os.platform();
  const arch = os.arch();
  const app = (electron as unknown as { app?: import("electron").App }).app;
  const isDev = app ? !app.isPackaged : true;
  const resourcesPath = (process as unknown as { resourcesPath?: string }).resourcesPath ?? process.cwd();
  const baseDir = isDev 
    ? path.join(process.cwd(), "bin", "tmux")
    : path.join(resourcesPath, "bin", "tmux");

  if (platform === "darwin") {
    if (arch === "arm64") {
      return path.join(baseDir, "darwin-arm64", "tmux");
    }
    if (arch === "x64") {
      return path.join(baseDir, "darwin-x64", "tmux");
    }
  }

  if (platform === "linux" && (arch === "x64" || arch === "arm64")) {
    const candidate = path.join(baseDir, `linux-${arch}`, "tmux");
    try {
      accessSync(candidate, constants.F_OK);
      return candidate;
    } catch {
      // continue
    }
  }
  return undefined;
}

export function resolveTmuxCommand(): string | undefined {
  const bundled = getBundledTmuxPath();
  if (bundled) {
    try {
      try {
        chmodSync(bundled, 0o755);
      } catch {
        // ignore if read-only or already executable
      }
      accessSync(bundled, constants.X_OK);
      return bundled;
    } catch {
      // fallback
    }
  }

  for (const candidate of ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"]) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // try next
    }
  }

  return undefined;
}

export function checkTmux(): boolean {
  const tmuxCmd = resolveTmuxCommand();
  if (!tmuxCmd) return false;
  try {
    execSync(`${shellQuote(tmuxCmd)} -V`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function createTerminalProcess(launch: { file: string; args: string[] }, cwd: string, executable: string, sessionId: string): TerminalProcess {
  const env = cleanEnv({
    ...process.env,
    BATON_AGENT_EXECUTABLE: executable,
    TERM: process.env.TERM || "xterm-256color",
    LANG: process.env.LANG || "en_US.UTF-8",
    LC_ALL: process.env.LC_ALL || "en_US.UTF-8",
    PATH: mergePath(process.env.PATH, path.dirname(executable))
  });

  const tmuxCmd = resolveTmuxCommand();
  const hasTmux = Boolean(tmuxCmd) && checkTmux();

  if (hasTmux && tmuxCmd) {
    const tmuxSessionName = `baton_${sessionId}`;
    const tmuxArgs = [
      "-L",
      "baton",
      "-f",
      "/dev/null",
      "-u",
      "new-session",
      "-A",
      "-D",
      "-s",
      tmuxSessionName,
      executable,
      ";",
      "set-option",
      "-g",
      "status",
      "off",
      ";",
      "set-option",
      "-g",
      "mouse",
      "off"
    ];

    try {
      const ptyProcess = pty.spawn(tmuxCmd, tmuxArgs, {
        name: "xterm-256color",
        cols: 100,
        rows: 32,
        cwd,
        env
      });
      return {
        write: (data) => ptyProcess.write(data),
        resize: (cols, rows) => ptyProcess.resize(cols, rows),
        kill: () => {
          ptyProcess.kill();
          spawn(tmuxCmd, ["-L", "baton", "kill-session", "-t", tmuxSessionName], { stdio: "ignore" });
        },
        onData: (callback) => ptyProcess.onData(callback),
        onExit: (callback) => ptyProcess.onExit(({ exitCode }) => callback(exitCode))
      };
    } catch {
      // Fall through
    }
  }

  try {
    const ptyProcess = pty.spawn(launch.file, launch.args, {
      name: "xterm-256color",
      cols: 100,
      rows: 32,
      cwd,
      env
    });
    return {
      write: (data) => ptyProcess.write(data),
      resize: (cols, rows) => ptyProcess.resize(cols, rows),
      kill: () => ptyProcess.kill(),
      onData: (callback) => ptyProcess.onData(callback),
      onExit: (callback) => ptyProcess.onExit(({ exitCode }) => callback(exitCode))
    };
  } catch {
    return createChildProcessFallback(launch, cwd, env);
  }
}

function createChildProcessFallback(launch: { file: string; args: string[] }, cwd: string, env: Record<string, string>): TerminalProcess {
  const child = spawn(launch.file, launch.args, {
    cwd,
    env,
    stdio: "pipe"
  });
  return childProcessTerminal(child);
}

function childProcessTerminal(child: ChildProcessWithoutNullStreams): TerminalProcess {
  return {
    write: (data) => child.stdin.write(data),
    resize: () => undefined,
    kill: () => child.kill(),
    onData: (callback) => {
      child.stdout.on("data", (data) => callback(data.toString()));
      child.stderr.on("data", (data) => callback(data.toString()));
    },
    onExit: (callback) => child.on("exit", (code) => callback(code ?? 0))
  };
}

function buildShellLaunch(executable: string): { file: string; args: string[] } {
  if (os.platform() === "win32") {
    return { file: "cmd.exe", args: ["/d", "/s", "/c", executable] };
  }

  const shell = process.env.SHELL || "/bin/zsh";
  const flag = shell.endsWith("zsh") || shell.endsWith("bash") ? "-lic" : "-lc";
  return { file: shell, args: [flag, `exec ${shellQuote(executable)}`] };
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function killTmuxSession(sessionId: string): void {
  const tmuxCmd = resolveTmuxCommand();
  if (!tmuxCmd) return;
  spawn(tmuxCmd, ["-L", "baton", "kill-session", "-t", `baton_${sessionId}`], { stdio: "ignore" });
}

function mergePath(currentPath: string | undefined, executableDir: string): string {
  const parts = [executableDir, ...(currentPath?.split(path.delimiter) ?? []), ...SHELL_PATHS]
    .filter(Boolean);
  return Array.from(new Set(parts)).join(path.delimiter);
}

function cleanEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

export function parseLogContext(rawLog: string): ExtractedLogContext {
  if (!rawLog || !rawLog.trim()) {
    return { commands: [], testResults: [], errors: [] };
  }

  // Strip ANSI escape sequences and non-printable control chars
  const clean = rawLog
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  const lines = clean.split(/\r?\n|\r/);
  const rawCommands: string[] = [];
  const rawTests: string[] = [];
  const rawErrors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isErrorLine(trimmed)) {
      rawErrors.push(trimmed);
    }

    if (isTestResultLine(trimmed)) {
      rawTests.push(trimmed);
    }

    const cmd = extractCommandLine(trimmed);
    if (cmd) {
      rawCommands.push(cmd);
    }
  }

  return {
    commands: dedupeRecent(rawCommands, 10),
    testResults: dedupeRecent(rawTests, 10),
    errors: dedupeRecent(rawErrors, 10)
  };
}

function extractCommandLine(trimmed: string): string | null {
  // Shell prompts: '$ cmd', '➜ cmd', '% cmd', '❯ cmd', 'user@host:path$ cmd'
  const promptMatch = trimmed.match(/^(?:(?:\S+@\S+:[^$#%]*[$#%])|(?:\([^)]+\)\s*[$#%])|[$%#➜❯])\s*(.+)$/);
  if (promptMatch) {
    const cmd = promptMatch[1]?.trim();
    if (cmd && !isNotACommand(cmd)) return cmd;
  }

  // Runner labels: 'Running: cmd', 'Executed: cmd', 'Command: cmd'
  const runnerMatch = trimmed.match(/^(?:Running|Executed|Executing|Command):\s*(.+)$/i);
  if (runnerMatch) {
    const cmd = runnerMatch[1]?.trim();
    if (cmd && !isNotACommand(cmd)) return cmd;
  }

  // Direct tool command invocations
  const directMatch = trimmed.match(
    /^(?:npm(?!\s+(?:ERR!|WARN|notice))\b|npx\b|pnpm(?!\s+(?:ERR!|WARN))\b|yarn(?!\s+(?:error|warning))\b|bun(?!\s+(?:error|warning))\b|git(?!\s+(?:fatal|error))\b|cargo\b|pytest\b|python3?\b|go\s+(?:test|run|build)\b|make\b|docker\b|tsc\b|vitest\b|jest\b)(?:\s+.*)?$/i
  );
  if (directMatch) {
    return trimmed;
  }

  return null;
}

function isNotACommand(cmd: string): boolean {
  if (cmd.length > 200) return true;
  if (/^(?:npm\s+(?:ERR!|WARN|notice)|fatal:|error|warning)/i.test(cmd)) return true;
  return false;
}

function isTestResultLine(trimmed: string): boolean {
  return (
    /^(?:PASS|FAIL)\b/.test(trimmed) ||
    /^[✓✔✕✖]\s+/.test(trimmed) ||
    /^\d+\s+(?:pass(?:ed)?|fail(?:ed)?)(?:,|$)/i.test(trimmed) ||
    /^Tests?:\s+\d+/i.test(trimmed) ||
    /^Test Suites?:\s+\d+/i.test(trimmed) ||
    /^Ran \d+ tests?/i.test(trimmed) ||
    /^test result:\s+(?:ok|FAILED)/i.test(trimmed) ||
    /^test\s+\S+\s+\.\.\.\s+(?:ok|FAILED|ignored)/i.test(trimmed) ||
    /^=+\s*\d+\s+(?:passed|failed|error).*=+/i.test(trimmed) ||
    /^--- (?:PASS|FAIL):/i.test(trimmed) ||
    /^\[(?:PASS|FAIL|ERROR)\]/i.test(trimmed) ||
    /^(?:FAILED|OK)\s*\((?:failures|run)=\d+/i.test(trimmed)
  );
}

function isErrorLine(trimmed: string): boolean {
  if (/\b(?:0 errors?|no errors?|errors?:\s*0|0 failed)\b/i.test(trimmed)) return false;
  if (/^[✓✔]\s+/.test(trimmed)) return false;
  if (/^test\s+.*ok$/.test(trimmed)) return false;
  return (
    /^(?:npm ERR!|fatal:|FAILED:)/i.test(trimmed) ||
    /^(?:TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError):\s*.+/.test(trimmed) ||
    /^(?:[A-Z]\w*Exception|Exception):\s*.+/.test(trimmed) ||
    /^Error:\s*.+/i.test(trimmed) ||
    /^error(?:\[[A-Z0-9]+\])?:\s*.+/i.test(trimmed) ||
    /^Traceback \(most recent call last\):/i.test(trimmed) ||
    /^Build failed with\s*.+/i.test(trimmed) ||
    /failed with exit code\s*\d+/i.test(trimmed) ||
    /\bUnhandledPromiseRejection\b/i.test(trimmed)
  );
}

function dedupeRecent(items: string[], max: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i].trim();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    result.unshift(item);
    if (result.length >= max) break;
  }
  return result;
}

