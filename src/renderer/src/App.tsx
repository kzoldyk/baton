import { useEffect } from "react";
import { PanelLeft } from "lucide-react";
import { AgentSelectorDialog } from "./components/AgentSelectorDialog";
import { AddProjectDialog } from "./components/AddProjectDialog";
import { CommandPalette } from "./components/CommandPalette";
import { CreateBatonPassSheet } from "./components/CreateBatonPassSheet";
import { HandoffPreview } from "./components/HandoffPreview";
import { McpScreen } from "./components/McpScreen";
import { HandoffPromptDialog } from "./components/HandoffPromptDialog";
import { KeyboardShortcutsDialog } from "./components/KeyboardShortcutsDialog";
import { QuickLaunchAgentDialog } from "./components/QuickLaunchAgentDialog";
import { SettingsScreen } from "./components/SettingsScreen";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { useAppStore } from "./store/useAppStore";

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="flex h-screen animate-pulse bg-zinc-950 p-4">
      <div className="mr-4 flex w-64 flex-col gap-3">
        <div className="h-4 w-20 rounded bg-zinc-800" />
        <div className="h-8 rounded bg-zinc-800" />
        <div className="h-8 rounded bg-zinc-800" />
        <div className="h-8 rounded bg-zinc-800" />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div className="h-4 w-48 rounded bg-zinc-800" />
        <div className="h-full rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function App(): JSX.Element {
  const { loadInitial, sidebarOpen, rightSidebarOpen, view, loading, theme, setState } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setState({ commandOpen: true });
      }
      if (mod && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setState({ sidebarOpen: !useAppStore.getState().sidebarOpen });
      }
      if (mod && event.key === ",") {
        event.preventDefault();
        setState({ view: "settings" });
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        setState({ handoffSheetOpen: true });
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setState({ usePassOpen: true });
      }
      if (mod && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setState({ addProjectOpen: true, addProjectError: undefined });
      }
      if (mod && event.key === "/") {
        event.preventDefault();
        setState({ shortcutsOpen: !useAppStore.getState().shortcutsOpen });
      }
      // #28 — ⌘1..⌘9 to switch between sessions
      if (mod && !event.shiftKey && /^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const store = useAppStore.getState();
        const projectSessions = store.sessions.filter((s) => s.projectId === store.selectedProjectId);
        const target = projectSessions[index];
        if (target) {
          event.preventDefault();
          setState({ activeSessionId: target.id });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setState]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {sidebarOpen ? <Sidebar /> : (
        <button
          onClick={() => setState({ sidebarOpen: true })}
          className="flex h-full w-4 shrink-0 items-center justify-center border-r border-zinc-800 bg-zinc-950 text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
          title="Open sidebar (⌘B)"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}
      {view === "workspace" ? <Workspace /> : null}
      {view === "settings" ? <SettingsScreen /> : null}
      {view === "mcp" ? <McpScreen /> : null}
      <CreateBatonPassSheet />
      <AddProjectDialog />
      <HandoffPreview />
      <QuickLaunchAgentDialog />
      <HandoffPromptDialog />
      <AgentSelectorDialog />
      <CommandPalette />
      <KeyboardShortcutsDialog />
    </div>
  );
}
