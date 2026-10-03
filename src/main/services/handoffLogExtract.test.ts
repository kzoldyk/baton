import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLogContext } from "./TerminalService.ts";
import { HandoffService } from "./HandoffService.ts";
import type { CreateFallbackHandoffInput, Project, GitStatus } from "../../shared/types.ts";

describe("session log extraction", () => {
  it("parses commands, test results, and errors from raw terminal output", () => {
    const raw = `
$ git status
On branch feat/auth
$ npm test
> baton@0.1.0 test
> node --test

✔ ipc validation (1.2ms)
✖ auth validation (3.4ms)
TypeError: Cannot read properties of undefined (reading 'token')
    at validateAuth (src/auth.ts:12:15)
npm ERR! Test failed. See above for more details.
1 pass, 1 fail
Ran 2 tests across 1 file.
`;

    const parsed = parseLogContext(raw);
    assert.ok(parsed.commands.includes("git status"));
    assert.ok(parsed.commands.includes("npm test"));
    assert.ok(parsed.testResults.some((t) => t.includes("✔ ipc validation")));
    assert.ok(parsed.testResults.some((t) => t.includes("✖ auth validation")));
    assert.ok(parsed.testResults.some((t) => t.includes("1 pass, 1 fail")));
    assert.ok(parsed.errors.some((e) => e.includes("TypeError: Cannot read properties")));
    assert.ok(parsed.errors.some((e) => e.includes("npm ERR!")));
  });

  it("strips ANSI escape codes cleanly", () => {
    const ansiLog = "\u001b[32m✔\u001b[0m \u001b[1mpass yaml\u001b[0m\n\u001b[31mError: module not found\u001b[0m\n$ \u001b[36mpnpm test\u001b[0m";
    const parsed = parseLogContext(ansiLog);

    assert.ok(parsed.commands.includes("pnpm test"));
    assert.ok(parsed.testResults.some((t) => t.includes("✔ pass yaml")));
    assert.ok(parsed.errors.some((e) => e.includes("Error: module not found")));
  });

  it("parses cargo and pytest outputs", () => {
    const cargoLog = `
➜ cargo test
   Compiling baton v0.1.0
error[E0432]: unresolved import \`crate::missing\`
test result: FAILED. 0 passed; 1 failed
`;
    const parsedCargo = parseLogContext(cargoLog);
    assert.ok(parsedCargo.commands.includes("cargo test"));
    assert.ok(parsedCargo.errors.some((e) => e.includes("error[E0432]")));
    assert.ok(parsedCargo.testResults.some((t) => t.includes("test result: FAILED")));

    const pytestLog = `
$ pytest tests/
===== 5 passed in 0.42s =====
`;
    const parsedPytest = parseLogContext(pytestLog);
    assert.ok(parsedPytest.commands.includes("pytest tests/"));
    assert.ok(parsedPytest.testResults.some((t) => t.includes("5 passed in 0.42s")));
    assert.equal(parsedPytest.errors.length, 0);
  });

  it("avoids false positive error lines", () => {
    const log = `
$ npm test
✔ handles error without crashing (2ms)
Tests: 5 passed, 0 errors
`;
    const parsed = parseLogContext(log);
    assert.equal(parsed.errors.length, 0);
  });

  it("deduplicates repeated commands and errors", () => {
    const log = `
$ npm test
$ npm test
Error: connection refused
Error: connection refused
`;
    const parsed = parseLogContext(log);
    assert.equal(parsed.commands.filter((c) => c === "npm test").length, 1);
    assert.equal(parsed.errors.filter((e) => e.includes("Error: connection refused")).length, 1);
  });
});

