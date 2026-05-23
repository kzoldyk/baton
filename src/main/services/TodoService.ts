import path from "node:path";
import { watch, type FSWatcher } from "node:fs";
import type { Project, Todo } from "../../shared/types";
import type { StorageService } from "./StorageService";

const DEFAULT_TODOS = `# Todos

Track progress below. Update this file as you complete items.

- [ ] Understand the codebase
- [ ] Implement the feature
- [ ] Add tests
- [ ] Verify everything works
`;

export class TodoService {
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly storage: StorageService,
    private readonly getProject: (id: string) => Project | undefined,
    private readonly getWindow?: () => import("electron").BrowserWindow | undefined
  ) {}

  async list(projectId: string): Promise<Todo[]> {
    const project = this.getProject(projectId);
    if (!project) return [];
    const filePath = path.join(project.path, ".baton", "todos.md");
    try {
      const content = await this.storage.readText(filePath);
      this.watchProject(project);
      return parseTodos(content);
    } catch {
      await this.storage.writeText(filePath, DEFAULT_TODOS);
      this.watchProject(project);
      return parseTodos(DEFAULT_TODOS);
    }
  }

  async save(projectId: string, todos: Todo[]): Promise<void> {
    const project = this.getProject(projectId);
    if (!project) return;
    const content = `# Todos\n\nTrack progress below. Update this file as you complete items.\n\n${todos.map((t) => `- ${t.done ? "[x]" : "[ ]"} ${t.text}`).join("\n")}\n`;
    await this.storage.writeText(path.join(project.path, ".baton", "todos.md"), content);
    this.getWindow?.()?.webContents.send("todos:updated", { projectId, todos });
  }

  private watchProject(project: Project): void {
    if (this.watchers.has(project.id)) return;
    const filePath = path.join(project.path, ".baton", "todos.md");
    try {
      const watcher = watch(filePath, () => {
        const existing = this.timers.get(project.id);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(async () => {
          try {
            const content = await this.storage.readText(filePath);
            this.getWindow?.()?.webContents.send("todos:updated", { projectId: project.id, todos: parseTodos(content) });
          } catch {
            // The file may be mid-write or temporarily missing; the next change will retry.
          }
        }, 150);
        this.timers.set(project.id, timer);
      });
      watcher.on("error", () => {
        this.watchers.delete(project.id);
      });
      this.watchers.set(project.id, watcher);
    } catch {
      // Watching is best-effort; explicit refresh still works.
    }
  }
}

function parseTodos(content: string): Todo[] {
  const todos: Todo[] = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^-\s+\[( |x|X)\]\s+(.+)/);
    if (match) {
      todos.push({ text: match[2].trim(), done: match[1] !== " " });
    }
  }
  return todos;
}
