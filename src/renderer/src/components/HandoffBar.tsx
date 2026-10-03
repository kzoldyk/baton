import { ArrowRightLeft, Check, Copy, Eye, PanelRight, RefreshCw, Send, Sparkles, Zap } from "lucide-react";
import type { GitStatus, Handoff } from "../../../shared/types";
import { agentLabel } from "../../../shared/types";
import { Button } from "./ui/button";
import { IconButton } from "./ui/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { GuiAgentDropdown } from "./GuiAgentDropdown";
import { calculateTokenSavings } from "../lib/tokenSavings";
import { cn } from "../lib/cn";

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
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-background/95 px-3 backdrop-blur-sm sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="min-w-0 truncate text-xs text-zinc-500">
          {error ? <span className="text-red-300">{status}</span> : status}
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
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {!rightSidebarOpen ? (
          <IconButton icon={PanelRight} label="Open feature context" hideLabel onClick={onOpenContext} />
        ) : null}

        {latestHandoff ? (
          <>
            <IconButton icon={Copy} label="Copy pass to clipboard" hideLabel onClick={onCopy} />
            <GuiAgentDropdown
              passContent={latestHandoff.content}
              projectId={projectId}
              taskTitle={taskTitle}
              variant="outline"
              size="sm"
              label="Copy for GUI"
              className="hidden sm:inline-flex"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <IconButton
                    icon={RefreshCw}
                    label="Ask current agent to refresh the pass"
                    hideLabel
                    disabled={!activeSessionId || updating}
                    className={updating ? "[&_svg]:animate-spin" : ""}
                    onClick={onUpdate}
                  />
                </span>
              </TooltipTrigger>
              {!activeSessionId ? <TooltipContent>Start an agent session first</TooltipContent> : null}
            </Tooltip>
            {onQuickPass ? (
              <Button
                size="sm"
                variant={quickPassToast ? "default" : "secondary"}
                className={cn(
                  "hidden sm:inline-flex transition-colors",
                  quickPassToast && "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600"
                )}
                disabled={updating}
                onClick={onQuickPass}
                title="Instant 1-click handoff: writes .baton/latest-handoff.md and copies continue prompt with zero modals"
              >
                {quickPassToast ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-white" />
                    {quickPassToast}
                  </>
                ) : (
                  <>
                    <Zap className="mr-1.5 h-3.5 w-3.5 text-orange-400" />
                    Quick Pass
                  </>
                )}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={onPass} title="Create a handoff pass for another agent">
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              Create handoff
            </Button>
            <IconButton icon={ArrowRightLeft} label="Create handoff" hideLabel className="sm:hidden" onClick={onPass} />
            <Button size="sm" className="hidden bg-orange-600 text-white hover:bg-orange-500 sm:inline-flex" disabled={!activeSessionId} onClick={onUse}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Use pass
            </Button>
            <IconButton icon={Send} label="Inject continue prompt into active session" hideLabel className="sm:hidden" disabled={!activeSessionId} onClick={onUse} />
          </>
        ) : (
          <div className="flex items-center gap-2">
            {onQuickPass ? (
              <Button size="sm" className="bg-orange-600 text-white hover:bg-orange-500" onClick={onQuickPass}>
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Quick Pass</span>
                <span className="sm:hidden">Pass</span>
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={onPass}>
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              <span>Create handoff</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
