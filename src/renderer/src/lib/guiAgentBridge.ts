import type { GuiAgentTarget } from "../../../shared/types";

export type GuiAgent = "cursor" | "windsurf" | "claude" | "copilot";

export const GUI_AGENT_LABELS: Record<GuiAgent, string> = {
  cursor: "Cursor Composer",
  windsurf: "Windsurf Cascade",
  claude: "Claude Desktop",
  copilot: "GitHub Copilot"
};

export function formatGuiAgentPrompt(
  agent: GuiAgent,
  passContent: string,
  taskTitle?: string
): string {
  const cleanPass = passContent.trim();
  const titleHeader = taskTitle ? `Feature / Task: ${taskTitle}\n\n` : "";

  switch (agent) {
    case "cursor":
      return `You are continuing a task in Cursor using Baton Handoff.

${titleHeader}Context & Baton Pass:
${cleanPass}

Instructions for Cursor:
1. Do not re-index or scan the entire repository.
2. Respect all architectural decisions, constraints, and untouched modules.
3. Continue work starting from the Next Steps listed above.
4. Keep modifications surgical and aligned with the active feature.`;

    case "windsurf":
      return `You are continuing a task in Windsurf (Cascade) using Baton Handoff.

${titleHeader}Context & Baton Pass:
${cleanPass}

Instructions for Cascade:
1. Do not scan unrelated files or start over from scratch.
2. Adhere strictly to the decisions, boundaries, and constraints documented above.
3. Execute the immediate Next Steps.
4. Verify changes after each bounded modification.`;

    case "claude":
      return `You are continuing a task in Claude Desktop using Baton Handoff.

${titleHeader}Context & Baton Pass:
${cleanPass}

Instructions for Claude:
1. Do not ask for or re-read the entire repository.
2. Strictly abide by the decisions and constraints defined above.
3. Proceed directly with the Next Steps outlined in the Baton Pass.
4. Work step-by-step and keep changes minimal.`;

    case "copilot":
      return `You are continuing a task in GitHub Copilot using Baton Handoff.

${titleHeader}Context & Baton Pass:
${cleanPass}

Instructions for Copilot:
1. Work within the provided context without modifying untouched files.
2. Follow all decisions and constraints listed above.
3. Implement the specified Next Steps directly.`;
  }
}

export async function exportRulesToFile(
  projectId: string,
  target: GuiAgentTarget,
  passContent: string
): Promise<{ success: boolean; filePath: string }> {
  return window.baton.projects.exportRules(projectId, target, passContent);
}
