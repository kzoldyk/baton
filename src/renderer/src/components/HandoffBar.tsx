import { ArrowRightLeft, Copy, Eye, PanelRight, RefreshCw, Send } from "lucide-react";
import type { Handoff } from "../../../shared/types";
import { agentLabel } from "../../../shared/types";
import { Button } from "./ui/button";
import { IconButton } from "./ui/icon-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type HandoffBarProps = {
  latestHandoff?: Handoff;
  error?: string;
  activeSessionId?: string;
  updating: boolean;
  rightSidebarOpen: boolean;
  onOpenContext: () => void;
  onPass: () => void;
  onPreview: () => void;
  onCopy: () => void;
  onUpdate: () => void;
  onUse: () => void;
};

export function HandoffBar({
  latestHandoff,
  error,
  activeSessionId,
  updating,
  rightSidebarOpen,
  onOpenContext,
  onPass,
  onPreview,
  onCopy,
  onUpdate,
  onUse
}: HandoffBarProps): JSX.Element {
  const status = error
    ? error
    : latestHandoff
    ? `${agentLabel(latestHandoff.fromAgent)} → ${agentLabel(latestHandoff.toAgent ?? "next")} · ${latestHandoff.quality?.warnings[0] ?? "pass ready"}`
    : "No pass yet — save one to switch agents without rereading the repo.";

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-background/95 px-3 backdrop-blur-sm sm:px-4">
      <div className="min-w-0 truncate text-xs text-zinc-500">
        {error ? <span className="text-red-300">{status}</span> : status}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {!rightSidebarOpen ? (
          <IconButton icon={PanelRight} label="Open feature context" hideLabel onClick={onOpenContext} />
        ) : null}

        {latestHandoff ? (
          <>
            <IconButton icon={Copy} label="Copy pass to clipboard" hideLabel onClick={onCopy} />
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
            <IconButton icon={Eye} label="Preview pass history" hideLabel onClick={onPreview} />
            <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={onPass}>
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              Pass to agent
            </Button>
            <IconButton icon={ArrowRightLeft} label="Pass to another agent" hideLabel className="sm:hidden" onClick={onPass} />
            <Button size="sm" className="hidden bg-orange-600 text-white hover:bg-orange-500 sm:inline-flex" disabled={!activeSessionId} onClick={onUse}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Use pass
            </Button>
            <IconButton icon={Send} label="Inject continue prompt into active session" hideLabel className="sm:hidden" disabled={!activeSessionId} onClick={onUse} />
          </>
        ) : (
          <Button size="sm" className="bg-orange-600 text-white hover:bg-orange-500" onClick={onPass}>
            <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pass to agent</span>
            <span className="sm:hidden">Pass</span>
          </Button>
        )}
      </div>
    </div>
  );
}
