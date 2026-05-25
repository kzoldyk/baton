import path from "node:path";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import type { Database } from "better-sqlite3";
import { AGENT_LABELS, type AgentId, type CreateFallbackHandoffInput, type Handoff, type Project } from "../../shared/types";
import { makeId, nowIso } from "./ids";
import { redactSecrets } from "./redaction";
import type { GitService } from "./GitService";
import type { StorageService } from "./StorageService";

const HANDOFF_CHAR_BUDGET = 12_000;
const REQUIRED_HANDOFF_SECTIONS = [
  "Current Task",
  "Completed",
  "Changed Files",
  "Decisions and Constraints",
  "Blockers or Risks",
  "Next Steps",
  "Todos",
  "Files to Inspect"
];

export class HandoffService {
  constructor(
    private readonly db: Database,
    private readonly storage: StorageService,
    private readonly git: GitService,
    private readonly getProject: (id: string) => Project | undefined,
    private readonly getWindow?: () => import("electron").BrowserWindow | undefined
  ) {}

  async createFallback(input: CreateFallbackHandoffInput): Promise<Handoff> {
    const project = this.requireProject(input.projectId);
    const currentTask = await this.readCurrentTask(project);
    const todos = await this.readTodos(project);
    const gitStatus = await this.git.status(project.path);
    const recentTerminal = await this.readRecentTerminalContext(project);
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

## Completed
- Unknown in fallback mode. Inspect changed files and terminal context below.

## Changed Files
${gitStatus.changedFiles.length ? gitStatus.changedFiles.map((file) => `- ${file.path} +${file.additions} -${file.deletions}`).join("\n") : "No changed files detected."}

## Diff Summary
Unstaged:
${gitStatus.diffStat || "No unstaged diff summary available."}

Staged:
${gitStatus.stagedDiffStat || "No staged diff summary available."}

## Known Context
Generated from Baton fallback mode using git state, task metadata, todos, and recent terminal log context.

## Decisions and Constraints
${input.constraints?.trim() || "- Do not restart from scratch.\n- Do not rewrite unrelated modules.\n- Respect existing code structure."}

## Blockers or Risks
- Fallback mode cannot verify agent intent. Inspect diffs before continuing.
- Staged and unstaged changes may represent separate work phases.

## Next Steps
${input.nextSteps?.trim() || "- Inspect changed files.\n- Continue from the current task.\n- Verify implementation before broad refactoring."}

## Todos
${todos}

## Files to Inspect
${gitStatus.changedFiles.length ? gitStatus.changedFiles.slice(0, 20).map((file) => `- ${file.path}`).join("\n") : "- No changed files detected."}

## Recent Terminal Context
${recentTerminal}
`);
    return this.saveHandoff(project, input.fromAgent, input.toAgent, input.taskId, content);
  }

  async ingestLatest(projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string): Promise<Handoff> {
    const project = this.requireProject(projectId);
    const bridgeLatest = path.join(project.path, ".baton", "latest-handoff.md");
    const content = redactSecrets(await this.storage.readText(bridgeLatest));
    validateHandoff(content);
    return this.saveHandoff(project, fromAgent, toAgent, taskId, content);
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
    let lastCandidate = "";
    let stableReads = 0;
    while (Date.now() < deadline) {
      try {
        const content = await this.storage.readText(bridgeLatest);
        const trimmed = content.trim();
        if (trimmed === lastCandidate) {
          stableReads += 1;
        } else {
          lastCandidate = trimmed;
          stableReads = 1;
        }
        if (stableReads >= 2 && isUsefulHandoff(content) && trimmed !== previousContent?.trim()) {
          validateHandoff(content);
          this.getWindow?.()?.webContents.send("handoff:progress", { done: true });
          return this.saveHandoff(project, fromAgent, toAgent, taskId, redactSecrets(content));
        }
      } catch {
        // Keep polling while the agent writes the bridge file.
      }
      elapsed += 1500;
      // Task #11 — emit progress so UI can show a spinner
      this.getWindow?.()?.webContents.send("handoff:progress", { done: false, elapsed, max: 120_000 });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    this.getWindow?.()?.webContents.send("handoff:progress", { done: true });
    throw new Error("Timed out waiting for .baton/latest-handoff.md.");
  }

  async list(projectId: string): Promise<Handoff[]> {
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
    const safeTimestamp = createdAt.replace(/[:.]/g, "-");
    const target = toAgent ?? "next";
    validateHandoff(content);
    const finalContent = normalizeHandoffContent(id, project, fromAgent, toAgent, createdAt, content);
    const latestPath = path.join(project.appStoragePath, "handoffs", "latest.md");
    const timestampPath = path.join(project.appStoragePath, "handoffs", `${safeTimestamp}-${id}-${fromAgent}-to-${target}.md`);
    const bridgePath = path.join(project.path, ".baton", "latest-handoff.md");

    await Promise.all([
      writeAtomic(latestPath, finalContent),
      writeAtomic(timestampPath, finalContent),
      writeAtomic(bridgePath, finalContent)
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
        summary: extractSummary(finalContent),
        createdAt
      });

    return { id, projectId: project.id, taskId, fromAgent, toAgent, filePath: timestampPath, summary: extractSummary(finalContent), createdAt, content: finalContent };
  }

  private async readCurrentTask(project: Project): Promise<string> {
    try {
      return (await this.storage.readText(path.join(project.path, ".baton", "current-task.md"))).trim();
    } catch {
      return "No active task yet.";
    }
  }

  private async readTodos(project: Project): Promise<string> {
    try {
      const content = (await this.storage.readText(path.join(project.path, ".baton", "todos.md"))).trim();
      return content
        .split(/\r?\n/)
        .filter((line) => /^-\s+\[( |x|X)\]\s+/.test(line))
        .join("\n") || "No todos recorded.";
    } catch {
      return "No todos recorded.";
    }
  }

  private requireProject(projectId: string): Project {
    const project = this.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return project;
  }

  private async readRecentTerminalContext(project: Project): Promise<string> {
    try {
      const logsDir = path.join(project.appStoragePath, "logs");
      const entries = await readdir(logsDir);
      const logs = await Promise.all(
        entries
          .filter((entry) => entry.endsWith(".log"))
          .map(async (entry) => {
            const filePath = path.join(logsDir, entry);
            const stats = await stat(filePath);
            return { filePath, mtimeMs: stats.mtimeMs };
          })
      );
      const latest = logs.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
      if (!latest) return "No recent terminal log available.";
      const content = await readFile(latest.filePath, "utf8");
      return redactSecrets(tail(content, 4000));
    } catch {
      return "No recent terminal log available.";
    }
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
  return AGENT_LABELS[agent];
}

function isUsefulHandoff(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.length > 80 && !trimmed.includes("No Baton Pass has been created yet.");
}

function validateHandoff(content: string): void {
  const missing = REQUIRED_HANDOFF_SECTIONS.filter((section) => !new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`, "im").test(content));
  if (missing.length > 0) {
    throw new Error(`Baton Pass is missing required sections: ${missing.join(", ")}.`);
  }
}

function normalizeHandoffContent(
  id: string,
  project: Project,
  fromAgent: AgentId,
  toAgent: AgentId | undefined,
  createdAt: string,
  content: string
): string {
  const trimmed = enforceBudget(redactSecrets(content.trim()));
  const metadata = `<!-- baton
handoffId: ${id}
projectId: ${project.id}
fromAgent: ${fromAgent}
toAgent: ${toAgent ?? "next"}
generatedAt: ${createdAt}
charBudget: ${HANDOFF_CHAR_BUDGET}
-->
`;
  return trimmed.startsWith("<!-- baton") ? `${trimmed}\n` : `${metadata}\n${trimmed}\n`;
}

function enforceBudget(content: string): string {
  if (content.length <= HANDOFF_CHAR_BUDGET) return content;
  const keep = HANDOFF_CHAR_BUDGET - 220;
  return `${content.slice(0, keep).trimEnd()}

## Baton Budget Note
This Baton Pass was truncated to stay under the ${HANDOFF_CHAR_BUDGET} character budget. Inspect changed files and terminal logs if more detail is needed.`;
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, content, "utf8");
  await rename(tmpPath, filePath);
}

function tail(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(content.length - maxChars);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
