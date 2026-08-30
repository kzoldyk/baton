import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Database } from "better-sqlite3";
import type { AddProjectResult, Project } from "../../shared/types";
import { makeId, nowIso } from "./ids";
import type { StorageService } from "./StorageService";
import { version } from "../../../package.json";

const CONTINUE_MD = `# Continue with Baton

You are continuing a coding task using Baton.

First read:

1. \`.baton/compiled-context.md\` (or \`.baton/latest-handoff.md\`)
2. \`.baton/current-task.md\`
3. \`.baton/todos.md\`
4. \`.baton/knowledge/decisions.md\`

Then continue from the Baton Pass.

Rules:
- Do not restart from scratch.
- Do not repeat completed investigation.
- Respect existing decisions and constraints.
- Focus on the listed next steps.
- Keep \`.baton/todos.md\` updated as work progresses.
- When done, summarize your changes for Baton in \`.baton/latest-handoff.md\`.
`;

const CURRENT_TASK_MD = `# Current Task

No active task yet.

Create a task in Baton before starting a handoff.
`;

const LATEST_HANDOFF_MD = `# Latest Baton Pass

No Baton Pass has been created yet.
`;

const TODOS_MD = `# Todos

Track progress below. Update this file as you complete items.

- [ ] Understand the codebase
- [ ] Implement the feature
- [ ] Add tests
- [ ] Verify everything works
`;

const PROJECT_OVERVIEW_MD = `# Project Overview

## High-Level Purpose
Comprehensive overview of project goals, domain rules, and primary system capabilities.

## Tech Stack
- Frontend / TUI / UI:
- Backend / Services:
- Database / Persistence:
`;

const ARCHITECTURE_MD = `# Architecture Specification

## Subsystems & Services
Document primary modules, system boundaries, and service ownership.

## Key Flow Pathways
Describe critical request/data pipelines.
`;

const DECISIONS_MD = `# Architecture Decisions (ADRs)

### ADR-001: Context OS Architecture Strategy
- **Status**: Accepted
- **Date**: 2026-07-25
- **Reason**: Preserve project context and architecture over long-running agent passes without token waste.
- **Alternatives Considered**: Single flat handoff file vs multi-tiered knowledge filesystem.
- **Impact**: Introduced \`.baton/knowledge/\` persistent memory and Context Compiler.
`;

const CONSTRAINTS_MD = `# Constraints & Guardrails

- **Local First**: Keep all indexing and caching local. No cloud dependencies required.
- **Filesystem Protocol**: \`.baton/\` markdown files are the primary public interface.
- **Zero Silent Failures**: Report errors explicitly.
`;

const PATTERNS_MD = `# Design Patterns & Conventions

- **Module Layout**: Keep services small, typed, and focused on single domain responsibilities.
- **Async Safety**: Use async/await and non-blocking file access.
`;

const PITFALLS_MD = `# Known Pitfalls & Anti-Patterns

- **Token Dumping**: Do not dump massive uncompressed log files into handoff passes.
- **Silent Exception Swallowing**: Avoid broad empty catch blocks.
`;

const GLOSSARY_MD = `# Project Glossary

- **Baton Pass**: Concise state handoff packet between AI coding agents.
- **Context OS**: Multi-tiered knowledge operating system for AI agents.
`;

const SHARED_AGENT_MD = `# Shared Agent Guidelines

- Respect existing code architecture.
- Keep changes surgical and verified.
- Update \`.baton/todos.md\` as work progresses.
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
    const name = path.basename(resolvedPath) || "Untitled Project";
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
    const remove = this.db.transaction((projectId: string) => {
      this.db.prepare(`DELETE FROM handoffs WHERE project_id = ?`).run(projectId);
      this.db.prepare(`DELETE FROM agent_sessions WHERE project_id = ?`).run(projectId);
      this.db.prepare(`DELETE FROM tasks WHERE project_id = ?`).run(projectId);
      this.db.prepare(`DELETE FROM projects WHERE id = ?`).run(projectId);
    });
    remove(id);
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
    const knowledgeDir = path.join(batonDir, "knowledge");
    const activeDir = path.join(batonDir, "active");
    const agentsDir = path.join(batonDir, "agents");
    const historyHandoffsDir = path.join(batonDir, "history", "handoffs");
    const historySessionsDir = path.join(batonDir, "history", "sessions");
    const historyArchiveDir = path.join(batonDir, "history", "archive");

    await Promise.all([
      mkdir(batonDir, { recursive: true }),
      mkdir(knowledgeDir, { recursive: true }),
      mkdir(activeDir, { recursive: true }),
      mkdir(agentsDir, { recursive: true }),
      mkdir(historyHandoffsDir, { recursive: true }),
      mkdir(historySessionsDir, { recursive: true }),
      mkdir(historyArchiveDir, { recursive: true })
    ]);

    const projectJson = {
      projectId: project.id,
      name: project.name,
      batonVersion: version,
      appStoragePath: project.appStoragePath,
      createdAt: project.createdAt
    };

    await Promise.all([
      writeFile(path.join(batonDir, "project.json"), `${JSON.stringify(projectJson, null, 2)}\n`, "utf8"),
      this.storage.writeIfMissing(path.join(batonDir, "continue.md"), CONTINUE_MD),
      this.storage.writeIfMissing(path.join(batonDir, "current-task.md"), CURRENT_TASK_MD),
      this.storage.writeIfMissing(path.join(batonDir, "latest-handoff.md"), LATEST_HANDOFF_MD),
      this.storage.writeIfMissing(path.join(batonDir, "handoff.md"), LATEST_HANDOFF_MD),
      this.storage.writeIfMissing(path.join(batonDir, "todos.md"), TODOS_MD),
      this.storage.writeIfMissing(path.join(knowledgeDir, "project-overview.md"), PROJECT_OVERVIEW_MD),
      this.storage.writeIfMissing(path.join(knowledgeDir, "architecture.md"), ARCHITECTURE_MD),
      this.storage.writeIfMissing(path.join(knowledgeDir, "decisions.md"), DECISIONS_MD),
      this.storage.writeIfMissing(path.join(knowledgeDir, "constraints.md"), CONSTRAINTS_MD),
      this.storage.writeIfMissing(path.join(knowledgeDir, "patterns.md"), PATTERNS_MD),
      this.storage.writeIfMissing(path.join(knowledgeDir, "pitfalls.md"), PITFALLS_MD),
      this.storage.writeIfMissing(path.join(knowledgeDir, "glossary.md"), GLOSSARY_MD),
      this.storage.writeIfMissing(path.join(agentsDir, "shared.md"), SHARED_AGENT_MD)
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
