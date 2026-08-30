import { create } from "zustand";
import type { AgentId, AgentStatus, BatonTask, GitStatus, Handoff, McpServer, Project, TerminalSession, Todo } from "../../../shared/types";
import {
  nextStateAfterRefreshChoice,
  shouldPromptRefreshBeforePass
} from "../lib/handoffUiFlow";

export type ViewMode = "workspace" | "mcp" | "settings";
export type Theme = "dark" | "light" | "catppuccin" | "catppuccin-latte" | "tokyo-night" | "dracula" | "nord" | "one-dark";

const VALID_THEMES: Theme[] = ["dark", "light", "catppuccin", "catppuccin-latte", "tokyo-night", "dracula", "nord", "one-dark"];

function readStoredTheme(): Theme {
  try {
    const val = localStorage.getItem("baton-theme") as Theme;
    if (val && VALID_THEMES.includes(val)) return val;
  } catch {
    // fallback
  }
  return "dark";
}

type AppState = {
  loading: boolean;
  theme: Theme;
  projects: Project[];
  selectedProjectId?: string;
  agents: AgentStatus[];
  agentsDetected: boolean;
  sessions: TerminalSession[];
  activeSessionId?: string;
  gitStatus?: GitStatus;
  latestHandoff?: Handoff;
  handoffs: Handoff[];
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
  refreshBeforePassOpen: boolean;
  handoffRefreshing: boolean;
  handoffRefreshError?: string;
  previewOpen: boolean;
  usePassOpen: boolean;
  addProjectOpen: boolean;
  removeProjectOpen: boolean;
  addProjectError?: string;
  runAgentError?: string;
  shortcutsOpen: boolean;
  quickLaunchProjectId?: string;
  handoffPrompt?: { sessionId: string; agentId: AgentId };
  setState: (state: Partial<AppState>) => void;
  setTheme: (theme: Theme) => void;
  loadInitial: () => Promise<void>;
  addProject: () => Promise<void>;
  addProjectByPath: (projectPath: string) => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  detectAgents: () => Promise<void>;
  refreshGit: () => Promise<void>;
  refreshHandoff: () => Promise<void>;
  refreshPassFromActiveSession: () => Promise<boolean>;
  openHandoffPass: () => void;
  confirmRefreshBeforePass: (choice: "refresh" | "skip" | "cancel") => Promise<void>;
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
  loading: true,
  theme: readStoredTheme(),
  projects: [],
  agents: [],
  agentsDetected: false,
  sessions: [],
  tasks: [],
  todos: [],
  handoffs: [],
  mcpServers: [],
  view: "workspace",
  sidebarOpen: true,
  rightSidebarOpen: false,
  sidebarWidth: readStoredNumber("baton-sidebar-width", 256, 200, 420),
  rightSidebarWidth: readStoredNumber("baton-right-sidebar-width", 320, 260, 520),
  projectLoading: false,
  commandOpen: false,
  handoffSheetOpen: false,
  refreshBeforePassOpen: false,
  handoffRefreshing: false,
  handoffRefreshError: undefined,
  previewOpen: false,
  usePassOpen: false,
  addProjectOpen: false,
  removeProjectOpen: false,
  shortcutsOpen: false,
  quickLaunchProjectId: undefined,
  handoffPrompt: undefined,

  setState: (state) => set(state),
  setTheme: (theme) => {
    localStorage.setItem("baton-theme", theme);
    set({ theme });
  },

  loadInitial: async () => {
    try {
      const projects = await window.baton.projects.list();
      const agents = await window.baton.agents.detect();
      const selectedProjectId = projects[0]?.id;
      const mcpServers = await window.baton.mcp.list(selectedProjectId);
      const allSessions = (await Promise.all(projects.map((p) => window.baton.sessions.list(p.id)))).flat();
      const projectSessions = allSessions.filter((s) => s.projectId === selectedProjectId);
      const running = projectSessions.find((s) => s.status === "running");
      const activeSessionId = running?.id ?? projectSessions[0]?.id;
      set({ projects, agents, agentsDetected: true, mcpServers, sessions: allSessions, selectedProjectId, activeSessionId, loading: false });
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
    } catch (err) {
      console.error("[baton] loadInitial failed:", err);
      set({ loading: false });
    }
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
    const activeTask = get().tasks.find((task) => task.status === "active");
    const [latestHandoff, handoffs] = await Promise.all([
      window.baton.handoff.latest(projectId),
      window.baton.handoff.list(projectId, activeTask?.id)
    ]);
    set({ latestHandoff, handoffs });
  },

  refreshPassFromActiveSession: async () => {
    const { activeSessionId, selectedProjectId, latestHandoff, tasks, sessions } = get();
    if (!activeSessionId || !selectedProjectId || !latestHandoff) {
      set({ handoffRefreshError: "Start an agent session and save a pass before refreshing." });
      return false;
    }
    const activeSession = sessions.find((session) => session.id === activeSessionId);
    if (activeSession?.status !== "running") {
      set({ handoffRefreshError: "Session is not live. Skip refresh or use emergency from git." });
      return false;
    }
    const activeTask = tasks.find((task) => task.status === "active");
    set({ handoffRefreshing: true, handoffRefreshError: undefined });
    try {
      await window.baton.agents.updateHandoffPrompt(activeSessionId);
      await window.baton.handoff.waitForUpdatedLatest(
        selectedProjectId,
        latestHandoff.content ?? "",
        latestHandoff.fromAgent,
        latestHandoff.toAgent,
        activeTask?.id ?? latestHandoff.taskId
      );
      await Promise.all([get().refreshHandoff(), get().refreshTodos()]);
      return true;
    } catch (error) {
      set({ handoffRefreshError: error instanceof Error ? error.message : "Could not refresh the pass." });
      return false;
    } finally {
      set({ handoffRefreshing: false });
    }
  },

  openHandoffPass: () => {
    if (shouldPromptRefreshBeforePass(get().latestHandoff)) {
      set({ refreshBeforePassOpen: true, handoffRefreshError: undefined });
      return;
    }
    set({ handoffSheetOpen: true });
  },

  confirmRefreshBeforePass: async (choice) => {
    let refreshSucceeded = true;
    if (choice === "refresh") {
      refreshSucceeded = await get().refreshPassFromActiveSession();
    }
    const next = nextStateAfterRefreshChoice(choice, refreshSucceeded);
    if (!next) return;
    set({ ...next, handoffRefreshError: undefined });
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
    await Promise.all([get().refreshHandoff(), get().refreshTodos()]);
  },

  // #5 — proper updateTaskStatus that supports all three states
  updateTaskStatus: async (taskId, status) => {
    await window.baton.tasks.updateStatus(taskId, status);
    const projectId = get().selectedProjectId;
    if (projectId) {
      set({ tasks: await window.baton.tasks.list(projectId) });
      await Promise.all([get().refreshHandoff(), get().refreshTodos()]);
    }
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
        const handoff = get().latestHandoff;
        if (handoff) set({ handoffPrompt: { sessionId: session.id, agentId } });
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
    
    try {
      await window.baton.sessions.restore(sessionId);
      set((state) => ({
        sessions: state.sessions.map((s) => s.id === sessionId ? { ...s, status: "running" } : s),
        activeSessionId: sessionId
      }));
      
      if (get().latestHandoff) set({ handoffPrompt: { sessionId, agentId: session.agentId } });
    } catch (error) {
      console.error("Restore failed, starting new session:", error);
      await get().runAgent(session.agentId);
    }
  },

  injectHandoffForSession: async (sessionId) => {
    try {
      await window.baton.agents.continue(sessionId);
      set({ handoffPrompt: undefined, runAgentError: undefined });
    } catch (error) {
      set({ runAgentError: error instanceof Error ? error.message : "Could not inject. Copy the continue prompt instead." });
    }
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
