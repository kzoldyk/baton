import { useState, useMemo } from "react";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { SourceIcon } from "./AgentIcon";
import { useAppStore } from "../store/useAppStore";
import { Cable, ChevronDown, ChevronRight, Search, Server, Wrench } from "lucide-react";
import type { McpServer } from "../../../shared/types";

function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "border-emerald-700 bg-emerald-950/40 text-emerald-300";
    case "failed":
      return "border-red-700 bg-red-950/40 text-red-300";
    default:
      return "border-zinc-700 bg-zinc-800/40 text-zinc-400";
  }
}

export function McpScreen(): JSX.Element {
  const servers = useAppStore((state) => state.mcpServers);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return servers;
    const q = search.toLowerCase();
    return servers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.source ?? "").toLowerCase().includes(q) ||
        s.detail.toLowerCase().includes(q)
    );
  }, [servers, search]);

  const groups = useMemo(() => {
    const map = new Map<string, McpServer[]>();
    for (const s of filtered) {
      const key = s.source ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <main className="flex flex-1 flex-col bg-zinc-950">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-zinc-400" />
          <h1 className="text-lg font-semibold text-zinc-100">MCP Servers</h1>
          <Badge className="border-zinc-700 bg-zinc-800 px-1.5 text-[11px] text-zinc-400">{servers.length}</Badge>
        </div>
      </div>

      <div className="shrink-0 border-b border-zinc-800 px-6 py-3">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter servers..."
            className="h-8 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-6">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
              <Server className="mb-3 h-10 w-10" />
              <p className="text-sm">{search ? "No MCP servers match your filter." : "No MCP servers detected."}</p>
              <p className="mt-1 text-xs">MCP servers are read from agent config files (Claude, Codex, Kiro, etc.).</p>
            </div>
          ) : (
            groups.map(([source, items]) => {
              const isCollapsed = collapsed.has(source);
              return (
                <div key={source}>
                  <button
                    onClick={() => toggle(source)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />}
                    <SourceIcon source={source} className="h-4 w-4 shrink-0" />
                    <span>{source}</span>
                    <Badge className="border-zinc-700 bg-zinc-800 px-1 text-[10px] text-zinc-500">{items.length}</Badge>
                  </button>

                  {!isCollapsed && (
                    <div className="mt-2 space-y-2 pl-4">
                      {items.map((server) => (
                        <div
                          key={server.name}
                          className="group rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Cable className="h-4 w-4 shrink-0 text-zinc-500" />
                              <span className="truncate text-sm font-medium text-zinc-100">{server.name}</span>
                            </div>
                            <Badge className={`shrink-0 border px-1.5 text-[11px] ${statusColor(server.status)}`}>{server.status}</Badge>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
                            <Wrench className="h-3 w-3" />
                            <span className="truncate">{server.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
