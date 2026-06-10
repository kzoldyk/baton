import {
  Antigravity,
  Claude,
  ClaudeCode,
  Codex,
  Cursor,
  Gemini,
  GeminiCLI,
  Google,
  KiloCode,
  OpenCode,
} from "@lobehub/icons";
import { Bot, FolderOpen, Monitor, Server, Zap } from "lucide-react";
import type { AgentId } from "../../../shared/types";

const icons: Record<AgentId, (props: { size?: number | string; className?: string }) => JSX.Element> = {
  codex: (props) => <Codex.Color size={props.size} className={props.className} />,
  claude: (props) => <ClaudeCode.Color size={props.size} className={props.className} />,
  opencode: (props) => <OpenCode size={props.size} className={props.className} />,
  gemini: (props) => <GeminiCLI.Color size={props.size} className={props.className} />,
  kiro: (props) => <Zap size={props.size} className={props.className} color="#9046FF" />,
  kilo: (props) => <KiloCode size={props.size} className={props.className} color="#F8F676" />,
  cursor: (props) => <Cursor size={props.size} className={props.className} />,
  agy: (props) => <Antigravity.Color size={props.size} className={props.className} />
};

export function AgentIcon({ agentId, className }: { agentId: AgentId; className?: string }): JSX.Element {
  const Icon = icons[agentId];
  return <Icon className={className} />;
}

const sourceIcons: Record<string, (props: { size?: number | string; className?: string }) => JSX.Element> = {
  "Claude Code": (props) => <ClaudeCode.Color size={props.size} className={props.className} />,
  "Codex": (props) => <Codex.Color size={props.size} className={props.className} />,
  "OpenCode": (props) => <OpenCode size={props.size} className={props.className} />,
  "Kiro": (props) => <Zap size={props.size} className={props.className} color="#9046FF" />,
  "Kilo": (props) => <KiloCode size={props.size} className={props.className} color="#F8F676" />,
  "Cursor": (props) => <Cursor size={props.size} className={props.className} />,
  "Antigravity": (props) => <Antigravity.Color size={props.size} className={props.className} />,
  "Google": (props) => <Google.Color size={props.size} className={props.className} />,
  "Gemini": (props) => <Gemini.Color size={props.size} className={props.className} />,
  "Gemini CLI": (props) => <GeminiCLI.Color size={props.size} className={props.className} />,
  "LM Studio": (props) => <Monitor size={props.size} className={props.className} />,
  "AI Tools": (props) => <Bot size={props.size} className={props.className} />,
  "Project MCP": (props) => <FolderOpen size={props.size} className={props.className} />,
  "Claude Code (project)": (props) => <ClaudeCode.Color size={props.size} className={props.className} />,
};

export function SourceIcon({ source, className }: { source?: string; className?: string }): JSX.Element {
  if (!source) return <Server className={className} />;
  const Icon = sourceIcons[source];
  if (!Icon) return <Server className={className} />;
  return <Icon className={className} />;
}
