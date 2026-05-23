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
    void this.writeBridge(project, task);
    return task;
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

  private async writeBridge(project: Project, task: BatonTask): Promise<void> {
    const content = `# Current Task

${task.title}
`;
    await Promise.all([
      this.storage.writeText(path.join(project.path, ".baton", "current-task.md"), content),
      this.storage.writeText(path.join(project.appStoragePath, "current-task.md"), content)
    ]);
  }
}
