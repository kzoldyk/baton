import { Check, CheckCircle2, Folder, FolderPlus, MessageSquare, Pencil, Play, Plus, PanelLeftClose, Server, Settings, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { AgentIcon } from "./AgentIcon";
import { useAppStore } from "../store/useAppStore";

function agentLabel(agentId: string): string {
  return { codex: "Codex", claude: "Claude Code", opencode: "OpenCode", gemini: "Gemini CLI", kiro: "Kiro" }[agentId] ?? agentId;
}

// #14 — relative time helper
function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
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
  const { projects, selectedProjectId, gitStatus, sessions, activeSessionId, sidebarWidth, selectProject, renameSession, deleteSession, resumeSession, setState } = useAppStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // #16 — persist collapse state in localStorage
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("baton-collapsed") ?? "{}") as Record<string, boolean>; }
    catch { return {}; }
  });
  const toggleCollapse = (id: string): void => {
    const next = { ...collapsed, [id]: !collapsed[id] };
    setCollapsed(next);
    localStorage.setItem("baton-collapsed", JSON.stringify(next));
  };

  const activateSession = async (projectId: string, sessionId: string): Promise<void> => {
    if (projectId !== selectedProjectId) await selectProject(projectId);
    setState({ activeSessionId: sessionId });
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const onMove = (moveEvent: PointerEvent): void => {
      const width = Math.min(420, Math.max(200, moveEvent.clientX));
      useAppStore.setState({ sidebarWidth: width });
      localStorage.setItem("baton-sidebar-width", String(width));
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <aside className="relative flex h-full shrink-0 flex-col border-r border-zinc-800 bg-zinc-950" style={{ width: sidebarWidth }}>
      <div
        className="absolute right-[-3px] top-0 z-20 h-full w-1.5 cursor-col-resize hover:bg-emerald-500/40"
        onPointerDown={startResize}
        title="Resize sidebar"
      />
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
          <div className="space-y-1">
            {projects.map((project) => {
              const selected = project.id === selectedProjectId;
              const projectSessions = sessions.filter((s) => s.projectId === project.id);
              const isCollapsed = collapsed[project.id] ?? false;

              return (
                <div key={project.id}>
                  <div className="group flex items-center gap-1">
                    <button
                      // #17 — always show path as tooltip
                      title={project.path}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${selected ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}
                      onClick={() => void selectProject(project.id)}
                    >
                      <Folder className="mt-0.5 h-4 w-4 shrink-0 self-start text-zinc-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{project.name}</span>
                          {selected && gitStatus?.isRepo ? (
                            <span className="shrink-0 text-xs">
                              <span className="text-emerald-400">+{gitStatus.additions}</span>
                              <span className="text-red-400"> -{gitStatus.deletions}</span>
                            </span>
                          ) : null}
                        </div>
                        {selected && <div className="mt-0.5 truncate text-xs text-zinc-500">{gitStatus?.branch || project.path}</div>}
                      </div>
                    </button>
                    {/* collapse toggle */}
                    {projectSessions.length > 0 && (
                      <button
                        onClick={() => toggleCollapse(project.id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 opacity-0 hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100"
                        title={isCollapsed ? "Expand sessions" : "Collapse sessions"}
                      >
                        {isCollapsed ? "›" : "‹"}
                      </button>
                    )}
                    <button
                      className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 opacity-0 hover:bg-zinc-800 hover:text-zinc-200 group-hover:opacity-100"
                      title="Launch agent for this project"
                      onClick={() => setState({ quickLaunchProjectId: project.id })}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {!isCollapsed && projectSessions.length > 0 && (
                    <div className="ml-2 mt-0.5 space-y-0.5">
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
                          <div key={session.id} className="group/session flex items-center gap-0.5">
                            <button
                              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                                sessionActive ? "bg-zinc-800/70 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                              }`}
                              onClick={() => void activateSession(project.id, session.id)}
                            >
                              <AgentIcon agentId={session.agentId} className="h-3 w-3 shrink-0" />
                              <span className="truncate">{session.name || agentLabel(session.agentId)}</span>
                              {/* #13 — status icons */}
                              {session.status === "running"
                                ? <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                : session.status === "failed"
                                ? <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                                : session.status === "completed"
                                ? <CheckCircle2 className="ml-auto h-3 w-3 shrink-0 text-zinc-600" />
                                : null}
                              {/* #14 — relative time */}
                              <span className="ml-1 shrink-0 text-[10px] text-zinc-600">{relativeTime(session.startedAt)}</span>
                            </button>

                            {/* #15 — resume button for completed/failed */}
                            {(session.status === "completed" || session.status === "failed") && (
                              <button
                                title="Resume — launch same agent again"
                                onClick={() => void resumeSession(session.id)}
                                // #35 — always visible for active session
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-800 hover:text-emerald-400 ${sessionActive ? "opacity-100" : "opacity-0 group-hover/session:opacity-100"}`}
                              >
                                <Play className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              title="Rename"
                              onClick={() => setRenamingId(session.id)}
                              // #35 — always visible for active session
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 ${sessionActive ? "opacity-100" : "opacity-0 group-hover/session:opacity-100"}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              title="Delete session"
                              onClick={() => setDeletingId(session.id)}
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-red-950 hover:text-red-400 ${sessionActive ? "opacity-100" : "opacity-0 group-hover/session:opacity-100"}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* #27 — icon-only bottom nav with tooltips */}
      <div className="flex items-center justify-around px-2 py-3">
        <button
          title="Add Project (⌘N)"
          onClick={() => setState({ addProjectOpen: true, addProjectError: undefined })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <FolderPlus className="h-4 w-4" />
        </button>
        <button
          title="MCP Servers"
          onClick={() => setState({ view: "mcp" })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Server className="h-4 w-4" />
        </button>
        <button
          title="Settings (⌘,)"
          onClick={() => setState({ view: "settings" })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          title="Give feedback"
          onClick={() => window.open("https://github.com/", "_blank")}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
