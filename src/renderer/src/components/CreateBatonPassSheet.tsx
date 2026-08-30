import { agentLabel, type AgentId } from "../../../shared/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, GitBranch, HelpCircle, Sparkles } from "lucide-react";
import { buildAgentOptions, resolvePassSheetAgents, shouldInitPassSheetAgents } from "../lib/handoffUiFlow";
import { motion } from "../lib/motion";
import { AgentIcon } from "./AgentIcon";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Callout } from "./ui/callout";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useAppStore } from "../store/useAppStore";
import { cn } from "../lib/cn";

const DEFAULT_NEXT_STEPS = "- Inspect the listed files\n- Continue from the current task\n- Verify before broad refactoring";
const DEFAULT_CONSTRAINTS = "- Do not restart from scratch\n- Do not rewrite unrelated modules";

export function CreateBatonPassSheet(): JSX.Element {
  const [fromAgent, setFromAgent] = useState<AgentId>("codex");
  const [toAgent, setToAgent] = useState<AgentId>("codex");
  const [nextSteps, setNextSteps] = useState(DEFAULT_NEXT_STEPS);
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);
  const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | undefined>();

  const { handoffSheetOpen, selectedProjectId, projects, sessions, activeSessionId, tasks, agents, setState, refreshHandoff, runAgent } = useAppStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const activeTask = tasks.find((t) => t.status === "active");
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const agentOptions = useMemo(
    () => buildAgentOptions(agents.filter((a) => a.installed && a.id !== "terminal").map((a) => a.id as AgentId)),
    [agents]
  );
  const sessionLive = activeSession?.status === "running";
  const sheetWasOpen = useRef(false);

  useEffect(() => {
    if (!handoffSheetOpen) {
      sheetWasOpen.current = false;
      return;
    }
    if (!shouldInitPassSheetAgents(handoffSheetOpen, sheetWasOpen.current)) return;
    sheetWasOpen.current = true;
    const { from, to } = resolvePassSheetAgents(agentOptions, activeSession?.agentId);
    setFromAgent(from);
    setToAgent(to);
    setError(undefined);
  }, [handoffSheetOpen, activeSession?.agentId, agentOptions]);

  useEffect(() => {
    if (!waiting) return;
    const dispose = window.baton.handoff.onProgress(({ done, elapsed, max }) => {
      if (done) { setProgress(0); return; }
      if (elapsed && max) setProgress(Math.min(100, Math.round((elapsed / max) * 100)));
    });
    return () => {
      dispose();
    };
  }, [waiting]);

  const afterPass = async (): Promise<void> => {
    await refreshHandoff();
    setState({ handoffSheetOpen: false, usePassOpen: true });
  };

  const generateWithAgent = async (): Promise<void> => {
    if (!activeSessionId || !selectedProjectId) return;
    setWaiting(true);
    setError(undefined);
    try {
      await window.baton.agents.handoffPrompt(activeSessionId, { nextSteps, constraints });
      await window.baton.handoff.waitForLatest(selectedProjectId, fromAgent, toAgent, activeTask?.id);
      await afterPass();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent did not write a pass. Try emergency from git.");
    } finally {
      setWaiting(false);
      setProgress(0);
    }
  };

  const generateFallback = async (): Promise<void> => {
    if (!selectedProjectId) return;
    setError(undefined);
    await window.baton.handoff.createFallback({ projectId: selectedProjectId, fromAgent, toAgent, taskId: activeTask?.id, nextSteps, constraints });
    await afterPass();
  };

  const passToAgent = async (): Promise<void> => {
    if (!selectedProjectId) return;
    setError(undefined);
    await window.baton.handoff.createFallback({
      projectId: selectedProjectId,
      fromAgent,
      toAgent,
      taskId: activeTask?.id,
      nextSteps,
      constraints
    });
    await refreshHandoff();
    setState({ handoffSheetOpen: false });
    await runAgent(toAgent, true);
  };

  return (
    <Sheet open={handoffSheetOpen} onOpenChange={(open) => setState({ handoffSheetOpen: open })}>
      <SheetContent className="flex w-full max-w-lg flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-zinc-900/80 px-5 py-4 pr-12">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="h-4 w-4 text-orange-400" />
            Pass to agent
          </SheetTitle>
          <SheetDescription>
            Save a capped pass under <code className="text-zinc-300">.baton/</code> for this feature, then open the next agent on it.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-5 py-4">
          <div className={cn("space-y-4 pb-4", motion.fadeIn)}>
            {!activeTask ? (
              <Callout variant="warning" title="Create a feature first">
                Passes are scoped per feature so yesterday's work does not mix with today's.
              </Callout>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Field label="From" hint="Who is handing off">
                <Select value={fromAgent} onValueChange={(value) => setFromAgent(value as AgentId)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent">{agentLabel(fromAgent)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>{agentOptions.map((id) => <SelectItem key={id} value={id}><span className="flex items-center gap-2"><AgentIcon agentId={id} className="h-4 w-4" />{agentLabel(id)}</span></SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="To" hint="Who continues next">
                <Select value={toAgent} onValueChange={(value) => setToAgent(value as AgentId)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent">{agentLabel(toAgent)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>{agentOptions.map((id) => <SelectItem key={id} value={id}><span className="flex items-center gap-2"><AgentIcon agentId={id} className="h-4 w-4" />{agentLabel(id)}</span></SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Active feature</span>
                {activeTask ? <Badge className="border-orange-800/80 bg-orange-950/40 text-[10px] text-orange-300">live</Badge> : null}
              </div>
              <div className="mt-1 text-sm text-zinc-100">{activeTask?.title ?? "None selected"}</div>
              <div className="mt-1 text-xs text-zinc-500">{project?.name}</div>
            </div>

            <Separator />

            <Field label="Next steps" hint="What the next agent should do first">
              <Textarea className="min-h-[88px] text-xs" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
            </Field>
            <Field label="Do not touch" hint="Modules or areas to leave alone">
              <Textarea className="min-h-[88px] text-xs" value={constraints} onChange={(e) => setConstraints(e.target.value)} />
            </Field>

            {waiting ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Waiting for agent to write the pass…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            {error ? <Callout variant="error" title="Pass failed">{error}</Callout> : null}

            <div className="space-y-2 pt-1">
              <Button className="w-full bg-orange-600 text-white hover:bg-orange-500" onClick={() => void passToAgent()} disabled={!selectedProjectId || waiting}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Save pass and open {agentLabel(toAgent)}
              </Button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full">
                      <Button className="w-full" variant="secondary" onClick={() => void generateWithAgent()} disabled={!sessionLive || waiting}>
                        {waiting ? "Waiting…" : "Ask current agent"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!sessionLive ? <TooltipContent>Start or focus a live agent session first</TooltipContent> : null}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button className="w-full" variant="secondary" onClick={() => void generateFallback()} disabled={!selectedProjectId || waiting}>
                      <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                      Emergency from git
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Build a pass from git status when the agent session is dead</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {!sessionLive ? (
              <Callout variant="warning" title="Session not live">
                Use emergency from git, or start an agent and try again.
              </Callout>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-zinc-400">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-zinc-600" />
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      </span>
      {children}
    </label>
  );
}
