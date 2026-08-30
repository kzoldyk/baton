import type { LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { cn } from "../../lib/cn";

type IconButtonProps = ButtonProps & {
  icon: LucideIcon;
  label: string;
  hideLabel?: boolean;
};

export function IconButton({ icon: Icon, label, hideLabel = false, className, children, ...props }: IconButtonProps): JSX.Element {
  const button = (
    <Button
      size={hideLabel ? "icon" : "sm"}
      variant="ghost"
      className={cn(hideLabel ? "" : "gap-1.5", className)}
      aria-label={label}
      {...props}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!hideLabel ? <span className="hidden sm:inline">{children ?? label}</span> : null}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
