import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentService } from "./AgentService.ts";

describe("agent detection", () => {
  it("never detects /usr/bin/command or OS system binaries as coding agents", async () => {
    const service = new AgentService();
    const detected = await service.detect();

    // Verify 'command' is never detected as an installed agent
    const commandAgent = detected.find((a) => a.id === "command" || a.command === "command");
    assert.equal(commandAgent, undefined, "System utility 'command' should not be detected as an agent");

    // Verify no detected agent points to a system directory
    const systemPaths = ["/bin/command", "/usr/bin/command"];
    for (const agent of detected) {
      if (agent.path) {
        assert.ok(
          !systemPaths.includes(agent.path),
          `Agent ${agent.id} should not resolve to system binary: ${agent.path}`
        );
      }
    }
  });

  it("returns only existing, verified executable commands", async () => {
    const service = new AgentService();
    const detected = await service.detect();

    // Every item returned must be an actually existing, installed command with a path
    assert.ok(detected.length > 0, "Should detect installed commands");
    for (const agent of detected) {
      assert.equal(agent.installed, true, `Agent ${agent.id} must be marked installed`);
      assert.ok(agent.path, `Agent ${agent.id} must have a valid resolved path`);
    }

    // Broken binaries like cline (which fails --version) must not be returned
    const clineAgent = detected.find((a) => a.id === "cline" || a.command === "cline");
    assert.equal(clineAgent, undefined, "Broken CLI 'cline' should not be detected as an existing agent");
  });
});
