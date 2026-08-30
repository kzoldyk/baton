import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentId } from "../../../shared/types";
import { AgentIcon } from "./AgentIcon";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { useAppStore } from "../store/useAppStore";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/cn";
import { Search, ArrowRight, Zap } from "lucide-react";

export function AgentSelectorDialog(): JSX.Element {
  const { usePassOpen, agents, runAgent, setState } = useAppStore();
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

  // Reset state when dialog opens and focus search.
  useEffect(() => {
    if (usePassOpen) {
      setQuery("");
      setSelectedIndex(0);
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [usePassOpen]);

  // Keep selected index in bounds when filtered list changes.
  useEffect(() => {
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, Math.max(filteredInstalled.length - 1, 0))));
  }, [filteredInstalled.length]);

  // Scroll selected item into view.
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const continueWith = async (agentId: AgentId): Promise<void> => {
    await runAgent(agentId, true);
    setState({ usePassOpen: false });
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
        void continueWith(agent.id);
      }
    }
  };

  return (
    <Dialog open={usePassOpen} onOpenChange={(open) => setState({ usePassOpen: open })}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[min(720px,calc(100vw-2rem))] max-h-[min(720px,90vh)] flex flex-col gap-0 overflow-hidden rounded-2xl border-zinc-800/80 bg-zinc-950 p-0 shadow-2xl shadow-black/40">
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-900/80 bg-zinc-950 p-4 pr-12 sm:p-6 sm:pr-14">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
                <Zap className="h-4 w-4 text-orange-400" />
                Use Baton Pass
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                Select an installed coding agent to continue your current work.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 border-b border-zinc-900/60 bg-zinc-950 px-4 py-3 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents..."
              className="h-9 border-zinc-800/80 bg-zinc-900/40 pl-9 pr-16 text-xs text-zinc-100 placeholder:text-zinc-600 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/20 sm:h-10 sm:text-sm"
            />
            <div className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
              <kbd className="rounded border border-zinc-800 bg-zinc-900/60 px-1 py-0.5 text-[10px] font-medium text-zinc-500">/</kbd>
              <span className="text-[10px] font-medium text-zinc-600">to search</span>
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 p-4 sm:p-6" onKeyDown={handleKeyDown} role="listbox" aria-label="Installed agents">
            {installed.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/20 px-4 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/50">
                  <Search className="h-5 w-5 text-zinc-500" />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-300">No installed agents detected</p>
                <p className="mt-1 max-w-xs text-xs text-zinc-500">
                  We couldn't find any agents on your PATH. Add them to your system PATH and try again.
                </p>
              </div>
            ) : filteredInstalled.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/20 px-4 py-14 text-center">
                <p className="text-sm font-medium text-zinc-400">No agents match "{query}"</p>
                <p className="mt-1 text-xs text-zinc-500">Try a different search term.</p>
                <Button variant="link" size="sm" className="mt-2 text-orange-400 hover:text-orange-300" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredInstalled.map((agent, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={agent.id}
                      ref={(el) => (itemRefs.current[index] = el)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "group relative flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-200 ease-out outline-none",
                        "border-zinc-800/60 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-800/30",
                        "focus-visible:border-orange-500/50 focus-visible:ring-2 focus-visible:ring-orange-500/20",
                        isSelected && "border-orange-500/40 bg-orange-500/[0.07] ring-1 ring-orange-500/20"
                      )}
                      onClick={() => void continueWith(agent.id)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200",
                          "border-zinc-800/70 bg-zinc-950",
                          "group-hover:border-orange-500/30 group-hover:bg-orange-500/5",
                          isSelected && "border-orange-500/40 bg-orange-500/10"
                        )}
                      >
                        <AgentIcon agentId={agent.id} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-zinc-200 group-hover:text-zinc-100">
                            {agent.displayName}
                          </span>
                          <ArrowRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-zinc-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-zinc-400",
                              isSelected && "translate-x-0.5 text-orange-400"
                            )}
                          />
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500 group-hover:text-zinc-400">
                          {agent.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredNotDetected.length > 0 && (
              <div className="border-t border-zinc-900/80 pt-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 sm:text-xs">
                  Available but not detected
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredNotDetected.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-1.5 rounded-full border border-zinc-800/80 bg-zinc-900/30 px-2.5 py-1 text-[11px] font-medium text-zinc-500"
                    >
                      <AgentIcon agentId={agent.id} className="h-3.5 w-3.5 opacity-70" />
                      {agent.displayName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-between border-t border-zinc-900/80 bg-zinc-950 px-4 py-3 sm:px-6">
          <p className="hidden text-[11px] text-zinc-600 sm:block">
            <kbd className="rounded border border-zinc-800 bg-zinc-900/60 px-1 py-0.5 font-mono text-[10px]">↑</kbd>{" "}
            <kbd className="rounded border border-zinc-800 bg-zinc-900/60 px-1 py-0.5 font-mono text-[10px]">↓</kbd>{" "}
            to navigate ·{" "}
            <kbd className="rounded border border-zinc-800 bg-zinc-900/60 px-1 py-0.5 font-mono text-[10px]">↵</kbd>{" "}
            to launch
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            onClick={() => setState({ usePassOpen: false })}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
