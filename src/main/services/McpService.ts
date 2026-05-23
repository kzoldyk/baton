import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { McpServer } from "../../shared/types";

type GlobalConfig = {
  filePath: string;
  format: "json" | "jsonc" | "toml";
  label: string;
  requiresCommand?: string;
};

type ProjectConfig = {
  relPath: string;
  format: "json";
  label: string;
  requiresCommand?: string;
};

const GLOBAL_SOURCES: GlobalConfig[] = [
  { filePath: path.join(os.homedir(), ".claude", "settings.json"), format: "json", label: "Claude Code", requiresCommand: "claude" },
  { filePath: path.join(os.homedir(), ".config", "opencode", "opencode.jsonc"), format: "jsonc", label: "OpenCode", requiresCommand: "opencode" },
  { filePath: path.join(os.homedir(), ".config", "kilo", "kilo.jsonc"), format: "jsonc", label: "Kilo", requiresCommand: "kilo" },
  { filePath: path.join(os.homedir(), ".codex", "config.toml"), format: "toml", label: "Codex", requiresCommand: "codex" },
  { filePath: path.join(os.homedir(), ".kiro", "settings", "mcp.json"), format: "json", label: "Kiro", requiresCommand: "kiro-cli" },
  { filePath: path.join(os.homedir(), ".lmstudio", "mcp.json"), format: "json", label: "LM Studio" },
  { filePath: path.join(os.homedir(), ".ai", "mcp", "mcp.json"), format: "json", label: "AI Tools" },
];

const PROJECT_SOURCES: ProjectConfig[] = [
  { relPath: ".claude/settings.json", format: "json", label: "Claude Code (project)", requiresCommand: "claude" },
  { relPath: ".mcp.json", format: "json", label: "Project MCP" },
];

export class McpService {
  async list(installedCommands: string[], projectPath?: string): Promise<McpServer[]> {
    const seen = new Set<string>();
    const servers: McpServer[] = [];

    const add = (name: string, source: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      servers.push({ name, status: "unknown", detail: `from ${source}`, source });
    };

    for (const src of GLOBAL_SOURCES) {
      if (src.requiresCommand && !installedCommands.includes(src.requiresCommand)) continue;
      const names = await this.readServerNames(src.filePath, src.format);
      for (const n of names) add(n, src.label);
    }

    if (projectPath) {
      for (const pf of PROJECT_SOURCES) {
        if (pf.requiresCommand && !installedCommands.includes(pf.requiresCommand)) continue;
        const fp = path.join(projectPath, pf.relPath);
        const names = await this.readServerNames(fp, pf.format);
        for (const n of names) add(n, pf.label);
      }
    }

    return servers;
  }

  private async readServerNames(filePath: string, format: string): Promise<string[]> {
    try {
      const raw = await readFile(filePath, "utf-8");
      if (!raw.trim()) return [];
      const cleaned = format === "jsonc" ? stripJsonc(raw) : raw;

      if (format === "toml") {
        return this.parseTomlMcpServers(cleaned);
      }

      const parsed = JSON.parse(cleaned);
      const mcpServers = parsed?.mcpServers;
      if (!mcpServers || typeof mcpServers !== "object") return [];
      return Object.keys(mcpServers);
    } catch {
      return [];
    }
  }

  private parseTomlMcpServers(content: string): string[] {
    const names: string[] = [];
    const re = /^\[mcp_servers\.([^\]]+)\]$/gm;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const name = match[1].trim();
      if (name) names.push(name);
    }
    return names;
  }
}

function stripJsonc(text: string): string {
  return text
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([}\]])/g, "$1");
}
