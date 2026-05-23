import { Claude, Codex, Gemini } from "@lobehub/icons";
import { Zap } from "lucide-react";
import type { AgentId } from "../../../shared/types";

function OpenCodeIcon({ size, className }: { size?: number | string; className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 24} height={size ?? 24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 18L22 12L16 6" />
      <path d="M8 6L2 12L8 18" />
    </svg>
  );
}

const icons: Record<AgentId, (props: { size?: number | string; className?: string }) => JSX.Element> = {
  codex: (props) => <Codex size={props.size} className={props.className} />,
  claude: (props) => <Claude size={props.size} className={props.className} />,
  opencode: (props) => <OpenCodeIcon size={props.size} className={props.className} />,
  gemini: (props) => <Gemini size={props.size} className={props.className} />,
  kiro: (props) => <Zap size={props.size} className={props.className} />
};

export function AgentIcon({ agentId, className }: { agentId: AgentId; className?: string }): JSX.Element {
  const Icon = icons[agentId];
  return <Icon className={className} />;
}
