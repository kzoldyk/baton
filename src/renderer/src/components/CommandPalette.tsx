import { Dialog, DialogContent } from "./ui/dialog";
import { useAppStore } from "../store/useAppStore";

const commands = [
  "Add Project",
  "Run Codex",
  "Run Claude Code",
  "Run OpenCode",
  "Create Baton Pass",
  "Use Latest Baton Pass",
  "Preview Latest Handoff",
  "Show Changed Files",
  "Show MCP Servers",
  "Settings"
];

export function CommandPalette(): JSX.Element {
  const { commandOpen, runAgent, setState } = useAppStore();

  const execute = (command: string): void => {
    setState({ commandOpen: false });
    if (command === "Add Project") setState({ addProjectOpen: true, addProjectError: undefined });
    if (command === "Run Codex") void runAgent("codex");
    if (command === "Run Claude Code") void runAgent("claude");
    if (command === "Run OpenCode") void runAgent("opencode");
    if (command === "Create Baton Pass") setState({ handoffSheetOpen: true });
    if (command === "Use Latest Baton Pass") setState({ usePassOpen: true });
    if (command === "Preview Latest Handoff") setState({ previewOpen: true });
    if (command === "Show MCP Servers") setState({ view: "mcp" });
    if (command === "Settings") setState({ view: "settings" });
  };

  return (
    <Dialog open={commandOpen} onOpenChange={(open) => setState({ commandOpen: open })}>
      <DialogContent className="max-w-xl p-2">
        <input autoFocus className="h-11 w-full border-b border-zinc-800 bg-transparent px-3 text-sm outline-none placeholder:text-zinc-500" placeholder="Type a command..." />
        <div className="max-h-80 overflow-auto p-1">
          {commands.map((command) => (
            <button key={command} onClick={() => execute(command)} className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
              {command}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
