import type { AgentId, Handoff } from "../../../shared/types";

export type RefreshBeforePassChoice = "refresh" | "skip" | "cancel";

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
