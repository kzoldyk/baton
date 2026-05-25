import { BrowserWindow } from "electron";
import type { Database } from "better-sqlite3";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import pty from "node-pty";
import type { AgentId, TerminalSession } from "../../shared/types";
import { AGENT_ADAPTERS, type AgentService, type HandoffPromptGuidance } from "./AgentService";
import { makeId, nowIso } from "./ids";
import type { ProjectService } from "./ProjectService";
import { redactSecrets } from "./redaction";

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

export class TerminalService {
  private readonly sessions = new Map<string, PtyRecord>();

  constructor(
    private readonly db: Database,
    private readonly projects: ProjectService,
    private readonly agents: AgentService
  ) {}

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
    
    const existingCount = (
      this.db.prepare("SELECT COUNT(*) as count FROM agent_sessions WHERE project_id = ? AND agent_name = ?").get(projectId, agentId) as { count: number }
    ).count;
    const defaultName = existingCount === 0 ? adapter.displayName : `${adapter.displayName} #${existingCount + 1}`;

    this.db
      .prepare(
        `INSERT INTO agent_sessions (id, project_id, agent_name, name, status, started_at, log_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(sessionId, projectId, agentId, defaultName, "running", nowIso(), logPath);

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
      const redacted = redactSecrets(data);
      log.write(redacted);
      window.webContents.send("terminal:data", { sessionId, data: redacted });
    });
    terminalProcess.onExit((exitCode) => {
      log.end();
      this.db
        .prepare(`UPDATE agent_sessions SET status = ?, ended_at = ? WHERE id = ?`)
        .run(exitCode === 0 ? "completed" : "failed", nowIso(), sessionId);
      window.webContents.send("terminal:exit", { sessionId, exitCode });
      this.sessions.delete(sessionId);
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

  injectContinue(sessionId: string): void {
    const record = this.sessions.get(sessionId);
    if (!record) return;
    const project = this.projects.getProject(record.session.projectId);
    if (!project) return;
    const prompt = this.agents.getAdapter(record.session.agentId).buildContinuePrompt({ projectPath: project.path });
    this.inject(sessionId, prompt);
  }

  injectHandoff(sessionId: string, guidance?: HandoffPromptGuidance): void {
    this.inject(sessionId, this.agents.buildHandoffPrompt(guidance));
  }

  injectUpdateHandoff(sessionId: string): void {
    this.inject(sessionId, this.agents.buildUpdateHandoffPrompt());
  }

  kill(sessionId: string): void {
    const record = this.sessions.get(sessionId);
    if (record) {
      record.process.kill();
      // Also kill the tmux session to be clean
      const tmuxSessionName = `baton_${sessionId}`;
      spawn("tmux", ["kill-session", "-t", tmuxSessionName]);
    }
  }

  listAdapters(): typeof AGENT_ADAPTERS {
    return AGENT_ADAPTERS;
  }

  listForProject(projectId: string): TerminalSession[] {
    return this.db
      .prepare(
        `SELECT id, project_id as projectId, agent_name as agentId, name, status, started_at as startedAt, ended_at as endedAt, log_path as logPath
         FROM agent_sessions
         WHERE project_id = ?
         ORDER BY started_at DESC`
      )
      .all(projectId) as TerminalSession[];
  }

  async markStaleSessions(): Promise<void> {
    const running = this.db.prepare(`SELECT id FROM agent_sessions WHERE status = ?`).all("running") as { id: string }[];
    for (const session of running) {
      const tmuxSessionName = `baton_${session.id}`;
      try {
        const { execSync } = await import("node:child_process");
        execSync(`tmux has-session -t ${tmuxSessionName} 2>/dev/null`);
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
    // Also kill tmux session in case it was detached
    const tmuxSessionName = `baton_${sessionId}`;
    spawn("tmux", ["kill-session", "-t", tmuxSessionName]);
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
    // Also kill tmux session in case it was detached
    const tmuxSessionName = `baton_${sessionId}`;
    spawn("tmux", ["kill-session", "-t", tmuxSessionName]);
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
}

function createTerminalProcess(launch: { file: string; args: string[] }, cwd: string, executable: string, sessionId: string): TerminalProcess {
  const env = cleanEnv({
    ...process.env,
    BATON_AGENT_EXECUTABLE: executable,
    TERM: process.env.TERM || "xterm-256color"
  });

  // Wrap in tmux for persistence
  const tmuxSessionName = `baton_${sessionId}`;
  const tmuxArgs = ["new-session", "-A", "-D", "-s", tmuxSessionName, executable];

  try {
    const ptyProcess = pty.spawn("tmux", tmuxArgs, {
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
        // Also kill the tmux session to be clean
        spawn("tmux", ["kill-session", "-t", tmuxSessionName]);
      },
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

function cleanEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}
