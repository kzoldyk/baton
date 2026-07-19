import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAppStore } from "../store/useAppStore";
import { SourceIcon } from "./AgentIcon";
import { ScrollArea } from "./ui/scroll-area";

export function SettingsScreen(): JSX.Element {
  const { agents, detectAgents, mcpServers, theme, setTheme } = useAppStore();
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    void window.baton.settings.all().then(setSettings);
  }, []);

  return (
    <main className="flex flex-1 flex-col bg-zinc-950 p-6">
      <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
      <Tabs defaultValue="agents" className="mt-5">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
        </TabsList>
        <TabsContent value="agents" className="mt-5 max-w-2xl space-y-4">
          <ScrollArea className="max-h-[50vh] pr-2">
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm">
                  <span className="text-zinc-200">{agent.displayName} path</span>
                  <span className="text-zinc-500">{agent.path ?? "not detected"}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button onClick={() => void detectAgents()}>Rescan Agents</Button>
        </TabsContent>
        <TabsContent value="mcp" className="mt-5 max-w-2xl">
          {mcpServers.length === 0 ? (
            <p className="text-sm text-zinc-500">No MCP servers detected.</p>
          ) : (
            <div className="space-y-2">
              {mcpServers.map((server) => (
                <div key={server.name} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SourceIcon source={server.source} className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="truncate text-zinc-200">{server.name}</span>
                    {server.source ? <span className="shrink-0 text-xs text-zinc-600">({server.source})</span> : null}
                  </div>
                  <Badge className={`shrink-0 border px-1.5 text-[11px] ${
                    server.status === "running"
                      ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-400"
                      : server.status === "failed"
                      ? "border-red-700/50 bg-red-950/30 text-red-400"
                      : "border-zinc-700/50 bg-zinc-800/30 text-zinc-500"
                  }`}>{server.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="storage" className="mt-5 max-w-2xl space-y-4 text-sm">
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <div className="text-zinc-500">App data</div>
            <div className="mt-1 text-zinc-200">{settings.userDataPath}</div>
          </div>
          <label className="flex items-center justify-between"><span>Add .baton/ to .gitignore by default</span><Switch defaultChecked /></label>
          <label className="flex items-center justify-between"><span>Redact .env values from handoffs</span><Switch defaultChecked /></label>
        </TabsContent>
        <TabsContent value="appearance" className="mt-5 max-w-2xl space-y-4 text-sm">
          <label className="flex items-center justify-between">
            <span className="text-zinc-200">Theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as "dark" | "light")}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
        </TabsContent>
        <TabsContent value="shortcuts" className="mt-5 max-w-lg space-y-2 text-sm">
          {["Cmd/Ctrl + K Command Palette", "Cmd/Ctrl + B Toggle Sidebar", "Cmd/Ctrl + , Settings", "Cmd/Ctrl + Shift + H Create Baton Pass", "Cmd/Ctrl + Shift + P Use Baton Pass"].map((shortcut) => (
            <div key={shortcut} className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-zinc-300">{shortcut}</div>
          ))}
        </TabsContent>
      </Tabs>
    </main>
  );
}
