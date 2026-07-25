import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "../../lib/cn";

export function ScrollArea({ className, children, ...props }: ScrollAreaPrimitive.ScrollAreaProps): JSX.Element {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      
      <ScrollAreaPrimitive.Scrollbar 
        className="flex touch-none select-none transition-colors duration-150 ease-out p-0.5 bg-zinc-950/20 hover:bg-zinc-900/40 w-2.5 hover:w-3 flex-col absolute right-0 top-0 bottom-0 z-50" 
        orientation="vertical"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-zinc-700/60 hover:bg-zinc-600 transition-colors" />
      </ScrollAreaPrimitive.Scrollbar>
      
      <ScrollAreaPrimitive.Scrollbar 
        className="flex touch-none select-none transition-colors duration-150 ease-out p-0.5 bg-zinc-950/20 hover:bg-zinc-900/40 h-2.5 hover:h-3 flex-row absolute left-0 right-0 bottom-0 z-50" 
        orientation="horizontal"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-zinc-700/60 hover:bg-zinc-600 transition-colors" />
      </ScrollAreaPrimitive.Scrollbar>
      
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}
