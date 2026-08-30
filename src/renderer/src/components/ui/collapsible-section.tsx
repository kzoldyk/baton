import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { motion } from "../../lib/motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type CollapsibleSectionProps = {
  title: string;
  tooltip?: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleSection({ title, tooltip, badge, children, defaultOpen = true }: CollapsibleSectionProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const heading = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-2 rounded-md py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        "hover:bg-accent/40 hover:text-foreground",
        motion.surface
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        {open ? (
          <ChevronDown className={cn("h-3 w-3 shrink-0", motion.chevron)} />
        ) : (
          <ChevronRight className={cn("h-3 w-3 shrink-0", motion.chevron)} />
        )}
        <span className="truncate">{title}</span>
      </span>
      <span className="shrink-0">{badge}</span>
    </button>
  );

  return (
    <div className="min-w-0">
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{heading}</TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        heading
      )}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-w-0 overflow-hidden">
          <div className="min-w-0 pb-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
