import { create } from "zustand";
import type { AgentId, AgentStatus, BatonTask, GitStatus, Handoff, McpServer, Project, TerminalSession, Todo } from "../../../shared/types";

export type ViewMode = "workspace" | "mcp" | "settings";

type AppState = {
  projects: Project[];
  selectedProjectId?: string;
  agents: AgentStatus[];
  agentsDetected: boolean;
  sessions: TerminalSession[];
  activeSessionId?: string;
  gitStatus?: GitStatus;
  latestHandoff?: Handoff;
  tasks: BatonTask[];
  todos: Todo[];
  mcpServers: McpServer[];
  view: ViewMode;
  sidebarOpen: boolean;
  rightSidebarOpen: boolean;
  sidebarWidth: number;
  rightSidebarWidth: number;
  projectLoading: boolean;
  commandOpen: boolean;
  handoffSheetOpen: boolean;
  previewOpen: boolean;
  usePassOpen: boolean;
  addProjectOpen: boolean;
  removeProjectOpen: boolean;
  addProjectError?: string;
  runAgentError?: string;
  quickLaunchProjectId?: string;
  handoffPrompt?: { sessionId: string; agentId: AgentId };
  setState: (state: Partial<AppState>) => void;
  loadInitial: () => Promise<void>;
  addProject: () => Promise<void>;
  addProjectByPath: (projectPath: string) => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  detectAgents: () => Promise<void>;
  refreshGit: () => Promise<void>;
  refreshHandoff: () => Promise<void>;
  refreshTask: () => Promise<void>;
  createTask: (title: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: "active" | "paused" | "completed") => Promise<void>;
  toggleTask: (taskId: string, completed: boolean) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  runAgent: (agentId: AgentId, injectContinue?: boolean) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  injectHandoffForSession: (sessionId: string) => Promise<void>;
  skipHandoffForSession: () => void;
  refreshTodos: () => Promise<void>;
  toggleTodo: (index: number) => Promise<void>;
  deleteTodo: (index: number) => Promise<void>;
};

function readStoredNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const value = Number(localStorage.getItem(key));
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  } catch {
    return fallback;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  agents: [],
  agentsDetected: false,
  sessions: [],
  tasks: [],
  todos: [],
  mcpServers: [],
  view: "workspace",
  sidebarOpen: true,
  rightSidebarOpen: true,
  sidebarWidth: readStoredNumber("baton-sidebar-width", 256, 200, 420),
  rightSidebarWidth: readStoredNumber("baton-right-sidebar-width", 320, 260, 520),
  projectLoading: false,
  commandOpen: false,
  handoffSheetOpen: false,
  previewOpen: false,
  usePassOpen: false,
  addProjectOpen: false,
  removeProjectOpen: false,
  quickLaunchProjectId: undefined,
  handoffPrompt: undefined,

  setState: (state) => set(state),

  loadInitial: async () => {
    const projects = await window.baton.projects.list();
    const agents = await window.baton.agents.detect();
    const selectedProjectId = projects[0]?.id;
    const mcpServers = await window.baton.mcp.list(selectedProjectId);
    // Load sessions for ALL projects so sidebar is fully populated on startup
    const allSessions = (await Promise.all(projects.map((p) => window.baton.sessions.list(p.id)))).flat();
    const projectSessions = allSessions.filter((s) => s.projectId === selectedProjectId);
    // #9 — prefer a running session over completed/failed
    const running = projectSessions.find((s) => s.status === "running");
    const activeSessionId = running?.id ?? projectSessions[0]?.id;
    set({ projects, agents, agentsDetected: true, mcpServers, sessions: allSessions, selectedProjectId, activeSessionId });
    if (selectedProjectId) {
      await Promise.all([get().refreshGit(), get().refreshHandoff(), get().refreshTask(), get().refreshTodos()]);
    }
    window.baton.todos.onUpdated(({ projectId, todos }) => {
      if (projectId === useAppStore.getState().selectedProjectId) {
        set({ todos });
      }
    });
    window.baton.terminal.onExit(({ sessionId, exitCode }) => {
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, status: exitCode === 0 ? "completed" : "failed" } : s
        )
      }));
    });
  },

  addProject: async () => {
    try {
      set({ addProjectError: undefined });
      const result = await window.baton.projects.add();
      if (!result) return;
      const projects = await window.baton.projects.list();
      const agents = await window.baton.agents.detect();
      // #10 — set agentsDetected: true
      set({ projects, agents, agentsDetected: true, selectedProjectId: result.project.id, view: "workspace", addProjectOpen: false });
      await Promise.all([get().refreshGit(), get().refreshTask(), get().refreshTodos()]);
    } catch (error) {
      set({ addProjectError: error instanceof Error ? error.message : "Could not add project." });
    }
  },

  addProjectByPath: async (projectPath) => {
    try {
      set({ addProjectError: undefined });
      const result = await window.baton.projects.addPath(projectPath);
      const projects = await window.baton.projects.list();
      const agents = await window.baton.agents.detect();
      set({ projects, agents, agentsDetected: true, selectedProjectId: result.project.id, view: "workspace", addProjectOpen: false });
      await Promise.all([get().refreshGit(), get().refreshTask(), get().refreshTodos()]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      const friendly = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already")
        ? "This project has already been added."
        : "Could not add project.";
      set({ addProjectError: friendly });
    }
  },

  selectProject: async (projectId) => {
    set({ projectLoading: true });
    try {
      const projectSessions = get().sessions.filter((s) => s.projectId === projectId);
      const running = projectSessions.find((s) => s.status === "running");
      const activeSessionId = running?.id ?? projectSessions[0]?.id;
      set({ selectedProjectId: projectId, activeSessionId, view: "workspace" });
      await Promise.all([get().refreshGit(), get().refreshHandoff(), get().refreshTask(), get().refreshTodos()]);
    } finally {
      set({ projectLoading: false });
    }
  },

  detectAgents: async () => {
    if (get().agentsDetected) return;
    const agents = await window.baton.agents.detect();
    set({ agents, agentsDetected: true });
  },

  refreshGit: async () => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    set({ gitStatus: await window.baton.git.status(projectId) });
  },

  refreshHandoff: async () => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    set({ latestHandoff: await window.baton.handoff.latest(projectId) });
  },

  refreshTask: async () => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    set({ tasks: await window.baton.tasks.list(projectId) });
  },

  createTask: async (title) => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    await window.baton.tasks.create(projectId, title);
    set({ tasks: await window.baton.tasks.list(projectId) });
  },

  // #5 — proper updateTaskStatus that supports all three states
  updateTaskStatus: async (taskId, status) => {
    await window.baton.tasks.updateStatus(taskId, status);
    const projectId = get().selectedProjectId;
    if (projectId) set({ tasks: await window.baton.tasks.list(projectId) });
  },

  // kept for backward compat
  toggleTask: async (taskId, completed) => {
    await get().updateTaskStatus(taskId, completed ? "completed" : "active");
  },

  // #25 — delete task (no delete IPC, mark completed + remove from local state)
  deleteTask: async (taskId) => {
    await window.baton.tasks.updateStatus(taskId, "completed");
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
  },

  runAgent: async (agentId, injectContinue = false) => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    try {
      set({ runAgentError: undefined });
      const session = await window.baton.agents.run(projectId, agentId);
      set((state) => ({ sessions: [...state.sessions, session], activeSessionId: session.id, view: "workspace", runAgentError: undefined }));
      if (injectContinue) {
        // check for existing handoff — show prompt dialog instead of always injecting
        const handoff = get().latestHandoff;
        if (handoff) {
          set({ handoffPrompt: { sessionId: session.id, agentId } });
        } else {
          window.setTimeout(() => void window.baton.agents.continue(session.id), 900);
        }
      }
    } catch (error) {
      set({ runAgentError: error instanceof Error ? error.message : "Could not start agent." });
    }
  },

  renameSession: async (sessionId, name) => {
    await window.baton.sessions.rename(sessionId, name);
    set((state) => ({ sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, name } : s)) }));
  },

  closeSession: async (sessionId) => {
    await window.baton.sessions.close(sessionId);
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      const activeSessionId = state.activeSessionId === sessionId
        ? (sessions.filter((s) => s.projectId === state.selectedProjectId)[0]?.id)
        : state.activeSessionId;
      return { sessions, activeSessionId };
    });
  },

  resumeSession: async (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;
    if (get().selectedProjectId !== session.projectId) await get().selectProject(session.projectId);
    await get().runAgent(session.agentId);
  },

  injectHandoffForSession: async (sessionId) => {
    await window.baton.agents.continue(sessionId);
    set({ handoffPrompt: undefined });
    await get().refreshHandoff();
  },

  skipHandoffForSession: () => {
    set({ handoffPrompt: undefined });
  },

  deleteSession: async (sessionId) => {
    await window.baton.sessions.delete(sessionId);
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      const activeSessionId = state.activeSessionId === sessionId
        ? (sessions.filter((s) => s.projectId === state.selectedProjectId)[0]?.id)
        : state.activeSessionId;
      return { sessions, activeSessionId };
    });
  },

  refreshTodos: async () => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    set({ todos: await window.baton.todos.list(projectId) });
  },

  toggleTodo: async (index) => {
    const { selectedProjectId, todos } = get();
    if (!selectedProjectId) return;
    const updated = todos.map((t, i) => (i === index ? { ...t, done: !t.done } : t));
    await window.baton.todos.save(selectedProjectId, updated);
    set({ todos: updated });
  },

  // #24 — delete todo
  deleteTodo: async (index) => {
    const { selectedProjectId, todos } = get();
    if (!selectedProjectId) return;
    const updated = todos.filter((_, i) => i !== index);
    await window.baton.todos.save(selectedProjectId, updated);
    set({ todos: updated });
  },
}));
