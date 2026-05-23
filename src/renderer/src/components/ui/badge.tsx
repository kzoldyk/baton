import * as React from "react";
import { cn } from "../../lib/cn";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("inline-flex items-center rounded-md border border-zinc-800 px-2 py-0.5 text-xs text-zinc-300", className)} {...props} />;
}
