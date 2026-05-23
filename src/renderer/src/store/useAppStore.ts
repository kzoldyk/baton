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
  commandOpen: boolean;
  handoffSheetOpen: boolean;
  previewOpen: boolean;
  usePassOpen: boolean;
  addProjectOpen: boolean;
  removeProjectOpen: boolean;
  addProjectError?: string;
  runAgentError?: string;
  quickLaunchProjectId?: string;
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
  toggleTask: (taskId: string, completed: boolean) => Promise<void>;
  runAgent: (agentId: AgentId, injectContinue?: boolean) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
  toggleTodo: (index: number) => Promise<void>;
};

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
  commandOpen: false,
  handoffSheetOpen: false,
  previewOpen: false,
  usePassOpen: false,
  addProjectOpen: false,
  removeProjectOpen: false,
  quickLaunchProjectId: undefined,
  setState: (state) => set(state),
  loadInitial: async () => {
    const [projects, agents, mcpServers] = await Promise.all([window.baton.projects.list(), window.baton.agents.detect(), window.baton.mcp.list()]);
    const selectedProjectId = projects[0]?.id;
    let sessions: TerminalSession[] = [];
    if (selectedProjectId) {
      sessions = await window.baton.sessions.list(selectedProjectId);
    }
    const activeSessionId = sessions.length > 0 ? sessions[0].id : undefined;
    set({ projects, agents, mcpServers, sessions, selectedProjectId, activeSessionId });
    if (selectedProjectId) {
      await get().refreshGit();
      await get().refreshHandoff();
      await get().refreshTask();
      await get().refreshTodos();
    }
    // Listen for terminal exit and update session status in real-time
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
      set({ projects, agents, selectedProjectId: result.project.id, view: "workspace", addProjectOpen: false });
      await get().refreshGit();
      await get().refreshTask();
      await get().refreshTodos();
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
      await get().refreshGit();
      await get().refreshTask();
      await get().refreshTodos();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      // Task #18 — friendly duplicate error
      const friendly = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already")
        ? "This project has already been added."
        : "Could not add project.";
      set({ addProjectError: friendly });
    }
  },
  selectProject: async (projectId) => {
    const state = get();
    const sessionsForProject = state.sessions.filter((s) => s.projectId === projectId);
    const isLoaded = state.sessions.some((s) => s.projectId === projectId);
    let sessions = state.sessions;
    if (!isLoaded) {
      const fromDb = await window.baton.sessions.list(projectId);
      sessions = [...state.sessions, ...fromDb];
    }
    const activeSessionId = sessionsForProject.length > 0 ? sessionsForProject[0].id : undefined;
    // Task #17 — don't re-detect agents on every project switch
    set({ selectedProjectId: projectId, sessions, activeSessionId, view: "workspace" });
    await get().refreshGit();
    await get().refreshHandoff();
    await get().refreshTask();
    await get().refreshTodos();
  },
  detectAgents: async () => {
    // Task #17 — only re-detect if not already done
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
  toggleTask: async (taskId, completed) => {
    // Task #6 — support paused status; completed param is kept for backward compat
    const status = completed ? "completed" : "active";
    await window.baton.tasks.updateStatus(taskId, status);
    const projectId = get().selectedProjectId;
    if (projectId) set({ tasks: await window.baton.tasks.list(projectId) });
  },
  runAgent: async (agentId, injectContinue = false) => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    try {
      set({ runAgentError: undefined });
      const session = await window.baton.agents.run(projectId, agentId);
      set((state) => ({ sessions: [...state.sessions, session], activeSessionId: session.id, view: "workspace", runAgentError: undefined }));
      if (injectContinue) {
        window.setTimeout(() => void window.baton.agents.continue(session.id), 900);
      }
    } catch (error) {
      set({ runAgentError: error instanceof Error ? error.message : "Could not start agent." });
    }
  },
  renameSession: async (sessionId, name) => {
    const updated = await window.baton.sessions.rename(sessionId, name);
    if (updated) {
      set((state) => ({ sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, name: updated.name } : s)) }));
    }
  },
  closeSession: async (sessionId) => {
    await window.baton.sessions.close(sessionId);
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      const activeSessionId = state.activeSessionId === sessionId ? (sessions.length > 0 ? sessions[0].id : undefined) : state.activeSessionId;
      return { sessions, activeSessionId };
    });
  },
  deleteSession: async (sessionId) => {
    await window.baton.sessions.delete(sessionId);
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== sessionId);
      const activeSessionId = state.activeSessionId === sessionId ? (sessions.length > 0 ? sessions[0].id : undefined) : state.activeSessionId;
      return { sessions, activeSessionId };
    });
  },
  refreshTodos: async () => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    set({ todos: await window.baton.todos.list(projectId) });
  },
  toggleTodo: async (index) => {
    const state = get();
    const projectId = state.selectedProjectId;
    if (!projectId) return;
    const todos = state.todos.map((t, i) => (i === index ? { ...t, done: !t.done } : t));
    await window.baton.todos.save(projectId, todos);
    set({ todos });
  }
}));
