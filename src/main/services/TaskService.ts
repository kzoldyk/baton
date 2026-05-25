import path from "node:path";
import type { Database } from "better-sqlite3";
import type { BatonTask, Project } from "../../shared/types";
import { makeId, nowIso } from "./ids";
import type { StorageService } from "./StorageService";

export class TaskService {
  constructor(
    private readonly db: Database,
    private readonly storage: StorageService,
    private readonly getProject: (id: string) => Project | undefined
  ) {}

  create(projectId: string, title: string): BatonTask {
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
    this.db
      .prepare(
        `INSERT INTO tasks (id, project_id, title, status, created_at, updated_at)
         VALUES (@id, @projectId, @title, @status, @createdAt, @updatedAt)`
      )
      .run(task);
    void this.writeActiveBridge(project);
    return task;
  }

  list(projectId: string): BatonTask[] {
    return this.db
      .prepare(
        `SELECT id, project_id as projectId, title, status, created_at as createdAt, updated_at as updatedAt
         FROM tasks
         WHERE project_id = ?
         ORDER BY status ASC, updated_at DESC`
      )
      .all(projectId) as BatonTask[];
  }

  updateStatus(taskId: string, status: "active" | "paused" | "completed"): BatonTask | undefined {
    const now = nowIso();
    this.db.prepare(`UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, taskId);
    const task = this.db
      .prepare(
        `SELECT id, project_id as projectId, title, status, created_at as createdAt, updated_at as updatedAt
         FROM tasks WHERE id = ?`
      )
      .get(taskId) as BatonTask | undefined;
    if (task) {
      const project = this.getProject(task.projectId);
      if (project) void this.writeActiveBridge(project);
    }
    return task;
  }

  delete(taskId: string): void {
    const task = this.db
      .prepare(`SELECT project_id as projectId FROM tasks WHERE id = ?`)
      .get(taskId) as { projectId: string } | undefined;
    this.db.prepare(`DELETE FROM tasks WHERE id = ?`).run(taskId);
    if (task) {
      const project = this.getProject(task.projectId);
      if (project) void this.writeActiveBridge(project);
    }
  }

  private async writeActiveBridge(project: Project): Promise<void> {
    const activeTask = this.active(project.id);
    const content = activeTask
      ? `# Current Task\n\n${activeTask.title}\n`
      : `# Current Task\n\nNo active task yet.\n\nCreate a task in Baton before starting a handoff.\n`;
    await Promise.all([
      this.storage.writeText(path.join(project.path, ".baton", "current-task.md"), content),
      this.storage.writeText(path.join(project.appStoragePath, "current-task.md"), content)
    ]);
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
}
