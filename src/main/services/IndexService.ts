import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Database } from "better-sqlite3";
import type { KnowledgeDocType } from "./KnowledgeService";

export type SearchResult = {
  documentId: string;
  projectId: string;
  category: string;
  title: string;
  snippet: string;
};

export class IndexService {
  constructor(private readonly db: Database) {}

  async indexProject(projectId: string, projectPath: string): Promise<void> {
    const knowledgeDir = path.join(projectPath, ".baton", "knowledge");
    try {
      const files = await readdir(knowledgeDir);
      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const category = file.replace(".md", "");
        const filePath = path.join(knowledgeDir, file);
        const content = await readFile(filePath, "utf8");
        this.indexDocument(projectId, category as KnowledgeDocType, file, content);
      }
    } catch {
      // directory might not exist yet
    }
  }

  indexDocument(projectId: string, category: string, title: string, content: string): void {
    const docId = `${projectId}:${category}`;
    
    // Clear existing FTS record for this docId
    this.db.prepare(`DELETE FROM fts_knowledge WHERE document_id = ?`).run(docId);

    // Insert updated FTS record
    this.db
      .prepare(
        `INSERT INTO fts_knowledge (document_id, project_id, category, title, content)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(docId, projectId, category, title, content);
  }

  search(projectId: string, query: string, limit = 10): SearchResult[] {
    if (!query.trim()) return [];
    try {
      const sanitized = query.replace(/[^\w\s]/gi, "").trim();
      if (!sanitized) return [];
      const matchQuery = `${sanitized}*`;

      return this.db
        .prepare(
          `SELECT document_id as documentId, project_id as projectId, category, title, snippet(fts_knowledge, 4, '<b>', '</b>', '...', 32) as snippet
           FROM fts_knowledge
           WHERE project_id = ? AND fts_knowledge MATCH ?
           LIMIT ?`
        )
        .all(projectId, matchQuery, limit) as SearchResult[];
    } catch {
      return [];
    }
  }
}
