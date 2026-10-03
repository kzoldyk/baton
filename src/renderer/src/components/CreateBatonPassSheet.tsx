import { agentLabel, type AgentId } from "../../../shared/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Bot, Check, ChevronDown, ChevronRight, Copy, GitBranch, Loader2, RotateCcw, Sparkles } from "lucide-react";
import {
  buildAgentOptions,
  nextStateAfterPassCreated,
  passSourceHint,
  resolvePassSheetAgents,
  resolvePassSource,
  shouldInitPassSheetAgents,
  type PassSource
} from "../lib/handoffUiFlow";
import { motion } from "../lib/motion";
import { AgentIcon } from "./AgentIcon";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Callout } from "./ui/callout";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Textarea } from "./ui/textarea";
import { useAppStore } from "../store/useAppStore";
import { cn } from "../lib/cn";
import { GuiAgentDropdown } from "./GuiAgentDropdown";

const DEFAULT_NEXT_STEPS = "- Inspect the listed files\n- Continue from the current task\n- Verify before broad refactoring";
const DEFAULT_CONSTRAINTS = "- Do not restart from scratch\n- Do not rewrite unrelated modules";

const bulletCount = (text: string): number => text.split("\n").map((line) => line.trim()).filter(Boolean).length;
const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }): JSX.Element {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{children}</span>
      {hint ? <span className="truncate text-[11px] text-zinc-600">{hint}</span> : null}
    </div>
  );
}

function CollapseRow({
  open,
  onToggle,
  title,
  hint
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  hint: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
        open ? "border-zinc-700 bg-zinc-900/60" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
      )}
    >
      {open ? (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      )}
      <span className="text-xs font-medium text-zinc-300">{title}</span>
      <span className="ml-auto truncate text-[11px] text-zinc-600">{hint}</span>
    </button>
  );
}

