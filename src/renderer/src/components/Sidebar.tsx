import { 
  Archive,
  Check, 
  CheckCircle2, 
  Copy,
  Folder, 
  FolderPlus, 
  MessageSquare, 
  Pencil, 
  Pin,
  Play, 
  Plus, 
  PanelLeftClose, 
  Server, 
  Settings, 
  Trash2, 
  X 
} from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { AgentIcon } from "./AgentIcon";
import { useAppStore } from "../store/useAppStore";
import { AGENT_LABELS } from "../../../shared/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

function agentLabel(agentId: string): string {
  return AGENT_LABELS[agentId as keyof typeof AGENT_LABELS] ?? agentId;
}

// #14 — relative time helper
function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function RenameInput({ current, onSave, onCancel }: { current: string; onSave: (name: string) => void; onCancel: () => void }): JSX.Element {
  const [value, setValue] = useState(current);
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <input
        autoFocus
        className="h-7 min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 outline-none focus:border-zinc-500"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSave(value.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
      <button onClick={() => value.trim() && onSave(value.trim())} aria-label="Save name" className="flex h-7 w-7 items-center justify-center rounded text-emerald-400 hover:bg-zinc-800">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onCancel} aria-label="Cancel rename" className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }): JSX.Element {
  return (
    <div className="mx-1 my-1 rounded-md border border-red-900 bg-red-950/40 px-3 py-2">
      <p className="text-[11px] font-medium text-red-300">Delete this session?</p>
      <div className="mt-2 flex gap-2">
        <button onClick={onConfirm} className="rounded bg-red-700 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600">Delete</button>
        <button onClick={onCancel} className="rounded px-2 py-0.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-200">Cancel</button>
      </div>
    </div>
  );
}

export function Sidebar(): JSX.Element {
  const { 
    projects, 
    selectedProjectId, 
    gitStatus, 
    sessions, 
    activeSessionId, 
    sidebarWidth, 
    selectProject, 
    renameSession, 
    deleteSession, 
    resumeSession, 
    setState 
  } = useAppStore();
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
      <div className="flex h-14 items-center justify-between px-4 pt-6">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Projects</div>
        <div className="flex items-center gap-1">
          <button
            title="Sort"
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <Plus className="h-3.5 w-3.5 rotate-45" />
          </button>
          <button
            onClick={() => setState({ sidebarOpen: false })}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
            title="Close sidebar (⌘B)"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        {projects.length === 0 ? (
          <div className="px-3 py-6 text-xs text-zinc-500">No projects yet.</div>
        ) : (
          <div className="space-y-0.5">
            {projects.map((project) => {
              const selected = project.id === selectedProjectId;
              const projectSessions = sessions.filter((s) => s.projectId === project.id);
              const isCollapsed = collapsed[project.id] ?? false;

              return (
                <div key={project.id} className="mb-2">
                  <div className="group flex items-center gap-1 px-1 py-1 text-zinc-500">
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-[11px] font-semibold">{project.name}</span>
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-0.5">
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
                          <DropdownMenu key={session.id}>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={`group/session flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                                  sessionActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                                }`}
                                onClick={() => void activateSession(project.id, session.id)}
                                onContextMenu={(e) => {
                                  // Right click to select and open menu is handled by DropdownMenuTrigger
                                }}
                              >
                                <span className="truncate flex-1 font-medium">{session.name || agentLabel(session.agentId)}</span>
                                
                                {session.status === "running" && (
                                  <span className="text-[10px] font-medium text-emerald-400">+1</span>
                                )}
                                {session.status === "detached" && (
                                  <span className="text-[10px] font-medium text-blue-400">BG</span>
                                )}
                                
                                <span className="shrink-0 text-[10px] text-zinc-600 group-hover/session:text-zinc-500">
                                  {relativeTime(session.startedAt)}
                                </span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              <DropdownMenuItem className="gap-2" onClick={() => {/* Placeholder */}}>
                                <Pin className="h-3.5 w-3.5 text-zinc-400" />
                                <span>Pin task</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => setRenamingId(session.id)}>
                                <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                                <span>Rename</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => {/* Placeholder */}}>
                                <Archive className="h-3.5 w-3.5 text-zinc-400" />
                                <span>Archive</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => {
                                if (gitStatus?.branch) navigator.clipboard.writeText(gitStatus.branch).catch(() => {});
                              }}>
                                <Copy className="h-3.5 w-3.5 text-zinc-400" />
                                <span>Copy branch name</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-red-400 focus:bg-red-950 focus:text-red-400" onClick={() => setDeletingId(session.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })}
                      
                      {/* Add session button */}
                      <button
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400"
                        onClick={() => setState({ quickLaunchProjectId: project.id })}
                      >
                        <Plus className="h-3 w-3" />
                        <span>New agent</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="mt-auto px-2 py-2 space-y-0.5">
        <button
          onClick={() => setState({ addProjectOpen: true, addProjectError: undefined })}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
        >
          <div className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4" />
            <span>Add Project</span>
          </div>
          <div className="flex items-center gap-0.5 text-[10px] text-zinc-600">
            <span>⇧⌘N</span>
          </div>
        </button>

        <button
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[13px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          onClick={() => {/* Skills placeholder */}}
        >
          <Play className="h-4 w-4 rotate-90" />
          <span>Skills</span>
        </button>

        <button
          onClick={() => setState({ view: "mcp" })}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[13px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
        >
          <Server className="h-4 w-4" />
          <span>MCP</span>
        </button>

        <button
          onClick={() => setState({ view: "settings" })}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-[13px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </div>
          <span className="text-[10px] text-zinc-600">⌘,</span>
        </button>
      </div>
    </aside>
  );
}

