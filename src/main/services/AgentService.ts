import { execFile } from "node:child_process";
import { constants, existsSync, readdirSync } from "node:fs";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { AgentId, AgentStatus } from "../../shared/types.ts";
import { AGENT_LABELS } from "../../shared/types.ts";

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

First read these files only:
1. .baton/current-task.md
2. .baton/latest-handoff.md
3. .baton/todos.md

Then continue the task from the Baton Pass.

Rules:
- Do not restart from scratch.
- Do not reread the whole repository.
- Do not read .baton/knowledge or compiled-context files.
- Respect decisions, constraints, and what not to touch.
- Focus on the listed next steps.
- Keep .baton/todos.md updated as work progresses.
- When done, rewrite .baton/latest-handoff.md with the latest accurate pass.
`;

const KNOWN_AGENTS: AgentDefinition[] = [
  {
    id: "terminal",
    displayName: "Terminal Shell",
    description: "Standard interactive system shell terminal session.",
    commands: [process.env.SHELL ? path.basename(process.env.SHELL) : "zsh", "zsh", "bash", "sh"],
    supportedModes: ["run"]
  },
  {
    id: "codex",
    displayName: "Codex CLI",
    description: "OpenAI's local coding agent with interactive TUI and sandboxed tool execution.",
    commands: ["codex"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "claude",
    displayName: "Claude Code",
    description: "Anthropic's repo-aware terminal agent for editing, refactoring, and git workflows.",
    commands: ["claude", "claude-code"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "opencode",
    displayName: "OpenCode",
    description: "Terminal-native coding agent with 75+ provider support and privacy-first design.",
    commands: ["opencode"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "gemini",
    displayName: "Gemini CLI",
    description: "Google's open-source terminal agent for repo work, research, and multi-file editing.",
    commands: ["gemini", "gemini-cli"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "antigravity",
    displayName: "Antigravity",
    description: "Google's next-gen agent CLI with multi-agent workflows and Gemini models.",
    commands: ["agy"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "grok",
    displayName: "Grok Build",
    description: "xAI's agentic CLI with parallel sub-agents, git worktree isolation, and Grok models.",
    commands: ["grok"],
    supportedModes: ["run", "handoff", "continue"]
  },
  {
    id: "aider",
    displayName: "Aider",
    description: "Pair-programming AI agent that edits code via diffs with strong git integration.",
    commands: ["aider"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "cline",
    displayName: "Cline",
    description: "Model-agnostic autonomous agent for planning, editing, and command execution.",
    commands: ["cline"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "goose",
    displayName: "Goose",
    description: "Local extensible MCP-native agent that executes, edits, and tests code.",
    commands: ["goose"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "amazon-q",
    displayName: "Amazon Q Developer",
    description: "AWS's agentic terminal chat for building, debugging, and DevOps.",
    commands: ["q"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "github-copilot-cli",
    displayName: "GitHub Copilot CLI",
    description: "GitHub's agentic CLI for repo, PR, and issue workflows with AI suggestions.",
    commands: ["github-copilot-cli", "copilot"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "roo",
    displayName: "Roo Code",
    description: "Multi-mode agent with architect, code, debug, and orchestrator modes.",
    commands: ["roo", "roo-code"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "kilo",
    displayName: "Kilo Code",
    description: "Open-source CLI agent with orchestrator mode, 500+ LLM support, and checkpointing.",
    commands: ["kilo", "kilo-code", "kilocode"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "kiro",
    displayName: "Kiro",
    description: "Lightweight agent focused on speed and surgical edits.",
    commands: ["kiro", "kiro-cli"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "cursor",
    displayName: "Cursor",
    description: "AI-first code editor with agent mode, Composer, and full codebase indexing.",
    commands: ["cursor"],
    supportedModes: ["run"]
  },
  {
    id: "windsurf",
    displayName: "Windsurf",
    description: "Agentic IDE by Codeium with Cascade AI and collaborative context sharing.",
    commands: ["windsurf"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "trae",
    displayName: "Trae",
    description: "ByteDance's AI-powered IDE with SOLO autonomous mode and multi-agent collaboration.",
    commands: ["trae"],
    supportedModes: ["run"]
  },
  {
    id: "zed",
    displayName: "Zed",
    description: "High-performance Rust-based editor with native AI assistant and ACP protocol.",
    commands: ["zed"],
    supportedModes: ["run"]
  },
  {
    id: "openhands",
    displayName: "OpenHands",
    description: "Open-source autonomous agent framework with sandboxed Docker execution.",
    commands: ["openhands"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "devin",
    displayName: "Devin",
    description: "Cognition's autonomous AI software engineer with shell, browser, and IDE access.",
    commands: ["devin"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "junie",
    displayName: "Junie",
    description: "JetBrains' LLM-agnostic CLI agent with plan mode, debugging, and CI/CD headless use.",
    commands: ["junie"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "manus",
    displayName: "Manus",
    description: "General-purpose autonomous agent for research, data collection, and web tasks.",
    commands: ["manus"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "pi",
    displayName: "Pi",
    description: "Minimal terminal coding harness with unified LLM API, TUI, skills, and MCP.",
    commands: ["pi"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "open-interpreter",
    displayName: "Open Interpreter",
    description: "Terminal tool that executes code and actions via natural language on your machine.",
    commands: ["interpreter"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "continue",
    displayName: "Continue CLI",
    description: "Open-source terminal coding agent with multi-model support and privacy focus.",
    commands: ["continue", "cn"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "qwen",
    displayName: "Qwen Code",
    description: "Alibaba's CLI agent for Qwen coder models with workflow tooling and repo operations.",
    commands: ["qwen"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "kimi",
    displayName: "Kimi CLI",
    description: "Moonshot AI's CLI coding agent with skills, MCP support, and ACP integration.",
    commands: ["kimi"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "plandex",
    displayName: "Plandex",
    description: "Plan-first CLI agent for building features across files with structured steps.",
    commands: ["plandex"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "crush",
    displayName: "Crush",
    description: "Charmbracelet's glamorous agentic coding TUI with multi-provider and LSP support.",
    commands: ["crush"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "deep-agents",
    displayName: "Deep Agents Code",
    description: "LangChain's terminal coding agent with TUI, subagents, and human-in-the-loop approvals.",
    commands: ["deep-agents"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "swe-agent",
    displayName: "SWE-agent",
    description: "Agent for resolving GitHub issues and PRs, frequently used in SWE-bench.",
    commands: ["sweagent"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "codebuff",
    displayName: "Codebuff",
    description: "Multi-agent AI coding assistant for terminal with collaborative workflows.",
    commands: ["codebuff"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "hermes",
    displayName: "Hermes Agent",
    description: "Nous Research's self-improving CLI agent with persistent memory and skills.",
    commands: ["hermes"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "claw",
    displayName: "Claw Code",
    description: "Clean-room Python/Rust rewrite of Claude Code architecture.",
    commands: ["claw"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "amp",
    displayName: "Amp",
    description: "Sourcegraph's AI coding agent CLI for implementing tasks with oracle mode.",
    commands: ["amp"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "droid",
    displayName: "Droid",
    description: "Factory's multi-model CLI agent with specialized droids for different tasks.",
    commands: ["droid"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "gptme",
    displayName: "gptme",
    description: "AI agent in your terminal that runs code, edits files, and browses the web.",
    commands: ["gptme"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "devon",
    displayName: "Devon",
    description: "Open-source pair programmer with TUI for planning, execution, and debugging.",
    commands: ["devon"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "auggie",
    displayName: "Auggie CLI",
    description: "Augment Code's CLI agent with semantic context engine and codebase indexing.",
    commands: ["auggie"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "codebuddy",
    displayName: "CodeBuddy",
    description: "Coding agent with ACP support and sandboxed execution environments.",
    commands: ["codebuddy"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "tabnine",
    displayName: "Tabnine CLI",
    description: "AI-powered terminal coding assistant with agentic workflows.",
    commands: ["tabnine"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "mimo",
    displayName: "MiMo Code",
    description: "Xiaomi's terminal coding agent with TUI, MCP, skills, hooks, and resumable sessions.",
    commands: ["mimo"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "groq",
    displayName: "Groq Code CLI",
    description: "Lightweight CLI powered by Groq's ultra-fast inference with multi-model support.",
    commands: ["groq"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "letta",
    displayName: "Letta Code",
    description: "Memory-first CLI coding agent with persistent memory across sessions.",
    commands: ["letta"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "ra-aid",
    displayName: "RA.Aid",
    description: "Autonomous coding agent with research, plan, and implement pipeline.",
    commands: ["ra-aid"],
    supportedModes: ["run", "continue"]
  },
  {
    id: "vibe",
    displayName: "Mistral Vibe",
    description: "Mistral's CLI coding assistant for conversational repo interaction and editing.",
    commands: ["vibe"],
    supportedModes: ["run", "continue"]
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
  "kiro",
  "kiro-cli",
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
  "qwen",
  "qwen-code",
  "perplexity",
  "phind",
  "agy",
  "grok",
  "pi",
  "interpreter",
  "cn",
  "continue",
  "vibe",
  "kimi",
  "plandex",
  "crush",
  "deep-agents",
  "sweagent",
  "codebuff",
  "forge",
  "hermes",
  "claw",
  "claude-engineer",
  "claurst",
  "free-code",
  "amp",
  "droid",
  "command-code",
  "codel",
  "gptme",
  "devon",
  "omp",
  "auggie",
  "codebuddy",
  "tabnine",
  "mimo",
  "smol",
  "nanocoder",
  "groq",
  "letta",
  "opensquilla",
  "ra-aid",
  "cortex",
  "coderabbit",
  "supergate",
  "superset",
  "vibe-kanban",
  "cmux",
  "ralph",
  "ruflo",
  "agentsmesh",
  "lovable",
  "bolt",
  "v0",
  "emergent",
  "warp",
  "augment",
  "dyad",
  "void",
  "zencoder",
  "cody",
  "codeium",
  "supermaven",
  "patapim",
  "bwee",
  "replit"
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

    const seenPaths = new Set<string>();

    for (const adapter of this.registry.values()) {
      const found = this.firstResolved(adapter.detectCommands, resolved);
      if (!found) continue;
      if (seenPaths.has(found)) continue;
      seenPaths.add(found);
      for (const cmd of adapter.detectCommands) foundCommands.add(cmd);
      const command = this.commandFor(adapter.id, found);
      if (command) foundCommands.add(command);
      detected.push({
        id: adapter.id,
        displayName: adapter.displayName,
        description: adapter.description,
        command: command ?? adapter.command,
        installed: true,
        path: found,
        supportedModes: adapter.supportedModes
      });
    }

    const systemBinDirs = new Set(["/bin", "/usr/bin", "/sbin", "/usr/sbin"]);

    for (const candidate of DISCOVERABLE_COMMANDS) {
      if (foundCommands.has(candidate)) continue;
      const found = resolved.get(candidate);
      if (found) {
        if (systemBinDirs.has(path.dirname(found))) continue;
        if (seenPaths.has(found)) continue;
        seenPaths.add(found);
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

    return detected.sort((a, b) => a.displayName.localeCompare(b.displayName));
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
    const which = os.platform() === "win32" ? "where" : "which";
    let stdout = "";
    try {
      const res = await execFileAsync(which, commands, { timeout: 8000 });
      stdout = res.stdout;
    } catch (err) {
      stdout = (err as { stdout?: string })?.stdout ?? "";
    }
    const whichMatches = this.parseWhichMatches(stdout, commands);

    // Concurrently verify candidate commands by running them
    const CONCURRENCY = 20;
    const matchEntries = [...whichMatches.entries()];
    for (let i = 0; i < matchEntries.length; i += CONCURRENCY) {
      const batch = matchEntries.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async ([cmd, matchPath]) => {
          if (await this.verifyExecutable(matchPath)) {
            result.set(cmd, matchPath);
          }
        })
      );
    }

    // Check known install paths for unresolved commands (concurrency-limited)
    const unresolved = [...result.entries()].filter(([, v]) => !v).map(([k]) => k);
    const checks = unresolved.flatMap((cmd) =>
      this.knownCommandPaths(cmd).map((p) => ({ cmd, path: p }))
    );
    for (let i = 0; i < checks.length; i += CONCURRENCY) {
      const batch = checks.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async ({ cmd, path: candidate }) => {
          if (result.get(cmd) || !(await this.fileExists(candidate))) return;
          if (await this.verifyExecutable(candidate)) {
            result.set(cmd, candidate);
          }
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

  private async verifyExecutable(filePath: string): Promise<boolean> {
    try {
      await access(filePath, constants.X_OK);
      await execFileAsync(filePath, ["--version"], { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  private parseWhichMatches(stdout: string, commands: string[]): Map<string, string> {
    const matches = new Map<string, string>();
    const lines = stdout.split(/\r?\n/).filter(Boolean);
    for (const cmd of commands) {
      const match = lines.find((l) => path.basename(l) === cmd);
      if (match) matches.set(cmd, match);
    }
    return matches;
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

    const nvmDir = path.join(home, ".nvm", "versions", "node");
    try {
      if (existsSync(nvmDir)) {
        const versions = readdirSync(nvmDir);
        for (const ver of versions) {
          candidates.push(path.join(nvmDir, ver, "bin", command));
        }
      }
    } catch { /* ignore */ }

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
- the current git status and a short diffstat only (do not dump full patches)

Before writing the handoff:
- Update .baton/todos.md so completed todo items are checked and newly discovered follow-up work is added.
- Keep todo text concise and actionable.
- Do not delete unfinished todos unless they are clearly obsolete.

${outputRule}
${operatorGuidance}

Use this structure:
# Baton Pass

## Current Task
One line.

## Completed
- Max 5 short bullets.

## Next Steps
- Max 5 ordered bullets.

## Files to Inspect
- Max 5 paths.

## Changed Files
- path: why (no diffs).

## Do Not Touch
- Max 5 bullets.

## Blockers
- None or 1-2 lines.

Rules:
- Keep the whole file under 80 lines.
- Do not include chat transcript, full patches, or file bodies.
- Do not reread the whole repository.
- Make .baton/latest-handoff.md and .baton/todos.md agree with each other.
`;
}
