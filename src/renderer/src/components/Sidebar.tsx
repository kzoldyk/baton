import {
  Check, 
  Folder, 
  FolderPlus, 
  Pencil, 
  Plus, 
  PanelLeftClose, 
  Server, 
  Settings, 
  Trash2, 
  X 
} from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { useAppStore } from "../store/useAppStore";
import { AgentIcon } from "./AgentIcon";
import { AGENT_LABELS } from "../../../shared/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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

type ContextMenuState =
  | { type: "session"; id: string; x: number; y: number }
  | { type: "project"; id: string; x: number; y: number };

function DeleteConfirmDialog({
  title,
  description,
  itemName,
  confirmLabel,
  open,
  onConfirm,
  onCancel
}: {
  title: string;
  description: string;
  itemName: string;
  confirmLabel: string;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <DialogContent className="max-w-sm border-zinc-800 bg-zinc-950 text-zinc-100">
        <DialogHeader className="space-y-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="my-2 rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2.5 text-sm text-zinc-200">
          {itemName}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="h-9 rounded-md border border-zinc-800 px-3 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-9 rounded-md bg-red-700 px-3 text-sm font-medium text-white hover:bg-red-600">
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Sidebar(): JSX.Element {
  const { 
    projects, 
    selectedProjectId, 
    sessions, 
    activeSessionId, 
    sidebarWidth, 
    selectProject, 
    renameSession, 
    deleteSession, 
    setState 
  } = useAppStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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

  useEffect(() => {
    if (!contextMenu) return;
    const close = (): void => setContextMenu(null);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

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

  const openContextMenu = (event: React.MouseEvent, menu: Omit<ContextMenuState, "x" | "y">): void => {
    event.preventDefault();
    setContextMenu({
      ...menu,
      x: Math.min(event.clientX, window.innerWidth - 184),
      y: Math.min(event.clientY, window.innerHeight - 88)
    } as ContextMenuState);
  };

  const removeProject = async (projectId: string): Promise<void> => {
    await window.baton.projects.remove(projectId);
    const nextProjects = await window.baton.projects.list();
    const nextSessions = sessions.filter((session) => session.projectId !== projectId);
    const nextSelectedProjectId = selectedProjectId === projectId ? nextProjects[0]?.id : selectedProjectId;
    const nextActiveSessionId = nextSessions.find((session) => session.projectId === nextSelectedProjectId)?.id;
    setState({
      projects: nextProjects,
      sessions: nextSessions,
      selectedProjectId: nextSelectedProjectId,
      activeSessionId: nextActiveSessionId,
      gitStatus: undefined,
      latestHandoff: undefined,
      tasks: [],
      todos: []
    });
    if (nextSelectedProjectId) await selectProject(nextSelectedProjectId);
  };

  const deletingSession = deletingId ? sessions.find((session) => session.id === deletingId) : undefined;
  const deletingProject = deletingProjectId ? projects.find((project) => project.id === deletingProjectId) : undefined;

  return (
    <>
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
                  <button
                    className={`group flex w-full items-center gap-1 rounded-md px-1 py-1 text-left ${
                      selected ? "text-zinc-300" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                    }`}
                    onClick={() => void selectProject(project.id)}
                    onContextMenu={(event) => openContextMenu(event, { type: "project", id: project.id })}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-[11px] font-semibold">{project.name}</span>
                  </button>

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
                        return (
                          <button
                            key={session.id}
                            className={`group/session flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                              sessionActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                            }`}
                            onClick={() => void activateSession(project.id, session.id)}
                            onContextMenu={(event) => openContextMenu(event, { type: "session", id: session.id })}
                          >
                            <AgentIcon agentId={session.agentId} className="h-3.5 w-3.5 shrink-0" />
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
    {contextMenu && (
      <div
        className="fixed z-50 w-44 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-xl shadow-black/40"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {contextMenu.type === "session" ? (
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
            onClick={() => {
              setRenamingId(contextMenu.id);
              setContextMenu(null);
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-zinc-500" />
            <span>Rename</span>
          </button>
        ) : null}
        <button
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-red-400 hover:bg-red-950/60 hover:text-red-300"
          onClick={() => {
            if (contextMenu.type === "session") {
              setDeletingId(contextMenu.id);
            } else {
              setDeletingProjectId(contextMenu.id);
            }
            setContextMenu(null);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{contextMenu.type === "session" ? "Delete session" : "Delete project"}</span>
        </button>
      </div>
    )}
    <DeleteConfirmDialog
      open={Boolean(deletingSession)}
      title="Delete session?"
      description="This removes the session from Baton. Project files are not deleted."
      itemName={deletingSession ? deletingSession.name || agentLabel(deletingSession.agentId) : ""}
      confirmLabel="Delete session"
      onConfirm={() => {
        if (deletingSession) void deleteSession(deletingSession.id);
        setDeletingId(null);
      }}
      onCancel={() => setDeletingId(null)}
    />
    <DeleteConfirmDialog
      open={Boolean(deletingProject)}
      title="Delete project?"
      description="This removes the project from Baton, including its saved sessions, tasks, and handoffs. Your project folder is not deleted."
      itemName={deletingProject?.name ?? ""}
      confirmLabel="Delete project"
      onConfirm={() => {
        if (deletingProject) void removeProject(deletingProject.id);
        setDeletingProjectId(null);
      }}
      onCancel={() => setDeletingProjectId(null)}
    />
    </>
  );
}
