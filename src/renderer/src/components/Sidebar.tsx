import { Bot, Check, Folder, FolderPlus, MessageSquare, Pencil, Plus, PanelLeftClose, Server, Settings, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { AgentIcon } from "./AgentIcon";
import { useAppStore } from "../store/useAppStore";

function agentLabel(agentId: string): string {
  return { codex: "Codex", claude: "Claude Code", opencode: "OpenCode", gemini: "Gemini CLI", kiro: "Kiro" }[agentId] ?? agentId;
}

function RenameInput({ current, onSave, onCancel }: { current: string; onSave: (name: string) => void; onCancel: () => void }): JSX.Element {
  const [value, setValue] = useState(current);
  return (
    <div className="flex items-center gap-1 px-1">
      <input
        autoFocus
        className="h-6 min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-2 text-xs text-zinc-100 outline-none focus:border-zinc-400"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSave(value.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
      <button onClick={() => value.trim() && onSave(value.trim())} className="flex h-6 w-6 items-center justify-center rounded text-emerald-400 hover:bg-zinc-800">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button onClick={onCancel} className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }): JSX.Element {
  return (
    <div className="mx-1 rounded-md border border-red-900 bg-red-950/40 px-3 py-2">
      <p className="text-xs text-red-300">Delete this session?</p>
      <div className="mt-2 flex gap-2">
        <button onClick={onConfirm} className="rounded bg-red-700 px-2 py-0.5 text-xs text-white hover:bg-red-600">Delete</button>
        <button onClick={onCancel} className="rounded px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200">Cancel</button>
      </div>
    </div>
  );
}

export function Sidebar(): JSX.Element {
  const { projects, selectedProjectId, gitStatus, sessions, activeSessionId, selectProject, renameSession, deleteSession, setState } = useAppStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activateSession = async (projectId: string, sessionId: string): Promise<void> => {
    await selectProject(projectId);
    setState({ activeSessionId: sessionId });
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-16 items-center justify-between px-4 pt-10">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Projects</div>
        <button
          onClick={() => setState({ sidebarOpen: false })}
          className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          title="Close sidebar (⌘B)"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <ScrollArea className="flex-1 px-2">
        {projects.length === 0 ? (
          <div className="px-3 py-6 text-sm text-zinc-500">No projects yet.</div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const selected = project.id === selectedProjectId;
              const projectSessions = sessions.filter((s) => s.projectId === project.id);
              return (
                <div key={project.id}>
                  <div className="group flex items-center gap-1">
                    <button
                      className={`flex items-center gap-2 min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm ${selected ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}
                      onClick={() => void selectProject(project.id)}
                    >
                      <Folder className="mt-0.5 h-4 w-4 shrink-0 self-start text-zinc-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{project.name}</span>
                          {selected && gitStatus?.isRepo ? (
                            <span className="shrink-0 text-xs">
                              <span className="text-emerald-400">+{gitStatus.additions}</span> <span className="text-red-400">-{gitStatus.deletions}</span>
                            </span>
                          ) : null}
                        </div>
                        {selected ? <div className="mt-0.5 truncate text-xs text-zinc-500">{gitStatus?.branch || project.path}</div> : null}
                      </div>
                    </button>
                    <button
                      className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 opacity-0 hover:bg-zinc-800 hover:text-zinc-200 group-hover:opacity-100"
                      title="Launch agent for this project"
                      onClick={() => setState({ quickLaunchProjectId: project.id })}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {projectSessions.length > 0 ? (
                    <div className="ml-2 mt-1 space-y-0.5">
                      {projectSessions.map((session) => {
                        const sessionActive = session.id === activeSessionId && selected;
                        if (renamingId === session.id) {
                          return (
                            <RenameInput
                              key={session.id}
                              current={session.name || agentLabel(session.agentId)}
                              onSave={(name) => { void renameSession(session.id, name); setRenamingId(null); }}
                              onCancel={() => setRenamingId(null)}
                            />
                          );
                        }
                        if (deletingId === session.id) {
                          return (
                            <DeleteConfirm
                              key={session.id}
                              onConfirm={() => { void deleteSession(session.id); setDeletingId(null); }}
                              onCancel={() => setDeletingId(null)}
                            />
                          );
                        }
                        return (
                          <div key={session.id} className="group flex items-center gap-1">
                            <button
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm ${
                                sessionActive ? "bg-zinc-800/70 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                              }`}
                              onClick={() => void activateSession(project.id, session.id)}
                            >
                              <AgentIcon agentId={session.agentId} className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                              <span className="truncate">{session.name || agentLabel(session.agentId)}</span>
                              {session.status === "running" ? <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /> : null}
                            </button>
                            <button
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 opacity-0 hover:bg-zinc-800 hover:text-zinc-200 group-hover:opacity-100"
                              title="Rename"
                              onClick={() => setRenamingId(session.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 opacity-0 hover:bg-red-950 hover:text-red-400 group-hover:opacity-100"
                              title="Delete session"
                              onClick={() => setDeletingId(session.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <Separator />
      <div className="space-y-1 p-2">
        <Button variant="ghost" className="w-full justify-start" onClick={() => setState({ addProjectOpen: true, addProjectError: undefined })}>
          <FolderPlus className="h-4 w-4" /> Add Project <Badge className="ml-auto">⌘N</Badge>
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setState({ view: "mcp" })}>
          <Server className="h-4 w-4" /> MCP
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setState({ view: "settings" })}>
          <Settings className="h-4 w-4" /> Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start text-zinc-500" onClick={() => window.open("https://github.com/", "_blank")}>
          <MessageSquare className="h-4 w-4" /> Give feedback
        </Button>
      </div>
    </aside>
  );
}
