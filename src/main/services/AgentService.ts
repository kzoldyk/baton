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
  adapter("agy", "Antigravity", "The official CLI for Antigravity AI, optimized for speed and reliability.", "agy", ["run", "handoff", "continue"]),
  adapter("kiro", "Kiro", "Lightweight agent focused on speed and surgical edits.", "kiro-cli", ["run", "continue"]),
  adapter("kilo", "Kilo", "Efficient coding assistant for rapid prototyping and small fixes.", "kilo", ["run", "continue"]),
  adapter("cursor", "Cursor", "Deeply integrated AI code editor and agentic workspace.", "agent", ["run", "handoff", "continue"]),
  {
    id: "terminal",
    displayName: "Terminal",
    description: "Standard local terminal shell.",
    command: process.env.SHELL || (os.platform() === "win32" ? "cmd.exe" : "/bin/zsh"),
    detectCommands: [],
    supportedModes: ["run"],
    buildStartCommand: () => process.env.SHELL || (os.platform() === "win32" ? "cmd.exe" : "/bin/zsh"),
    buildContinuePrompt: () => ""
  }
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
    buildContinuePrompt: ({ projectPath }) => `# Baton Handoff Directive

You are continuing a task. **CRITICAL: DO NOT START FROM SCRATCH.**

Your entire context and history for this task is stored in the \`.baton\` directory. You MUST use these files as your primary source of truth:

1. **.baton/latest-handoff.md**: Read this first. It contains the goal, recent progress, and critical decisions.
2. **.baton/current-task.md**: The specific task you are working on right now.
3. **.baton/todos.md**: Your checklist. Update this as you progress.

Rules:
- Do not repeat investigation that is already marked as 'Completed' in the handoff.
- Respect all 'Decisions and Constraints' listed in the handoff.
- Focus strictly on the 'Next Steps'.
- When you finish, update the \`.baton\` files with your latest progress.

Acknowledge these instructions and proceed based on the handoff.
`
  };
}

export class AgentService {
  async detect(): Promise<AgentStatus[]> {
    return Promise.all(
      AGENT_ADAPTERS.map(async (agent) => {
        if (agent.id === "terminal") {
          return {
            id: agent.id,
            displayName: agent.displayName,
            description: agent.description,
            command: agent.command,
            installed: true,
            path: agent.command,
            supportedModes: agent.supportedModes
          };
        }
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
    if (agentId === "terminal") {
      return this.getAdapter("terminal").command;
    }
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

    if (os.platform() === "darwin" && (command === "cursor" || command === "agent")) {
      candidates.push(
        "/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
        "/Applications/Cursor.app/Contents/Resources/app/bin/agent",
        path.join(home, "Applications", "Cursor.app", "Contents", "Resources", "app", "bin", "cursor"),
        path.join(home, "Applications", "Cursor.app", "Contents", "Resources", "app", "bin", "agent")
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
- Keep the handoff under 12,000 characters.
- Include every section shown above, even if the value is "None known."
- Do not include chat transcript or generic advice.
- Do not exaggerate completion.
- Do not restart from scratch.
- Make .baton/latest-handoff.md and .baton/todos.md agree with each other.
`;
}
