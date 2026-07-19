import { AgentIcon as LobeAgentIcon, ProviderIcon, Kiro } from "@lobehub/icons";
import { Bot, Server } from "lucide-react";
import type { AgentId } from "../../../shared/types";
import { cn } from "../lib/cn";

// Aider: Git branch + Code terminal
function AiderIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v8" />
      <path d="m9 7 3-3 3 3" />
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="M9 15h6" />
    </svg>
  );
}

// Cline: Robot helmet
function ClineIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}

// Windsurf: Waves
function WindsurfIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 10h12a4 4 0 0 1 0 8H12" />
      <path d="M4 6h16a4 4 0 0 1 0 8H16" />
      <path d="M8 14H4" />
    </svg>
  );
}

// Roo Code: Kangaroo silhouette
function RooIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 20c8 0 11-8 18-8" />
      <path d="M16 8l5 4-5 4" />
      <circle cx="6" cy="10" r="3" />
    </svg>
  );
}

// Goose: Feather
function GooseIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
    </svg>
  );
}

// Amazon Q: Styled Q
function AmazonQIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
      <path d="M11 8a3 3 0 0 1 3 3" />
    </svg>
  );
}

// GitHub Copilot CLI: Octocat
function CopilotIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

// Devin: Hexagonal D
function DevinIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
      <path d="M8 8h4a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H8V8z" />
    </svg>
  );
}

// OpenHands: Hand inside shield
function OpenHandsIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8c0 4 3 7 7 7h1a7 7 0 0 0 7-7v-3" />
    </svg>
  );
}

// Manus: Hand index finger touch
function ManusIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const CUSTOM_ICONS: Record<string, React.ElementType> = {
  aider: AiderIcon,
  cline: ClineIcon,
  windsurf: WindsurfIcon,
  roo: RooIcon,
  "roo-code": RooIcon,
  goose: GooseIcon,
  "amazon-q": AmazonQIcon,
  q: AmazonQIcon,
  "github-copilot-cli": CopilotIcon,
  copilot: CopilotIcon,
  devin: DevinIcon,
  openhands: OpenHandsIcon,
  manus: ManusIcon,
};

import { BatonLogo } from "./BatonLogo";

const OVERRIDE_AGENTS: Partial<Record<AgentId, React.ElementType>> = {
  kiro: Kiro.Color,
  antigravity: BatonLogo,
  agy: BatonLogo,
};

export function AgentIcon({ agentId, className }: { agentId: AgentId; className?: string }): JSX.Element {
  const id = agentId.toLowerCase();
  const CustomIcon = CUSTOM_ICONS[id];
  if (CustomIcon) {
    let colorClass = "text-zinc-400";
    if (id === "aider") colorClass = "text-orange-500";
    else if (id === "amazon-q" || id === "q") colorClass = "text-violet-500";
    else if (id === "cline") colorClass = "text-sky-500";
    else if (id === "windsurf") colorClass = "text-cyan-500";
    else if (id === "roo" || id === "roo-code") colorClass = "text-lime-500";
    else if (id === "goose") colorClass = "text-amber-500";
    else if (id === "github-copilot-cli" || id === "copilot") colorClass = "text-indigo-500";
    else if (id === "devin") colorClass = "text-emerald-500";
    else if (id === "openhands") colorClass = "text-teal-500";
    else if (id === "manus") colorClass = "text-rose-500";

    return <CustomIcon className={cn(colorClass, className)} />;
  }

  const Override = OVERRIDE_AGENTS[id];
  if (Override) return <Override size={24} className={className} />;
  return <LobeAgentIcon agent={id} type="color" size={24} className={className} />;
}

const AGENT_SOURCE_MAP: Record<string, string> = {
  "Claude Code": "claude-code",
  "Codex": "codex",
  "OpenCode": "opencode",
  "Kiro": "kiro",
  "Kilo": "kilo",
  "Claude Code (project)": "claude-code",
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
