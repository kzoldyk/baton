import { createHash } from "node:crypto";
import type { ChangedFile } from "../../shared/types";

export const MAX_PASS_FILES = 8;
export const MAX_PASS_BULLETS = 5;
export const MAX_BULLET_WORDS = 16;
export const MAX_HANDOFF_CHARS = 4_000;
export const MAX_HISTORY_PASSES = 10;

export type PassFile = { path: string; why: string };

export type BatonPass = {
  v: 1;
  task: string;
  from: string;
  to: string;
  status: "in_progress" | "blocked" | "ready_for_review";
  done: string[];
  next: string[];
  files: PassFile[];
  inspect: string[];
  dont: string[];
  blockers: string[];
  git: {
    branch: string;
    head: string;
    dirty: boolean;
    files_changed: number;
  };
};

export const HANDOFF_STUB = `# Latest Baton Pass

No Baton Pass has been created yet.
`;

export type HandoffQuality = {
  useful: boolean;
  tooLong: boolean;
  charCount: number;
  missing: string[];
  warnings: string[];
};

export function emptyPass(partial?: Partial<BatonPass>): BatonPass {
  return {
    v: 1,
    task: "",
    from: "",
    to: "next",
    status: "in_progress",
    done: [],
    next: [],
    files: [],
    inspect: [],
    dont: [],
    blockers: [],
    git: { branch: "", head: "", dirty: false, files_changed: 0 },
    ...partial
  };
}

export function capList(items: string[], max = MAX_PASS_BULLETS): string[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((item) => {
      const words = item.split(/\s+/);
      return words.length > MAX_BULLET_WORDS ? `${words.slice(0, MAX_BULLET_WORDS).join(" ")}…` : item;
    });
}

export function capFiles(files: PassFile[]): PassFile[] {
  return files
    .filter((file) => file.path.trim())
    .slice(0, MAX_PASS_FILES)
    .map((file) => ({
      path: file.path.trim(),
      why: capList([file.why], 1)[0] ?? ""
    }));
}

export function normalizePass(pass: BatonPass): BatonPass {
  return {
    v: 1,
    task: pass.task.trim().slice(0, 160),
    from: pass.from.trim(),
    to: pass.to.trim() || "next",
    status: pass.status,
    done: capList(pass.done),
    next: capList(pass.next),
    files: capFiles(pass.files),
    inspect: capList(pass.inspect),
    dont: capList(pass.dont),
    blockers: capList(pass.blockers, 2),
    git: {
      branch: pass.git.branch.trim(),
      head: pass.git.head.trim(),
      dirty: pass.git.dirty,
      files_changed: pass.git.files_changed
    }
  };
}

export function serializePassYaml(pass: BatonPass): string {
  const p = normalizePass(pass);
  const lines: string[] = [
    "v: 1",
    `task: ${yamlQuote(p.task)}`,
    `from: ${yamlQuote(p.from)}`,
    `to: ${yamlQuote(p.to)}`,
    `status: ${p.status}`,
    yamlStringList("done", p.done),
    yamlStringList("next", p.next),
    yamlFiles("files", p.files),
    yamlStringList("inspect", p.inspect),
    yamlStringList("dont", p.dont),
    yamlStringList("blockers", p.blockers),
    "git:",
    `  branch: ${yamlQuote(p.git.branch)}`,
    `  head: ${yamlQuote(p.git.head)}`,
    `  dirty: ${p.git.dirty ? "true" : "false"}`,
    `  files_changed: ${p.git.files_changed}`,
    ""
  ];
  return lines.filter((line) => line !== "").join("\n") + "\n";
}

export function parsePassYaml(text: string): BatonPass {
  const pass = emptyPass();
  const lines = text.split(/\r?\n/);
  let section: "done" | "next" | "inspect" | "dont" | "blockers" | "files" | "git" | undefined;
  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ");
    const fileMatch = line.match(/^\s+- path:\s*(.+)$/);
    if (section === "files" && fileMatch) {
      pass.files.push({ path: unquote(fileMatch[1]), why: "" });
      continue;
    }
    const whyMatch = line.match(/^\s+why:\s*(.+)$/);
    if (section === "files" && whyMatch && pass.files.length) {
      pass.files[pass.files.length - 1].why = unquote(whyMatch[1]);
      continue;
    }
    const listItem = line.match(/^\s+- (.+)$/);
    if (listItem && section && section !== "files" && section !== "git") {
      pass[section].push(unquote(listItem[1]));
      continue;
    }
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) {
      const gitKv = line.match(/^\s+(branch|head|dirty|files_changed):\s*(.*)$/);
      if (gitKv) {
        const key = gitKv[1];
        const value = unquote(gitKv[2]);
        if (key === "dirty") pass.git.dirty = value === "true";
        else if (key === "files_changed") pass.git.files_changed = Number(value) || 0;
        else if (key === "branch") pass.git.branch = value;
        else pass.git.head = value;
      }
      continue;
    }
    const [, key, value] = kv;
    if (key === "done" || key === "next" || key === "inspect" || key === "dont" || key === "blockers" || key === "files" || key === "git") {
      section = key;
      continue;
    }
    section = undefined;
    if (key === "task") pass.task = unquote(value);
    if (key === "from") pass.from = unquote(value);
    if (key === "to") pass.to = unquote(value);
    if (key === "status" && (value === "in_progress" || value === "blocked" || value === "ready_for_review")) pass.status = value;
  }
  return normalizePass(pass);
}

