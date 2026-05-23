import { BrowserWindow } from "electron";
import type { Database } from "better-sqlite3";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import pty from "node-pty";
import type { AgentId, TerminalSession } from "../../shared/types";
import { AGENT_ADAPTERS, type AgentService } from "./AgentService";
import { makeId, nowIso } from "./ids";
import type { ProjectService } from "./ProjectService";

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
    const launch = buildShellLaunch(adapter.command);
    const terminalProcess = createTerminalProcess(launch, project.path, executable);
    const log = createWriteStream(logPath, { flags: "a" });
    const existingCount = (
      this.db.prepare("SELECT COUNT(*) as count FROM agent_sessions WHERE project_id = ? AND agent_name = ?").get(projectId, agentId) as { count: number }
    ).count;
    const defaultName = existingCount === 0 ? adapter.displayName : `${adapter.displayName} #${existingCount + 1}`;
    const session = { id: sessionId, projectId, agentId };

    this.db
      .prepare(
        `INSERT INTO agent_sessions (id, project_id, agent_name, name, status, started_at, log_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(sessionId, projectId, agentId, defaultName, "running", nowIso(), logPath);

    terminalProcess.onData((data) => {
      log.write(data);
      window.webContents.send("terminal:data", { sessionId, data });
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

  injectHandoff(sessionId: string): void {
    this.inject(sessionId, this.agents.buildHandoffPrompt());
  }

  kill(sessionId: string): void {
    this.sessions.get(sessionId)?.process.kill();
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

  close(sessionId: string): void {
    const record = this.sessions.get(sessionId);
    if (record) {
      record.process.kill();
      this.sessions.delete(sessionId);
    }
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
    this.db.prepare(`DELETE FROM agent_sessions WHERE id = ?`).run(sessionId);
  }
}

function createTerminalProcess(launch: { file: string; args: string[] }, cwd: string, executable: string): TerminalProcess {
  const env = cleanEnv({
    ...process.env,
    BATON_AGENT_EXECUTABLE: executable,
    TERM: process.env.TERM || "xterm-256color"
  });

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

function buildShellLaunch(command: string): { file: string; args: string[] } {
  if (os.platform() === "win32") {
    return { file: "cmd.exe", args: ["/d", "/s", "/c", command] };
  }

  const shell = process.env.SHELL || "/bin/zsh";
  const flag = shell.endsWith("zsh") || shell.endsWith("bash") ? "-lic" : "-lc";
  return { file: shell, args: [flag, `exec ${command}`] };
}

function cleanEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}
