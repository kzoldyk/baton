import { app, BrowserWindow, ipcMain, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentId, CreateFallbackHandoffInput, Todo } from "../shared/types";
import { optionalId, requireId, requireStatus } from "./services/ipcValidate";
import { AgentService } from "./services/AgentService";
import { ContextCompiler } from "./services/ContextCompiler";
import { GitService } from "./services/GitService";
import { HandoffService } from "./services/HandoffService";
import { IndexService } from "./services/IndexService";
import { KnowledgeService, type KnowledgeDocType } from "./services/KnowledgeService";
import { McpService } from "./services/McpService";
import { ProjectService } from "./services/ProjectService";
import { SettingsService } from "./services/SettingsService";
import { SQLiteService } from "./services/SQLiteService";
import { StorageService } from "./services/StorageService";
import { hasTmuxAvailable, TerminalService } from "./services/TerminalService";
import { TaskService } from "./services/TaskService";
import { TodoService } from "./services/TodoService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fixPathEnvironment(): void {
  const home = os.homedir();
  const extraPaths = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    path.join(home, ".local", "bin"),
    path.join(home, ".npm-global", "bin"),
    path.join(home, ".bun", "bin"),
    path.join(home, ".cargo", "bin"),
    path.join(home, ".deno", "bin"),
  ];

  const nvmDir = path.join(home, ".nvm", "versions", "node");
  try {
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir);
      for (const ver of versions) {
        extraPaths.push(path.join(nvmDir, ver, "bin"));
      }
    }
  } catch { /* ignore */ }

  const currentPath = process.env.PATH ?? "";
  const missing = extraPaths.filter((p) => fs.existsSync(p) && !currentPath.includes(p));
  if (missing.length > 0) {
    process.env.PATH = `${missing.join(path.delimiter)}${path.delimiter}${currentPath}`;
  }
}

fixPathEnvironment();

let mainWindow: BrowserWindow | undefined;
let services: ReturnType<typeof createServices>;

