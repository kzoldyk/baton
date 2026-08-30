import { AlertTriangle, Info, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { motion } from "../../lib/motion";

type CalloutVariant = "info" | "warning" | "error";

const styles: Record<CalloutVariant, { box: string; icon: LucideIcon }> = {
  info: { box: "border-border bg-muted/40 text-foreground", icon: Info },
  warning: { box: "border-amber-900/80 bg-amber-950/30 text-amber-200", icon: AlertTriangle },
  error: { box: "border-destructive/50 bg-destructive/10 text-red-200", icon: AlertTriangle }
};

export function Callout({ variant = "info", title, children }: { variant?: CalloutVariant; title?: string; children: React.ReactNode }): JSX.Element {
  const Icon = styles[variant].icon;
  return (
    <div className={cn("flex gap-2 rounded-lg border px-3 py-2 text-xs", motion.fadeIn, styles[variant].box)}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" />
      <div className="min-w-0">
        {title ? <div className="font-medium">{title}</div> : null}
        <div className={cn(title ? "mt-0.5 text-muted-foreground" : "")}>{children}</div>
      </div>
    </div>
  );
}
