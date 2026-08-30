import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/cn";
import { motion } from "../../lib/motion";

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ ...props }: TooltipPrimitive.TooltipProps): JSX.Element {
  return <TooltipPrimitive.Root delayDuration={300} {...props} />;
}

export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: TooltipPrimitive.TooltipContentProps): JSX.Element {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-[100] max-w-xs rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md",
          motion.tooltip,
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
