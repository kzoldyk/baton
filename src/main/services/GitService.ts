import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFile, GitStatus } from "../../shared/types";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd, timeout: 10_000 });
    return stdout.trimEnd();
  } catch {
    return "";
  }
}

export class GitService {
  async status(projectPath: string): Promise<GitStatus> {
    const isRepo = (await git(projectPath, ["rev-parse", "--is-inside-work-tree"])) === "true";
    if (!isRepo) {
      return {
        isRepo: false,
        branch: "",
        statusShort: "",
        diffStat: "",
        nameStatus: "",
        changedFiles: [],
        additions: 0,
        deletions: 0,
        omittedFileCount: 0,
        head: ""
      };
    }

    const [branch, statusShort, diffStat, nameStatus, numstat, head] = await Promise.all([
      git(projectPath, ["branch", "--show-current"]),
      git(projectPath, ["status", "--short"]),
      git(projectPath, ["diff", "HEAD", "--stat"]),
      git(projectPath, ["diff", "HEAD", "--name-status"]),
      git(projectPath, ["diff", "HEAD", "--numstat"]),
      git(projectPath, ["rev-parse", "--short", "HEAD"])
    ]);
    const changedFiles = parseChangedFiles(statusShort, numstat);
    const totals = changedFiles.reduce(
      (sum, file) => ({ additions: sum.additions + file.additions, deletions: sum.deletions + file.deletions }),
      { additions: 0, deletions: 0 }
    );
    return { isRepo, branch, statusShort, diffStat, nameStatus, changedFiles, ...totals, omittedFileCount: 0, head };
  }
}

export function parseChangedFiles(statusShort: string, numstat: string): ChangedFile[] {
  const counts = new Map<string, { additions: number; deletions: number }>();
  for (const line of numstat.split(/\r?\n/).filter(Boolean)) {
    const [additions, deletions, ...pathParts] = line.split(/\t/);
    const file = pathParts.join("\t").replace(/.* -> /, "").trim();
    if (!file) continue;
    counts.set(file, {
      additions: Number(additions) || 0,
      deletions: Number(deletions) || 0
    });
  }

  return statusShort
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2);
      let file = line.slice(3).trim();
      if (file.includes(" -> ")) file = file.split(" -> ").pop() ?? file;
      const stats = counts.get(file) ?? { additions: 0, deletions: 0 };
      return {
        path: file,
        additions: stats.additions,
        deletions: stats.deletions,
        status: mapStatus(code)
      };
    });
}

function mapStatus(code: string): ChangedFile["status"] {
  if (code.includes("?")) return "untracked";
  if (code.includes("A")) return "added";
  if (code.includes("D")) return "deleted";
  if (code.includes("R")) return "renamed";
  return "modified";
}
