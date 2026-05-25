import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { useAppStore } from "../store/useAppStore";
import type { Handoff } from "../../../shared/types";

export function HandoffPreview(): JSX.Element {
  const { previewOpen, latestHandoff, selectedProjectId, setState } = useAppStore();
  const [history, setHistory] = useState<Handoff[]>([]);
  const [selected, setSelected] = useState<Handoff | null>(null);

  useEffect(() => {
    if (!previewOpen || !selectedProjectId) return;
    void window.baton.handoff.list(selectedProjectId).then((list) => {
      setHistory(list);
      setSelected(null);
    });
  }, [previewOpen, selectedProjectId]);

  const displayed = selected ?? latestHandoff;

  return (
    <Dialog open={previewOpen} onOpenChange={(open) => setState({ previewOpen: open })}>
      <DialogContent className="h-[80vh] max-w-4xl flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-zinc-800">
          <DialogTitle>Handoff History</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          {/* History list — task #8 */}
          <div className="w-56 shrink-0 border-r border-zinc-800 overflow-y-auto">
            {history.length === 0 ? (
              <div className="p-4 text-xs text-zinc-500">No handoffs yet.</div>
            ) : (
              history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSelected(h)}
                  className={`w-full px-3 py-2.5 text-left border-b border-zinc-800/50 hover:bg-zinc-800 ${selected?.id === h.id ? "bg-zinc-800" : ""}`}
                >
                  <div className="text-xs font-medium text-zinc-200 truncate">{h.fromAgent} → {h.toAgent ?? "next"}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500 truncate">{h.summary || "No summary"}</div>
                  <div className="mt-0.5 text-[10px] text-zinc-600">{new Date(h.createdAt).toLocaleString()}</div>
                </button>
              ))
            )}
          </div>
          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            <pre className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{displayed?.content ?? "No handoff selected."}</pre>
          </ScrollArea>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <Button variant="secondary" onClick={() => setState({ previewOpen: false, usePassOpen: true })}>Use Baton Pass</Button>
          <Button onClick={() => { navigator.clipboard.writeText(displayed?.content ?? "").catch(() => {/* clipboard write failed */}); }}>Copy</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
