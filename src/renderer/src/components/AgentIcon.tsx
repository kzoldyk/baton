import { Claude, Gemini, OpenAI } from "@lobehub/icons";
import { Code, Zap } from "lucide-react";
import type { AgentId } from "../../../shared/types";

type IconComponent = (props: { size?: number | string; className?: string }) => JSX.Element;

const icons: Record<AgentId, IconComponent> = {
  codex: (props) => <OpenAI size={props.size} className={props.className} />,
  claude: (props) => <Claude size={props.size} className={props.className} />,
  opencode: (props) => <Code size={props.size} className={props.className} />,
  gemini: (props) => <Gemini size={props.size} className={props.className} />,
  kiro: (props) => <Zap size={props.size} className={props.className} />
};

export function AgentIcon({ agentId, className }: { agentId: AgentId; className?: string }): JSX.Element {
  const Icon = icons[agentId];
  return <Icon className={className} />;
}
