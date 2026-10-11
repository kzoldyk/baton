import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAppStore } from "../store/useAppStore";
import { SourceIcon } from "./AgentIcon";
import { ScrollArea } from "./ui/scroll-area";
import { Bot, Download, HardDrive, Keyboard, Palette, RefreshCw, Server, Sparkles, X } from "lucide-react";

export function SettingsScreen(): JSX.Element {
  const { agents, detectAgents, mcpServers, theme, setTheme, setState, updateInfo, checkingUpdates, checkForUpdates, setWhatsNewOpen } = useAppStore();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    void window.baton.settings.all().then(setSettings);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setState({ view: "workspace" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setState]);

  const handleRescan = async (): Promise<void> => {
    setRescanning(true);
    await detectAgents();
    setRescanning(false);
  };

  return (
    <main className="flex flex-1 flex-col mac-glass-workspace">
      <div className="titlebar-drag-region flex shrink-0 items-center justify-between border-b border-white/5 mac-glass-header px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
          <p className="text-xs text-zinc-500">Configure agents, themes, storage options, and keyboard shortcuts.</p>
        </div>
        <button
          onClick={() => setState({ view: "workspace" })}
          title="Close Settings (Esc)"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 max-w-4xl">
          <Tabs defaultValue="agents">
            <TabsList className="mb-6">
              <TabsTrigger value="agents" className="gap-1.5"><Bot className="h-3.5 w-3.5" /> Agents</TabsTrigger>
              <TabsTrigger value="mcp" className="gap-1.5"><Server className="h-3.5 w-3.5" /> MCP</TabsTrigger>
              <TabsTrigger value="appearance" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
              <TabsTrigger value="storage" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" /> Storage</TabsTrigger>
              <TabsTrigger value="shortcuts" className="gap-1.5"><Keyboard className="h-3.5 w-3.5" /> Shortcuts</TabsTrigger>
              <TabsTrigger value="updates" className="gap-1.5 relative">
                <Sparkles className="h-3.5 w-3.5" /> Updates
                {updateInfo?.updateAvailable && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agents" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-zinc-200">Installed Coding Agents</h2>
                  <p className="text-xs text-zinc-500">Baton automatically detects CLI agents on your PATH environment.</p>
                </div>
                <Button size="sm" variant="outline" disabled={rescanning} onClick={() => void handleRescan()}>
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${rescanning ? "animate-spin" : ""}`} />
                  {rescanning ? "Scanning..." : "Rescan PATH"}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-2">
                {agents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
                    No coding agents currently detected on PATH.
                  </div>
                ) : (
                  agents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-3.5 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <div>
                          <div className="font-medium text-zinc-200">{agent.displayName}</div>
                          <div className="font-mono text-xs text-zinc-500 truncate max-w-md">{agent.path ?? "Detected on PATH"}</div>
                        </div>
                      </div>
                      <Badge className="shrink-0 border px-2 py-0.5 text-xs border-emerald-700/50 bg-emerald-950/30 text-emerald-400">
                        Installed
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="mcp" className="space-y-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-200">Model Context Protocol (MCP) Servers</h2>
                <p className="text-xs text-zinc-500">MCP servers detected in your workspace or agent configuration files.</p>
              </div>

              {mcpServers.length === 0 ? (
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-8 text-center text-xs text-zinc-500">
                  No MCP servers currently running or configured.
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  {mcpServers.map((server) => (
                    <div key={server.name} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SourceIcon source={server.source} className="h-4 w-4 shrink-0 text-zinc-400" />
                        <span className="truncate text-zinc-200 font-medium">{server.name}</span>
                        {server.source ? <span className="shrink-0 text-xs text-zinc-500">({server.source})</span> : null}
                      </div>
                      <Badge className={`shrink-0 border px-2 py-0.5 text-xs ${
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

            <TabsContent value="storage" className="space-y-4 text-sm">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="text-xs font-medium text-zinc-400">Application Storage Path</div>
                <div className="mt-1 text-zinc-200 font-mono text-xs break-all">{settings.userDataPath || "~/.baton"}</div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Auto-gitignore `.baton/`</div>
                    <div className="text-xs text-zinc-500">Automatically add `.baton/` folder to `.gitignore` when initializing projects.</div>
                  </div>
                  <Switch defaultChecked />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Redact `.env` secrets</div>
                    <div className="text-xs text-zinc-500">Mask API keys and sensitive environment values before saving handoffs.</div>
                  </div>
                  <Switch defaultChecked />
                </label>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 text-sm">
              <div>
                <h2 className="text-sm font-medium text-zinc-200 mb-1">Color Theme Preset</h2>
                <p className="text-xs text-zinc-500 mb-4">Choose a color theme for the entire app UI and integrated terminal.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "catppuccin", name: "Catppuccin Mocha", category: "Cozy Dark Pastel", bg: "#1e1e2e", card: "#181825", accent: "#cba6f7", text: "#cdd6f4" },
                    { id: "catppuccin-latte", name: "Catppuccin Latte", category: "Soft Light Pastel", bg: "#eff1f5", card: "#e6e9ef", accent: "#8839ef", text: "#4c4f69" },
                    { id: "tokyo-night", name: "Tokyo Night", category: "Vibrant Neon Dark", bg: "#1a1b26", card: "#16161e", accent: "#7aa2f7", text: "#c0caf5" },
                    { id: "dracula", name: "Dracula", category: "Gothic High Contrast", bg: "#282a36", card: "#21222c", accent: "#bd93f9", text: "#f8f8f2" },
                    { id: "nord", name: "Nord", category: "Arctic Frost", bg: "#2e3440", card: "#242933", accent: "#88c0d0", text: "#d8dee9" },
                    { id: "one-dark", name: "One Dark", category: "Atom Warm Dark", bg: "#21252b", card: "#1e2227", accent: "#61afef", text: "#abb2bf" },
                    { id: "dark", name: "Zinc Dark", category: "Default Sleek Dark", bg: "#09090b", card: "#18181b", accent: "#38bdf8", text: "#e4e4e7" },
                    { id: "light", name: "Zinc Light", category: "Clean Minimal Light", bg: "#ffffff", card: "#f4f4f5", accent: "#0284c7", text: "#18181b" }
                  ].map((t) => {
                    const isActive = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as never)}
                        className={`group relative flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all ${
                          isActive
                            ? "border-sky-500 bg-zinc-900 shadow-md ring-1 ring-sky-500/50"
                            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div>
                            <div className="font-medium text-zinc-200 text-sm flex items-center gap-1.5">
                              {t.name}
                              {isActive && <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />}
                            </div>
                            <div className="text-[11px] text-zinc-500">{t.category}</div>
                          </div>
                        </div>

                        {/* Theme Swatch Preview */}
                        <div 
                          className="h-14 w-full rounded-md border border-white/10 p-2 flex flex-col justify-between overflow-hidden shadow-inner"
                          style={{ backgroundColor: t.bg }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="h-2.5 w-14 rounded" style={{ backgroundColor: t.accent }} />
                            <div className="flex gap-1">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.accent }} />
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: t.text }} />
                            </div>
                          </div>
                          <div 
                            className="h-5 w-full rounded flex items-center px-2 text-[10px] font-mono truncate"
                            style={{ backgroundColor: t.card, color: t.text }}
                          >
                            baton theme --set {t.id}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shortcuts" className="space-y-3 text-sm">
              <div>
                <h2 className="text-sm font-medium text-zinc-200 mb-1">Keyboard Shortcuts Reference</h2>
                <p className="text-xs text-zinc-500 mb-4">Fast keyboard shortcuts for navigating Baton seamlessly.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { keys: "⌘K", label: "Open Command Palette" },
                  { keys: "⌘B", label: "Toggle Left Sidebar" },
                  { keys: "⌘T", label: "Open New Terminal Shell" },
                  { keys: "⌘,", label: "Open Settings Screen" },
                  { keys: "⌘N", label: "Add New Project" },
                  { keys: "⌘⇧H", label: "Create Baton Pass" },
                  { keys: "⌘⇧P", label: "Use Latest Baton Pass" },
                  { keys: "⌘1 – ⌘9", label: "Switch Active Terminal Session" },
                  { keys: "Esc", label: "Close Modal / Settings View" }
                ].map(({ keys, label }) => (
                  <div key={keys} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-3.5">
                    <span className="text-zinc-300 text-xs font-medium">{label}</span>
                    <kbd className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">{keys}</kbd>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="updates" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-zinc-200">Software Updates & Changelog</h2>
                  <p className="text-xs text-zinc-500">Keep Baton up to date with the latest features, agent integrations, and fixes.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={checkingUpdates}
                  onClick={() => void checkForUpdates(true)}
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checkingUpdates ? "animate-spin" : ""}`} />
                  {checkingUpdates ? "Checking..." : "Check for Updates"}
                </Button>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-zinc-400">Current Installed Version</div>
                    <div className="text-lg font-mono font-bold text-zinc-100">v{updateInfo?.currentVersion || "0.1.0"}</div>
                  </div>
                  {updateInfo?.updateAvailable ? (
                    <Badge className="border border-emerald-700/50 bg-emerald-950/40 text-emerald-400 text-xs px-2.5 py-1">
                      v{updateInfo.latestVersion} Available
                    </Badge>
                  ) : (
                    <Badge className="border border-zinc-700 bg-zinc-800/60 text-zinc-300 text-xs px-2.5 py-1">
                      Up to Date
                    </Badge>
                  )}
                </div>

                {updateInfo?.updateAvailable ? (
                  <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-emerald-400">
                      A newer version (v{updateInfo.latestVersion}) is ready to download!
                    </span>
                    <div className="flex items-center gap-2">
                      {updateInfo.downloadUrl && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3"
                          onClick={() => void window.baton.updates.openUrl(updateInfo.downloadUrl!)}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Download DMG
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-3"
                        onClick={() => setWhatsNewOpen(true)}
                      >
                        View Changelog
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {updateInfo?.checkedAt ? `Last checked: ${new Date(updateInfo.checkedAt).toLocaleTimeString()}` : "Checked automatically on startup."}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-3"
                      onClick={() => setWhatsNewOpen(true)}
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 text-orange-400" />
                      View What's New
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </main>
  );
}
