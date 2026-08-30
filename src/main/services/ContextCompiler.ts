import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GitService } from "./GitService";
import type { KnowledgeService } from "./KnowledgeService";

export type CompileOptions = {
  projectId: string;
  projectPath: string;
  taskId?: string;
  agentId?: string;
  maxTokens?: number;
};

export class ContextCompiler {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly git: GitService
  ) {}

  async compile(options: CompileOptions): Promise<string> {
    const { projectPath, agentId } = options;

    // Tier 1: Ephemeral Active Context
    const currentTask = await this.readBatonFile(projectPath, "current-task.md", "# Current Task\n\nNo active task specified.");
    const todos = await this.readBatonFile(projectPath, "todos.md", "# Todos\n\nNo todos tracked.");
    const latestHandoff = await this.readBatonFile(projectPath, "latest-handoff.md", "# Latest Handoff\n\nNo prior handoff.");
    
    let gitInfo = "";
    try {
      const gitStat = await this.git.status(projectPath);
      if (gitStat.isRepo) {
        gitInfo = `Branch: ${gitStat.branch}\nStatus: ${gitStat.statusShort || "Clean"}\nChanged Files (${gitStat.changedFiles.length}):\n` +
          gitStat.changedFiles.slice(0, 15).map((f) => `- ${f.path} (+${f.additions}/-${f.deletions})`).join("\n");
      }
    } catch {
      gitInfo = "Git repository information unavailable.";
    }

    // Tier 2: Persistent Knowledge (Fetch concurrently for maximum throughput)
    const [overview, architecture, decisions, constraints, patterns, pitfalls] = await Promise.all([
      this.knowledge.getDoc(projectPath, "overview"),
      this.knowledge.getDoc(projectPath, "architecture"),
      this.knowledge.getDoc(projectPath, "decisions"),
      this.knowledge.getDoc(projectPath, "constraints"),
      this.knowledge.getDoc(projectPath, "patterns"),
      this.knowledge.getDoc(projectPath, "pitfalls")
    ]);

    // Tier 3: Agent Scoped Memory
    const [sharedAgentMemory, agentMemory] = await Promise.all([
      this.readBatonFile(projectPath, path.join("agents", "shared.md"), ""),
      agentId ? this.readBatonFile(projectPath, path.join("agents", `${agentId}.md`), "") : Promise.resolve("")
    ]);

    // Assemble Compiled Context Document
    const compiledMarkdown = `# Baton Compiled Context
> Auto-compiled context package for active coding task. Do not restart from scratch.

---

## 1. Immediate Active Context (Tier 1)

### Task Specification
${currentTask.replace(/^#\s*Current Task/i, "").trim()}

### Todos & Checklist
${todos.replace(/^#\s*Todos/i, "").trim()}

### Latest Handoff Summary
${latestHandoff.replace(/^#\s*Latest Baton Pass/i, "").trim()}

### Working Tree & Git Status
${gitInfo}

---

## 2. Project Knowledge & Architecture (Tier 2)

### Project Overview
${overview.replace(/^#\s*Project Overview/i, "").trim()}

### System Architecture
${architecture.replace(/^#\s*Architecture Specification/i, "").trim()}

### Architecture Decisions (ADRs)
${decisions.replace(/^#\s*Architecture Decisions/i, "").trim()}

### Constraints & Guardrails
${constraints.replace(/^#\s*Constraints & Guardrails/i, "").trim()}

### Design Patterns & Conventions
${patterns.replace(/^#\s*Design Patterns/i, "").trim()}

### Known Pitfalls
${pitfalls.replace(/^#\s*Known Pitfalls/i, "").trim()}

---

## 3. Agent Execution Guidelines

${sharedAgentMemory ? `### Shared Guidelines\n${sharedAgentMemory.trim()}\n` : ""}
${agentMemory ? `### Scoped Memory (${agentId})\n${agentMemory.trim()}\n` : ""}

---
*Compiled by Baton Context OS Engine.*
`;

    // Persist compiled-context.md to .baton/
    const batonDir = path.join(projectPath, ".baton");
    await mkdir(batonDir, { recursive: true });
    await writeFile(path.join(batonDir, "compiled-context.md"), compiledMarkdown, "utf8");

    return compiledMarkdown;
  }

  private async readBatonFile(projectPath: string, relativePath: string, fallback: string): Promise<string> {
    try {
      const fullPath = path.join(projectPath, ".baton", relativePath);
      const text = await readFile(fullPath, "utf8");
      return text.trim() ? text : fallback;
    } catch {
      return fallback;
    }
  }
}
