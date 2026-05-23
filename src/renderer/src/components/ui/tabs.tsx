import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/cn";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps): JSX.Element {
  return <TabsPrimitive.List className={cn("inline-flex h-9 items-center rounded-md bg-zinc-900 p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps): JSX.Element {
  return <TabsPrimitive.Trigger className={cn("inline-flex items-center justify-center rounded-sm px-3 py-1 text-sm text-zinc-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100", className)} {...props} />;
}
