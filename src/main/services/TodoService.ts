import path from "node:path";
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
  constructor(
    private readonly storage: StorageService,
    private readonly getProject: (id: string) => Project | undefined
  ) {}

  async list(projectId: string): Promise<Todo[]> {
    const project = this.getProject(projectId);
    if (!project) return [];
    const filePath = path.join(project.path, ".baton", "todos.md");
    try {
      const content = await this.storage.readText(filePath);
      return parseTodos(content);
    } catch {
      await this.storage.writeText(filePath, DEFAULT_TODOS);
      return parseTodos(DEFAULT_TODOS);
    }
  }

  async save(projectId: string, todos: Todo[]): Promise<void> {
    const project = this.getProject(projectId);
    if (!project) return;
    const content = `# Todos\n\nTrack progress below. Update this file as you complete items.\n\n${todos.map((t) => `- ${t.done ? "[x]" : "[ ]"} ${t.text}`).join("\n")}\n`;
    await this.storage.writeText(path.join(project.path, ".baton", "todos.md"), content);
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
