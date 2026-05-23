import type { AgentId } from "../../../shared/types";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { useAppStore } from "../store/useAppStore";

const sections = ["Current task", "Git diff summary", "Changed files", "Decisions", "Blockers", "Next steps", "Relevant files", "Terminal summary"];

export function CreateBatonPassSheet(): JSX.Element {
  const [fromAgent, setFromAgent] = useState<AgentId>("codex");
  const [toAgent, setToAgent] = useState<AgentId>("claude");
  const [waiting, setWaiting] = useState(false);
  const { handoffSheetOpen, selectedProjectId, projects, activeSessionId, activeTask, setState, refreshHandoff } = useAppStore();
  const project = projects.find((item) => item.id === selectedProjectId);

  const generateWithAgent = async (): Promise<void> => {
    if (!activeSessionId || !selectedProjectId) return;
    setWaiting(true);
    await window.baton.agents.handoffPrompt(activeSessionId);
    try {
      await window.baton.handoff.waitForLatest(selectedProjectId, fromAgent, toAgent, activeTask?.id);
      await refreshHandoff();
      setState({ handoffSheetOpen: false, previewOpen: true });
    } finally {
      setWaiting(false);
    }
  };

  const generateFallback = async (): Promise<void> => {
    if (!selectedProjectId) return;
    await window.baton.handoff.createFallback({ projectId: selectedProjectId, fromAgent, toAgent, taskId: activeTask?.id });
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
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-sm">
              <span className="text-zinc-400">From Agent</span>
              <Select value={fromAgent} onValueChange={(value) => setFromAgent(value as AgentId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="codex">Codex</SelectItem>
                  <SelectItem value="claude">Claude Code</SelectItem>
                  <SelectItem value="opencode">OpenCode</SelectItem>
                  <SelectItem value="gemini">Gemini CLI</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-zinc-400">To Agent</span>
              <Select value={toAgent} onValueChange={(value) => setToAgent(value as AgentId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude Code</SelectItem>
                  <SelectItem value="codex">Codex</SelectItem>
                  <SelectItem value="opencode">OpenCode</SelectItem>
                  <SelectItem value="gemini">Gemini CLI</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="text-xs uppercase text-zinc-500">Project</div>
            <div className="mt-1 text-sm text-zinc-100">{project?.name ?? "No project selected"}</div>
            <div className="mt-3 text-xs uppercase text-zinc-500">Current Task</div>
            <div className="mt-1 text-sm text-zinc-300">{activeTask?.title ?? "No active task yet."}</div>
          </div>
          <Separator />
          <ScrollArea className="h-64">
            <div className="space-y-3 pr-3">
              {sections.map((section) => (
                <label key={section} className="flex items-center gap-3 text-sm text-zinc-300">
                  <Checkbox defaultChecked />
                  <span>{section}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center gap-2">
            <Button className="flex-1" onClick={() => void generateWithAgent()} disabled={!activeSessionId}>
              {waiting ? "Waiting for .baton/latest-handoff.md" : "Generate with Current Agent"}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => void generateFallback()} disabled={!selectedProjectId}>
              Generate from Git Diff
            </Button>
          </div>
          {!activeSessionId ? <Badge className="border-amber-800 text-amber-300">No active terminal; fallback is available.</Badge> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
