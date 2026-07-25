import {
  AgentIcon as LobeAgentIcon,
  ProviderIcon,
  Amp,
  Antigravity,
  Claude,
  Cline,
  CodeBuddy,
  Codex,
  Coze,
  Cursor,
  Devin,
  Dify,
  Gemini,
  Goose,
  Grok,
  Groq,
  Junie,
  Kimi,
  Lovable,
  Manus,
  N8n,
  OpenCode,
  OpenHands,
  Perplexity,
  Phind,
  Pi,
  Qwen,
  Replit,
  Trae,
  Windsurf,
  Zencoder,
} from "@lobehub/icons";
import { Bot, Server } from "lucide-react";
import type { AgentId } from "../../../shared/types";

type IconComponent = React.ElementType<{ size?: number; className?: string }> & {
  Color?: IconComponent;
};

const DIRECT_ICONS: Record<string, IconComponent> = {
  amp: Amp,
  antigravity: Antigravity,
  agy: Antigravity,
  claude: Claude,
  "claude-code": Claude,
  cline: Cline,
  codebuddy: CodeBuddy,
  codex: Codex,
  coze: Coze,
  cursor: Cursor,
  devin: Devin,
  dify: Dify,
  gemini: Gemini,
  goose: Goose,
  grok: Grok,
  "grok-build": Grok,
  groq: Groq,
  junie: Junie,
  kimi: Kimi,
  lovable: Lovable,
  manus: Manus,
  n8n: N8n,
  opencode: OpenCode,
  "open-code": OpenCode,
  openhands: OpenHands,
  "open-hands": OpenHands,
  perplexity: Perplexity,
  phind: Phind,
  pi: Pi,
  qwen: Qwen,
  "qwen-code": Qwen,
  replit: Replit,
  trae: Trae,
  windsurf: Windsurf,
  zencoder: Zencoder,
};

const PROVIDER_ALIAS: Record<string, string> = {
  copilot: "githubcopilot",
  "github-copilot": "githubcopilot",
  "github-copilot-cli": "githubcopilot",
};

export function AgentIcon({ agentId, className }: { agentId: AgentId; className?: string }): JSX.Element {
  const id = agentId.toLowerCase();

  const Direct = DIRECT_ICONS[id];
  if (Direct) {
    const ColorVariant = (Direct as IconComponent).Color;
    if (ColorVariant) return <ColorVariant size={20} className={className} />;
    return <Direct size={20} className={className} />;
  }

  const provider = PROVIDER_ALIAS[id];
  if (provider) return <ProviderIcon provider={provider} type="color" size={20} className={className} />;

  return <LobeAgentIcon agent={id} type="color" size={20} className={className} />;
}

const AGENT_SOURCE_MAP: Record<string, string> = {
  "Claude Code": "claude-code",
  "Codex": "codex",
  "OpenCode": "opencode",
  "Kiro": "kiro",
  "Kilo": "kilo",
  "Claude Code (project)": "claude-code",
  "Grok Build": "grok",
};

const STATIC_SOURCE_ICONS: Record<string, React.ElementType> = {
  "AI Tools": Bot,
  "Project MCP": Bot,
};

export function SourceIcon({ source, className }: { source?: string; className?: string }): JSX.Element {
  if (!source) return <Server className={className} />;

  const StaticIcon = STATIC_SOURCE_ICONS[source];
  if (StaticIcon) return <StaticIcon size={16} className={className} />;

  const agentKey = AGENT_SOURCE_MAP[source];
  if (agentKey) return <LobeAgentIcon agent={agentKey} type="color" size={16} className={className} />;

  return <ProviderIcon provider={source} type="color" size={16} className={className} />;
}
