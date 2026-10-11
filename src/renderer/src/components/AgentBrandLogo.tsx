import type { AgentId } from "../../../shared/types";
import { cn } from "../lib/cn";
import { Terminal, Bot } from "lucide-react";

export function AntigravityLogo({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      title="Antigravity"
    >
      <defs>
        <linearGradient id="antigravity-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="30%" stopColor="#34A853" />
          <stop offset="65%" stopColor="#FBBC05" />
          <stop offset="100%" stopColor="#EA4335" />
        </linearGradient>
      </defs>
      <path
        d="M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1 5.17 1 6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714 4.857 0 4.522 6.197 9.714 9.715z"
        fill="url(#antigravity-grad)"
      />
    </svg>
  );
}

export function ClaudeLogo({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0 text-amber-500", className)}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      title="Claude"
    >
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  );
}

export function GeminiLogo({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      title="Gemini"
    >
      <defs>
        <linearGradient id="gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A73E8" />
          <stop offset="100%" stopColor="#8AB4F8" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
        fill="url(#gemini-grad)"
      />
    </svg>
  );
}

export function OpenCodeLogo({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0 text-emerald-400", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      title="OpenCode"
    >
      <polyline points="8 7 3 12 8 17" />
      <polyline points="16 7 21 12 16 17" />
      <line x1="12" y1="19" x2="12" y2="5" />
    </svg>
  );
}

export function CursorLogo({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0 text-indigo-400", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      title="Cursor"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function KiroLogo({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0 text-purple-400", className)}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      title="Kiro"
    >
      <path d="M4.594 6.677C6.67-2.226 18.746-2.211 21.16 6.632c.353 1.297 1.725 7.582-1.673 13.747-1.545 2.797-5.841 5.49-6.99 1.883C8.6 25.477 3.315 24.1 5.789 18.609l-.318.143c-3.57 1.305-3.863-1.208-3.173-2.513.45-.84.727-1.335.937-1.897.353-.975.458-1.568.593-2.498.27-1.837.277-3.607.765-5.167zm8.37.01a.92.92 0 00-.81.428c-.217.323-.33.825-.33 1.462 0 .705.15 1.89 1.14 1.89h.008c.757 0 1.214-.705 1.214-1.89 0-.622-.127-1.125-.367-1.455a1.014 1.014 0 00-.855-.435zm4.08 0a.92.92 0 00-.81.428c-.217.323-.33.825-.33 1.462 0 .705.15 1.89 1.14 1.89h.008c.757 0 1.215-.705 1.215-1.89 0-.622-.128-1.125-.368-1.455a1.014 1.014 0 00-.855-.435z" />
    </svg>
  );
}

export function AgentBrandLogo({
  agentId,
  className
}: {
  agentId?: AgentId | string;
  className?: string;
}): JSX.Element {
  const normalized = (agentId || "").toLowerCase();

  if (normalized.includes("antigravity") || normalized === "agy") {
    return <AntigravityLogo className={className} />;
  }
  if (normalized.includes("kiro")) {
    return <KiroLogo className={className} />;
  }
  if (normalized.includes("claude")) {
    return <ClaudeLogo className={className} />;
  }
  if (normalized.includes("gemini")) {
    return <GeminiLogo className={className} />;
  }
  if (normalized.includes("opencode")) {
    return <OpenCodeLogo className={className} />;
  }
  if (normalized.includes("cursor")) {
    return <CursorLogo className={className} />;
  }
  if (normalized.includes("terminal")) {
    return <Terminal className={cn("text-zinc-400", className)} />;
  }

  return <Bot className={cn("text-zinc-400", className)} />;
}