export function renderPassMarkdown(pass: BatonPass): string {
  const p = normalizePass(pass);
  const bullets = (items: string[]): string => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- None");
  const files = p.files.length
    ? p.files.map((file) => `- ${file.path}${file.why ? `: ${file.why}` : ""}`).join("\n")
    : "- None listed. Run git status locally if needed.";
  return `# Baton Pass

## Current Task
${p.task || "No active task."}

## From
${p.from || "unknown"}

## To
${p.to}

## Completed
${bullets(p.done)}

## Next Steps
${bullets(p.next)}

## Files to Inspect
${p.inspect.length ? bullets(p.inspect) : files}

## Changed Files
${files}

## Do Not Touch
${bullets(p.dont)}

## Blockers
${bullets(p.blockers)}

## Git
- branch: ${p.git.branch || "n/a"}
- head: ${p.git.head || "n/a"}
- dirty: ${p.git.dirty ? "yes" : "no"}
- files_changed: ${p.git.files_changed}

Do not reread the whole repository. Do not dump full diffs.
`;
}

export function parseMarkdownToPass(markdown: string, base?: Partial<BatonPass>): BatonPass {
  const pass = emptyPass(base);
  const section = (name: string): string => {
    const match = markdown.match(new RegExp(`##\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i"));
    return match?.[1]?.trim() ?? "";
  };
  const bullets = (body: string): string[] =>
    body
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*-\s+/, "").trim())
      .filter((line) => line && !/^none\b/i.test(line));

  const task = section("Current Task").split(/\r?\n/)[0]?.trim();
  if (task) pass.task = task;
  const from = section("From").split(/\r?\n/)[0]?.trim();
  if (from) pass.from = from;
  const to = section("To").split(/\r?\n/)[0]?.trim();
  if (to) pass.to = to;
  pass.done = bullets(section("Completed") || section("Known Context"));
  pass.next = bullets(section("Next Steps"));
  pass.dont = bullets(section("Do Not Touch") || section("Constraints"));
  pass.blockers = bullets(section("Blockers") || section("Blockers or Risks"));
  pass.inspect = bullets(section("Files to Inspect")).map((line) => line.replace(/:.*$/, "").trim());
  pass.files = bullets(section("Changed Files")).map((line) => {
    const [pathPart, ...whyParts] = line.split(":");
    const path = pathPart.replace(/\s+\+\d+.*$/, "").trim();
    return { path, why: whyParts.join(":").trim() };
  });
  return normalizePass(pass);
}

export function isHandoffStub(content: string): boolean {
  return content.includes("No Baton Pass has been created yet.");
}

export function isUsefulHandoff(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 40) return false;
  if (isHandoffStub(trimmed)) return false;
  if (trimmed.includes("task:") && trimmed.includes("next:")) return true;
  return /##\s*Current Task/i.test(trimmed) || /##\s*Next Steps/i.test(trimmed);
}

export function assessHandoffQuality(content: string): HandoffQuality {
  const trimmed = content.trim();
  const charCount = trimmed.length;
  const missing: string[] = [];
  if (!/##\s*Current Task/i.test(trimmed) && !/^task:/m.test(trimmed)) missing.push("Current Task");
  if (!/##\s*Next Steps/i.test(trimmed) && !/^next:/m.test(trimmed)) missing.push("Next Steps");
  const warnings: string[] = [];
  if (!isUsefulHandoff(trimmed)) warnings.push("This pass is empty or incomplete. The next agent may restart from scratch.");
  if (charCount > MAX_HANDOFF_CHARS) warnings.push(`Pass is ${charCount} characters. Trim it so the next agent does not waste tokens.`);
  if (missing.includes("Next Steps")) warnings.push("Add ordered next steps before handing off.");
  return { useful: isUsefulHandoff(trimmed), tooLong: charCount > MAX_HANDOFF_CHARS, charCount, missing, warnings };
}

export function passHash(yaml: string): string {
  return createHash("sha256").update(yaml).digest("hex").slice(0, 16);
}

export function filesFromGit(files: ChangedFile[]): PassFile[] {
  return capFiles(files.map((file) => ({ path: file.path, why: file.status })));
}

export const V1_CONTINUE_PROMPT = `You are continuing a coding task using Baton.

First read these files only:
1. .baton/current-task.md
2. .baton/latest-handoff.md
3. .baton/todos.md

Then continue from the Baton Pass.

Rules:
- Do not restart from scratch.
- Do not reread the whole repository.
- Do not read .baton/knowledge or compiled-context files.
- Respect decisions, constraints, and what not to touch.
- Focus on the listed next steps.
- Keep .baton/todos.md updated as work progresses.
- When done, rewrite .baton/latest-handoff.md with the latest accurate pass (keep it short).
`;

export const V1_CONTINUE_MD = `# Continue with Baton

${V1_CONTINUE_PROMPT}
`;

function yamlQuote(value: string): string {
  if (value === "") return '""';
  if (/[:#{}[\],&*?|>!%@`]/.test(value) || value.includes("'") || value.includes('"') || /\s/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed.replace(/^'/, '"').replace(/'$/, '"')) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function yamlStringList(key: string, items: string[]): string {
  if (!items.length) return `${key}: []`;
  return `${key}:\n${items.map((item) => `  - ${yamlQuote(item)}`).join("\n")}`;
}

function yamlFiles(key: string, files: PassFile[]): string {
  if (!files.length) return `${key}: []`;
  return `${key}:\n${files.map((file) => `  - path: ${yamlQuote(file.path)}\n    why: ${yamlQuote(file.why)}`).join("\n")}`;
}
