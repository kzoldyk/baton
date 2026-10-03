import path from "node:path";
import { watch, type FSWatcher } from "node:fs";
import { readdir, unlink } from "node:fs/promises";
import type { Database } from "better-sqlite3";
import type { AgentId, CreateFallbackHandoffInput, Handoff, Project } from "../../shared/types.ts";
import { assessHandoffQuality, isUsefulHandoff } from "./handoffContract.ts";
import {
  MAX_HISTORY_PASSES,
  filesFromGit,
  parseMarkdownToPass,
  parsePassYaml,
  passHash,
  renderPassMarkdown,
  serializePassYaml,
  type BatonPass
} from "./passFormat.ts";
import { makeId, nowIso } from "./ids.ts";
import { redactSecrets } from "./redaction.ts";
import type { GitService } from "./GitService.ts";
import type { StorageService } from "./StorageService.ts";
import type { TaskService } from "./TaskService.ts";
import { parseLogContext, type ExtractedLogContext } from "./TerminalService.ts";

export class HandoffService {
  private readonly db: Database;
  private readonly storage: StorageService;
  private readonly git: GitService;
  private readonly getProject: (id: string) => Project | undefined;
  private readonly tasks: TaskService;
  private readonly getWindow?: () => import("electron").BrowserWindow | undefined;
  private readonly terminal?: { extractLogContext(sessionId: string): Promise<ExtractedLogContext> };

  constructor(
    db: Database,
    storage: StorageService,
    git: GitService,
    getProject: (id: string) => Project | undefined,
    tasks: TaskService,
    getWindow?: () => import("electron").BrowserWindow | undefined,
    terminal?: { extractLogContext(sessionId: string): Promise<ExtractedLogContext> }
  ) {
    this.db = db;
    this.storage = storage;
    this.git = git;
    this.getProject = getProject;
    this.tasks = tasks;
    this.getWindow = getWindow;
    this.terminal = terminal;
  }

  assess(content: string) {
    return assessHandoffQuality(content);
  }

