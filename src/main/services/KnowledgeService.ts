import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Database } from "better-sqlite3";
import { makeId, nowIso } from "./ids";

export type KnowledgeDocType =
  | "overview"
  | "architecture"
  | "decisions"
  | "constraints"
  | "patterns"
  | "pitfalls"
  | "glossary";

export type ArchitectureDecision = {
  id: string;
  projectId: string;
  title: string;
  reason: string;
  alternatives?: string;
  impact?: string;
  status: "proposed" | "accepted" | "superseded" | "deprecated";
  date: string;
  filePath: string;
};

const DOC_FILENAMES: Record<KnowledgeDocType, string> = {
  overview: "project-overview.md",
  architecture: "architecture.md",
  decisions: "decisions.md",
  constraints: "constraints.md",
  patterns: "patterns.md",
  pitfalls: "pitfalls.md",
  glossary: "glossary.md"
};

export class KnowledgeService {
  constructor(private readonly db: Database) {}

  async getDoc(projectPath: string, docType: KnowledgeDocType): Promise<string> {
    const filename = DOC_FILENAMES[docType];
    if (!filename) throw new Error(`Unknown knowledge document type: ${docType}`);
    const filePath = path.join(projectPath, ".baton", "knowledge", filename);
    try {
      return await readFile(filePath, "utf8");
    } catch {
      return "";
    }
  }

  async saveDoc(projectPath: string, projectId: string, docType: KnowledgeDocType, content: string): Promise<void> {
    const filename = DOC_FILENAMES[docType];
    if (!filename) throw new Error(`Unknown knowledge document type: ${docType}`);
    const knowledgeDir = path.join(projectPath, ".baton", "knowledge");
    await mkdir(knowledgeDir, { recursive: true });
    const filePath = path.join(knowledgeDir, filename);
    await writeFile(filePath, content, "utf8");

    // Index into SQLite
    const id = `${projectId}:${docType}`;
    const hash = String(content.length);
    const title = filename.replace(".md", "");

    this.db
      .prepare(
        `INSERT INTO knowledge_documents (id, project_id, document_type, title, raw_markdown, file_path, hash, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           raw_markdown = excluded.raw_markdown,
           hash = excluded.hash,
           updated_at = excluded.updated_at`
      )
      .run(id, projectId, docType, title, content, filePath, hash, nowIso());
  }

  async listDecisions(projectId: string): Promise<ArchitectureDecision[]> {
    return this.db
      .prepare(
        `SELECT id, project_id as projectId, title, reason, alternatives, impact, status, date, file_path as filePath
         FROM decisions
         WHERE project_id = ?
         ORDER BY date DESC`
      )
      .all(projectId) as ArchitectureDecision[];
  }

  async addDecision(
    projectPath: string,
    projectId: string,
    input: { title: string; reason: string; alternatives?: string; impact?: string }
  ): Promise<ArchitectureDecision> {
    const id = makeId("adr");
    const date = nowIso().split("T")[0] ?? "2026-07-25";
    const decision: ArchitectureDecision = {
      id,
      projectId,
      title: input.title,
      reason: input.reason,
      alternatives: input.alternatives,
      impact: input.impact,
      status: "accepted",
      date,
      filePath: path.join(projectPath, ".baton", "knowledge", "decisions.md")
    };

    // Save to SQLite
    this.db
      .prepare(
        `INSERT INTO decisions (id, project_id, title, reason, alternatives, impact, status, date, file_path)
         VALUES (@id, @projectId, @title, @reason, @alternatives, @impact, @status, @date, @filePath)`
      )
      .run(decision);

    // Append to decisions.md
    const existing = await this.getDoc(projectPath, "decisions");
    const newEntry = `\n### ${input.title}\n- **Status**: Accepted\n- **Date**: ${date}\n- **Reason**: ${input.reason}${
      input.alternatives ? `\n- **Alternatives Considered**: ${input.alternatives}` : ""
    }${input.impact ? `\n- **Impact**: ${input.impact}` : ""}\n`;

    const updated = existing.trimEnd() + "\n" + newEntry;
    await this.saveDoc(projectPath, projectId, "decisions", updated);

    return decision;
  }
}
