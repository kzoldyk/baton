import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AgentId, AgentStatus } from "../../shared/types";

const execFileAsync = promisify(execFile);

export type ContinuePromptInput = {
  projectPath: string;
};

export type HandoffPromptGuidance = {
  nextSteps?: string;
  constraints?: string;
};

export type AgentAdapter = {
  id: AgentId;
  displayName: string;
  description: string;
  command: string;
  detectCommands: string[];
  supportedModes: Array<"run" | "handoff" | "continue">;
  buildStartCommand(projectPath: string): string;
  buildContinuePrompt(input: ContinuePromptInput): string;
};

export const AGENT_ADAPTERS: AgentAdapter[] = [
  adapter("codex", "Codex", "High-performance coding assistant for complex refactoring.", "codex", ["run", "handoff", "continue"]),
  adapter("claude", "Claude Code", "Agentic CLI with deep reasoning and context awareness.", "claude", ["run", "handoff", "continue"]),
  adapter("opencode", "OpenCode", "Open-source agent optimized for local execution.", "opencode", ["run", "handoff", "continue"]),
  adapter("gemini", "Gemini CLI", "Powered by Google's latest models for large-scale tasks.", "gemini", ["run", "handoff", "continue"]),
  adapter("kiro", "Kiro", "Lightweight agent focused on speed and surgical edits.", "kiro-cli", ["run", "continue"])
];

function adapter(id: AgentId, displayName: string, description: string, command: string, supportedModes: AgentAdapter["supportedModes"]): AgentAdapter {
  return {
    id,
    displayName,
    description,
    command,
    detectCommands: [command],
    supportedModes,
    buildStartCommand: () => command,
    buildContinuePrompt: ({ projectPath }) => `You are continuing a coding task using Baton.

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
`
  };
}

export class AgentService {
  async detect(): Promise<AgentStatus[]> {
    return Promise.all(
      AGENT_ADAPTERS.map(async (agent) => {
        const found = await this.findCommand(agent.command);
        return {
          id: agent.id,
          displayName: agent.displayName,
          description: agent.description,
          command: agent.command,
          installed: Boolean(found),
          path: found,
          supportedModes: agent.supportedModes
        };
      })
    );
  }

  getAdapter(agentId: AgentId): AgentAdapter {
    const adapter = AGENT_ADAPTERS.find((item) => item.id === agentId);
    if (!adapter) throw new Error(`Unknown agent: ${agentId}`);
    return adapter;
  }

  async resolveExecutable(agentId: AgentId): Promise<string | undefined> {
    const adapter = this.getAdapter(agentId);
    return this.findCommand(adapter.command);
  }

  buildHandoffPrompt(guidance?: HandoffPromptGuidance): string {
    return buildHandoffContextPrompt("create", guidance);
  }

  buildUpdateHandoffPrompt(): string {
    return buildHandoffContextPrompt("update");
  }

  private async findCommand(command: string): Promise<string | undefined> {
    const lookup = os.platform() === "win32" ? "where" : "which";
    try {
      const { stdout } = await execFileAsync(lookup, [command], { timeout: 5000 });
      const found = stdout.split(/\r?\n/).find(Boolean)?.trim();
      if (found) return found;
    } catch {
      // Not on Electron's PATH. Fall through to login shell and known install locations.
    }

    const fromShell = await this.findCommandFromLoginShell(command);
    if (fromShell) return fromShell;

    for (const candidate of this.knownCommandPaths(command)) {
      try {
        await execFileAsync(candidate, ["--version"], { timeout: 3000 });
        return candidate;
      } catch {
        // try next
      }
    }

    return undefined;
  }

  private async findCommandFromLoginShell(command: string): Promise<string | undefined> {
    if (os.platform() === "win32") return undefined;
    const shell = process.env.SHELL || "/bin/zsh";
    const flag = shell.endsWith("zsh") || shell.endsWith("bash") ? "-lic" : "-lc";
    try {
      const { stdout } = await execFileAsync(shell, [flag, `command -v ${shellQuote(command)}`], { timeout: 5000 });
      const found = stdout.split(/\r?\n/).find(Boolean)?.trim();
      return found || undefined;
    } catch {
      return undefined;
    }
  }

  private knownCommandPaths(command: string): string[] {
    const home = os.homedir();
    const candidates = [
      path.join(home, ".local", "bin", command),
      path.join(home, ".npm-global", "bin", command),
      path.join(home, ".bun", "bin", command),
      path.join(home, ".deno", "bin", command)
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

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
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