  async createFallback(input: CreateFallbackHandoffInput): Promise<Handoff> {
    const project = this.requireProject(input.projectId);
    const task = input.taskId ? this.tasks.get(input.taskId) : this.tasks.active(project.id);
    const gitStatus = await this.git.status(project.path);

    let sessionId = input.sessionId;
    if (!sessionId) {
      const activeSession = (
        this.db
          .prepare(
            `SELECT id FROM agent_sessions WHERE project_id = ? AND status IN ('running', 'detached') ORDER BY started_at DESC LIMIT 1`
          )
          .get(project.id) ||
        this.db
          .prepare(
            `SELECT id FROM agent_sessions WHERE project_id = ? ORDER BY started_at DESC LIMIT 1`
          )
          .get(project.id)
      ) as { id: string } | undefined;
      sessionId = activeSession?.id;
    }

    let logContext: ExtractedLogContext | undefined;
    if (sessionId) {
      try {
        if (this.terminal) {
          logContext = await this.terminal.extractLogContext(sessionId);
        } else {
          const row = this.db
            .prepare(`SELECT log_path as logPath FROM agent_sessions WHERE id = ?`)
            .get(sessionId) as { logPath?: string } | undefined;
          if (row?.logPath) {
            const rawLog = await this.storage.readText(row.logPath).catch(() => "");
            if (rawLog) {
              logContext = parseLogContext(rawLog);
            }
          }
        }
      } catch {
        // Fallback gracefully if log cannot be read or parsed
      }
    }

    const doneItems: string[] = [];
    if (logContext?.commands.length) {
      for (const cmd of logContext.commands.slice(-4)) {
        doneItems.push(`Ran: ${cmd}`);
      }
    }
    if (logContext?.testResults.length) {
      const passing = logContext.testResults.filter(
        (t) => /pass|✓|✔|ok/i.test(t) && !/fail|✕|✖/i.test(t)
      );
      for (const p of passing.slice(-2)) {
        doneItems.push(`Test passed: ${p}`);
      }
    }

    const blockerItems: string[] = [];
    if (logContext?.errors.length) {
      for (const err of logContext.errors.slice(-3)) {
        blockerItems.push(err);
      }
    }
    if (logContext?.testResults.length) {
      const failing = logContext.testResults.filter((t) => /fail|✕|✖|error/i.test(t));
      for (const f of failing.slice(-2)) {
        blockerItems.push(`Test failed: ${f}`);
      }
    }

    const userNext = bulletsFromText(input.nextSteps);
    let nextItems: string[];
    if (userNext.length) {
      nextItems = userNext;
    } else if (blockerItems.length) {
      const lastCmd = logContext?.commands.at(-1);
      nextItems = [
        `Fix error: ${blockerItems[0]}`,
        lastCmd ? `Re-run ${lastCmd} after fixing` : "Verify fix with tests",
        `Continue from current task: ${task?.title ?? "active task"}`
      ];
    } else if (logContext?.commands.length) {
      const lastCmd = logContext.commands.at(-1);
      nextItems = [
        `Verify recent run: ${lastCmd}`,
        `Continue from current task: ${task?.title ?? "active task"}`,
        "Inspect the listed files"
      ];
    } else {
      nextItems = ["Inspect the listed files", "Continue from the current task", "Verify before broad refactoring"];
    }

    const pass: BatonPass = {
      v: 1,
      task: task?.title ?? "No active task yet.",
      from: input.fromAgent,
      to: input.toAgent ?? "next",
      status: blockerItems.length > 0 ? "blocked" : "in_progress",
      done: doneItems,
      next: nextItems,
      files: filesFromGit(gitStatus.changedFiles),
      inspect: filesFromGit(gitStatus.changedFiles).map((file) => file.path),
      dont: bulletsFromText(input.constraints).length
        ? bulletsFromText(input.constraints)
        : ["Do not restart from scratch", "Do not rewrite unrelated modules"],
      blockers: blockerItems,
      git: {
        branch: gitStatus.branch,
        head: gitStatus.head ?? "",
        dirty: gitStatus.changedFiles.length > 0,
        files_changed: gitStatus.changedFiles.length
      }
    };
    return this.savePass(project, pass, task?.id);
  }

  async ingestLatest(projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string): Promise<Handoff> {
    const project = this.requireProject(projectId);
    const bridgeLatest = path.join(project.path, ".baton", "latest-handoff.md");
    const content = redactSecrets(await this.storage.readText(bridgeLatest));
    const task = taskId ?? this.tasks.active(project.id)?.id;
    const gitStatus = await this.git.status(project.path);
    const pass = parseMarkdownToPass(content, {
      from: fromAgent,
      to: toAgent ?? "next",
      git: {
        branch: gitStatus.branch,
        head: gitStatus.head ?? "",
        dirty: gitStatus.changedFiles.length > 0,
        files_changed: gitStatus.changedFiles.length
      }
    });
    if (!pass.files.length) pass.files = filesFromGit(gitStatus.changedFiles);
    return this.savePass(project, pass, task);
  }

  async waitForLatest(projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string): Promise<Handoff> {
    return this.waitForLatestMatching(projectId, fromAgent, toAgent, taskId);
  }

  async waitForUpdatedLatest(projectId: string, previousContent: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string): Promise<Handoff> {
    return this.waitForLatestMatching(projectId, fromAgent, toAgent, taskId, previousContent);
  }

