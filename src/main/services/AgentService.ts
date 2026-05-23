import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import type { AgentId, AgentStatus } from "../../shared/types";

const execFileAsync = promisify(execFile);

export type ContinuePromptInput = {
  projectPath: string;
};

export type AgentAdapter = {
  id: AgentId;
  displayName: string;
  command: string;
  detectCommands: string[];
  supportedModes: Array<"run" | "handoff" | "continue">;
  buildStartCommand(projectPath: string): string;
  buildContinuePrompt(input: ContinuePromptInput): string;
};

export const AGENT_ADAPTERS: AgentAdapter[] = [
  adapter("codex", "Codex", "codex", ["run", "handoff", "continue"]),
  adapter("claude", "Claude Code", "claude", ["run", "handoff", "continue"]),
  adapter("opencode", "OpenCode", "opencode", ["run", "handoff", "continue"]),
  adapter("gemini", "Gemini CLI", "gemini", ["run", "handoff", "continue"]),
  adapter("kiro", "Kiro", "kiro", ["run", "continue"])
];

function adapter(id: AgentId, displayName: string, command: string, supportedModes: AgentAdapter["supportedModes"]): AgentAdapter {
  return {
    id,
    displayName,
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

Then continue the task from the Baton Pass.

Rules:
- Do not restart from scratch.
- Do not repeat completed investigation.
- Respect decisions and constraints.
- Focus on the listed next steps.
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

  buildHandoffPrompt(): string {
    return `You are creating a Baton Pass for another coding agent.

Summarize the current work in a compact handoff format.

Include:
- current task
- what you completed
- changed files
- important decisions
- current blocker
- next steps
- warnings
- files the next agent should inspect

Write the handoff to:
.baton/latest-handoff.md

Do not include unnecessary chat history.
Do not exaggerate.
Be precise and useful for another coding agent continuing this task.
`;
  }

  private async findCommand(command: string): Promise<string | undefined> {
    const lookup = os.platform() === "win32" ? "where" : "which";
    try {
      const { stdout } = await execFileAsync(lookup, [command], { timeout: 5000 });
      return stdout.split(/\r?\n/).find(Boolean)?.trim();
    } catch {
      return undefined;
    }
  }
}
