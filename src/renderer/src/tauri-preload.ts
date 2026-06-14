import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type HandoffProgressPayload = { done: boolean; elapsed?: number; max?: number };

const api = {
  projects: {
    add: () => invoke<{ project: Record<string, unknown>; gitignoreUpdated: boolean } | null>("add_project"),
    addPath: (projectPath: string) => invoke<{ project: Record<string, unknown>; gitignoreUpdated: boolean }>("add_project_path", { projectPath }),
    list: () => invoke<Record<string, unknown>[]>("list_projects"),
    get: (id: string) => invoke<Record<string, unknown> | null>("get_project", { id }),
    remove: (id: string) => invoke<void>("remove_project", { id }),
  },
  agents: {
    detect: () => invoke<Record<string, unknown>[]>("detect_agents"),
    run: (projectId: string, agentId: string) => invoke<Record<string, unknown>>("run_agent", { projectId, agentId }),
    continue: (sessionId: string) => invoke<void>("continue_agent", { sessionId }),
    handoffPrompt: (sessionId: string, guidance?: { nextSteps?: string; constraints?: string }) =>
      invoke<void>("handoff_prompt", { sessionId, ...guidance }),
    updateHandoffPrompt: (sessionId: string) => invoke<void>("update_handoff_prompt", { sessionId }),
  },
  handoff: {
    createFallback: (input: Record<string, unknown>) => invoke<Record<string, unknown>>("create_fallback", { input }),
    checkExists: (projectId: string) => invoke<boolean>("check_handoff_exists", { projectId }),
    ingestLatest: (projectId: string, fromAgent: string, toAgent?: string, taskId?: string) =>
      invoke<Record<string, unknown>>("ingest_latest", { projectId, fromAgent, toAgent, taskId }),
    waitForLatest: (projectId: string, fromAgent: string, toAgent?: string, taskId?: string) =>
      invoke<Record<string, unknown>>("wait_for_latest", { projectId, fromAgent, toAgent, taskId }),
    waitForUpdatedLatest: (projectId: string, previousContent: string, fromAgent: string, toAgent?: string, taskId?: string) =>
      invoke<Record<string, unknown>>("wait_for_updated_latest", { projectId, previousContent, fromAgent, toAgent, taskId }),
    latest: (projectId: string) => invoke<Record<string, unknown> | null>("get_latest_handoff", { projectId }),
    list: (projectId: string) => invoke<Record<string, unknown>[]>("list_handoffs", { projectId }),
    onProgress: (callback: (payload: HandoffProgressPayload) => void): (() => void) => {
      let unlisten: (() => void) | undefined;
      listen<HandoffProgressPayload>("handoff:progress", (event) => callback(event.payload)).then((fn) => { unlisten = fn; });
      return () => { if (unlisten) unlisten(); };
    },
  },
  tasks: {
    create: (projectId: string, title: string) => invoke<Record<string, unknown>>("create_task", { projectId, title }),
    active: (projectId: string) => invoke<Record<string, unknown> | null>("active_task", { projectId }),
    list: (projectId: string) => invoke<Record<string, unknown>[]>("list_tasks", { projectId }),
    updateStatus: (taskId: string, status: string) => invoke<Record<string, unknown> | null>("update_task_status", { taskId, status }),
    delete: (taskId: string) => invoke<void>("delete_task", { taskId }),
  },
  git: {
    status: (projectId: string) => invoke<Record<string, unknown>>("git_status", { projectId }),
  },
  settings: {
    get: (key: string) => invoke<string | null>("get_setting", { key }),
    set: (key: string, value: string) => invoke<void>("set_setting", { key, value }),
    all: () => invoke<Record<string, string>>("all_settings"),
  },
  mcp: {
    list: (projectId?: string) => invoke<Record<string, unknown>[]>("list_mcp", { projectId }),
  },
  todos: {
    list: (projectId: string) => invoke<Record<string, unknown>[]>("list_todos", { projectId }),
    save: (projectId: string, todos: Array<{ text: string; done: boolean }>) =>
      invoke<void>("save_todos", { projectId, todos }),
    onUpdated: (callback: (payload: { projectId: string; todos: Array<{ text: string; done: boolean }> }) => void): (() => void) => {
      let unlisten: (() => void) | undefined;
      listen<{ projectId: string; todos: Array<{ text: string; done: boolean }> }>("todos:updated", (event) => callback(event.payload)).then((fn) => { unlisten = fn; });
      return () => { if (unlisten) unlisten(); };
    },
  },
  sessions: {
    list: (projectId: string) => invoke<Record<string, unknown>[]>("list_sessions", { projectId }),
    rename: (sessionId: string, name: string) => invoke<Record<string, unknown> | null>("rename_session", { sessionId, name }),
    delete: (sessionId: string) => invoke<void>("delete_session", { sessionId }),
    close: (sessionId: string) => invoke<void>("close_session", { sessionId }),
    readLog: (sessionId: string) => invoke<string>("read_log", { sessionId }),
    restore: (sessionId: string) => invoke<Record<string, unknown>>("restore_session", { sessionId }),
  },
  terminal: {
    write: (sessionId: string, data: string) => invoke<void>("terminal_write", { sessionId, data }),
    resize: (sessionId: string, cols: number, rows: number) => invoke<void>("terminal_resize", { sessionId, cols, rows }),
    kill: (sessionId: string) => invoke<void>("terminal_kill", { sessionId }),
    onData: (callback: (payload: { sessionId: string; data: string }) => void): (() => void) => {
      let unlisten: (() => void) | undefined;
      listen<{ sessionId: string; data: string }>("terminal:data", (event) => callback(event.payload)).then((fn) => { unlisten = fn; });
      return () => { if (unlisten) unlisten(); };
    },
    onExit: (callback: (payload: { sessionId: string; exitCode: number }) => void): (() => void) => {
      let unlisten: (() => void) | undefined;
      listen<{ sessionId: string; exitCode: number }>("terminal:exit", (event) => callback(event.payload)).then((fn) => { unlisten = fn; });
      return () => { if (unlisten) unlisten(); };
    },
  },
};

(window as unknown as Record<string, unknown>).baton = api;
export type BatonApi = typeof api;
