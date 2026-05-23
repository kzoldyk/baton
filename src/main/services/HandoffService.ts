import path from "node:path";
import type { Database } from "better-sqlite3";
import type { AgentId, CreateFallbackHandoffInput, Handoff, Project } from "../../shared/types";
import { makeId, nowIso } from "./ids";
import { redactSecrets } from "./redaction";
import type { GitService } from "./GitService";
import type { StorageService } from "./StorageService";

export class HandoffService {
  constructor(
    private readonly db: Database,
    private readonly storage: StorageService,
    private readonly git: GitService,
    private readonly getProject: (id: string) => Project | undefined
  ) {}

  async createFallback(input: CreateFallbackHandoffInput): Promise<Handoff> {
    const project = this.requireProject(input.projectId);
    const currentTask = await this.readCurrentTask(project);
    const gitStatus = await this.git.status(project.path);
    const content = redactSecrets(`# Baton Pass

## From
${displayAgent(input.fromAgent)}

## To
${input.toAgent ? displayAgent(input.toAgent) : "Next agent"}

## Project
${project.name}

## Current Task
${currentTask}

## Git Branch
${gitStatus.branch || "Not a git repository"}

## Changed Files
${gitStatus.changedFiles.length ? gitStatus.changedFiles.map((file) => `- ${file.path} +${file.additions} -${file.deletions}`).join("\n") : "No changed files detected."}

## Diff Summary
${gitStatus.diffStat || "No diff summary available."}

## Known Context
Generated from Baton fallback mode using git state and task metadata.

## Next Steps
- Inspect changed files.
- Continue from the current task.
- Verify implementation before broad refactoring.

## Constraints
- Do not restart from scratch.
- Do not rewrite unrelated modules.
- Respect existing code structure.
`);
    return this.saveHandoff(project, input.fromAgent, input.toAgent, input.taskId, content);
  }

  async ingestLatest(projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string): Promise<Handoff> {
    const project = this.requireProject(projectId);
    const bridgeLatest = path.join(project.path, ".baton", "latest-handoff.md");
    const content = redactSecrets(await this.storage.readText(bridgeLatest));
    return this.saveHandoff(project, fromAgent, toAgent, taskId, content);
  }

  async waitForLatest(projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string): Promise<Handoff> {
    const project = this.requireProject(projectId);
    const bridgeLatest = path.join(project.path, ".baton", "latest-handoff.md");
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      try {
        const content = await this.storage.readText(bridgeLatest);
        if (isUsefulHandoff(content)) {
          return this.saveHandoff(project, fromAgent, toAgent, taskId, redactSecrets(content));
        }
      } catch {
        // Keep polling while the agent writes the bridge file.
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("Timed out waiting for .baton/latest-handoff.md.");
  }

  async latest(projectId: string): Promise<Handoff | undefined> {
    const row = this.db
      .prepare(
        `SELECT id, project_id as projectId, task_id as taskId, from_agent as fromAgent, to_agent as toAgent,
          file_path as filePath, summary, created_at as createdAt
         FROM handoffs
         WHERE project_id = ?
         ORDER BY created_at DESC
         LIMIT 1`
      )
      .get(projectId) as Handoff | undefined;
    if (!row) return undefined;
    return { ...row, content: await this.storage.readText(row.filePath) };
  }

  private async saveHandoff(project: Project, fromAgent: AgentId, toAgent: AgentId | undefined, taskId: string | undefined, content: string): Promise<Handoff> {
    const createdAt = nowIso();
    const id = makeId("hnd");
    const safeDate = createdAt.slice(0, 10);
    const target = toAgent ?? "next";
    const latestPath = path.join(project.appStoragePath, "handoffs", "latest.md");
    const timestampPath = path.join(project.appStoragePath, "handoffs", `${safeDate}-${fromAgent}-to-${target}.md`);
    const bridgePath = path.join(project.path, ".baton", "latest-handoff.md");

    await Promise.all([
      this.storage.writeText(latestPath, content),
      this.storage.writeText(timestampPath, content),
      this.storage.writeText(bridgePath, content)
    ]);

    this.db
      .prepare(
        `INSERT INTO handoffs (id, project_id, task_id, from_agent, to_agent, file_path, summary, created_at)
         VALUES (@id, @projectId, @taskId, @fromAgent, @toAgent, @filePath, @summary, @createdAt)`
      )
      .run({
        id,
        projectId: project.id,
        taskId: taskId ?? null,
        fromAgent,
        toAgent: toAgent ?? null,
        filePath: timestampPath,
        summary: extractSummary(content),
        createdAt
      });

    return { id, projectId: project.id, taskId, fromAgent, toAgent, filePath: timestampPath, summary: extractSummary(content), createdAt, content };
  }

  private async readCurrentTask(project: Project): Promise<string> {
    try {
      return (await this.storage.readText(path.join(project.path, ".baton", "current-task.md"))).trim();
    } catch {
      return "No active task yet.";
    }
  }

  private requireProject(projectId: string): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return project;
  }
}

function extractSummary(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .slice(0, 2)
    .join(" ")
    .slice(0, 240);
}

function displayAgent(agent: AgentId): string {
  const names: Record<AgentId, string> = {
    codex: "Codex",
    claude: "Claude Code",
    opencode: "OpenCode",
    gemini: "Gemini CLI",
    kiro: "Kiro"
  };
  return names[agent];
}

function isUsefulHandoff(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.length > 80 && !trimmed.includes("No Baton Pass has been created yet.");
}
