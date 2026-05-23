import { Badge } from "./ui/badge";
import { useAppStore } from "../store/useAppStore";

export function McpScreen(): JSX.Element {
  const servers = useAppStore((state) => state.mcpServers);
  return (
    <main className="flex flex-1 flex-col bg-zinc-950 p-6">
      <h1 className="text-lg font-semibold text-zinc-100">MCP Servers</h1>
      <div className="mt-5 max-w-2xl space-y-3">
        {servers.map((server) => (
          <div key={server.name} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-zinc-100">{server.name}</div>
              <Badge className={server.status === "running" ? "border-emerald-900 text-emerald-300" : "border-amber-900 text-amber-300"}>{server.status}</Badge>
            </div>
            <div className="mt-2 text-sm text-zinc-500">{server.detail}</div>
            {server.name === "lazyweb" ? <div className="mt-3 text-sm text-zinc-400">Used by: Codex, Claude Code</div> : null}
          </div>
        ))}
      </div>
    </main>
  );
}
