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
      return { isRepo: false, branch: "", statusShort: "", diffStat: "", nameStatus: "", changedFiles: [], additions: 0, deletions: 0 };
    }

    const [branch, statusShort, diffStat, nameStatus, numstat] = await Promise.all([
      git(projectPath, ["branch", "--show-current"]),
      git(projectPath, ["status", "--short"]),
      git(projectPath, ["diff", "--stat"]),
      git(projectPath, ["diff", "--name-status"]),
      git(projectPath, ["diff", "--numstat"])
    ]);
    const changedFiles = parseChangedFiles(statusShort, numstat);
    const totals = changedFiles.reduce(
      (sum, file) => ({ additions: sum.additions + file.additions, deletions: sum.deletions + file.deletions }),
      { additions: 0, deletions: 0 }
    );
    return { isRepo, branch, statusShort, diffStat, nameStatus, changedFiles, ...totals };
  }
}

function parseChangedFiles(statusShort: string, numstat: string): ChangedFile[] {
  const counts = new Map<string, { additions: number; deletions: number }>();
  for (const line of numstat.split(/\r?\n/).filter(Boolean)) {
    const [additions, deletions, file] = line.split(/\t/);
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
      const file = line.slice(3).trim();
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
