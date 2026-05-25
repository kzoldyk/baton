import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { AgentIcon } from "./AgentIcon";
import { TerminalPane } from "./TerminalPane";
import { useAppStore } from "../store/useAppStore";
import {
  CheckCircle2, ChevronDown, ChevronRight, Circle, Copy, FolderOpen,
  History, Minus, PanelRight, PanelRightClose, Plus, Settings,
  RefreshCw, TerminalSquare, Trash2, X
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AGENT_LABELS, type AgentId } from "../../../shared/types";

function Section({ title, badge, children, defaultOpen = true }: {
  title: string; badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 text-xs font-medium uppercase text-zinc-500 hover:text-zinc-300"
      >
        <span className="flex items-center gap-1">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {title}
        </span>
        {badge}
      </button>
      {open ? <div className="pb-2">{children}</div> : null}
    </div>
  );
}

export function Workspace(): JSX.Element {
  const [taskTitle, setTaskTitle] = useState("");
  const [todoText, setTodoText] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<string | null>(null);
  const [confirmDeleteTodo, setConfirmDeleteTodo] = useState<number | null>(null);
  const [updatingHandoff, setUpdatingHandoff] = useState(false);
  const [handoffUpdateError, setHandoffUpdateError] = useState<string | undefined>();
  const gitPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    projects, selectedProjectId, agents, sessions, activeSessionId,
    gitStatus, latestHandoff, tasks, todos, rightSidebarOpen, rightSidebarWidth, projectLoading,
    runAgentError, runAgent, closeSession, createTask, updateTaskStatus,
    deleteTask, toggleTodo, deleteTodo, refreshGit, setState
  } = useAppStore();

  const project = projects.find((p) => p.id === selectedProjectId);
  const projectSessions = sessions.filter((s) => s.projectId === selectedProjectId);

  // #31 — only poll git when sidebar is open
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
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-zinc-100">No projects yet.</h1>
          <p className="mt-2 text-sm text-zinc-500">Add a local project to start using Baton.</p>
          <Button className="mt-5" onClick={() => setState({ addProjectOpen: true, addProjectError: undefined })}>Add Project</Button>
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

  const updateHandoffContext = async (): Promise<void> => {
    if (!activeSessionId || !selectedProjectId || !latestHandoff) return;
    const activeTask = tasks.find((task) => task.status === "active");
    setUpdatingHandoff(true);
    setHandoffUpdateError(undefined);
    try {
      await window.baton.agents.updateHandoffPrompt(activeSessionId);
      await window.baton.handoff.waitForUpdatedLatest(
        selectedProjectId,
        latestHandoff.content ?? "",
        latestHandoff.fromAgent,
        latestHandoff.toAgent,
        activeTask?.id ?? latestHandoff.taskId
      );
      await Promise.all([useAppStore.getState().refreshHandoff(), useAppStore.getState().refreshTodos()]);
    } catch (error) {
      setHandoffUpdateError(error instanceof Error ? error.message : "Could not update handoff context.");
    } finally {
      setUpdatingHandoff(false);
    }
  };

  const activeSession = projectSessions.find((s) => s.id === activeSessionId);
  const activeSessionName = activeSession?.name || (activeSession ? AGENT_LABELS[activeSession.agentId] : undefined);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      {/* #34 — min-w-0 on header left side */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-200">
          <span className="truncate font-medium">{project.name}</span>
          <span className="text-zinc-600">/</span>
          <span className="truncate text-zinc-400">{activeSessionName || gitStatus?.branch || "no branch"}</span>
          <ChevronDown className="h-3 w-3 text-zinc-600" />
          {/* #21 — project loading spinner */}
          {projectLoading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" title="Terminal"><TerminalSquare className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Open folder"><FolderOpen className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title={rightSidebarOpen ? "Close panel" : "Open panel"} onClick={() => setState({ rightSidebarOpen: !rightSidebarOpen })}>
            {rightSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" title="Handoff history" onClick={() => setState({ previewOpen: true })}><History className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Settings" onClick={() => setState({ view: "settings" })}><Settings className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* #33 — overflow-x-auto on tab bar, #12 — close tooltip */}
      <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-800 px-3">
        {projectSessions.map((session) => (
          <div key={session.id} className="group flex shrink-0 items-center">
            <button
              onClick={() => setState({ activeSessionId: session.id })}
              className={`flex items-center gap-1.5 h-8 rounded-l-md px-2 text-sm ${
                session.id === activeSessionId ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              <AgentIcon agentId={session.agentId} className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-28 truncate">{session.name || AGENT_LABELS[session.agentId]}</span>
              {session.status === "running"
                ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                : session.status === "failed"
                ? <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                : null}
            </button>
            {/* #12 — title says "Close tab" */}
            <button
              title="Close tab"
              onClick={() => void closeSession(session.id)}
              className={`flex h-8 w-5 items-center justify-center rounded-r-md text-zinc-600 opacity-0 hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100 ${
                session.id === activeSessionId ? "bg-zinc-800" : ""
              }`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {/* #8/#20 — open QuickLaunchAgentDialog (plain picker, not Baton Pass) */}
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
          disabled={agents.filter((a) => a.installed).length === 0}
          onClick={() => setState({ quickLaunchProjectId: selectedProjectId })}
          title="Launch a new agent session"
        >
          <Plus className="h-4 w-4" />
          New agent
        </Button>
      </div>

      {/* Main content */}
      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: rightSidebarOpen ? `minmax(0, 1fr) ${rightSidebarWidth}px` : "minmax(0, 1fr)" }}
      >
        <div className="min-h-0 overflow-hidden"><TerminalPane /></div>

        {/* #1/#32 — proper flex layout so ScrollArea fills and doesn't clip */}
        {rightSidebarOpen ? (
          <aside className="relative flex min-h-0 min-w-[260px] max-w-[520px] flex-col border-l border-zinc-800 bg-zinc-950">
            <div
              className="absolute left-[-3px] top-0 z-20 h-full w-1.5 cursor-col-resize hover:bg-emerald-500/40"
              onPointerDown={startRightResize}
              title="Resize panel"
            />
            {/* #18 — show project name instead of generic "Info" */}
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-2">
              <div className="truncate text-xs font-medium text-zinc-400">{project.name}</div>
              <button onClick={() => setState({ rightSidebarOpen: false })} aria-label="Close panel" className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4">

                {/* Tasks — #5 fixed cycle, #25 delete */}
                <Section title="Tasks" badge={<span className="text-zinc-600">{tasks.filter((t) => t.status === "completed").length}/{tasks.length}</span>}>
                  <div className="space-y-1">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-zinc-600">No tasks yet.</p>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id}>
                          {confirmDeleteTask === task.id ? (
                            <div className="flex items-center gap-2 rounded-md border border-red-900 bg-red-950/40 px-2 py-1.5">
                              <span className="flex-1 truncate text-xs text-red-300">Delete task?</span>
                              <button onClick={() => { void deleteTask(task.id); setConfirmDeleteTask(null); }} className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600">Delete</button>
                              <button onClick={() => setConfirmDeleteTask(null)} className="text-xs text-zinc-400 hover:text-zinc-200">Cancel</button>
                            </div>
                          ) : (
                            <div className="group flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5">
                              <button
                                title={task.status === "active" ? "Pause" : task.status === "paused" ? "Complete" : "Reopen"}
                                onClick={() => {
                                  const next = task.status === "active" ? "paused" : task.status === "paused" ? "completed" : "active";
                                  void updateTaskStatus(task.id, next);
                                }}
                                className="shrink-0"
                              >
                                {task.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  : task.status === "paused" ? <Minus className="h-4 w-4 text-amber-400" />
                                  : <Circle className="h-4 w-4 text-zinc-500" />}
                              </button>
                              <span className={`min-w-0 flex-1 truncate text-xs ${
                                task.status === "completed" ? "text-zinc-500 line-through"
                                : task.status === "paused" ? "text-amber-400/80"
                                : "text-zinc-200"
                              }`}>{task.title}</span>
                              {task.status === "paused" && <Badge className="shrink-0 border-amber-900 px-1 text-[10px] text-amber-400">paused</Badge>}
                              <button
                                title="Delete task"
                                onClick={() => setConfirmDeleteTask(task.id)}
                                className="hidden shrink-0 text-zinc-600 hover:text-red-400 group-hover:flex"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div className="flex gap-2 pt-1">
                      <Input className="h-7 text-xs" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="New task..."
                        onKeyDown={(e) => { if (e.key === "Enter" && taskTitle.trim()) { void createTask(taskTitle); setTaskTitle(""); } }}
                      />
                      <Button className="h-7 shrink-0" variant="secondary" size="sm"
                        disabled={!taskTitle.trim()}
                        onClick={() => { void createTask(taskTitle); setTaskTitle(""); }}
                      >Add</Button>
                    </div>
                  </div>
                </Section>

                <Separator className="my-1" />

                {/* Todos — #24 delete */}
                <Section title="Todos" badge={<span className="text-zinc-600">{todos.filter((t) => t.done).length}/{todos.length}</span>}>
                  <div className="space-y-1">
                    {todos.length === 0 ? <p className="text-xs text-zinc-600">No todos yet.</p> : (
                      todos.map((todo, i) => (
                        <div key={i}>
                          {confirmDeleteTodo === i ? (
                            <div className="flex items-center gap-2 rounded-md border border-red-900 bg-red-950/40 px-2 py-1.5">
                              <span className="flex-1 truncate text-xs text-red-300">Delete todo?</span>
                              <button onClick={() => { void deleteTodo(i); setConfirmDeleteTodo(null); }} className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600">Delete</button>
                              <button onClick={() => setConfirmDeleteTodo(null)} className="text-xs text-zinc-400 hover:text-zinc-200">Cancel</button>
                            </div>
                          ) : (
                            <div className="group flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5">
                              <button onClick={() => void toggleTodo(i)} aria-label={todo.done ? "Mark todo incomplete" : "Mark todo complete"} className="shrink-0">
                                {todo.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-zinc-500" />}
                              </button>
                              <span className={`min-w-0 flex-1 truncate text-xs ${todo.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{todo.text}</span>
                              <button
                                title="Delete todo"
                                onClick={() => setConfirmDeleteTodo(i)}
                                className="hidden shrink-0 text-zinc-600 hover:text-red-400 group-hover:flex"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div className="flex gap-2 pt-1">
                      <Input className="h-7 text-xs" value={todoText} onChange={(e) => setTodoText(e.target.value)}
                        placeholder="New todo..."
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && todoText.trim() && selectedProjectId) {
                            const newTodos = [...todos, { text: todoText.trim(), done: false }];
                            await window.baton.todos.save(selectedProjectId, newTodos);
                            useAppStore.setState({ todos: newTodos });
                            setTodoText("");
                          }
                        }}
                      />
                      <Button className="h-7 shrink-0" variant="secondary" size="sm"
                        disabled={!todoText.trim()}
                        onClick={async () => {
                          if (!todoText.trim() || !selectedProjectId) return;
                          const newTodos = [...todos, { text: todoText.trim(), done: false }];
                          await window.baton.todos.save(selectedProjectId, newTodos);
                          useAppStore.setState({ todos: newTodos });
                          setTodoText("");
                        }}
                      >Add</Button>
                    </div>
                  </div>
                </Section>

                <Separator className="my-1" />

                {/* #26 — Changed Files default closed */}
                <Section title="Changed Files" defaultOpen={false} badge={
                  <Badge className="text-[10px]">
                    <span className="text-emerald-400">+{gitStatus?.additions ?? 0}</span>
                    <span className="mx-0.5 text-zinc-600"> </span>
                    <span className="text-red-400">-{gitStatus?.deletions ?? 0}</span>
                  </Badge>
                }>
                  {gitStatus?.changedFiles.length ? (
                    <div className="space-y-0.5">
                      {gitStatus.changedFiles.slice(0, 10).map((file) => (
                        <div key={file.path} className="flex items-center justify-between gap-2 rounded px-1 py-0.5 text-xs text-zinc-400">
                          <span className="truncate">{file.path}</span>
                          <span className="shrink-0"><span className="text-emerald-400">+{file.additions}</span> <span className="text-red-400">-{file.deletions}</span></span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-zinc-600">No changed files.</p>}
                </Section>

                <Separator className="my-1" />

                {/* #26 — Agents default closed */}
                <Section title="Agents" defaultOpen={false}>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((agent) => (
                      <Button key={agent.id} size="sm" variant={agent.installed ? "secondary" : "outline"} disabled={!agent.installed}
                        onClick={() => void runAgent(agent.id)}
                      >
                        <AgentIcon agentId={agent.id} className="mr-1.5 h-3.5 w-3.5" />
                        {agent.displayName}
                      </Button>
                    ))}
                  </div>
                  {runAgentError && <div className="mt-2 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200">{runAgentError}</div>}
                </Section>

                <Separator className="my-1" />

                {/* #6 — Remove project with inline confirm */}
                <Section title="Project" defaultOpen={false}>
                  <div className="space-y-2">
                    <div className="break-all text-xs text-zinc-500">{project.path}</div>
                    {confirmRemove ? (
                      <div className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2">
                        <p className="text-xs text-red-300">Remove this project from Baton? (Files are not deleted.)</p>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => void handleRemoveProject()} className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600">Remove</button>
                          <button onClick={() => setConfirmRemove(false)} className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300"
                        onClick={() => setConfirmRemove(true)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Remove Project
                      </Button>
                    )}
                  </div>
                </Section>

              </div>
            </ScrollArea>
          </aside>
        ) : null}
      </div>

      {/* Handoff bottom bar — #22 tooltip on disabled button */}
      <div className="flex h-14 shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4">
        <div className="text-xs text-zinc-500">
          {handoffUpdateError
            ? <span className="text-red-300">{handoffUpdateError}</span>
            : latestHandoff
            ? <><span className="text-zinc-400">{latestHandoff.fromAgent} → {latestHandoff.toAgent ?? "next agent"}</span> · handoff ready</>
            : "No handoff yet. Create one to pass context between agents."}
        </div>
        <div className="flex gap-2">
          {latestHandoff ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(latestHandoff.content ?? "").catch(() => {/* clipboard write failed */}); }}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!activeSessionId || updatingHandoff}
                title={!activeSessionId ? "Start an agent session first" : "Reinject an update prompt and rewrite .baton/latest-handoff.md"}
                onClick={() => void updateHandoffContext()}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${updatingHandoff ? "animate-spin" : ""}`} />
                {updatingHandoff ? "Updating" : "Update Context"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setState({ previewOpen: true })}>Preview</Button>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                disabled={!activeSessionId}
                title={!activeSessionId ? "Start an agent session first" : "Inject handoff context into the active terminal session"}
                onClick={() => activeSessionId && void window.baton.agents.continue(activeSessionId)}
              >
                Use Handoff ↵
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setState({ handoffSheetOpen: true })}>Create Handoff</Button>
          )}
        </div>
      </div>
    </main>
  );
}