function SourceOption({
  active,
  disabled,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={disabled ? "Needs a live agent session" : label}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300",
        disabled && "cursor-not-allowed opacity-40 hover:text-zinc-500"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function CreateBatonPassSheet(): JSX.Element {
  const [fromAgent, setFromAgent] = useState<AgentId>("codex");
  const [toAgent, setToAgent] = useState<AgentId>("any");
  const [nextSteps, setNextSteps] = useState(DEFAULT_NEXT_STEPS);
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);
  const [source, setSource] = useState<PassSource>("git");
  const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    handoffSheetOpen, selectedProjectId, projects, sessions, activeSessionId, tasks, agents,
    gitStatus, latestHandoff, setState, refreshHandoff, runAgent
  } = useAppStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const activeTask = tasks.find((t) => t.status === "active");
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const agentOptions = useMemo(
    () => {
      const detected = buildAgentOptions(agents.filter((a) => a.installed && a.id !== "terminal").map((a) => a.id as AgentId));
      return ["any", ...detected.filter((a) => a !== "any")];
    },
    [agents]
  );
  const sessionLive = activeSession?.status === "running";
  const sheetWasOpen = useRef(false);
  const busyRef = useRef(false);
  const copyTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  useEffect(() => {
    if (!handoffSheetOpen) {
      sheetWasOpen.current = false;
      return;
    }
    if (!shouldInitPassSheetAgents(handoffSheetOpen, sheetWasOpen.current)) return;
    sheetWasOpen.current = true;
    const { from } = resolvePassSheetAgents(agentOptions, activeSession?.agentId);
    setFromAgent(from ?? "developer");
    setToAgent("any");
    setSource(resolvePassSource("git", sessionLive));
    setNextSteps(DEFAULT_NEXT_STEPS);
    setConstraints(DEFAULT_CONSTRAINTS);
    setError(undefined);
    setShowInstructions(false);
    setShowPreview(false);
    setCopied(false);
  }, [handoffSheetOpen, activeSession?.agentId, agentOptions, sessionLive]);

  useEffect(() => {
    setSource((prev) => resolvePassSource(prev, sessionLive));
  }, [sessionLive]);

  useEffect(() => {
    if (!waiting) return;
    const dispose = window.baton.handoff.onProgress(({ done, elapsed, max }) => {
      if (done) { setProgress(0); return; }
      if (elapsed && max) setProgress(Math.min(100, Math.round((elapsed / max) * 100)));
    });
    return () => { dispose(); };
  }, [waiting]);

  const draftPreview =
    `## Feature: ${activeTask?.title ?? project?.name ?? "Current Work"}\n\n## Next Steps\n${nextSteps}\n\n## Constraints\n${constraints}`;
  const passContent = latestHandoff?.content || draftPreview;

  const createPass = async (): Promise<void> => {
    if (!selectedProjectId || busyRef.current) return;
    busyRef.current = true;
    setError(undefined);
    setWaiting(true);
    setProgress(0);
    try {
      if (source === "agent") {
        if (!activeSessionId) throw new Error("No live agent session. Use Git & logs, or start an agent first.");
        await window.baton.agents.handoffPrompt(activeSessionId, { nextSteps, constraints });
        await window.baton.handoff.waitForLatest(selectedProjectId, fromAgent, toAgent, activeTask?.id);
      } else {
        await window.baton.handoff.createFallback({
          projectId: selectedProjectId,
          fromAgent,
          toAgent,
          taskId: activeTask?.id,
          nextSteps,
          constraints
        });
      }
      await refreshHandoff();
      setState(nextStateAfterPassCreated(toAgent));
      if (toAgent !== "any") await runAgent(toAgent, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the pass.");
    } finally {
      busyRef.current = false;
      setWaiting(false);
      setProgress(0);
    }
  };

  const copyPassContent = async (): Promise<void> => {
    await navigator.clipboard.writeText(passContent);
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const resetInstructions = (): void => {
    setNextSteps(DEFAULT_NEXT_STEPS);
    setConstraints(DEFAULT_CONSTRAINTS);
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void createPass();
    }
  };

  const primaryLabel = waiting
    ? source === "agent" ? `Waiting for ${agentLabel(fromAgent)}…` : "Creating pass…"
    : toAgent === "any" ? "Create pass" : `Create pass & open ${agentLabel(toAgent)}`;

  return (
    <Sheet open={handoffSheetOpen} onOpenChange={(open) => setState({ handoffSheetOpen: open })}>
      <SheetContent className="flex w-full max-w-md flex-col gap-0 p-0 sm:max-w-lg" onKeyDown={onKeyDown}>
        <SheetHeader className="border-b border-zinc-800 px-5 py-3.5 pr-12">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <ArrowRightLeft className="h-4 w-4 text-orange-400" />
            Create handoff
          </SheetTitle>
          <SheetDescription className="text-xs text-zinc-500">
            Package this feature's context so the next agent continues without rereading the repo.
          </SheetDescription>
        </SheetHeader>

        <div className={cn("flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4", motion.fadeIn)}>
          {/* ── Context strip ── */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            {activeTask ? (
              <Badge className="shrink-0 border-orange-800/80 bg-orange-950/40 px-1.5 py-0 text-[10px] text-orange-300">TASK</Badge>
            ) : null}
            <span className={cn("min-w-0 flex-1 truncate text-sm", activeTask ? "text-zinc-200" : "text-amber-300/90")}>
              {activeTask ? activeTask.title : "No active task — pass will fall back to the project name."}
            </span>
            {gitStatus?.isRepo ? (
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-600">
                <GitBranch className="h-3 w-3 shrink-0" />
                <span className="max-w-[6.5rem] truncate">{gitStatus.branch}</span>
                {gitStatus.changedFiles.length ? <span className="shrink-0">· {gitStatus.changedFiles.length} changed</span> : null}
              </span>
            ) : null}
          </div>

          {/* ── Route: From → To ── */}
          <div>
            <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-800/70 bg-zinc-900/40 px-3 py-1.5">
              <span className="w-8 shrink-0 text-[10px] font-medium uppercase tracking-wider text-zinc-500">From</span>
              <AgentIcon agentId={fromAgent} className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs font-medium text-zinc-300">{agentLabel(fromAgent)}</span>
              <span className="ml-auto shrink-0 text-[11px] text-zinc-600">
                {activeSession ? "current session" : "auto-detected"}
              </span>
            </div>

            <SectionLabel>Hand off to</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {agentOptions.map((id) => {
                const selected = toAgent === id;
                const isCurrent = id === fromAgent;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={isCurrent}
                    aria-pressed={selected}
                    onClick={() => setToAgent(id)}
                    title={isCurrent ? "Already the sending agent" : id === "any" ? "Agent-agnostic pass (paste anywhere)" : `Hand off to ${agentLabel(id)}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600/60",
                      selected
                        ? "border-orange-600 bg-orange-950/50 text-orange-100 ring-1 ring-orange-600/40"
                        : isCurrent
                        ? "cursor-not-allowed border-zinc-800/60 bg-zinc-900/20 text-zinc-600"
                        : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-200"
                    )}
                  >
                    <AgentIcon agentId={id} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{agentLabel(id)}</span>
                    {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-orange-400" /> : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-600">
              {toAgent === "any"
                ? "Agent-agnostic — save now, pick who continues next."
                : `Launches ${agentLabel(toAgent)} with a prompt to read .baton/latest-handoff.md.`}
            </p>
          </div>

          {/* ── Instructions ── */}
          <div>
            <CollapseRow
              open={showInstructions}
              onToggle={() => setShowInstructions((v) => !v)}
              title="Instructions"
              hint={
                showInstructions
                  ? "optional"
                  : `${bulletCount(nextSteps)} steps · ${bulletCount(constraints)} rules`
              }
            />
            {showInstructions ? (
              <div className={cn("mt-2 space-y-3 rounded-md border border-zinc-800/70 bg-zinc-900/30 p-3", motion.fadeIn)}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-300">For the next agent</span>
                  <button
                    type="button"
                    onClick={resetInstructions}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </div>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-400">Next steps</span>
                  <Textarea className="min-h-[72px] text-xs" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-400">Do not touch</span>
                  <Textarea className="min-h-[56px] text-xs" value={constraints} onChange={(e) => setConstraints(e.target.value)} />
                </label>
              </div>
            ) : null}
          </div>

          {/* ── Source ── */}
          <div>
            <SectionLabel hint={source === "agent" && sessionLive ? "slower · richer" : "instant"}>How to build it</SectionLabel>
            <div className="flex gap-1 rounded-md border border-zinc-800 bg-zinc-900/40 p-1">
              <SourceOption active={source === "git"} icon={GitBranch} label="Git & logs" onClick={() => setSource("git")} />
              <SourceOption
                active={source === "agent"}
                disabled={!sessionLive}
                icon={Bot}
                label="Ask my agent"
                onClick={() => setSource("agent")}
              />
            </div>
            <p className={cn("mt-1.5 text-[11px] leading-relaxed", source === "agent" && !sessionLive ? "text-amber-400/80" : "text-zinc-600")}>
              {passSourceHint(source, sessionLive)}
            </p>
          </div>

          {/* ── Preview ── */}
          <div>
            <CollapseRow
              open={showPreview}
              onToggle={() => setShowPreview((v) => !v)}
              title="Preview"
              hint={`${passContent.length.toLocaleString()} chars`}
            />
            {showPreview ? (
              <div className={cn("mt-2 space-y-1.5", motion.fadeIn)}>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-400">
                  {passContent}
                </pre>
                <p className="text-[11px] text-zinc-600">
                  Saved passes also pick up changed files, branch and session output automatically.
                </p>
              </div>
            ) : null}
          </div>

          {/* ── Progress ── */}
          {waiting ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{source === "agent" ? `Waiting for ${agentLabel(fromAgent)} to write the pass…` : "Building pass from git & logs…"}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 space-y-2.5 border-t border-zinc-800/70 bg-zinc-950/60 px-5 py-3.5">
          {error ? (
            <Callout variant="error" title="Couldn't create the pass">
              {error}
            </Callout>
          ) : null}

          <Button
            className="w-full bg-orange-600 text-white hover:bg-orange-500"
            onClick={() => void createPass()}
            disabled={!selectedProjectId || waiting}
          >
            {waiting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="truncate">{primaryLabel}</span>
            {!waiting ? (
              <kbd className="ml-auto hidden rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70 sm:inline-block">
                {isMac ? "⌘↵" : "Ctrl↵"}
              </kbd>
            ) : null}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => void copyPassContent()} disabled={waiting}>
              <Copy className={cn("h-3.5 w-3.5", copied && "text-emerald-400")} />
              {copied ? "Copied" : "Copy pass"}
            </Button>
            <GuiAgentDropdown
              passContent={passContent}
              projectId={selectedProjectId}
              taskTitle={activeTask?.title}
              variant="secondary"
              size="sm"
              className="h-8 w-8 px-0"
              iconOnly
              label="Export for GUI agent"
            />
            <Button variant="ghost" size="sm" onClick={() => setState({ handoffSheetOpen: false })} disabled={waiting}>
              Cancel
            </Button>
          </div>

          <p className="text-center text-[11px] text-zinc-600">
            {toAgent === "any"
              ? "Next: choose which agent continues."
              : `Next: ${agentLabel(toAgent)} opens with a read-pass prompt.`}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
