import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentId, CreateFallbackHandoffInput } from "../shared/types";
import { AgentService } from "./services/AgentService";
import { GitService } from "./services/GitService";
import { HandoffService } from "./services/HandoffService";
import { McpService } from "./services/McpService";
import { ProjectService } from "./services/ProjectService";
import { SettingsService } from "./services/SettingsService";
import { SQLiteService } from "./services/SQLiteService";
import { StorageService } from "./services/StorageService";
import { TerminalService } from "./services/TerminalService";
import { TaskService } from "./services/TaskService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | undefined;
let services: ReturnType<typeof createServices>;

function createServices() {
  const storage = new StorageService();
  const sqlite = new SQLiteService(storage.dbPath());
  const projects = new ProjectService(sqlite.db, storage);
  const agents = new AgentService();
  const git = new GitService();
  const handoff = new HandoffService(sqlite.db, storage, git, (id) => projects.getProject(id));
  const tasks = new TaskService(sqlite.db, storage, (id) => projects.getProject(id));
  const terminal = new TerminalService(sqlite.db, projects, agents);
  const settings = new SettingsService(sqlite.db);
  const mcp = new McpService();
  return { storage, sqlite, projects, agents, git, handoff, terminal, settings, mcp, tasks };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    title: "Baton",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function registerIpc(): void {
  ipcMain.handle("projects:add", () => services.projects.pickAndAddProject(mainWindow));
  ipcMain.handle("projects:addPath", (_event, projectPath: string) => services.projects.addProject(projectPath, true));
  ipcMain.handle("projects:list", () => services.projects.listProjects());
  ipcMain.handle("projects:get", (_event, id: string) => services.projects.getProject(id));
  ipcMain.handle("agents:detect", () => services.agents.detect());
  ipcMain.handle("agents:run", async (_event, projectId: string, agentId: AgentId) => {
    if (!mainWindow) throw new Error("Main window not ready.");
    return services.terminal.start(projectId, agentId, mainWindow);
  });
  ipcMain.handle("agents:continue", (_event, sessionId: string) => services.terminal.injectContinue(sessionId));
  ipcMain.handle("agents:handoffPrompt", (_event, sessionId: string) => services.terminal.injectHandoff(sessionId));
  ipcMain.handle("handoff:createFallback", (_event, input: CreateFallbackHandoffInput) => services.handoff.createFallback(input));
  ipcMain.handle("handoff:ingestLatest", (_event, projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string) =>
    services.handoff.ingestLatest(projectId, fromAgent, toAgent, taskId)
  );
  ipcMain.handle("handoff:waitForLatest", (_event, projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string) =>
    services.handoff.waitForLatest(projectId, fromAgent, toAgent, taskId)
  );
  ipcMain.handle("handoff:latest", (_event, projectId: string) => services.handoff.latest(projectId));
  ipcMain.handle("tasks:create", (_event, projectId: string, title: string) => services.tasks.create(projectId, title));
  ipcMain.handle("tasks:active", (_event, projectId: string) => services.tasks.active(projectId));
  ipcMain.handle("git:status", async (_event, projectId: string) => {
    const project = services.projects.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return services.git.status(project.path);
  });
  ipcMain.handle("settings:get", (_event, key: string) => services.settings.get(key));
  ipcMain.handle("settings:set", (_event, key: string, value: string) => services.settings.set(key, value));
  ipcMain.handle("settings:all", () => ({ ...services.settings.all(), userDataPath: services.storage.userDataPath }));
  ipcMain.handle("mcp:list", () => services.mcp.list());
  ipcMain.handle("sessions:list", (_event, projectId: string) => services.terminal.listForProject(projectId));
  ipcMain.handle("sessions:rename", (_event, sessionId: string, name: string) => services.terminal.rename(sessionId, name));
  ipcMain.handle("sessions:delete", (_event, sessionId: string) => services.terminal.delete(sessionId));
  ipcMain.handle("sessions:close", (_event, sessionId: string) => services.terminal.close(sessionId));
  ipcMain.on("terminal:write", (_event, sessionId: string, data: string) => services.terminal.write(sessionId, data));
  ipcMain.on("terminal:resize", (_event, sessionId: string, cols: number, rows: number) => services.terminal.resize(sessionId, cols, rows));
  ipcMain.on("terminal:kill", (_event, sessionId: string) => services.terminal.kill(sessionId));
}

app.whenReady().then(() => {
  services = createServices();
  services.terminal.markStaleSessions();
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
