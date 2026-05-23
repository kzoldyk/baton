import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/cn";

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps): JSX.Element {
  return (
    <SwitchPrimitive.Root className={cn("h-5 w-9 rounded-full bg-zinc-800 data-[state=checked]:bg-emerald-500", className)} {...props}>
      <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}
