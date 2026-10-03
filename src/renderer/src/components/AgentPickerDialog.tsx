import { forwardRef, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AgentId, AgentStatus } from "../../../shared/types";
import { AgentIcon } from "./AgentIcon";
import { ModalShell } from "./ui/modal-shell";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/cn";
import { motion } from "../lib/motion";
import { Search, ArrowRight, type LucideIcon } from "lucide-react";

type AgentPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  agents: AgentStatus[];
  onSelect: (agentId: AgentId) => void | Promise<void>;
  contextBanner?: ReactNode;
  footerHint?: string;
};

export function AgentPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  agents,
  onSelect,
  contextBanner,
  footerHint = "↑ ↓ navigate · ↵ select"
}: AgentPickerDialogProps): JSX.Element {
  const installed = agents.filter((a) => a.installed);
  const notDetected = agents.filter((a) => !a.installed);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredInstalled = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return installed;
    return installed.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false) ||
        a.id.toLowerCase().includes(q)
    );
  }, [installed, query]);

  const filteredNotDetected = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notDetected;
    return notDetected.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        (a.description?.toLowerCase().includes(q) ?? false) ||
        a.id.toLowerCase().includes(q)
    );
  }, [notDetected, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, Math.max(filteredInstalled.length - 1, 0))));
  }, [filteredInstalled.length]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  const pick = (agentId: AgentId): void => {
    void onSelect(agentId);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "/" && document.activeElement !== searchRef.current) {
      event.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (filteredInstalled.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredInstalled.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredInstalled.length) % filteredInstalled.length);
    } else if (event.key === "Enter") {
      const agent = filteredInstalled[selectedIndex];
      if (agent) {
        event.preventDefault();
        pick(agent.id);
      }
    }
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={icon}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-[11px] text-zinc-600 sm:block">{footerHint}</p>
          <Button variant="ghost" size="sm" className="ml-auto text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      }
    >
      {contextBanner ? <div className="shrink-0 border-b border-zinc-900/60 px-4 py-3 sm:px-6">{contextBanner}</div> : null}
      <div className="shrink-0 border-b border-zinc-900/60 px-4 py-3 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents…"
            className="h-9 border-zinc-800/80 bg-zinc-900/40 pl-9 text-xs text-zinc-100 placeholder:text-zinc-600 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/20 sm:h-10 sm:text-sm"
          />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-4 sm:p-6" onKeyDown={handleKeyDown} role="listbox" aria-label="Installed agents">
          {installed.length === 0 ? (
            <EmptyAgents message="No installed agents detected" detail="Add agent CLIs to your PATH, then restart Baton." />
          ) : filteredInstalled.length === 0 ? (
            <EmptyAgents message={`No agents match "${query}"`} detail="Try another name or clear the search." action={() => setQuery("")} actionLabel="Clear search" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredInstalled.map((agent, index) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={index === selectedIndex}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  onClick={() => pick(agent.id)}
                  onHover={() => setSelectedIndex(index)}
                />
              ))}
            </div>
          )}
          {filteredNotDetected.length > 0 ? (
            <div className="border-t border-zinc-900/80 pt-5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Not on PATH</p>
              <div className="flex flex-wrap gap-2">
                {filteredNotDetected.map((agent) => (
                  <span key={agent.id} className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/30 px-3 py-1 text-[11px] text-zinc-400">
                    <AgentIcon agentId={agent.id} className="h-4.5 w-4.5 opacity-80" />
                    {agent.displayName}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </ModalShell>
  );
}

function EmptyAgents({ message, detail, action, actionLabel }: { message: string; detail: string; action?: () => void; actionLabel?: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/20 px-4 py-14 text-center">
      <Search className="h-8 w-8 text-zinc-600" />
      <p className="mt-4 text-sm font-medium text-zinc-300">{message}</p>
      <p className="mt-1 max-w-xs text-xs text-zinc-500">{detail}</p>
      {action && actionLabel ? (
        <Button variant="ghost" size="sm" className="mt-3 text-orange-400 hover:text-orange-300" onClick={action}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

const AgentCard = forwardRef<HTMLButtonElement, {
  agent: AgentStatus;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}>(function AgentCard({ agent, selected, onClick, onHover }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(
      "group flex items-start gap-3.5 rounded-xl border p-3.5 text-left outline-none",
      motion.surface,
      motion.press,
      "border-border/60 bg-card/40 hover:border-border hover:bg-accent/30",
      selected && "border-orange-500/40 bg-orange-500/[0.07] ring-1 ring-orange-500/20"
      )}
      onClick={onClick}
      onMouseEnter={onHover}
    >
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-800/70 bg-zinc-950", selected && "border-orange-500/40 bg-orange-500/10")}>
        <AgentIcon agentId={agent.id} className="h-8 w-8" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-zinc-200">{agent.displayName}</span>
          <ArrowRight className={cn("h-3.5 w-3.5 shrink-0 text-zinc-600", selected && "text-orange-400")} />
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{agent.description}</p>
      </div>
    </button>
  );
});
