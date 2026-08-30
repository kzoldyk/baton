import type { LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { cn } from "../../lib/cn";
import { motion } from "../../lib/motion";

type ModalShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  iconClassName,
  footer,
  headerExtra,
  className,
  children
}: ModalShellProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(720px,90vh)] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-xl border-border bg-background p-0 shadow-2xl sm:w-[min(720px,calc(100vw-2rem))]",
          className
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-border p-4 pr-12 sm:p-6 sm:pr-14">
          <div className="flex items-start justify-between gap-4">
            <div className={cn("min-w-0 flex-1", motion.fadeIn)}>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
                {Icon ? <Icon className={cn("h-4 w-4 text-orange-400", iconClassName)} /> : null}
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="mt-1.5 text-xs leading-relaxed sm:text-sm">{description}</DialogDescription>
              ) : null}
            </div>
            {headerExtra}
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        {footer ? <div className={cn("shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6", motion.fadeIn)}>{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
