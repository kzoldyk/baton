import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAppStore } from "../store/useAppStore";

const SHORTCUTS = [
  { keys: "⌘K", label: "Command Palette" },
  { keys: "⌘B", label: "Toggle Sidebar" },
  { keys: "⌘,", label: "Settings" },
  { keys: "⌘N", label: "Add Project" },
  { keys: "⌘⇧H", label: "Create Baton Pass" },
  { keys: "⌘⇧P", label: "Use Baton Pass" },
  { keys: "⌘1–9", label: "Switch agent session" },
];

export function KeyboardShortcutsDialog(): JSX.Element {
  const { shortcutsOpen, setState } = useAppStore();

  return (
    <Dialog open={shortcutsOpen} onOpenChange={(open) => setState({ shortcutsOpen: open })}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={keys} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm">
              <span className="text-zinc-300">{label}</span>
              <kbd className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-400">{keys}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
