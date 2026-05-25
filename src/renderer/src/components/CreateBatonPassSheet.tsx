import { AGENT_LABELS, type AgentId } from "../../../shared/types";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Textarea } from "./ui/textarea";
import { useAppStore } from "../store/useAppStore";

const AGENTS: { value: AgentId; label: string }[] = Object.entries(AGENT_LABELS).map(([value, label]) => ({ value: value as AgentId, label }));

const DEFAULT_NEXT_STEPS = "- Inspect changed files.\n- Continue from the current task.\n- Verify implementation before broad refactoring.";
const DEFAULT_CONSTRAINTS = "- Do not restart from scratch.\n- Do not rewrite unrelated modules.\n- Respect existing code structure.";

export function CreateBatonPassSheet(): JSX.Element {
  const [fromAgent, setFromAgent] = useState<AgentId>("codex");
  const [toAgent, setToAgent] = useState<AgentId>("claude");
  const [nextSteps, setNextSteps] = useState(DEFAULT_NEXT_STEPS);
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);
  const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState(0);

  const { handoffSheetOpen, selectedProjectId, projects, activeSessionId, tasks, setState, refreshHandoff } = useAppStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const activeTask = tasks.find((t) => t.status === "active");

  // Task #11 — listen for progress events while waiting
  useEffect(() => {
    if (!waiting) return;
    const dispose = window.baton.handoff.onProgress(({ done, elapsed, max }) => {
      if (done) { setProgress(0); return; }
      if (elapsed && max) setProgress(Math.min(100, Math.round((elapsed / max) * 100)));
    });
    return dispose;
  }, [waiting]);

  const generateWithAgent = async (): Promise<void> => {
    if (!activeSessionId || !selectedProjectId) return;
    setWaiting(true);
    await window.baton.agents.handoffPrompt(activeSessionId, { nextSteps, constraints });
    try {
      await window.baton.handoff.waitForLatest(selectedProjectId, fromAgent, toAgent, activeTask?.id);
      await refreshHandoff();
      setState({ handoffSheetOpen: false, previewOpen: true });
    } finally {
      setWaiting(false);
      setProgress(0);
    }
  };

  const generateFallback = async (): Promise<void> => {
    if (!selectedProjectId) return;
    await window.baton.handoff.createFallback({ projectId: selectedProjectId, fromAgent, toAgent, taskId: activeTask?.id, nextSteps, constraints });
    await refreshHandoff();
    setState({ handoffSheetOpen: false, previewOpen: true });
  };

  return (
    <Sheet open={handoffSheetOpen} onOpenChange={(open) => setState({ handoffSheetOpen: open })}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Baton Pass</SheetTitle>
          <SheetDescription>Generate a compact local handoff for another coding agent.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-160px)] pr-1">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-sm">
                <span className="text-zinc-400">From Agent</span>
                <Select value={fromAgent} onValueChange={(v) => setFromAgent(v as AgentId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AGENTS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-zinc-400">To Agent</span>
                <Select value={toAgent} onValueChange={(v) => setToAgent(v as AgentId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AGENTS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </label>
            </div>

            <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
              <div className="text-xs uppercase text-zinc-500">Project</div>
              <div className="mt-1 text-zinc-100">{project?.name ?? "—"}</div>
              <div className="mt-2 text-xs uppercase text-zinc-500">Active Task</div>
              <div className="mt-1 text-zinc-300">{activeTask?.title ?? "No active task."}</div>
            </div>

            <Separator />

            {/* Task #19 — editable next steps and constraints */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase text-zinc-500">Next Steps</label>
              <Textarea
                className="min-h-[80px] text-xs"
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase text-zinc-500">Constraints</label>
              <Textarea
                className="min-h-[80px] text-xs"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
              />
            </div>

            {/* Task #11 — progress bar while waiting */}
            {waiting && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Waiting for agent to write handoff…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={() => void generateWithAgent()} disabled={!activeSessionId || waiting}>
                {waiting ? "Waiting…" : "Generate with Agent"}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => void generateFallback()} disabled={!selectedProjectId || waiting}>
                From Git Diff
              </Button>
            </div>
            {!activeSessionId && <Badge className="border-amber-800 text-amber-300">No active session — use Git Diff fallback.</Badge>}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
