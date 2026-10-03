import type { AgentId, Handoff } from "../../../shared/types";

export type RefreshBeforePassChoice = "refresh" | "skip" | "cancel";

export type PassSource = "git" | "agent";

export function shouldPromptRefreshBeforePass(latestHandoff: Handoff | undefined): boolean {
  return Boolean(latestHandoff);
}

export function resolvePassSheetAgents(
  agentOptions: AgentId[],
  activeSessionAgentId: AgentId | undefined,
  fallback: AgentId = "codex"
): { from: AgentId; to: AgentId } {
  const from = (activeSessionAgentId ?? agentOptions[0] ?? fallback) as AgentId;
  const to = (agentOptions.find((id) => id !== from) ?? agentOptions[0] ?? fallback) as AgentId;
  return { from, to };
}

export function shouldInitPassSheetAgents(sheetOpen: boolean, wasOpen: boolean): boolean {
  return sheetOpen && !wasOpen;
}

/** Falls back to the instant git-based source when the chosen source needs a live session. */
export function resolvePassSource(preferred: PassSource, sessionLive: boolean): PassSource {
  return preferred === "agent" && !sessionLive ? "git" : preferred;
}

export function passSourceHint(source: PassSource, sessionLive: boolean): string {
  if (source === "agent") {
    return sessionLive
      ? "Your running agent writes the pass itself. Slower, but it knows what it just did."
      : "Start a live agent session to let it write the pass.";
  }
  return "Built instantly from the git diff plus your session's commands, tests and errors.";
}

/** Sheet should always close; an agent-agnostic pass routes straight to the receiver picker. */
export function nextStateAfterPassCreated(toAgent: AgentId): { handoffSheetOpen: boolean; usePassOpen: boolean } {
  return { handoffSheetOpen: false, usePassOpen: toAgent === "any" };
}

export function nextStateAfterRefreshChoice(
  choice: RefreshBeforePassChoice,
  refreshSucceeded: boolean
): { refreshBeforePassOpen: boolean; handoffSheetOpen: boolean } | null {
  if (choice === "cancel") {
    return { refreshBeforePassOpen: false, handoffSheetOpen: false };
  }
  if (choice === "refresh" && !refreshSucceeded) {
    return null;
  }
  return { refreshBeforePassOpen: false, handoffSheetOpen: true };
}

export function buildAgentOptions(
  installedIds: AgentId[],
  fallback: AgentId[] = ["codex", "claude", "opencode", "gemini", "grok"]
): AgentId[] {
  return installedIds.length ? installedIds : fallback;
}
