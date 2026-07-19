import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AgentId, AgentStatus } from "../../shared/types";
import { AGENT_LABELS } from "../../shared/types";

const execFileAsync = promisify(execFile);

export type ContinuePromptInput = {
  projectPath: string;
};

export type HandoffPromptGuidance = {
  nextSteps?: string;
  constraints?: string;
};

export type AgentMode = "run" | "handoff" | "continue";

export type AgentAdapter = {
  id: AgentId;
  displayName: string;
  description: string;
  command: string;
  detectCommands: string[];
  supportedModes: AgentMode[];
  buildStartCommand(projectPath: string): string;
  buildContinuePrompt(input: ContinuePromptInput): string;
};

type AgentDefinition = {
  id: AgentId;
  displayName: string;
  description: string;
  commands: string[];
  supportedModes: AgentMode[];
};

const DEFAULT_CONTINUE_PROMPT = ({ projectPath }: ContinuePromptInput): string => `You are continuing a coding task using Baton.

Project path:
${projectPath}

First read:
- .baton/continue.md
- .baton/current-task.md
- .baton/latest-handoff.md
- .baton/todos.md

Then continue the task from the Baton Pass.

Rules:
- Do not restart from scratch.
- Do not repeat completed investigation.
- Respect decisions and constraints.
- Focus on the listed next steps.
- When you complete a todo item, mark it done in .baton/todos.md.
- When done, summarize your changes for Baton.
`;

