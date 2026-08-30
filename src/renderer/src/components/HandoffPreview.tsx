import { useEffect, useState } from "react";
import { agentLabel } from "../../../shared/types";
import { Copy, History, Send } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Callout } from "./ui/callout";
import { ModalShell } from "./ui/modal-shell";
import { ScrollArea } from "./ui/scroll-area";
import { useAppStore } from "../store/useAppStore";
import type { Handoff } from "../../../shared/types";

export function HandoffPreview(): JSX.Element {
  const { previewOpen, latestHandoff, selectedProjectId, tasks, setState } = useAppStore();
  const [history, setHistory] = useState<Handoff[]>([]);
  const [selected, setSelected] = useState<Handoff | null>(null);
  const activeFeature = tasks.find((t) => t.status === "active");

  useEffect(() => {
    if (!previewOpen || !selectedProjectId) return;
    void window.baton.handoff.list(selectedProjectId, activeFeature?.id).then((list) => {
      setHistory(list);
      setSelected(null);
    });
  }, [previewOpen, selectedProjectId, activeFeature?.id]);

  const displayed = selected ?? latestHandoff;
  const warnings = displayed?.quality?.warnings ?? [];

  return (
    <ModalShell
      open={previewOpen}
      onOpenChange={(open) => setState({ previewOpen: open })}
      title="Pass history"
      description={activeFeature ? `Passes for feature: ${activeFeature.title}` : "Select a feature to scope pass history"}
      icon={History}
      className="max-h-[min(720px,90vh)] sm:max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-zinc-600">{history.length} saved · agents read markdown, Baton stores yaml</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setState({ previewOpen: false, usePassOpen: true })}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Continue with pass
            </Button>
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(displayed?.content ?? "").catch(() => {/* clipboard write failed */}); }}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <div className="max-h-40 shrink-0 overflow-y-auto border-b border-zinc-900/80 sm:max-h-none sm:w-60 sm:border-b-0 sm:border-r">
          {history.length === 0 ? (
            <div className="p-4 text-xs text-zinc-500">No passes for this feature yet.</div>
          ) : (
            history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelected(h)}
                className={`w-full border-b border-zinc-900/50 px-3 py-2.5 text-left hover:bg-zinc-900/60 ${selected?.id === h.id ? "bg-zinc-900" : ""}`}
              >
                <div className="truncate text-xs font-medium text-zinc-200">
                  {agentLabel(h.fromAgent)} → {agentLabel(h.toAgent ?? "next")}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-zinc-500">{h.summary || "No summary"}</div>
                <div className="mt-0.5 text-[10px] text-zinc-600">{new Date(h.createdAt).toLocaleString()}</div>
              </button>
            ))
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4 sm:p-5">
            {warnings.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {warnings.map((warning) => (
                  <Badge key={warning} className="border-amber-900 bg-amber-950/40 text-[10px] text-amber-300">{warning}</Badge>
                ))}
              </div>
            ) : displayed ? (
              <Callout variant="info">Pass looks within size limits.</Callout>
            ) : null}
            <pre className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{displayed?.content ?? "Select a pass from the list."}</pre>
          </div>
        </ScrollArea>
      </div>
    </ModalShell>
  );
}