function createServices() {
  const storage = new StorageService();
  const sqlite = new SQLiteService(storage.dbPath());
  const projects = new ProjectService(sqlite.db, storage);
  const agents = new AgentService();
  const git = new GitService();
  const tasks = new TaskService(sqlite.db, storage, (id) => projects.getProject(id));
  const terminal = new TerminalService(sqlite.db, projects, agents);
  const handoff = new HandoffService(sqlite.db, storage, git, (id) => projects.getProject(id), tasks, () => mainWindow, terminal);
  const knowledge = new KnowledgeService(sqlite.db);
  const indexer = new IndexService(sqlite.db);
  const compiler = new ContextCompiler(knowledge, git);
  const settings = new SettingsService(sqlite.db);
  const mcp = new McpService();
  const todos = new TodoService(storage, (id) => projects.getProject(id), (id) => tasks.active(id), () => mainWindow);
  return { storage, sqlite, projects, agents, git, handoff, terminal, settings, mcp, tasks, todos, knowledge, indexer, compiler };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1040,
    minHeight: 680,
    title: "Baton",
    titleBarStyle: "hiddenInset",
    backgroundColor: "#18181b",
    icon: path.join(__dirname, "../../build/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false // required by node-pty and better-sqlite3 native modules
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
  ipcMain.handle("projects:remove", (_event, id: string) => services.projects.removeProject(requireId(id, "project id")));
  ipcMain.handle("projects:openFolder", (_event, projectPath: string) => shell.openPath(projectPath));
  ipcMain.handle("projects:exportRules", async (_event, projectId: string, target: "cursor" | "windsurf" | "instructions", content: string) => {
    const project = services.projects.getProject(requireId(projectId, "project id"));
    if (!project) throw new Error("Project not found.");
    const filename = target === "cursor" ? ".cursorrules" : target === "windsurf" ? ".windsurfrules" : "INSTRUCTIONS.md";
    const filePath = path.join(project.path, filename);
    await services.storage.writeText(filePath, content);
    return { success: true, filePath };
  });
  ipcMain.handle("agents:detect", () => services.agents.detect());
  ipcMain.handle("agents:run", async (_event, projectId: string, agentId: AgentId) => {
    if (!mainWindow) throw new Error("Main window not ready.");
    return services.terminal.start(requireId(projectId, "project id"), requireId(agentId, "agent id"), mainWindow);
  });
  ipcMain.handle("agents:continue", (_event, sessionId: string) => services.terminal.injectContinue(requireId(sessionId, "session id")));
  ipcMain.handle("agents:continuePrompt", (_event, sessionId: string) => services.terminal.continuePrompt(requireId(sessionId, "session id")));
  ipcMain.handle("agents:handoffPrompt", (_event, sessionId: string, guidance?: { nextSteps?: string; constraints?: string }) =>
    services.terminal.injectHandoff(sessionId, guidance)
  );
  ipcMain.handle("agents:updateHandoffPrompt", (_event, sessionId: string) => services.terminal.injectUpdateHandoff(sessionId));
  ipcMain.handle("handoff:createFallback", (_event, input: CreateFallbackHandoffInput) => services.handoff.createFallback(input));
  ipcMain.handle("handoff:ingestLatest", (_event, projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string) =>
    services.handoff.ingestLatest(projectId, fromAgent, toAgent, taskId)
  );
  ipcMain.handle("handoff:waitForLatest", (_event, projectId: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string) =>
    services.handoff.waitForLatest(projectId, fromAgent, toAgent, taskId)
  );
  ipcMain.handle("handoff:waitForUpdatedLatest", (_event, projectId: string, previousContent: string, fromAgent: AgentId, toAgent?: AgentId, taskId?: string) =>
    services.handoff.waitForUpdatedLatest(projectId, previousContent, fromAgent, toAgent, taskId)
  );
  ipcMain.handle("handoff:latest", (_event, projectId: string) => services.handoff.latest(projectId));
  ipcMain.handle("handoff:list", (_event, projectId: string, taskId?: string) =>
    services.handoff.list(requireId(projectId, "project id"), optionalId(taskId, "task id"))
  );
  ipcMain.handle("tasks:create", (_event, projectId: string, title: string) => services.tasks.create(projectId, title));
  ipcMain.handle("tasks:active", (_event, projectId: string) => services.tasks.active(projectId));
  ipcMain.handle("tasks:list", (_event, projectId: string) => services.tasks.list(projectId));
  ipcMain.handle("tasks:updateStatus", (_event, taskId: string, status: string) => services.tasks.updateStatus(requireId(taskId, "task id"), requireStatus(status)));
  ipcMain.handle("git:status", async (_event, projectId: string) => {
    const project = services.projects.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return services.git.status(project.path);
  });
  ipcMain.handle("settings:get", (_event, key: string) => services.settings.get(key));
  ipcMain.handle("settings:set", (_event, key: string, value: string) => services.settings.set(key, value));
  ipcMain.handle("settings:all", () => {
    const hasTmux = hasTmuxAvailable();
    return { ...services.settings.all(), userDataPath: services.storage.userDataPath, hasTmux: hasTmux ? "true" : "false" };
  });
  ipcMain.handle("mcp:list", async (_event, projectId?: string) => {
    const projectPath = projectId ? services.projects.getProject(projectId)?.path : undefined;
    const agents = await services.agents.detect();
    const installedCommands = agents.filter((a) => a.installed).map((a) => a.command);
    return services.mcp.list(installedCommands, projectPath);
  });
  ipcMain.handle("sessions:list", (_event, projectId: string) => services.terminal.listForProject(projectId));
  ipcMain.handle("sessions:rename", (_event, sessionId: string, name: string) => services.terminal.rename(sessionId, name));
  ipcMain.handle("sessions:delete", (_event, sessionId: string) => services.terminal.delete(sessionId));
  ipcMain.handle("sessions:close", (_event, sessionId: string) => services.terminal.close(sessionId));
  ipcMain.handle("sessions:readLog", (_event, sessionId: string) => services.terminal.readLog(sessionId));
  ipcMain.handle("sessions:restore", (_event, sessionId: string) => {
    if (!mainWindow) throw new Error("Main window not ready.");
    return services.terminal.restore(sessionId, mainWindow);
  });
  ipcMain.handle("todos:list", (_event, projectId: string) => services.todos.list(projectId));
  ipcMain.handle("todos:save", (_event, projectId: string, todos: Todo[]) => services.todos.save(projectId, todos));
  ipcMain.handle("knowledge:getDoc", (_event, projectId: string, docType: KnowledgeDocType) => {
    const project = services.projects.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return services.knowledge.getDoc(project.path, docType);
  });
  ipcMain.handle("knowledge:saveDoc", (_event, projectId: string, docType: KnowledgeDocType, content: string) => {
    const project = services.projects.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return services.knowledge.saveDoc(project.path, projectId, docType, content);
  });
  ipcMain.handle("knowledge:listDecisions", (_event, projectId: string) => services.knowledge.listDecisions(projectId));
  ipcMain.handle("knowledge:addDecision", (_event, projectId: string, input: { title: string; reason: string; alternatives?: string; impact?: string }) => {
    const project = services.projects.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return services.knowledge.addDecision(project.path, projectId, input);
  });
  ipcMain.handle("context:compile", (_event, projectId: string, agentId?: string) => {
    const project = services.projects.getProject(projectId);
    if (!project) throw new Error("Project not found.");
    return services.compiler.compile({ projectId, projectPath: project.path, agentId });
  });
  ipcMain.handle("knowledge:search", (_event, projectId: string, query: string) => services.indexer.search(projectId, query));
  ipcMain.on("terminal:write", (_event, sessionId: string, data: string) => services.terminal.write(sessionId, data));
  ipcMain.on("terminal:resize", (_event, sessionId: string, cols: number, rows: number) => services.terminal.resize(sessionId, cols, rows));
  ipcMain.on("terminal:kill", (_event, sessionId: string) => services.terminal.kill(sessionId));
}

process.on("unhandledRejection", (reason) => {
  console.error("[baton] Unhandled rejection:", reason);
});

app.whenReady().then(async () => {
  services = createServices();
  await services.terminal.markStaleSessions();
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