  private async waitForLatestMatching(
    projectId: string,
    fromAgent: AgentId,
    toAgent?: AgentId,
    taskId?: string,
    previousContent?: string
  ): Promise<Handoff> {
    const project = this.requireProject(projectId);
    const bridgeLatest = path.join(project.path, ".baton", "latest-handoff.md");
    const batonDir = path.join(project.path, ".baton");
    const deadline = Date.now() + 120_000;

    return new Promise<Handoff>((resolve, reject) => {
      let settled = false;
      let checking = false;
      let pendingCheck = false;
      let watcher: FSWatcher | null = null;
      let debounceTimer: ReturnType<typeof setTimeout> | undefined;
      let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

      const cleanup = () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = undefined;
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = undefined;
        }
        if (watcher) {
          try {
            watcher.close();
          } catch {
            // ignore
          }
          watcher = null;
        }
      };

      const tryResolvePass = async (): Promise<Handoff | null> => {
        try {
          const content = await this.storage.readText(bridgeLatest);
          if (isUsefulHandoff(content) && content.trim() !== previousContent?.trim()) {
            this.getWindow?.()?.webContents.send("handoff:progress", { done: true });
            const task = taskId ?? this.tasks.active(project.id)?.id;
            const gitStatus = await this.git.status(project.path);
            const pass = parseMarkdownToPass(redactSecrets(content), {
              from: fromAgent,
              to: toAgent ?? "next",
              git: {
                branch: gitStatus.branch,
                head: gitStatus.head ?? "",
                dirty: gitStatus.changedFiles.length > 0,
                files_changed: gitStatus.changedFiles.length
              }
            });
            return await this.savePass(project, pass, task);
          }
        } catch {
          // Keep waiting while the agent writes the bridge file.
        }
        return null;
      };

      const triggerCheck = async () => {
        if (settled) return;
        if (checking) {
          pendingCheck = true;
          return;
        }
        checking = true;
        try {
          const handoff = await tryResolvePass();
          if (handoff && !settled) {
            settled = true;
            cleanup();
            resolve(handoff);
            return;
          }
        } catch (err) {
          if (!settled) {
            settled = true;
            cleanup();
            this.getWindow?.()?.webContents.send("handoff:progress", { done: true });
            reject(err);
            return;
          }
        } finally {
          checking = false;
          if (pendingCheck && !settled) {
            pendingCheck = false;
            void triggerCheck();
          }
        }
      };

      const onFileChange = (_eventType?: string, filename?: string | Buffer | null) => {
        const fname = filename ? filename.toString() : "";
        if (!fname || fname === "latest-handoff.md" || fname.endsWith("latest-handoff.md")) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            void triggerCheck();
          }, 50);
        }
      };

      try {
        watcher = watch(batonDir, onFileChange);
        watcher.on("error", () => {});
      } catch {
        try {
          watcher = watch(project.path, onFileChange);
          watcher.on("error", () => {});
        } catch {
          // Heartbeat fallback handles polling
        }
      }

      let elapsed = 0;
      heartbeatTimer = setInterval(() => {
        if (settled) {
          cleanup();
          return;
        }
        elapsed += 1500;
        this.getWindow?.()?.webContents.send("handoff:progress", { done: false, elapsed, max: 120_000 });
        if (Date.now() >= deadline) {
          settled = true;
          cleanup();
          this.getWindow?.()?.webContents.send("handoff:progress", { done: true });
          reject(new Error("Timed out waiting for .baton/latest-handoff.md. Save a pass from git instead."));
          return;
        }
        void triggerCheck();
      }, 1500);

      // Immediate initial check in case file already has updated content
      void triggerCheck();
    });
  }

  async list(projectId: string, taskId?: string): Promise<Handoff[]> {
    if (taskId) {
      return this.db
        .prepare(
          `SELECT id, project_id as projectId, task_id as taskId, from_agent as fromAgent, to_agent as toAgent,
            file_path as filePath, summary, created_at as createdAt
           FROM handoffs
           WHERE project_id = ? AND task_id = ?
           ORDER BY created_at DESC`
        )
        .all(projectId, taskId) as Handoff[];
    }
    return this.db
      .prepare(
        `SELECT id, project_id as projectId, task_id as taskId, from_agent as fromAgent, to_agent as toAgent,
          file_path as filePath, summary, created_at as createdAt
         FROM handoffs
         WHERE project_id = ?
         ORDER BY created_at DESC`
      )
      .all(projectId) as Handoff[];
  }

  async latest(projectId: string, taskId?: string): Promise<Handoff | undefined> {
    const activeId = taskId ?? this.tasks.active(projectId)?.id;
    const row = (
      activeId
        ? this.db
            .prepare(
              `SELECT id, project_id as projectId, task_id as taskId, from_agent as fromAgent, to_agent as toAgent,
                file_path as filePath, summary, created_at as createdAt
               FROM handoffs
               WHERE project_id = ? AND task_id = ?
               ORDER BY created_at DESC
               LIMIT 1`
            )
            .get(projectId, activeId)
        : this.db
            .prepare(
              `SELECT id, project_id as projectId, task_id as taskId, from_agent as fromAgent, to_agent as toAgent,
                file_path as filePath, summary, created_at as createdAt
               FROM handoffs
               WHERE project_id = ?
               ORDER BY created_at DESC
               LIMIT 1`
            )
            .get(projectId)
    ) as Handoff | undefined;
    if (!row) return undefined;
    const stored = await this.storage.readText(row.filePath);
    const content = row.filePath.endsWith(".yaml") ? renderPassMarkdown(parsePassYaml(stored)) : stored;
    return { ...row, content, quality: assessHandoffQuality(content) };
  }

  private async savePass(project: Project, pass: BatonPass, taskId: string | undefined): Promise<Handoff> {
    const yaml = serializePassYaml(pass);
    const markdown = renderPassMarkdown(pass);
    const createdAt = nowIso();
    const id = makeId("hnd");
    const hash = passHash(yaml);
    const yamlPath = taskId
      ? path.join(taskDir(project.path, taskId), "pass.yaml")
      : path.join(project.path, ".baton", "pass.yaml");
    const bridgePath = path.join(project.path, ".baton", "latest-handoff.md");
    const historyDir = path.join(project.path, ".baton", "history", "handoffs");
    const historyPath = path.join(historyDir, `${hash}.md`);

    await this.storage.writeText(yamlPath, yaml);
    await this.storage.writeText(bridgePath, markdown);
    try {
      await this.storage.readText(historyPath);
    } catch {
      await this.storage.writeText(historyPath, markdown);
    }
    await pruneHistory(historyDir);
    await this.tasks.persistHandoff(project, taskId, markdown);

    this.db
      .prepare(
        `INSERT INTO handoffs (id, project_id, task_id, from_agent, to_agent, file_path, summary, created_at)
         VALUES (@id, @projectId, @taskId, @fromAgent, @toAgent, @filePath, @summary, @createdAt)`
      )
      .run({
        id,
        projectId: project.id,
        taskId: taskId ?? null,
        fromAgent: pass.from,
        toAgent: pass.to === "next" ? null : pass.to,
        filePath: yamlPath,
        summary: `${hash} ${pass.task}`.slice(0, 140),
        createdAt
      });

    return {
      id,
      projectId: project.id,
      taskId,
      fromAgent: pass.from,
      toAgent: pass.to === "next" ? undefined : pass.to,
      filePath: yamlPath,
      summary: pass.task.slice(0, 140),
      createdAt,
      content: markdown,
      quality: assessHandoffQuality(markdown)
    };
  }

  private requireProject(projectId: string): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return project;
  }
}

function bulletsFromText(text?: string): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

async function pruneHistory(historyDir: string): Promise<void> {
  try {
    const files = (await readdir(historyDir)).filter((name) => name.endsWith(".md")).sort();
    if (files.length <= MAX_HISTORY_PASSES) return;
    const extra = files.slice(0, files.length - MAX_HISTORY_PASSES);
    await Promise.all(extra.map((name) => unlink(path.join(historyDir, name)).catch(() => undefined)));
  } catch {
    // history dir may not exist yet
  }
}

function taskDir(projectPath: string, taskId: string): string {
  return path.join(projectPath, ".baton", "tasks", taskId);
}

