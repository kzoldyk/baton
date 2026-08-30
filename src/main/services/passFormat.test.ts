import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChangedFiles } from "./GitService.ts";
import {
  capList,
  emptyPass,
  isUsefulHandoff,
  parseMarkdownToPass,
  parsePassYaml,
  renderPassMarkdown,
  serializePassYaml,
  V1_CONTINUE_PROMPT
} from "./passFormat.ts";

describe("pass yaml", () => {
  it("roundtrips a compact pass", () => {
    const pass = emptyPass({
      task: "Billing retries",
      from: "grok",
      to: "codex",
      next: ["Add idempotency key"],
      files: [{ path: "src/webhooks/stripe.ts", why: "retry loop" }],
      inspect: ["src/webhooks/stripe.ts"],
      dont: ["Do not touch auth"],
      git: { branch: "feat/billing", head: "abc123", dirty: true, files_changed: 3 }
    });
    const yaml = serializePassYaml(pass);
    const parsed = parsePassYaml(yaml);
    assert.equal(parsed.task, "Billing retries");
    assert.equal(parsed.to, "codex");
    assert.equal(parsed.files[0]?.path, "src/webhooks/stripe.ts");
    assert.equal(parsed.git.head, "abc123");
    const md = renderPassMarkdown(parsed);
    assert.match(md, /## Next Steps/);
    assert.ok(md.length < 4000);
    assert.ok(isUsefulHandoff(md));
  });

  it("caps long bullet lists", () => {
    const capped = capList(["a", "b", "c", "d", "e", "f", "g"]);
    assert.equal(capped.length, 5);
  });

  it("parses agent markdown into a pass", () => {
    const md = `# Baton Pass

## Current Task
Fix login

## Next Steps
- Read auth.ts

## Changed Files
- src/auth.ts: token check
`;
    const parsed = parseMarkdownToPass(md);
    assert.equal(parsed.task, "Fix login");
    assert.equal(parsed.next[0], "Read auth.ts");
  });
});

describe("git parse", () => {
  it("includes untracked and staged-style paths", () => {
    const files = parseChangedFiles(" M src/a.ts\n?? src/b.ts\n", "1\t2\tsrc/a.ts");
    assert.equal(files.length, 2);
    assert.equal(files.find((f) => f.path === "src/b.ts")?.status, "untracked");
  });
});

describe("continue prompt", () => {
  it("does not send agents into knowledge or compiled context", () => {
    assert.match(V1_CONTINUE_PROMPT, /current-task\.md/);
    assert.match(V1_CONTINUE_PROMPT, /latest-handoff\.md/);
    assert.match(V1_CONTINUE_PROMPT, /todos\.md/);
    assert.match(V1_CONTINUE_PROMPT, /First read these files only/);
    assert.match(V1_CONTINUE_PROMPT, /Do not read \.baton\/knowledge/);
  });

  it("rejects stub handoffs as not useful", () => {
    assert.equal(isUsefulHandoff("# Latest Baton Pass\n\nNo Baton Pass has been created yet.\n"), false);
  });
});
