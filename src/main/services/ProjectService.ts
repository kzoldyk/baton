import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Database } from "better-sqlite3";
import type { AddProjectResult, Project } from "../../shared/types";
import { makeId, nowIso } from "./ids";
import type { StorageService } from "./StorageService";

const CONTINUE_MD = `# Continue with Baton

You are continuing a coding task from another agent.

First read:

1. \`.baton/current-task.md\`
2. \`.baton/latest-handoff.md\`

Then continue from the Baton Pass.

Rules:
- Do not restart from scratch.
- Do not repeat completed investigation.
- Respect existing decisions and constraints.
- Focus on the listed next steps.
- When done, summarize your changes for Baton.
`;

const CURRENT_TASK_MD = `# Current Task

No active task yet.

Create a task in Baton before starting a handoff.
`;

const LATEST_HANDOFF_MD = `# Latest Baton Pass

No Baton Pass has been created yet.
`;

export class ProjectService {
  constructor(
    private readonly db: Database,
    private readonly storage: StorageService
  ) {}

  async pickAndAddProject(parent?: BrowserWindow): Promise<AddProjectResult | null> {
    const options: OpenDialogOptions = {
      title: "Add Project",
      properties: ["openDirectory", "createDirectory"]
    };
    const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    return this.addProject(result.filePaths[0], true);
  }

  async addProject(projectPath: string, addGitignore: boolean): Promise<AddProjectResult> {
    const resolvedPath = path.resolve(projectPath);
    const stats = await stat(resolvedPath);
    if (!stats.isDirectory()) throw new Error("Selected path is not a folder.");

    const existing = this.getProjectByPath(resolvedPath);
    if (existing) {
      const gitignoreUpdated = addGitignore ? await this.ensureGitignore(resolvedPath) : false;
      return { project: existing, gitignoreUpdated };
    }

    const id = makeId("prj");
    const name = path.basename(resolvedPath);
    const appStoragePath = await this.storage.ensureProjectStorage(id);
    const createdAt = nowIso();
    const project: Project = {
      id,
      name,
      path: resolvedPath,
      appStoragePath,
      createdAt,
      updatedAt: createdAt
    };

    this.db
      .prepare(
        `INSERT INTO projects (id, name, path, app_storage_path, created_at, updated_at)
         VALUES (@id, @name, @path, @appStoragePath, @createdAt, @updatedAt)`
      )
      .run(project);

    await this.createBridge(project);
    const gitignoreUpdated = addGitignore ? await this.ensureGitignore(resolvedPath) : false;
    return { project, gitignoreUpdated };
  }

  removeProject(id: string): void {
    this.db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
  }

  listProjects(): Project[] {
    return this.db
      .prepare(
        `SELECT id, name, path, app_storage_path as appStoragePath, created_at as createdAt, updated_at as updatedAt
         FROM projects
         ORDER BY updated_at DESC`
      )
      .all() as Project[];
  }

  getProject(id: string): Project | undefined {
    return this.db
      .prepare(
        `SELECT id, name, path, app_storage_path as appStoragePath, created_at as createdAt, updated_at as updatedAt
         FROM projects
         WHERE id = ?`
      )
      .get(id) as Project | undefined;
  }

  getProjectByPath(projectPath: string): Project | undefined {
    return this.db
      .prepare(
        `SELECT id, name, path, app_storage_path as appStoragePath, created_at as createdAt, updated_at as updatedAt
         FROM projects
         WHERE path = ?`
      )
      .get(projectPath) as Project | undefined;
  }

  async createBridge(project: Project): Promise<void> {
    const batonDir = path.join(project.path, ".baton");
    await mkdir(batonDir, { recursive: true });
    const projectJson = {
      projectId: project.id,
      name: project.name,
      batonVersion: "0.1.0",
      appStoragePath: project.appStoragePath,
      createdAt: project.createdAt
    };

    await Promise.all([
      writeFile(path.join(batonDir, "project.json"), `${JSON.stringify(projectJson, null, 2)}\n`, "utf8"),
      this.storage.writeIfMissing(path.join(batonDir, "continue.md"), CONTINUE_MD),
      this.storage.writeIfMissing(path.join(batonDir, "current-task.md"), CURRENT_TASK_MD),
      this.storage.writeIfMissing(path.join(batonDir, "latest-handoff.md"), LATEST_HANDOFF_MD)
    ]);
  }

  async ensureGitignore(projectPath: string): Promise<boolean> {
    try {
      await access(path.join(projectPath, ".git"));
    } catch {
      return false;
    }

    const gitignorePath = path.join(projectPath, ".gitignore");
    let content = "";
    try {
      content = await readFile(gitignorePath, "utf8");
    } catch {
      content = "";
    }
    if (content.split(/\r?\n/).some((line) => line.trim() === ".baton/")) return false;
    const next = content.trimEnd().length > 0 ? `${content.trimEnd()}\n.baton/\n` : ".baton/\n";
    await writeFile(gitignorePath, next, "utf8");
    return true;
  }
}
