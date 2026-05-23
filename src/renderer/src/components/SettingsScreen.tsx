import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAppStore } from "../store/useAppStore";

export function SettingsScreen(): JSX.Element {
  const { agents, detectAgents } = useAppStore();
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
        <TabsContent value="agents" className="mt-5 max-w-2xl space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm">
              <span className="text-zinc-200">{agent.displayName} path</span>
              <span className="text-zinc-500">{agent.path ?? "not detected"}</span>
            </div>
          ))}
          <Button onClick={() => void detectAgents()}>Rescan Agents</Button>
        </TabsContent>
        <TabsContent value="mcp" className="mt-5 max-w-2xl space-y-3">
          {["lazyweb", "github", "filesystem"].map((name) => (
            <div key={name} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm">
              <span>{name}</span>
              <span className="text-zinc-500">{name === "github" ? "enabled, token missing" : "enabled"}</span>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="storage" className="mt-5 max-w-2xl space-y-4 text-sm">
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <div className="text-zinc-500">App data</div>
            <div className="mt-1 text-zinc-200">{settings.userDataPath}</div>
          </div>
          <label className="flex items-center justify-between"><span>Add .baton/ to .gitignore by default</span><Switch defaultChecked /></label>
          <label className="flex items-center justify-between"><span>Redact .env values from handoffs</span><Switch defaultChecked /></label>
        </TabsContent>
        <TabsContent value="appearance" className="mt-5 text-sm text-zinc-400">Theme: Dark only</TabsContent>
        <TabsContent value="shortcuts" className="mt-5 max-w-lg space-y-2 text-sm">
          {["Cmd/Ctrl + K Command Palette", "Cmd/Ctrl + B Toggle Sidebar", "Cmd/Ctrl + , Settings", "Cmd/Ctrl + Shift + H Create Baton Pass", "Cmd/Ctrl + Shift + P Use Baton Pass"].map((shortcut) => (
            <div key={shortcut} className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-zinc-300">{shortcut}</div>
          ))}
        </TabsContent>
      </Tabs>
    </main>
  );
}
