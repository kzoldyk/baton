import { ArrowRightLeft, Check, Copy, Eye, PanelRight, RefreshCw, Send, Sparkles, Zap } from "lucide-react";
import type { GitStatus, Handoff } from "../../../shared/types";
import { agentLabel } from "../../../shared/types";
import { Button } from "./ui/button";
import { IconButton } from "./ui/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { GuiAgentDropdown } from "./GuiAgentDropdown";
import { calculateTokenSavings } from "../lib/tokenSavings";
import { cn } from "../lib/cn";
import { hapticTap, hapticSelect, hapticSuccess } from "../lib/macHaptics";

type HandoffBarProps = {
  latestHandoff?: Handoff;
  error?: string;
  activeSessionId?: string;
  updating: boolean;
  rightSidebarOpen: boolean;
  quickPassToast?: string;
  onOpenContext: () => void;
  onQuickPass?: () => void;
  onPass: () => void;
  onPreview: () => void;
  onCopy: () => void;
  onUpdate: () => void;
  onUse: () => void;
  projectId?: string;
  gitStatus?: GitStatus;
  taskTitle?: string;
};

export function HandoffBar({
  latestHandoff,
  error,
  activeSessionId,
  updating,
  rightSidebarOpen,
  quickPassToast,
  onOpenContext,
  onQuickPass,
  onPass,
  onPreview,
  onCopy,
  onUpdate,
  onUse,
  projectId,
  gitStatus,
  taskTitle
}: HandoffBarProps): JSX.Element {
  const status = error
    ? error
    : latestHandoff
    ? `${agentLabel(latestHandoff.fromAgent)} → ${agentLabel(latestHandoff.toAgent ?? "next")} · ${latestHandoff.quality?.warnings[0] ?? "pass ready"}`
    : "No pass yet — save one to switch agents without rereading the repo.";

  const tokenSavings = latestHandoff
    ? calculateTokenSavings(latestHandoff.content, gitStatus)
    : null;

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-white/5 mac-glass-header px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex min-w-0 items-center gap-2 truncate text-xs text-zinc-400">
          <span className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            error ? "bg-red-400" : latestHandoff ? "bg-emerald-400 ring-2 ring-emerald-500/20" : "bg-zinc-600"
          )} />
          <span className="truncate">
            {error ? <span className="text-red-300">{status}</span> : status}
          </span>
        </div>
        {tokenSavings ? (
          <div
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 md:inline-flex"
            title={`Pass: ~${tokenSavings.passTokens} tokens · Avoided repo reread: ~${Math.round(tokenSavings.repoTokens / 1000)}k tokens`}
          >
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span>{tokenSavings.formattedBadge}</span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {latestHandoff ? (
          <>
            <IconButton
              icon={Copy}
              label="Copy pass to clipboard"
              hideLabel
              onClick={() => {
                hapticSuccess();
                onCopy();
              }}
            />
            <GuiAgentDropdown
              passContent={latestHandoff.content}
              projectId={projectId}
              taskTitle={taskTitle}
              variant="outline"
              size="sm"
              label="Copy for GUI"
              className="hidden sm:inline-flex mac-btn-secondary border border-white/10"
            />
          </>
        ) : null}

        <button
          type="button"
          disabled={updating}
          onClick={() => {
            hapticTap();
            onPass();
          }}
          className={cn(
            "flex h-8 items-center rounded-md px-3 text-xs font-medium select-none transition-all",
            quickPassToast
              ? "bg-emerald-600 text-white shadow-sm"
              : "mac-btn-secondary text-zinc-200"
          )}
          title="Directly prompts the running agent to summarize work into .baton/latest-handoff.md"
        >
          {updating ? (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
              <span>Prompting agent...</span>
            </>
          ) : quickPassToast ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5 text-white" strokeWidth={1.5} />
              <span>{quickPassToast}</span>
            </>
          ) : (
            <>
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
              <span>Capture handoff</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={!activeSessionId}
          onClick={() => {
            hapticSelect();
            onUse();
          }}
          className={cn(
            "flex h-8 items-center rounded-md px-3 text-xs font-medium select-none mac-btn-primary transition-all",
            !activeSessionId && "opacity-40 cursor-not-allowed filter-none"
          )}
          title="Inject continue prompt into the active terminal agent"
        >
          <Send className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
          <span>Use pass</span>
        </button>
      </div>
    </div>
  );
}
