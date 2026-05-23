import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "../../lib/cn";

export function Separator({ className, ...props }: SeparatorPrimitive.SeparatorProps): JSX.Element {
  return <SeparatorPrimitive.Root className={cn("shrink-0 bg-zinc-800 data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px", className)} {...props} />;
}
