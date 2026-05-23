import { ChevronDown, Columns2, FolderOpen, History, PanelLeft, Plus, Settings, TerminalSquare } from "lucide-react";
import { useState } from "react";
import type { AgentId } from "../../../shared/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { TerminalPane } from "./TerminalPane";
import { useAppStore } from "../store/useAppStore";

export function Workspace(): JSX.Element {
  const [taskTitle, setTaskTitle] = useState("");
  const { projects, selectedProjectId, agents, sessions, activeSessionId, gitStatus, latestHandoff, activeTask, runAgentError, runAgent, createTask, setState } = useAppStore();
  const project = projects.find((item) => item.id === selectedProjectId);
  const installed = agents.filter((agent) => agent.installed);

  if (!project) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-950">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-zinc-100">No projects yet.</h1>
          <p className="mt-2 text-sm text-zinc-500">Add a local project to start using Baton. Baton will create a lightweight .baton folder for context handoffs.</p>
          <Button className="mt-5" onClick={() => setState({ addProjectOpen: true, addProjectError: undefined })}>Add Project</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
      <div className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <button className="flex min-w-0 items-center gap-2 text-sm text-zinc-200">
          <span className="truncate font-medium">{project.name}</span>
          <span className="text-zinc-600">/</span>
          <span className="truncate text-zinc-400">{gitStatus?.branch || "no branch"}</span>
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </button>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="Terminal"><TerminalSquare className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Split view"><Columns2 className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Open folder"><FolderOpen className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="History" onClick={() => setState({ previewOpen: true })}><History className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" title="Settings" onClick={() => setState({ view: "settings" })}><Settings className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex h-10 items-center gap-1 border-b border-zinc-800 px-3">
        {sessions.filter((s) => s.projectId === project.id).map((session) => (
          <button
            key={session.id}
            onClick={() => setState({ activeSessionId: session.id })}
            className={`h-8 rounded-md px-3 text-sm ${session.id === activeSessionId ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900"}`}
          >
            {session.name || labelForAgent(session.agentId)}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => installed[0] && void runAgent(installed[0].id)}>
          <Plus className="h-4 w-4" /> New agent
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px]">
        <TerminalPane />
        <aside className="border-l border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs font-medium uppercase text-zinc-500">Current Task</div>
          <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
            {activeTask ? (
              <>
                <div className="text-sm font-medium text-zinc-200">{activeTask.title}</div>
                <p className="mt-1 text-sm text-zinc-500">Saved to `.baton/current-task.md`.</p>
              </>
            ) : (
              <>
                <div className="text-sm font-medium text-zinc-200">No active task.</div>
                <p className="mt-1 text-sm text-zinc-500">Create a task so Baton can build better handoffs.</p>
                <Input className="mt-3" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Fix Cashfree webhook verification" />
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void createTask(taskTitle);
                    setTaskTitle("");
                  }}
                >
                  Create Task
                </Button>
              </>
            )}
          </div>
          <Separator className="my-4" />
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium uppercase text-zinc-500">Changed Files</div>
            <Badge><span className="text-emerald-400">+{gitStatus?.additions ?? 0}</span> <span className="text-red-400">-{gitStatus?.deletions ?? 0}</span></Badge>
          </div>
          <div className="space-y-1">
            {gitStatus?.changedFiles.slice(0, 8).map((file) => (
              <div key={file.path} className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs text-zinc-400">
                <span className="truncate">{file.path}</span>
                <span className="shrink-0"><span className="text-emerald-400">+{file.additions}</span> <span className="text-red-400">-{file.deletions}</span></span>
              </div>
            ))}
            {!gitStatus?.changedFiles.length ? <div className="text-sm text-zinc-600">No changed files detected.</div> : null}
          </div>
          <Separator className="my-4" />
          <div className="text-xs font-medium uppercase text-zinc-500">Agents</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {agents.map((agent) => (
              <Button key={agent.id} size="sm" variant={agent.installed ? "secondary" : "outline"} disabled={!agent.installed} onClick={() => void runAgent(agent.id)}>
                Run {agent.displayName}
              </Button>
            ))}
          </div>
          {runAgentError ? <div className="mt-3 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">{runAgentError}</div> : null}
        </aside>
      </div>

      <div className="flex h-14 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <PanelLeft className="h-4 w-4" />
          Baton Pass is the handoff layer for this project.
        </div>
        <div className="flex gap-2">
          {latestHandoff ? (
            <>
              <Button variant="secondary" onClick={() => setState({ previewOpen: true })}>Preview</Button>
              <Button onClick={() => setState({ usePassOpen: true })}>Use Baton Pass →</Button>
            </>
          ) : (
            <Button onClick={() => setState({ handoffSheetOpen: true })}>Create Baton Pass ↑</Button>
          )}
          {latestHandoff ? <Button variant="outline" onClick={() => setState({ handoffSheetOpen: true })}>Create New Pass</Button> : null}
        </div>
      </div>
    </main>
  );
}

function labelForAgent(agent: AgentId): string {
  return {
    codex: "Codex",
    claude: "Claude Code",
    opencode: "OpenCode",
    gemini: "Gemini CLI",
    kiro: "Kiro"
  }[agent];
}
