import { contextBridge, ipcRenderer } from "electron";
import type { AgentId, CreateFallbackHandoffInput } from "../shared/types";

const api = {
  projects: {
    add: () => ipcRenderer.invoke("projects:add"),
    addPath: (projectPath: string) => ipcRenderer.invoke("projects:addPath", projectPath),
    list: () => ipcRenderer.invoke("projects:list"),
    get: (id: string) => ipcRenderer.invoke("projects:get", id),
    remove: (id: string) => ipcRenderer.invoke("projects:remove", id)
  },
  agents: {
    detect: () => ipcRenderer.invoke("agents:detect"),
    run: (projectId: string, agentId: AgentId) => ipcRenderer.invoke("agents:run", projectId, agentId),
    continue: (sessionId: string) => ipcRenderer.invoke("agents:continue", sessionId),
    handoffPrompt: (sessionId: string, guidance?: { nextSteps?: string; constraints?: string }) => ipcRenderer.invoke("agents:handoffPrompt", sessionId, guidance),
    updateHandoffPrompt: (sessionId: string) => ipcRenderer.invoke("agents:updateHandoffPrompt", sessionId)
  },
  handoff: {
    createFallback: (input: CreateFallbackHandoffInput) => ipcRenderer.invoke("handoff:createFallback", input),
    ingestLatest: (projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string) =>
      ipcRenderer.invoke("handoff:ingestLatest", projectId, fromAgent, toAgent, taskId),
    waitForLatest: (projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string) =>
      ipcRenderer.invoke("handoff:waitForLatest", projectId, fromAgent, toAgent, taskId),
    waitForUpdatedLatest: (projectId: string, previousContent: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string) =>
      ipcRenderer.invoke("handoff:waitForUpdatedLatest", projectId, previousContent, fromAgent, toAgent, taskId),
    latest: (projectId: string) => ipcRenderer.invoke("handoff:latest", projectId),
    list: (projectId: string) => ipcRenderer.invoke("handoff:list", projectId),
    onProgress: (callback: (payload: { done: boolean; elapsed?: number; max?: number }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { done: boolean; elapsed?: number; max?: number }) => callback(payload);
      ipcRenderer.on("handoff:progress", listener);
      return () => ipcRenderer.removeListener("handoff:progress", listener);
    }
  },
  tasks: {
    create: (projectId: string, title: string) => ipcRenderer.invoke("tasks:create", projectId, title),
    active: (projectId: string) => ipcRenderer.invoke("tasks:active", projectId),
    list: (projectId: string) => ipcRenderer.invoke("tasks:list", projectId),
    updateStatus: (taskId: string, status: string) => ipcRenderer.invoke("tasks:updateStatus", taskId, status),
    delete: (taskId: string) => ipcRenderer.invoke("tasks:delete", taskId)
  },
  git: {
    status: (projectId: string) => ipcRenderer.invoke("git:status", projectId)
  },
  settings: {
    get: (key: string) => ipcRenderer.invoke("settings:get", key),
    set: (key: string, value: string) => ipcRenderer.invoke("settings:set", key, value),
    all: () => ipcRenderer.invoke("settings:all")
  },
  mcp: {
    list: (projectId?: string) => ipcRenderer.invoke("mcp:list", projectId)
  },
  todos: {
    list: (projectId: string) => ipcRenderer.invoke("todos:list", projectId),
    save: (projectId: string, todos: { text: string; done: boolean }[]) =>
      ipcRenderer.invoke("todos:save", projectId, todos),
    onUpdated: (callback: (payload: { projectId: string; todos: { text: string; done: boolean }[] }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { projectId: string; todos: { text: string; done: boolean }[] }) => callback(payload);
      ipcRenderer.on("todos:updated", listener);
      return () => ipcRenderer.removeListener("todos:updated", listener);
    }
  },
  sessions: {
    list: (projectId: string) => ipcRenderer.invoke("sessions:list", projectId),
    rename: (sessionId: string, name: string) => ipcRenderer.invoke("sessions:rename", sessionId, name),
    delete: (sessionId: string) => ipcRenderer.invoke("sessions:delete", sessionId),
    close: (sessionId: string) => ipcRenderer.invoke("sessions:close", sessionId),
    readLog: (sessionId: string) => ipcRenderer.invoke("sessions:readLog", sessionId),
    restore: (sessionId: string) => ipcRenderer.invoke("sessions:restore", sessionId)
  },
  terminal: {
    write: (sessionId: string, data: string) => ipcRenderer.send("terminal:write", sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) => ipcRenderer.send("terminal:resize", sessionId, cols, rows),
    kill: (sessionId: string) => ipcRenderer.send("terminal:kill", sessionId),
    onData: (callback: (payload: { sessionId: string; data: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { sessionId: string; data: string }) => callback(payload);
      ipcRenderer.on("terminal:data", listener);
      return () => ipcRenderer.removeListener("terminal:data", listener);
    },
    onExit: (callback: (payload: { sessionId: string; exitCode: number }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: { sessionId: string; exitCode: number }) => callback(payload);
      ipcRenderer.on("terminal:exit", listener);
      return () => ipcRenderer.removeListener("terminal:exit", listener);
    }
  }
};

contextBridge.exposeInMainWorld("baton", api);

export type BatonApi = typeof api;
