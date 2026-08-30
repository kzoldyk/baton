import path from "node:path";
import type { Database } from "better-sqlite3";
import type { BatonTask, Project } from "../../shared/types";
import { HANDOFF_STUB, V1_CONTINUE_MD } from "./handoffContract";
import { emptyPass, parsePassYaml, renderPassMarkdown, serializePassYaml } from "./passFormat";
import { makeId, nowIso } from "./ids";
import type { StorageService } from "./StorageService";

export const DEFAULT_TODOS = `# Todos

Track progress below. Update this file as you complete items.

- [ ] Understand the current task
- [ ] Implement the change
- [ ] Verify the change
`;

export function taskDir(projectPath: string, taskId: string): string {
  return path.join(projectPath, ".baton", "tasks", taskId);
}

export class TaskService {
  constructor(
    private readonly db: Database,
    private readonly storage: StorageService,
    private readonly getProject: (id: string) => Project | undefined
  ) {}

  async create(projectId: string, title: string): Promise<BatonTask> {
    const project = this.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    const now = nowIso();
    const task: BatonTask = {
      id: makeId("tsk"),
      projectId,
      title: title.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    if (!task.title) throw new Error("Task title is required.");
    this.db.prepare(`UPDATE tasks SET status = 'paused', updated_at = ? WHERE project_id = ? AND status = 'active'`).run(now, projectId);
    this.db
      .prepare(
        `INSERT INTO tasks (id, project_id, title, status, created_at, updated_at)
         VALUES (@id, @projectId, @title, @status, @createdAt, @updatedAt)`
      )
      .run(task);
    await this.initializeTaskFiles(project, task);
    await this.syncActiveBridge(project);
    return task;
  }

  list(projectId: string): BatonTask[] {
    return this.db
      .prepare(
        `SELECT id, project_id as projectId, title, status, created_at as createdAt, updated_at as updatedAt
         FROM tasks
         WHERE project_id = ?
         ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, updated_at DESC`
      )
      .all(projectId) as BatonTask[];
  }

  async updateStatus(taskId: string, status: "active" | "paused" | "completed"): Promise<BatonTask | undefined> {
    const existing = this.get(taskId);
    if (!existing) return undefined;
    const project = this.getProject(existing.projectId);
    if (!project) return undefined;
    const now = nowIso();
    if (status === "active") {
      this.db.prepare(`UPDATE tasks SET status = 'paused', updated_at = ? WHERE project_id = ? AND status = 'active' AND id != ?`).run(now, existing.projectId, taskId);
    }
    this.db.prepare(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, taskId);
    const task = this.get(taskId);
    if (task) await this.syncActiveBridge(project);
    return task;
  }

  get(taskId: string): BatonTask | undefined {
    return this.db
      .prepare(
        `SELECT id, project_id as projectId, title, status, created_at as createdAt, updated_at as updatedAt
         FROM tasks WHERE id = ?`
      )
      .get(taskId) as BatonTask | undefined;
  }

  active(projectId: string): BatonTask | undefined {
    return this.db
      .prepare(
        `SELECT id, project_id as projectId, title, status, created_at as createdAt, updated_at as updatedAt
         FROM tasks
         WHERE project_id = ? AND status = 'active'
         ORDER BY updated_at DESC
         LIMIT 1`
      )
      .get(projectId) as BatonTask | undefined;
  }

  async persistHandoff(project: Project, taskId: string | undefined, content: string): Promise<void> {
    if (!taskId) return;
    await this.storage.writeText(path.join(taskDir(project.path, taskId), "latest-handoff.md"), content);
  }

  async persistTodos(project: Project, taskId: string | undefined, content: string): Promise<void> {
    if (!taskId) return;
    await this.storage.writeText(path.join(taskDir(project.path, taskId), "todos.md"), content);
  }

  private async initializeTaskFiles(project: Project, task: BatonTask): Promise<void> {
    const dir = taskDir(project.path, task.id);
    await this.storage.writeText(
      path.join(dir, "task.md"),
      `# ${task.title}\n\nid: ${task.id}\nstatus: ${task.status}\ncreated: ${task.createdAt}\n`
    );
    await this.storage.writeIfMissing(path.join(dir, "pass.yaml"), serializePassYaml(emptyPass({ task: task.title })));
    await this.storage.writeIfMissing(path.join(dir, "todos.md"), DEFAULT_TODOS);
  }

  async syncActiveBridge(project: Project): Promise<void> {
    const activeTask = this.active(project.id);
    const batonDir = path.join(project.path, ".baton");
    if (!activeTask) {
      await Promise.all([
        this.storage.writeText(path.join(batonDir, "current-task.md"), `# Current Task\n\nNo active task yet.\n\nCreate a feature/task in Baton before starting a handoff.\n`),
        this.storage.writeText(path.join(batonDir, "latest-handoff.md"), HANDOFF_STUB),
        this.storage.writeText(path.join(batonDir, "todos.md"), DEFAULT_TODOS),
        this.storage.writeText(path.join(batonDir, "active.json"), `${JSON.stringify({ taskId: null }, null, 2)}\n`),
        this.storage.writeIfMissing(path.join(batonDir, "continue.md"), V1_CONTINUE_MD)
      ]);
      return;
    }

    await this.initializeTaskFiles(project, activeTask);
    const dir = taskDir(project.path, activeTask.id);
    let handoff = HANDOFF_STUB;
    let todos = DEFAULT_TODOS;
    try {
      const yaml = await this.storage.readText(path.join(dir, "pass.yaml"));
      handoff = renderPassMarkdown(parsePassYaml(yaml));
    } catch {
      try {
        handoff = await this.storage.readText(path.join(dir, "latest-handoff.md"));
      } catch {
        // keep stub
      }
    }
    try {
      todos = await this.storage.readText(path.join(dir, "todos.md"));
    } catch {
      // keep default
    }

    await Promise.all([
      this.storage.writeText(
        path.join(batonDir, "current-task.md"),
        `# Current Task\n\n${activeTask.title}\n\nTask id: ${activeTask.id}\n`
      ),
      this.storage.writeText(path.join(batonDir, "latest-handoff.md"), handoff),
      this.storage.writeText(path.join(batonDir, "todos.md"), todos),
      this.storage.writeText(path.join(batonDir, "active.json"), `${JSON.stringify({ taskId: activeTask.id }, null, 2)}\n`),
      this.storage.writeText(path.join(dir, "task.md"), `# ${activeTask.title}\n\nid: ${activeTask.id}\nstatus: ${activeTask.status}\nupdated: ${activeTask.updatedAt}\n`),
      this.storage.writeIfMissing(path.join(batonDir, "continue.md"), V1_CONTINUE_MD)
    ]);
  }
}
