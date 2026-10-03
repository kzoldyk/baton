import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { GitService } from "./GitService.ts";

test("non-git project status handling", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "baton-non-git-"));

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  await t.test("returns clean isRepo=false without throwing errors", async () => {
    const git = new GitService();
    const status = await git.status(tempDir);
    assert.equal(status.isRepo, false);
    assert.equal(status.branch, "");
    assert.deepEqual(status.changedFiles, []);
    assert.equal(status.additions, 0);
    assert.equal(status.deletions, 0);
  });
});
