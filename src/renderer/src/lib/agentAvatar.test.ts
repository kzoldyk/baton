import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAgentAvatarConfig, extractAvatarSize, AGENT_AVATAR_CONFIGS } from "./agentAvatar.ts";

describe("agentAvatar", () => {
  it("provides valid colors and shapes for all explicitly defined agents", () => {
    for (const [id, config] of Object.entries(AGENT_AVATAR_CONFIGS)) {
      assert.match(config.color, /^#[0-9a-fA-F]{6}$/, `Invalid hex color for agent ${id}`);
      assert.ok(
        typeof config.shape === "number" && config.shape >= 0 && config.shape <= 100,
        `Shape out of range [0, 100] for agent ${id}: ${config.shape}`
      );
    }
  });

  it("assigns distinct colors and shapes to core coding agents", () => {
    const codex = getAgentAvatarConfig("codex");
    const claude = getAgentAvatarConfig("claude");
    const gemini = getAgentAvatarConfig("gemini");
    const terminal = getAgentAvatarConfig("terminal");
    const opencode = getAgentAvatarConfig("opencode");

    // Colors should differ
    assert.notEqual(codex.color, claude.color);
    assert.notEqual(claude.color, gemini.color);
    assert.notEqual(gemini.color, terminal.color);

    // Shapes should differ
    assert.notEqual(codex.shape, claude.shape);
    assert.notEqual(claude.shape, gemini.shape);
    assert.notEqual(terminal.shape, gemini.shape);
  });

  it("deterministically assigns fallback colors and shapes for unknown agents", () => {
    const unknown1 = getAgentAvatarConfig("my-custom-robot-agent");
    const unknown2 = getAgentAvatarConfig("my-custom-robot-agent");
    const unknown3 = getAgentAvatarConfig("different-robot");

    assert.deepEqual(unknown1, unknown2, "Identical agent IDs should produce identical configurations");
    assert.match(unknown1.color, /^#[0-9a-fA-F]{6}$/);
    assert.ok(unknown1.shape >= 0 && unknown1.shape <= 100);
  });

  it("extracts appropriate pixel size from Tailwind classes", () => {
    assert.equal(extractAvatarSize("h-3.5 w-3.5 shrink-0"), 18);
    assert.equal(extractAvatarSize("h-4 w-4"), 20);
    assert.equal(extractAvatarSize("h-5 w-5"), 24);
    assert.equal(extractAvatarSize("mr-1.5 h-3.5 w-3.5"), 18);
    assert.equal(extractAvatarSize(undefined, 32), 32);
    assert.equal(extractAvatarSize("", undefined), 24);
  });
});
