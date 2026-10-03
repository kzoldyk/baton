import test from "node:test";
import assert from "node:assert/strict";
import { isSensitiveFile, filesFromGit } from "./passFormat.ts";
import type { ChangedFile } from "../../shared/types.ts";

test("sensitive file exclusion", async (t) => {
  await t.test("identifies .env and secret files as sensitive", () => {
    assert.equal(isSensitiveFile(".env"), true);
    assert.equal(isSensitiveFile(".env.local"), true);
    assert.equal(isSensitiveFile(".env.production"), true);
    assert.equal(isSensitiveFile("config/.env.secret"), true);
    assert.equal(isSensitiveFile("id_rsa"), true);
    assert.equal(isSensitiveFile("id_rsa.pub"), true);
    assert.equal(isSensitiveFile("id_ed25519"), true);
    assert.equal(isSensitiveFile("server.key"), true);
    assert.equal(isSensitiveFile("cert.pem"), true);
    assert.equal(isSensitiveFile("credentials.json"), true);
    assert.equal(isSensitiveFile("service-account-key.json"), true);
  });

  await t.test("allows normal source code and config files", () => {
    assert.equal(isSensitiveFile("src/index.ts"), false);
    assert.equal(isSensitiveFile("package.json"), false);
    assert.equal(isSensitiveFile("README.md"), false);
    assert.equal(isSensitiveFile("src/environments/environment.ts"), false);
  });

  await t.test("filesFromGit completely filters out sensitive files from handoff lists", () => {
    const gitFiles: ChangedFile[] = [
      { path: "src/auth.ts", status: "modified", additions: 10, deletions: 2 },
      { path: ".env", status: "untracked", additions: 5, deletions: 0 },
      { path: ".env.production", status: "modified", additions: 2, deletions: 0 },
      { path: "server.key", status: "added", additions: 100, deletions: 0 },
      { path: "src/server.ts", status: "modified", additions: 4, deletions: 1 }
    ];

    const passFiles = filesFromGit(gitFiles);
    assert.equal(passFiles.length, 2);
    assert.deepEqual(passFiles.map((f) => f.path), ["src/auth.ts", "src/server.ts"]);
    assert.equal(passFiles.some((f) => f.path.includes(".env")), false);
  });
});
