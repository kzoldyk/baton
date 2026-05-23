import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps): JSX.Element {
  return (
    <CheckboxPrimitive.Root
      className={cn("flex h-4 w-4 items-center justify-center rounded border border-zinc-700 bg-zinc-950 data-[state=checked]:bg-zinc-100 data-[state=checked]:text-zinc-950", className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="h-3 w-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
