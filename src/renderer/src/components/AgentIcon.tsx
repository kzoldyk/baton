import { Bot, Code, Sparkles, Terminal, Zap } from "lucide-react";
import type { AgentId } from "../../../shared/types";

const icons: Record<AgentId, typeof Code> = {
  codex: Code,
  claude: Bot,
  opencode: Terminal,
  gemini: Sparkles,
  kiro: Zap
};

export function AgentIcon({ agentId, className }: { agentId: AgentId; className?: string }): JSX.Element {
  const Icon = icons[agentId] ?? Terminal;
  return <Icon className={className} />;
}
