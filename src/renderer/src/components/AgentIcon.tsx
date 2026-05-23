import { Claude, Codex, Gemini } from "@lobehub/icons";
import { Bot, FolderOpen, Monitor, Server, Zap } from "lucide-react";
import type { AgentId } from "../../../shared/types";

function OpenCodeIcon({ size, className }: { size?: number | string; className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 24} height={size ?? 24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 18L22 12L16 6" />
      <path d="M8 6L2 12L8 18" />
    </svg>
  );
}

function KiloIcon({ size, className }: { size?: number | string; className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 24} height={size ?? 24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 8l8 8" />
      <path d="M16 8l-8 8" />
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

const sourceIcons: Record<string, (props: { size?: number | string; className?: string }) => JSX.Element> = {
  "Claude Code": (props) => <Claude size={props.size} className={props.className} />,
  "Codex": (props) => <Codex size={props.size} className={props.className} />,
  "OpenCode": (props) => <OpenCodeIcon size={props.size} className={props.className} />,
  "Kiro": (props) => <Zap size={props.size} className={props.className} />,
  "Kilo": (props) => <KiloIcon size={props.size} className={props.className} />,
  "LM Studio": (props) => <Monitor size={props.size} className={props.className} />,
  "AI Tools": (props) => <Bot size={props.size} className={props.className} />,
  "Project MCP": (props) => <FolderOpen size={props.size} className={props.className} />,
  "Claude Code (project)": (props) => <Claude size={props.size} className={props.className} />,
};

export function SourceIcon({ source, className }: { source?: string; className?: string }): JSX.Element {
  if (!source) return <Server className={className} />;
  const Icon = sourceIcons[source];
  if (!Icon) return <Server className={className} />;
  return <Icon className={className} />;
}