const KNOWN_AGENTS: AgentDefinition[] = [
  {
    id: "codex",
    displayName: "Codex",
    description: "High-performance coding assistant for complex refactoring.",
    commands: ["codex"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "claude",
    displayName: "Claude Code",
    description: "Agentic CLI with deep reasoning and context awareness.",
    commands: ["claude", "claude-code"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "opencode",
    displayName: "OpenCode",
    description: "Open-source agent optimized for local execution.",
    commands: ["opencode"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "gemini",
    displayName: "Gemini CLI",
    description: "Powered by Google's latest models for large-scale tasks.",
    commands: ["gemini", "gemini-cli"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "kiro",
    displayName: "Kiro",
    description: "Lightweight agent focused on speed and surgical edits.",
    commands: ["kiro-cli", "kiro"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "aider",
    displayName: "Aider",
    description: "Pair programming with your favorite LLMs using git.",
    commands: ["aider"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "cline",
    displayName: "Cline",
    description: "Autonomous coding agent for VS Code, also available as CLI.",
    commands: ["cline"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "windsurf",
    displayName: "Windsurf",
    description: "Codeium's agentic IDE and CLI workflow.",
    commands: ["windsurf"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "cursor",
    displayName: "Cursor",
    description: "AI-first code editor.",
    commands: ["cursor"],
    supportedModes: ["run"]
  },
  {
    id: "roo",
    displayName: "Roo Code",
    description: "Autonomous coding agent for VS Code.",
    commands: ["roo-code", "roo"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "goose",
    displayName: "Goose",
    description: "Open-source AI agent from Block.",
    commands: ["goose"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "amazon-q",
    displayName: "Amazon Q",
    description: "AWS-powered coding assistant CLI.",
    commands: ["q"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "github-copilot-cli",
    displayName: "GitHub Copilot CLI",
    description: "GitHub Copilot command-line interface.",
    commands: ["github-copilot-cli", "copilot"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "trae",
    displayName: "Trae",
    description: "ByteDance's AI coding IDE.",
    commands: ["trae"],
    supportedModes: ["run"]
  },
  {
    id: "zed",
    displayName: "Zed",
    description: "High-performance collaborative code editor with AI.",
    commands: ["zed"],
    supportedModes: ["run"]
  },
  {
    id: "openhands",
    displayName: "OpenHands",
    description: "Open-source autonomous software engineering agent.",
    commands: ["openhands"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "devin",
    displayName: "Devin",
    description: "Autonomous AI software engineer.",
    commands: ["devin"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "junie",
    displayName: "Junie",
    description: "JetBrains AI coding agent.",
    commands: ["junie"],
    supportedModes: ["run"]
  },
  {
    id: "manus",
    displayName: "Manus",
    description: "General AI agent for complex tasks.",
    commands: ["manus"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "kilo",
    displayName: "Kilo",
    description: "Lightweight coding companion.",
    commands: ["kilo", "kilo-code"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "antigravity",
    displayName: "Antigravity",
    description: "Google's AI-first developer agent CLI.",
    commands: ["agy"],
    supportedModes: ["run", "handoff", "continue"]
  }
];

// Additional command names that are common enough to check on PATH even if
// they are not in the curated registry above. When found, they are created
// as generic adapters so the user can launch them from Baton.
const DISCOVERABLE_COMMANDS: string[] = [
  "codex",
  "claude",
  "claude-code",
  "opencode",
  "gemini",
  "gemini-cli",
  "kiro-cli",
  "kiro",
  "aider",
  "cline",
  "windsurf",
  "cursor",
  "roo",
  "roo-code",
  "goose",
  "q",
  "github-copilot-cli",
  "copilot",
  "trae",
  "zed",
  "openhands",
  "devin",
  "junie",
  "manus",
  "kilo",
  "kilo-code",
  "kilocode",
  "coze",
  "dify",
  "n8n",
  "qwen-code",
  "perplexity",
  "phind",
  "agy"
];

function createAdapter(definition: AgentDefinition): AgentAdapter {
  return {
    id: definition.id,
    displayName: definition.displayName,
    description: definition.description,
    command: definition.commands[0] ?? definition.id,
    detectCommands: definition.commands,
    supportedModes: definition.supportedModes,
    buildStartCommand: (_projectPath) => definition.commands[0] ?? definition.id,
    buildContinuePrompt: DEFAULT_CONTINUE_PROMPT
  };
}

function createDefaultAdapter(command: string): AgentAdapter {
  return {
    id: command,
    displayName: AGENT_LABELS[command] ?? command,
    description: "Detected coding agent.",
    command,
    detectCommands: [command],
    supportedModes: ["run", "continue"],
    buildStartCommand: () => command,
    buildContinuePrompt: DEFAULT_CONTINUE_PROMPT
  };
}

export const AGENT_ADAPTERS: AgentAdapter[] = KNOWN_AGENTS.map(createAdapter);

export class AgentService {
  private readonly registry = new Map<AgentId, AgentAdapter>();

  constructor() {
    for (const adapter of AGENT_ADAPTERS) {
      this.registry.set(adapter.id, adapter);
    }
  }

  async detect(): Promise<AgentStatus[]> {
    const allCommands = new Set<string>();
    for (const adapter of this.registry.values()) {
      for (const cmd of adapter.detectCommands) allCommands.add(cmd);
    }
    for (const cmd of DISCOVERABLE_COMMANDS) allCommands.add(cmd);

    const resolved = await this.batchResolve([...allCommands]);

    const detected: AgentStatus[] = [];
    const foundCommands = new Set<string>();

    for (const adapter of this.registry.values()) {
      const found = this.firstResolved(adapter.detectCommands, resolved);
      const command = this.commandFor(adapter.id, found);
      if (command) foundCommands.add(command);
      detected.push({
        id: adapter.id,
        displayName: adapter.displayName,
        description: adapter.description,
        command: command ?? adapter.command,
        installed: Boolean(found),
        path: found,
        supportedModes: adapter.supportedModes
      });
    }

    for (const candidate of DISCOVERABLE_COMMANDS) {
      if (foundCommands.has(candidate)) continue;
      const found = resolved.get(candidate);
      if (found) {
        foundCommands.add(candidate);
        const adapter = createDefaultAdapter(candidate);
        detected.push({
          id: adapter.id,
          displayName: adapter.displayName,
          description: adapter.description,
          command: candidate,
          installed: true,
          path: found,
          supportedModes: adapter.supportedModes
        });
      }
    }

    return detected.sort((a, b) => {
      if (a.installed !== b.installed) return a.installed ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  getAdapter(agentId: AgentId): AgentAdapter {
    const registered = this.registry.get(agentId);
    if (registered) return registered;
    if (DISCOVERABLE_COMMANDS.includes(agentId)) {
      return createDefaultAdapter(agentId);
    }
    throw new Error(`Unknown agent: ${agentId}`);
  }

  async resolveExecutable(agentId: AgentId): Promise<string | undefined> {
    const adapter = this.getAdapter(agentId);
    const allCommands = new Set([...adapter.detectCommands, agentId]);
    const resolved = await this.batchResolve([...allCommands]);
    return this.firstResolved([...allCommands], resolved);
  }

  private async batchResolve(commands: string[]): Promise<Map<string, string | undefined>> {
    const result = new Map<string, string | undefined>();
    for (const cmd of commands) result.set(cmd, undefined);

    // Fast path: try `which` for all at once
    // `which` exits non-zero when any command isn't found,
    // but stdout still contains paths for the ones that are.
    const which = os.platform() === "win32" ? "where" : "which";
    try {
      const { stdout } = await execFileAsync(which, commands, { timeout: 8000 });
      this.parseWhichOutput(stdout, commands, result);
    } catch (err) {
      const stdout = (err as { stdout?: string })?.stdout ?? "";
      this.parseWhichOutput(stdout, commands, result);
    }

    // Check known install paths for unresolved commands (concurrency-limited)
    const unresolved = [...result.entries()].filter(([, v]) => !v).map(([k]) => k);
    const checks = unresolved.flatMap((cmd) =>
      this.knownCommandPaths(cmd).map((p) => ({ cmd, path: p }))
    );
    const CONCURRENCY = 20;
    for (let i = 0; i < checks.length; i += CONCURRENCY) {
      const batch = checks.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async ({ cmd, path: candidate }) => {
          if (result.get(cmd) || !this.fileExists(candidate)) return;
          try {
            await execFileAsync(candidate, ["--version"], { timeout: 2000 });
            result.set(cmd, candidate);
          } catch { /* not found */ }
        })
      );
    }

    return result;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private parseWhichOutput(stdout: string, commands: string[], result: Map<string, string | undefined>): void {
    const lines = stdout.split(/\r?\n/).filter(Boolean);
    for (const cmd of commands) {
      const match = lines.find((l) => path.basename(l) === cmd);
      if (match) result.set(cmd, match);
    }
  }

  private firstResolved(commands: string[], resolved: Map<string, string | undefined>): string | undefined {
    for (const cmd of commands) {
      const found = resolved.get(cmd);
      if (found) return found;
    }
    return undefined;
  }

  buildHandoffPrompt(guidance?: HandoffPromptGuidance): string {
    return buildHandoffContextPrompt("create", guidance);
  }

  buildUpdateHandoffPrompt(): string {
    return buildHandoffContextPrompt("update");
  }

  private commandFor(agentId: AgentId, resolvedPath?: string): string | undefined {
    const adapter = this.registry.get(agentId);
    if (!adapter) return resolvedPath ? path.basename(resolvedPath) : agentId;
    for (const command of adapter.detectCommands) {
      const found = resolvedPath?.toLowerCase().includes(command.toLowerCase());
      if (found) return command;
    }
    return adapter.command;
  }

  private knownCommandPaths(command: string): string[] {
    const home = os.homedir();
    const candidates = [
      path.join("/opt", "homebrew", "bin", command),
      path.join("/usr", "local", "bin", command),
      path.join("/usr", "bin", command),
      path.join("/bin", command),
      path.join(home, ".local", "bin", command),
      path.join(home, ".npm-global", "bin", command),
      path.join(home, ".npm", "bin", command),
      path.join(home, ".bun", "bin", command),
      path.join(home, ".deno", "bin", command),
      path.join(home, ".cargo", "bin", command)
    ];

    if (os.platform() === "darwin" && command === "kiro-cli") {
      candidates.push(
        "/Applications/Kiro CLI.app/Contents/Resources/kiro-cli",
        path.join(home, "Applications", "Kiro CLI.app", "Contents", "Resources", "kiro-cli")
      );
    }

    return candidates;
  }
}

function buildHandoffContextPrompt(mode: "create" | "update", guidance?: HandoffPromptGuidance): string {
  const action = mode === "update"
    ? "Update the existing Baton handoff context for the next coding agent."
    : "Create a Baton handoff context for the next coding agent.";
  const outputRule = mode === "update"
    ? "Read the current `.baton/latest-handoff.md` first, then rewrite that same file with the latest accurate context. Preserve still-relevant decisions and constraints; remove stale blockers, stale next steps, and completed work that no longer matters."
    : "Write the handoff to `.baton/latest-handoff.md`.";

  const operatorGuidance = guidance?.nextSteps || guidance?.constraints
    ? `
Operator guidance:
${guidance.nextSteps ? `Next steps requested by Baton:\n${guidance.nextSteps.trim()}\n` : ""}${guidance.constraints ? `Constraints requested by Baton:\n${guidance.constraints.trim()}\n` : ""}`
    : "";

  return `${action}

First read:
- .baton/current-task.md
- .baton/latest-handoff.md
- .baton/todos.md
- the current git status and relevant diffs

Before writing the handoff:
- Update .baton/todos.md so completed todo items are checked and newly discovered follow-up work is added.
- Keep todo text concise and actionable.
- Do not delete unfinished todos unless they are clearly obsolete.

${outputRule}
${operatorGuidance}

Use this structure:
# Baton Pass

## Current Task
One or two sentences describing the exact task state.

## Completed
- Concrete work already done.

## Changed Files
- path: why it changed.

## Decisions and Constraints
- Important choices the next agent must preserve.

## Blockers or Risks
- Current blockers, failing checks, uncertainty, or "None known."

## Next Steps
- Ordered, actionable next work.

## Todos
- Mirror the current .baton/todos.md state as markdown checkboxes.

## Files to Inspect
- Specific files the next agent should read first.

Rules:
- Be precise and compact.
- Do not include chat transcript or generic advice.
- Do not exaggerate completion.
- Do not restart from scratch.
- Make .baton/latest-handoff.md and .baton/todos.md agree with each other.
`;
}
