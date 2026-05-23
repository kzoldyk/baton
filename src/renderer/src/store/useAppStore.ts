import { create } from "zustand";
import type { AgentId, AgentStatus, BatonTask, GitStatus, Handoff, McpServer, Project, TerminalSession } from "../../../shared/types";

export type ViewMode = "workspace" | "mcp" | "settings";

type AppState = {
  projects: Project[];
  selectedProjectId?: string;
  agents: AgentStatus[];
  sessions: TerminalSession[];
  activeSessionId?: string;
  gitStatus?: GitStatus;
  latestHandoff?: Handoff;
  activeTask?: BatonTask;
  mcpServers: McpServer[];
  view: ViewMode;
  sidebarOpen: boolean;
  commandOpen: boolean;
  handoffSheetOpen: boolean;
  previewOpen: boolean;
  usePassOpen: boolean;
  addProjectOpen: boolean;
  addProjectError?: string;
  runAgentError?: string;
  quickLaunchProjectId?: string;
  handoffPromptOpen: boolean;
  pendingHandoffSessionId?: string;
  pendingHandoffAgentId?: AgentId;
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
  runAgent: (agentId: AgentId, injectContinue?: boolean) => Promise<void>;
  injectHandoffForSession: () => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  agents: [],
  sessions: [],
  mcpServers: [],
  view: "workspace",
  sidebarOpen: true,
  commandOpen: false,
  handoffSheetOpen: false,
  previewOpen: false,
  usePassOpen: false,
  addProjectOpen: false,
  handoffPromptOpen: false,
  quickLaunchProjectId: undefined,
  pendingHandoffSessionId: undefined,
  pendingHandoffAgentId: undefined,
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
    }
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
      set({ projects, agents, selectedProjectId: result.project.id, view: "workspace", addProjectOpen: false });
      await get().refreshGit();
      await get().refreshTask();
    } catch (error) {
      set({ addProjectError: error instanceof Error ? error.message : "Could not add project." });
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
    set({ selectedProjectId: projectId, sessions, activeSessionId, view: "workspace" });
    await get().refreshGit();
    await get().refreshHandoff();
    await get().refreshTask();
  },
  detectAgents: async () => set({ agents: await window.baton.agents.detect() }),
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
    set({ activeTask: await window.baton.tasks.active(projectId) });
  },
  createTask: async (title) => {
    const projectId = get().selectedProjectId;
    if (!projectId) return;
    const activeTask = await window.baton.tasks.create(projectId, title);
    set({ activeTask });
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
      } else {
        const handoff = await window.baton.handoff.latest(projectId);
        if (handoff) {
          set({ handoffPromptOpen: true, pendingHandoffSessionId: session.id, pendingHandoffAgentId: agentId });
        }
      }
    } catch (error) {
      set({ runAgentError: error instanceof Error ? error.message : "Could not start agent." });
    }
  },
  injectHandoffForSession: async () => {
    const { pendingHandoffSessionId } = get();
    if (pendingHandoffSessionId) {
      await window.baton.agents.continue(pendingHandoffSessionId);
    }
    set({ handoffPromptOpen: false, pendingHandoffSessionId: undefined, pendingHandoffAgentId: undefined });
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
  }
}));
