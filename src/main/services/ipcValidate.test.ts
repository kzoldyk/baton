import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { optionalId, requireId, requireStatus } from "./ipcValidate.ts";

describe("ipc validation", () => {
  it("accepts safe ids", () => {
    assert.equal(requireId("prj_abc123", "project id"), "prj_abc123");
    assert.equal(optionalId("tsk_1", "task id"), "tsk_1");
    assert.equal(optionalId(undefined, "task id"), undefined);
  });

  it("rejects path traversal in ids", () => {
    assert.throws(() => requireId("../etc", "project id"), /Invalid project id/);
    assert.throws(() => requireId("a/b", "task id"), /Invalid task id/);
    assert.throws(() => requireId("a\\b", "session id"), /Invalid session id/);
  });

  it("rejects empty ids", () => {
    assert.throws(() => requireId("", "project id"), /Invalid project id/);
    assert.throws(() => requireId("   ", "project id"), /Invalid project id/);
  });

  it("validates task status enum", () => {
    assert.equal(requireStatus("active"), "active");
    assert.equal(requireStatus("paused"), "paused");
    assert.equal(requireStatus("completed"), "completed");
    assert.throws(() => requireStatus("deleted"), /Invalid task status/);
  });
});
