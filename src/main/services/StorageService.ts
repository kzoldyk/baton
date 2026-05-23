import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class StorageService {
  readonly userDataPath: string;

  constructor(userDataPath = app.getPath("userData")) {
    this.userDataPath = userDataPath;
  }

  dbPath(): string {
    return path.join(this.userDataPath, "baton.db");
  }

  projectPath(projectId: string): string {
    return path.join(this.userDataPath, "projects", projectId);
  }

  async ensureProjectStorage(projectId: string): Promise<string> {
    const root = this.projectPath(projectId);
    await Promise.all([
      mkdir(path.join(root, "handoffs"), { recursive: true }),
      mkdir(path.join(root, "sessions"), { recursive: true }),
      mkdir(path.join(root, "logs"), { recursive: true }),
      mkdir(path.join(root, "context"), { recursive: true })
    ]);
    await Promise.all([
      this.writeIfMissing(path.join(root, "project.md"), "# Project\n\n"),
      this.writeIfMissing(path.join(root, "current-task.md"), "# Current Task\n\nNo active task yet.\n"),
      this.writeIfMissing(path.join(root, "changed-files.md"), "# Changed Files\n\n"),
      this.writeIfMissing(path.join(root, "decisions.md"), "# Decisions\n\n"),
      this.writeIfMissing(path.join(root, "context", "context-pack.md"), "# Context Pack\n\n")
    ]);
    return root;
  }

  async writeIfMissing(filePath: string, content: string): Promise<void> {
    try {
      await readFile(filePath, "utf8");
    } catch {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
    }
  }

  async writeText(filePath: string, content: string): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }

  async readText(filePath: string): Promise<string> {
    return readFile(filePath, "utf8");
  }
}
