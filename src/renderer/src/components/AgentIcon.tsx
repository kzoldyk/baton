import "agent-robot-avatar";
import { useEffect, useRef } from "react";
import { Bot, Server } from "lucide-react";
import type { AgentId } from "../../../shared/types";
import { extractAvatarSize, getAgentAvatarConfig } from "../lib/agentAvatar";
import { cn } from "../lib/cn";

export interface AgentAvatarProps {
  agentId: AgentId | string;
  className?: string;
  size?: number;
  interactive?: boolean;
  running?: boolean;
  status?: string;
}

export function AgentAvatar({
  agentId,
  className,
  size,
  interactive = false,
  running,
  status,
}: AgentAvatarProps): JSX.Element {
  const avatarRef = useRef<HTMLElement | null>(null);
  const { color, shape } = getAgentAvatarConfig(agentId);
  const computedSize = extractAvatarSize(className, size);

  useEffect(() => {
    const el = avatarRef.current as any;
    if (!el) return;

    const applyConfig = () => {
      if (typeof el.setHeadRoundness === "function") {
        el.setHeadRoundness(shape);
      }
      if (typeof el.setPointerFollow === "function") {
        el.setPointerFollow(true);
      }
      if (typeof el.setAntennaFlash === "function") {
        el.setAntennaFlash(Boolean(running || status === "running"));
      }
    };

    applyConfig();
    if (typeof window !== "undefined" && window.customElements?.whenDefined) {
      void window.customElements.whenDefined("agent-robot-avatar").then(applyConfig);
    }
    const rafId = requestAnimationFrame(applyConfig);
    return () => cancelAnimationFrame(rafId);
  }, [shape, running, status]);

  const handleMouseEnter = () => {
    const el = avatarRef.current as any;
    if (el) {
      if (typeof el.noteActivity === "function") el.noteActivity(true);
      if (typeof el.play === "function") void el.play("wake");
    }
  };

  return (
    <agent-robot-avatar
      ref={avatarRef}
      color={color}
      size={computedSize}
      onMouseEnter={handleMouseEnter}
      className={cn(
        "inline-block shrink-0 align-middle select-none transition-transform duration-200 hover:scale-110",
        !interactive && "pointer-events-none",
        className
      )}
      style={{
        width: computedSize,
        height: computedSize,
        lineHeight: 0,
        ["--face-size" as any]: `${computedSize}px`,
      }}
    />
  );
}

export function AgentIcon({
  agentId,
  className,
  size,
  interactive,
  running,
  status,
}: {
  agentId: AgentId;
  className?: string;
  size?: number;
  interactive?: boolean;
  running?: boolean;
  status?: string;
}): JSX.Element {
  return (
    <AgentAvatar
      agentId={agentId}
      className={className}
      size={size}
      interactive={interactive}
      running={running}
      status={status}
    />
  );
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
  if (agentKey) return <AgentAvatar agentId={agentKey} className={className} size={16} />;

  return <AgentAvatar agentId={source} className={className} size={16} />;
}
