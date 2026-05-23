import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { AgentIcon } from "./AgentIcon";
import { TerminalPane } from "./TerminalPane";
import { useAppStore } from "../store/useAppStore";
import {
  CheckCircle2, ChevronDown, Circle, Copy, FolderOpen, History,
  Minus, PanelRight, PanelRightClose, Plus, Settings, TerminalSquare,
  X, ChevronRight, Trash2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { AgentId } from "../../../shared/types";

function labelForAgent(agent: AgentId): string {
  return { codex: "Codex", claude: "Claude Code", opencode: "OpenCode", gemini: "Gemini CLI", kiro: "Kiro" }[agent];
}

// Collapsible sidebar section
function Section({ title, badge, children, defaultOpen = true }: { title: string; badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }): JSX.Element {
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
  const [loadingAgent, setLoadingAgent] = useState(false);
  const gitPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    projects, selectedProjectId, agents, sessions, activeSessionId,
    gitStatus, latestHandoff, tasks, todos, rightSidebarOpen, runAgentError,
    runAgent, closeSession, deleteSession, createTask, toggleTask, toggleTodo,
    refreshGit, refreshHandoff, setState
  } = useAppStore();

  const project = projects.find((p) => p.id === selectedProjectId);
  const installed = agents.filter((a) => a.installed);
  const projectSessions = sessions.filter((s) => s.projectId === selectedProjectId);

  // Task #9 — auto-refresh git status every 10s while a session is running
  useEffect(() => {
    if (gitPollRef.current) clearInterval(gitPollRef.current);
    const hasRunning = projectSessions.some((s) => s.status === "running");
    if (hasRunning) {
      gitPollRef.current = setInterval(() => void refreshGit(), 10_000);
    }
    return () => { if (gitPollRef.current) clearInterval(gitPollRef.current); };
  }, [projectSessions, refreshGit]);

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

  // Task #21 — loading wrapper for runAgent
  const handleRunAgent = async (agentId: AgentId): Promise<void> => {
    setLoadingAgent(true);
    try { await runAgent(agentId); } finally { setLoadingAgent(false); }
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <button className="flex min-w-0 items-center gap-2 text-sm text-zinc-200">
          <span className="truncate font-medium">{project.name}</span>
          <span className="text-zinc-600">/</span>
          <span className="truncate text-zinc-400">{gitStatus?.branch || "no branch"}</span>
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </button>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="Terminal"><TerminalSquare className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Open folder"><FolderOpen className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title={rightSidebarOpen ? "Close panel" : "Open panel"} onClick={() => setState({ rightSidebarOpen: !rightSidebarOpen })}>
            {rightSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" title="Handoff history" onClick={() => setState({ previewOpen: true })}><History className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Settings" onClick={() => setState({ view: "settings" })}><Settings className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Session tabs — Task #3: + opens AgentSelectorDialog, Task #20: show index for duplicate agents */}
      <div className="flex h-10 items-center gap-1 border-b border-zinc-800 px-3">
        {projectSessions.map((session) => (
          <div key={session.id} className="group flex items-center">
            <button
              onClick={() => setState({ activeSessionId: session.id })}
              className={`flex items-center gap-1.5 h-8 rounded-l-md px-2 text-sm ${
                session.id === activeSessionId ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              <AgentIcon agentId={session.agentId} className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-28 truncate">{session.name || labelForAgent(session.agentId)}</span>
              {session.status === "running"
                ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                : session.status === "failed"
                ? <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                : null}
            </button>
            <button
              onClick={() => void closeSession(session.id)}
              className={`flex h-8 w-5 items-center justify-center rounded-r-md text-zinc-600 opacity-0 hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100 ${
                session.id === activeSessionId ? "bg-zinc-800" : ""
              }`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {/* Task #3 — open AgentSelectorDialog, Task #21 — show spinner */}
        <Button
          size="sm"
          variant="ghost"
          disabled={loadingAgent || installed.length === 0}
          onClick={() => setState({ usePassOpen: true })}
          title="Launch a new agent session"
        >
          {loadingAgent ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" /> : <Plus className="h-4 w-4" />}
          New agent
        </Button>
      </div>

      {/* Main content */}
      <div className={`grid min-h-0 flex-1 ${rightSidebarOpen ? "grid-cols-[1fr_300px]" : "grid-cols-[1fr]"}`}>
        {/* Task #4 — TerminalPane already has empty state, but we enhance it */}
        <div className="min-h-0 overflow-hidden"><TerminalPane /></div>

        {rightSidebarOpen ? (
          <aside className="flex flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm px-4 py-2">
              <div className="text-xs font-medium uppercase text-zinc-500">Info</div>
              <button onClick={() => setState({ rightSidebarOpen: false })} className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-4">

                {/* Task #6 — Tasks with paused state */}
                <Section title="Tasks" badge={<span className="text-zinc-600">{tasks.filter((t) => t.status === "completed").length}/{tasks.length}</span>}>
                  <div className="space-y-1">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-zinc-600">No tasks yet. Add one below.</p>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="group flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5">
                          {/* cycle: active → paused → completed → active */}
                          <button
                            title={task.status === "active" ? "Pause" : task.status === "paused" ? "Complete" : "Reopen"}
                            onClick={() => {
                              const next = task.status === "active" ? "paused" : task.status === "paused" ? "completed" : "active";
                              void useAppStore.getState().toggleTask(task.id, next === "completed");
                              if (next === "paused") void window.baton.tasks.updateStatus(task.id, "paused");
                            }}
                            className="shrink-0"
                          >
                            {task.status === "completed"
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : task.status === "paused"
                              ? <Minus className="h-4 w-4 text-amber-400" />
                              : <Circle className="h-4 w-4 text-zinc-500" />}
                          </button>
                          <span className={`min-w-0 flex-1 truncate text-xs ${
                            task.status === "completed" ? "text-zinc-500 line-through" :
                            task.status === "paused" ? "text-amber-400/80" : "text-zinc-200"
                          }`}>
                            {task.title}
                          </span>
                          {task.status === "paused" && <Badge className="shrink-0 border-amber-900 text-amber-400 text-[10px] px-1">paused</Badge>}
                        </div>
                      ))
                    )}
                    <div className="flex gap-2 pt-1">
                      <Input
                        className="h-7 text-xs"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="New task..."
                        onKeyDown={(e) => { if (e.key === "Enter" && taskTitle.trim()) { void createTask(taskTitle); setTaskTitle(""); } }}
                      />
                      <Button className="h-7 shrink-0" variant="secondary" size="sm"
                        onClick={() => { void createTask(taskTitle); setTaskTitle(""); }}
                        disabled={!taskTitle.trim()}
                      >Add</Button>
                    </div>
                  </div>
                </Section>

                <Separator className="my-1" />

                {/* Task #7 — Todos with inline creation */}
                <Section title="Todos" badge={<span className="text-zinc-600">{todos.filter((t) => t.done).length}/{todos.length}</span>}>
                  <div className="space-y-1">
                    {todos.length === 0 ? (
                      <p className="text-xs text-zinc-600">No todos yet.</p>
                    ) : (
                      todos.map((todo, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5">
                          <button onClick={() => void toggleTodo(i)} className="shrink-0">
                            {todo.done
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : <Circle className="h-4 w-4 text-zinc-500" />}
                          </button>
                          <span className={`min-w-0 flex-1 truncate text-xs ${todo.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>{todo.text}</span>
                        </div>
                      ))
                    )}
                    <div className="flex gap-2 pt-1">
                      <Input
                        className="h-7 text-xs"
                        value={todoText}
                        onChange={(e) => setTodoText(e.target.value)}
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

                {/* Changed files */}
                <Section title="Changed Files" defaultOpen={true} badge={
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
                  ) : (
                    <p className="text-xs text-zinc-600">No changed files.</p>
                  )}
                </Section>

                <Separator className="my-1" />

                {/* Agents */}
                <Section title="Agents" defaultOpen={true}>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((agent) => (
                      <Button key={agent.id} size="sm" variant={agent.installed ? "secondary" : "outline"} disabled={!agent.installed || loadingAgent}
                        onClick={() => void handleRunAgent(agent.id)}
                      >
                        <AgentIcon agentId={agent.id} className="mr-1.5 h-3.5 w-3.5" />
                        {agent.displayName}
                      </Button>
                    ))}
                  </div>
                  {runAgentError ? <div className="mt-2 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200">{runAgentError}</div> : null}
                </Section>

                {/* Task #16 — Project removal */}
                <Separator className="my-1" />
                <Section title="Project" defaultOpen={false}>
                  <div className="space-y-2">
                    <div className="text-xs text-zinc-500 break-all">{project.path}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300"
                      onClick={() => setState({ removeProjectOpen: true } as never)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Remove Project
                    </Button>
                  </div>
                </Section>

              </div>
            </ScrollArea>
          </aside>
        ) : null}
      </div>

      {/* Task #5 — Handoff bottom bar with explanation */}
      <div className="flex h-14 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4">
        <div className="text-xs text-zinc-500">
          {latestHandoff
            ? <>Handoff ready · <span className="text-zinc-400">{latestHandoff.fromAgent} → {latestHandoff.toAgent ?? "next agent"}</span></>
            : "No handoff yet. Create one to pass context between agents."}
        </div>
        <div className="flex gap-2">
          {latestHandoff ? (
            <>
              <Button variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(latestHandoff.content ?? "")}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setState({ previewOpen: true })}>
                Preview
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 text-white hover:bg-emerald-500"
                disabled={!activeSessionId}
                title="Injects the handoff context into the active terminal session so the agent can continue from where the last one left off."
                onClick={() => activeSessionId && void window.baton.agents.continue(activeSessionId)}
              >
                Use Handoff ↵
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setState({ handoffSheetOpen: true })}>
              Create Handoff
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