describe("handoff fallback enhancement with log extraction", () => {
  const fakeProject: Project = {
    id: "prj_test1",
    name: "Test Project",
    path: "/fake/repo",
    appStoragePath: "/fake/storage",
    createdAt: "2026-10-03T10:00:00Z",
    updatedAt: "2026-10-03T10:00:00Z"
  };

  const fakeGitStatus: GitStatus = {
    isRepo: true,
    branch: "main",
    statusShort: " M src/index.ts",
    diffStat: " 1 file changed",
    nameStatus: "M src/index.ts",
    changedFiles: [{ path: "src/index.ts", additions: 5, deletions: 1, status: "modified" }],
    additions: 5,
    deletions: 1,
    head: "abc1234"
  };

  const createMockStorage = () => {
    const files = new Map<string, string>();
    return {
      files,
      readText: async (filePath: string) => files.get(filePath) ?? "",
      writeText: async (filePath: string, content: string) => {
        files.set(filePath, content);
      }
    };
  };

  const createMockTasks = () => ({
    get: (_id: string) => ({ id: "tsk_1", projectId: "prj_test1", title: "Implement feature", status: "active" as const, createdAt: "", updatedAt: "" }),
    active: (_id: string) => ({ id: "tsk_1", projectId: "prj_test1", title: "Implement feature", status: "active" as const, createdAt: "", updatedAt: "" }),
    persistHandoff: async () => {}
  });

  const createMockGit = () => ({
    status: async () => fakeGitStatus
  });

  it("populates done, blockers, and next from sessionId log context", async () => {
    const storage = createMockStorage();
    const tasks = createMockTasks();
    const git = createMockGit();

    const mockDb = {
      prepare: (query: string) => ({
        get: () => undefined,
        all: () => [],
        run: () => ({ changes: 1 })
      })
    };

    const mockTerminal = {
      extractLogContext: async (sessionId: string) => {
        assert.equal(sessionId, "ses_123");
        return {
          commands: ["git checkout -b fix", "npm test"],
          testResults: ["✖ login test failed"],
          errors: ["TypeError: auth token is undefined"]
        };
      }
    };

    const handoffService = new HandoffService(
      mockDb as any,
      storage as any,
      git as any,
      () => fakeProject,
      tasks as any,
      undefined,
      mockTerminal
    );

    const input: CreateFallbackHandoffInput = {
      projectId: "prj_test1",
      sessionId: "ses_123",
      fromAgent: "claude",
      toAgent: "codex"
    };

    const result = await handoffService.createFallback(input);

    assert.ok(result.content, "Should produce handoff content");
    assert.match(result.content, /Ran: npm test/);
    assert.match(result.content, /TypeError: auth token is undefined/);
    assert.match(result.content, /Fix error: TypeError: auth token is undefined/);
  });

  it("automatically discovers active session when input.sessionId is omitted", async () => {
    const storage = createMockStorage();
    const tasks = createMockTasks();
    const git = createMockGit();

    const mockDb = {
      prepare: (query: string) => ({
        get: (projectId: string) => {
          if (query.includes("agent_sessions")) {
            return { id: "ses_auto_active" };
          }
          return undefined;
        },
        all: () => [],
        run: () => ({ changes: 1 })
      })
    };

    let inspectedSession = "";
    const mockTerminal = {
      extractLogContext: async (sessionId: string) => {
        inspectedSession = sessionId;
        return {
          commands: ["npm run build"],
          testResults: ["Build passed"],
          errors: []
        };
      }
    };

    const handoffService = new HandoffService(
      mockDb as any,
      storage as any,
      git as any,
      () => fakeProject,
      tasks as any,
      undefined,
      mockTerminal
    );

    const input: CreateFallbackHandoffInput = {
      projectId: "prj_test1",
      fromAgent: "gemini",
      toAgent: "cursor"
    };

    const result = await handoffService.createFallback(input);

    assert.equal(inspectedSession, "ses_auto_active");
    assert.ok(result.content);
    assert.match(result.content, /Ran: npm run build/);
    assert.match(result.content, /Verify recent run: npm run build/);
  });

  it("preserves explicit user nextSteps and constraints", async () => {
    const storage = createMockStorage();
    const tasks = createMockTasks();
    const git = createMockGit();

    const mockDb = {
      prepare: () => ({
        get: () => ({ id: "ses_1" }),
        all: () => [],
        run: () => ({ changes: 1 })
      })
    };

    const mockTerminal = {
      extractLogContext: async () => ({
        commands: ["npm test"],
        testResults: [],
        errors: []
      })
    };

    const handoffService = new HandoffService(
      mockDb as any,
      storage as any,
      git as any,
      () => fakeProject,
      tasks as any,
      undefined,
      mockTerminal
    );

    const input: CreateFallbackHandoffInput = {
      projectId: "prj_test1",
      fromAgent: "claude",
      toAgent: "codex",
      nextSteps: "1. Add unit test for retry\n2. Deploy to staging",
      constraints: "Do not modify database schema"
    };

    const result = await handoffService.createFallback(input);
    assert.match(result.content!, /Add unit test for retry/);
    assert.match(result.content!, /Do not modify database schema/);
  });
});
