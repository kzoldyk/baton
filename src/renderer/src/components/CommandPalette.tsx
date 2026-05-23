import { useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { useAppStore } from "../store/useAppStore";

const COMMANDS = [
  { label: "Add Project", shortcut: "⌘N", action: "addProject" },
  { label: "Toggle Sidebar", shortcut: "⌘B", action: "sidebar" },
  { label: "Create Baton Pass", shortcut: "⌘⇧H", action: "handoff" },
  { label: "Use Latest Baton Pass", shortcut: "⌘⇧P", action: "usePass" },
  { label: "Preview Latest Handoff", shortcut: "", action: "preview" },
  { label: "Run Codex", shortcut: "", action: "codex" },
  { label: "Run Claude Code", shortcut: "", action: "claude" },
  { label: "Run OpenCode", shortcut: "", action: "opencode" },
  { label: "Run Gemini CLI", shortcut: "", action: "gemini" },
  { label: "Run Kiro", shortcut: "", action: "kiro" },
  { label: "Show MCP Servers", shortcut: "", action: "mcp" },
  { label: "Settings", shortcut: "⌘,", action: "settings" },
];

export function CommandPalette(): JSX.Element {
  const [query, setQuery] = useState("");
  const { commandOpen, runAgent, setState } = useAppStore();

  const filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  const execute = (action: string): void => {
    setState({ commandOpen: false });
    setQuery("");
    if (action === "addProject") setState({ addProjectOpen: true, addProjectError: undefined });
    else if (action === "sidebar") setState({ sidebarOpen: !useAppStore.getState().sidebarOpen });
    else if (action === "handoff") setState({ handoffSheetOpen: true });
    else if (action === "usePass") setState({ usePassOpen: true });
    else if (action === "preview") setState({ previewOpen: true });
    else if (action === "mcp") setState({ view: "mcp" });
    else if (action === "settings") setState({ view: "settings" });
    else if (["codex", "claude", "opencode", "gemini", "kiro"].includes(action)) void runAgent(action as never);
  };

  return (
    <Dialog open={commandOpen} onOpenChange={(open) => { setState({ commandOpen: open }); if (!open) setQuery(""); }}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <input
          autoFocus
          className="h-12 w-full border-b border-zinc-800 bg-transparent px-4 text-sm outline-none placeholder:text-zinc-500"
          placeholder="Type a command or shortcut…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-80 overflow-auto py-1">
          {filtered.length === 0 && <div className="px-4 py-3 text-sm text-zinc-500">No commands found.</div>}
          {filtered.map((cmd) => (
            <button
              key={cmd.action}
              onClick={() => execute(cmd.action)}
              className="flex w-full items-center justify-between rounded-md px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">{cmd.shortcut}</kbd>}
            </button>
          ))}
        </div>
        <div className="border-t border-zinc-800 px-4 py-2 text-xs text-zinc-600">
          ⌘K open · ⌘B sidebar · ⌘N project · ⌘⇧H handoff · ⌘⇧P use pass · ⌘, settings
        </div>
      </DialogContent>
    </Dialog>
  );
}
