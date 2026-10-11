import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBundledTmuxPath, resolveTmuxCommand, checkTmux } from "./TerminalService.ts";

describe("tmux bundling & detection", () => {
  it("resolves bundled or system tmux on supported platforms", () => {
    const bundled = getBundledTmuxPath();
    const resolved = resolveTmuxCommand();

    // On macOS arm64 where we bundled bin/tmux/darwin-arm64/tmux, bundled must exist or system candidate matches
    if (process.platform === "darwin" && process.arch === "arm64") {
      assert.ok(bundled, "Bundled darwin-arm64 path should be configured");
      assert.ok(resolved, "Resolved tmux command should be available");
      assert.equal(checkTmux(), true, "checkTmux should return true");
    }
  });

  it("checks tmux availability safely without throwing", () => {
    const available = checkTmux();
    assert.equal(typeof available, "boolean");
  });
});
