import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { AgentIcon } from "./AgentIcon";
import { TerminalPane } from "./TerminalPane";
import { FeaturePanel } from "./FeaturePanel";
import { HandoffBar } from "./HandoffBar";
import { CollapsibleSection } from "./ui/collapsible-section";
import { IconButton } from "./ui/icon-button";
import { Callout } from "./ui/callout";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useAppStore } from "../store/useAppStore";
import {
  CheckCircle2, Circle, FolderOpen, History, Layers, PanelRight, PanelRightClose,
  Plus, Search, Settings, TerminalSquare, Trash2, X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AGENT_LABELS, agentLabel, type AgentId } from "../../../shared/types";
import { BatonLogo } from "./BatonLogo";

export function Workspace(): JSX.Element {
  const [todoText, setTodoText] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmDeleteTodo, setConfirmDeleteTodo] = useState<number | null>(null);
  const gitPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    projects, selectedProjectId, agents, sessions, activeSessionId,
    gitStatus, latestHandoff, handoffs, tasks, todos, rightSidebarOpen, rightSidebarWidth, projectLoading,
    runAgentError, runAgent, closeSession, createTask, updateTaskStatus,
    deleteTask, toggleTodo, deleteTodo, refreshGit, setState, sidebarOpen,
    handoffRefreshing, handoffRefreshError, refreshPassFromActiveSession, openHandoffPass
  } = useAppStore();

  const project = projects.find((p) => p.id === selectedProjectId);
  const projectSessions = sessions.filter((s) => s.projectId === selectedProjectId);
  const activeFeature = tasks.find((t) => t.status === "active");

  useEffect(() => {
    if (gitPollRef.current) clearInterval(gitPollRef.current);
    const hasRunning = projectSessions.some((s) => s.status === "running");
    if (hasRunning && rightSidebarOpen) {
      gitPollRef.current = setInterval(() => void refreshGit(), 10_000);
    }
    return () => { if (gitPollRef.current) clearInterval(gitPollRef.current); };
  }, [projectSessions, rightSidebarOpen, refreshGit]);

  if (!project) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-950">
        <div className="flex max-w-md flex-col items-center text-center">
          <BatonLogo size={112} className="mb-6 animate-pulse" />
          <h1 className="text-lg font-semibold text-zinc-100">No projects yet</h1>
          <p className="mt-2 text-sm text-zinc-500">Add a local folder to start passing work between agents.</p>
          <Button className="mt-5 bg-orange-600 text-white hover:bg-orange-500" onClick={() => setState({ addProjectOpen: true, addProjectError: undefined })}>
            Add project
          </Button>
        </div>
      </main>
    );
  }

  const handleRemoveProject = async (): Promise<void> => {
    await window.baton.projects.remove(project.id);
    const projects = await window.baton.projects.list();
    useAppStore.setState({
      projects,
      selectedProjectId: projects[0]?.id,
      sessions: useAppStore.getState().sessions.filter((s) => s.projectId !== project.id),
      removeProjectOpen: false,
    });
    setConfirmRemove(false);
  };

  const startRightResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const onMove = (moveEvent: PointerEvent): void => {
      const width = Math.min(520, Math.max(260, window.innerWidth - moveEvent.clientX));
      useAppStore.setState({ rightSidebarWidth: width });
      localStorage.setItem("baton-right-sidebar-width", String(width));
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const activeSession = projectSessions.find((s) => s.id === activeSessionId);
  const activeSessionName = activeSession?.name || (activeSession ? AGENT_LABELS[activeSession.agentId] : undefined);
  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac");
  const headerPl = (!sidebarOpen && isMac) ? "pl-20" : "pl-4";

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      <div className={`flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 ${headerPl} pr-3 sm:pr-4`}>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-zinc-200 sm:gap-2">
          <span className="truncate font-medium">{project.name}</span>
          <span className="text-zinc-700">/</span>
          {activeFeature ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex min-w-0 items-center gap-1 truncate text-orange-300/90">
                  <Layers className="hidden h-3.5 w-3.5 shrink-0 sm:inline" />
                  <span className="truncate">{activeFeature.title}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Active feature — passes and todos belong here</TooltipContent>
            </Tooltip>
          ) : (
            <span className="truncate text-zinc-500">no feature</span>
          )}
          <span className="hidden text-zinc-700 sm:inline">/</span>
          <span className="hidden truncate text-zinc-400 sm:inline">{activeSessionName || gitStatus?.branch || "no branch"}</span>
          {projectLoading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" /> : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setState({ commandOpen: true })}
                className="mr-0.5 flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 sm:mr-1 sm:px-2.5"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Commands</span>
                <kbd className="rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">⌘K</kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent>Search commands and features</TooltipContent>
          </Tooltip>

          <IconButton icon={TerminalSquare} label="New terminal shell (⌘T)" hideLabel onClick={() => void runAgent("terminal")} />
          <IconButton icon={FolderOpen} label="Open project folder" hideLabel onClick={() => void window.baton.projects.openFolder(project.path)} />
          <IconButton
            icon={rightSidebarOpen ? PanelRightClose : PanelRight}
            label={rightSidebarOpen ? "Close context panel" : "Open context panel"}
            hideLabel
            onClick={() => setState({ rightSidebarOpen: !rightSidebarOpen })}
          />
          <IconButton icon={History} label="Pass history" hideLabel onClick={() => setState({ previewOpen: true })} />
          <IconButton icon={Settings} label="Settings (⌘,)" hideLabel onClick={() => setState({ view: "settings" })} />
        </div>
      </div>

      <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-800 px-3">
        {projectSessions.map((session) => (
          <div key={session.id} className="group flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setState({ activeSessionId: session.id })}
              className={`flex h-8 items-center gap-1.5 rounded-l-md px-2 text-sm ${
                session.id === activeSessionId ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              <AgentIcon agentId={session.agentId} className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-28 truncate">{session.name || AGENT_LABELS[session.agentId]}</span>
              {session.status === "running"
                ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Running" />
                : session.status === "detached"
                ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Detached" />
                : session.status === "failed"
                ? <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Failed" />
                : null}
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void closeSession(session.id)}
                  className={`flex h-8 w-5 items-center justify-center rounded-r-md text-zinc-600 opacity-0 hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100 ${
                    session.id === activeSessionId ? "bg-zinc-800" : ""
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Close tab</TooltipContent>
            </Tooltip>
          </div>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              disabled={agents.filter((a) => a.installed).length === 0}
              onClick={() => setState({ quickLaunchProjectId: selectedProjectId })}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New agent</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Launch a fresh agent session</TooltipContent>
        </Tooltip>
      </div>

      <div
        className="grid min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{ gridTemplateColumns: rightSidebarOpen ? `minmax(0, 1fr) ${rightSidebarWidth}px` : "minmax(0, 1fr)" }}
      >
        <div className="min-h-0 overflow-hidden"><TerminalPane /></div>

        {rightSidebarOpen ? (
          <aside className="relative flex min-h-0 min-w-0 max-w-[520px] flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute left-[-3px] top-0 z-20 h-full w-1.5 cursor-col-resize hover:bg-orange-500/40"
                  onPointerDown={startRightResize}
                />
              </TooltipTrigger>
              <TooltipContent side="left">Drag to resize</TooltipContent>
            </Tooltip>
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2">
              <div className="min-w-0 truncate text-xs font-medium text-zinc-400">{project.name} · context</div>
              <IconButton icon={X} label="Close panel" hideLabel className="h-7 w-7" onClick={() => setState({ rightSidebarOpen: false })} />
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="min-w-0 px-4">
                <FeaturePanel
                  tasks={tasks}
                  activeFeature={activeFeature}
                  onCreate={createTask}
                  onActivate={(taskId) => void updateTaskStatus(taskId, "active")}
                  onCycleStatus={(taskId, current) => {
                    const next = current === "active" ? "paused" : current === "paused" ? "completed" : "active";
                    void updateTaskStatus(taskId, next);
                  }}
                  onDelete={deleteTask}
                />

                <Separator className="my-1" />

                <CollapsibleSection
                  title="Todos"
                  tooltip="Synced to .baton/todos.md for the active feature"
                  badge={<span className="text-zinc-600">{todos.filter((t) => t.done).length}/{todos.length}</span>}
                >
                  <div className="space-y-1">
                    {todos.length === 0 ? (
                      <Callout variant="info">Track next steps for the active feature.</Callout>
                    ) : (
                      todos.map((todo, i) => (
                        <div key={i}>
                          {confirmDeleteTodo === i ? (
                            <ConfirmRow
                              message="Remove this todo?"
                              onConfirm={() => { void deleteTodo(i); setConfirmDeleteTodo(null); }}
                              onCancel={() => setConfirmDeleteTodo(null)}
                            />
                          ) : (
                            <div className="group flex min-w-0 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => void toggleTodo(i)} className="shrink-0">
                                    {todo.done ? <CheckCircle2 className="h-4 w-4 text-orange-500" /> : <Circle className="h-4 w-4 text-zinc-500" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{todo.done ? "Mark incomplete" : "Mark done"}</TooltipContent>
                              </Tooltip>
                              <span className={`min-w-0 flex-1 break-words text-xs ${todo.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{todo.text}</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" onClick={() => setConfirmDeleteTodo(i)} className="hidden shrink-0 text-zinc-600 hover:text-red-400 group-hover:flex">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Remove todo</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div className="flex min-w-0 gap-2 pt-1">
                      <Input
                        className="h-7 min-w-0 text-xs"
                        value={todoText}
                        placeholder="New todo…"
                        onChange={(e) => setTodoText(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && todoText.trim() && selectedProjectId) {
                            const newTodos = [...todos, { text: todoText.trim(), done: false }];
                            await window.baton.todos.save(selectedProjectId, newTodos);
                            useAppStore.setState({ todos: newTodos });
                            setTodoText("");
                          }
                        }}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="h-7 shrink-0 px-2"
                            variant="secondary"
                            size="sm"
                            disabled={!todoText.trim()}
                            onClick={async () => {
                              if (!todoText.trim() || !selectedProjectId) return;
                              const newTodos = [...todos, { text: todoText.trim(), done: false }];
                              await window.baton.todos.save(selectedProjectId, newTodos);
                              useAppStore.setState({ todos: newTodos });
                              setTodoText("");
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add todo</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CollapsibleSection>

                <Separator className="my-1" />

                <CollapsibleSection
                  title="Pass history"
                  tooltip="Saved passes for the active feature only"
                  defaultOpen={false}
                  badge={<span className="text-zinc-600">{handoffs.length}</span>}
                >
                  {handoffs.length === 0 ? (
                    <Callout variant="info">Passes appear here after you use Pass to agent.</Callout>
                  ) : (
                    <div className="space-y-1">
                      {handoffs.slice(0, 8).map((handoff) => (
                        <button
                          key={handoff.id}
                          type="button"
                          className="w-full rounded-md border border-zinc-800 px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-900"
                          onClick={() => setState({ previewOpen: true })}
                        >
                          <div className="truncate text-zinc-200">{agentLabel(handoff.fromAgent)} → {agentLabel(handoff.toAgent ?? "next")}</div>
                          <div className="truncate text-[11px] text-zinc-500">{handoff.summary}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>

                <Separator className="my-1" />

                <CollapsibleSection
                  title="Changed files"
                  tooltip="Git diff summary — refreshed while agents run"
                  defaultOpen={false}
                  badge={
                    <Badge className="text-[10px]">
                      <span className="text-emerald-400">+{gitStatus?.additions ?? 0}</span>
                      <span className="mx-0.5 text-zinc-600"> </span>
                      <span className="text-red-400">-{gitStatus?.deletions ?? 0}</span>
                    </Badge>
                  }
                >
                  {gitStatus?.changedFiles.length ? (
                    <div className="space-y-0.5">
                      {gitStatus.changedFiles.slice(0, 10).map((file) => (
                        <div key={file.path} className="flex min-w-0 items-center justify-between gap-2 rounded px-1 py-0.5 text-xs text-zinc-400">
                          <span className="min-w-0 truncate">{file.path}</span>
                          <span className="shrink-0"><span className="text-emerald-400">+{file.additions}</span> <span className="text-red-400">-{file.deletions}</span></span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">No local changes detected.</p>
                  )}
                </CollapsibleSection>

                <Separator className="my-1" />

                <CollapsibleSection title="Agents" tooltip="Quick-launch installed CLIs in this project" defaultOpen={false}>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((agent) => (
                      <Tooltip key={agent.id}>
                        <TooltipTrigger asChild>
                          <span>
                            <Button size="sm" variant={agent.installed ? "secondary" : "outline"} disabled={!agent.installed} onClick={() => void runAgent(agent.id as AgentId)}>
                              <AgentIcon agentId={agent.id} className="mr-1.5 h-3.5 w-3.5" />
                              {agent.displayName}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!agent.installed ? <TooltipContent>Not detected on PATH</TooltipContent> : null}
                      </Tooltip>
                    ))}
                  </div>
                  {runAgentError ? <Callout variant="error" title="Could not start agent">{runAgentError}</Callout> : null}
                </CollapsibleSection>

                <Separator className="my-1" />

                <CollapsibleSection title="Project" tooltip="Folder on disk — removing only unlinks from Baton" defaultOpen={false}>
                  <div className="space-y-2">
                    <div className="break-all text-xs text-zinc-500">{project.path}</div>
                    {confirmRemove ? (
                      <Callout variant="warning" title="Remove from Baton?">
                        Files on disk are not deleted.
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => void handleRemoveProject()} className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600">Remove</button>
                          <button type="button" onClick={() => setConfirmRemove(false)} className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200">Cancel</button>
                        </div>
                      </Callout>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300" onClick={() => setConfirmRemove(true)}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Remove project
                      </Button>
                    )}
                  </div>
                </CollapsibleSection>
              </div>
            </ScrollArea>
          </aside>
        ) : null}
      </div>

      <HandoffBar
        latestHandoff={latestHandoff}
        error={handoffRefreshError}
        activeSessionId={activeSessionId}
        updating={handoffRefreshing}
        rightSidebarOpen={rightSidebarOpen}
        onOpenContext={() => setState({ rightSidebarOpen: true })}
        onPass={() => openHandoffPass()}
        onPreview={() => setState({ previewOpen: true })}
        onCopy={() => { navigator.clipboard.writeText(latestHandoff?.content ?? "").catch(() => {/* clipboard write failed */}); }}
        onUpdate={() => void refreshPassFromActiveSession()}
        onUse={() => { if (activeSessionId) void window.baton.agents.continue(activeSessionId); }}
      />
    </main>
  );
}

function ConfirmRow({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-900 bg-red-950/40 px-2 py-1.5">
      <span className="flex-1 truncate text-xs text-red-300">{message}</span>
      <button type="button" onClick={onConfirm} className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600">Remove</button>
      <button type="button" onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-200">Cancel</button>
    </div>
  );
}
