import path from "node:path";
import { readdir, unlink } from "node:fs/promises";
import type { Database } from "better-sqlite3";
import type { AgentId, CreateFallbackHandoffInput, Handoff, Project } from "../../shared/types";
import { assessHandoffQuality, isUsefulHandoff } from "./handoffContract";
import {
  MAX_HISTORY_PASSES,
  filesFromGit,
  parseMarkdownToPass,
  parsePassYaml,
  passHash,
  renderPassMarkdown,
  serializePassYaml,
  type BatonPass
} from "./passFormat";
import { makeId, nowIso } from "./ids";
import { redactSecrets } from "./redaction";
import type { GitService } from "./GitService";
import type { StorageService } from "./StorageService";
import { taskDir, type TaskService } from "./TaskService";

export class HandoffService {
  constructor(
    private readonly db: Database,
    private readonly storage: StorageService,
    private readonly git: GitService,
    private readonly getProject: (id: string) => Project | undefined,
    private readonly tasks: TaskService,
    private readonly getWindow?: () => import("electron").BrowserWindow | undefined
  ) {}

  assess(content: string) {
    return assessHandoffQuality(content);
  }

  async createFallback(input: CreateFallbackHandoffInput): Promise<Handoff> {
    const project = this.requireProject(input.projectId);
    const task = input.taskId ? this.tasks.get(input.taskId) : this.tasks.active(project.id);
    const gitStatus = await this.git.status(project.path);
    const pass: BatonPass = {
      v: 1,
      task: task?.title ?? "No active task yet.",
      from: input.fromAgent,
      to: input.toAgent ?? "next",
      status: "in_progress",
      done: [],
      next: bulletsFromText(input.nextSteps).length
        ? bulletsFromText(input.nextSteps)
        : ["Inspect the listed files", "Continue from the current task", "Verify before broad refactoring"],
      files: filesFromGit(gitStatus.changedFiles),
      inspect: filesFromGit(gitStatus.changedFiles).map((file) => file.path),
      dont: bulletsFromText(input.constraints).length
        ? bulletsFromText(input.constraints)
        : ["Do not restart from scratch", "Do not rewrite unrelated modules"],
      blockers: [],
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
    const deadline = Date.now() + 120_000;
    let elapsed = 0;
    while (Date.now() < deadline) {
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
          return this.savePass(project, pass, task);
        }
      } catch {
        // Keep polling while the agent writes the bridge file.
      }
      elapsed += 1500;
      this.getWindow?.()?.webContents.send("handoff:progress", { done: false, elapsed, max: 120_000 });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    this.getWindow?.()?.webContents.send("handoff:progress", { done: true });
    throw new Error("Timed out waiting for .baton/latest-handoff.md. Save a pass from git instead.");
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
