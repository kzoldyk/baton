import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatGuiAgentPrompt } from "./guiAgentBridge.ts";

describe("guiAgentBridge", () => {
  it("formats prompt for Cursor with instructions", () => {
    const prompt = formatGuiAgentPrompt("cursor", "Goal: Implement login", "Auth Module");
    assert.match(prompt, /Cursor/);
    assert.match(prompt, /Auth Module/);
    assert.match(prompt, /Goal: Implement login/);
    assert.match(prompt, /Do not re-index/);
  });

  it("formats prompt for Windsurf Cascade", () => {
    const prompt = formatGuiAgentPrompt("windsurf", "Goal: Refactor db");
    assert.match(prompt, /Windsurf/);
    assert.match(prompt, /Cascade/);
    assert.match(prompt, /Goal: Refactor db/);
  });

  it("formats prompt for Claude Desktop", () => {
    const prompt = formatGuiAgentPrompt("claude", "Goal: Review UI");
    assert.match(prompt, /Claude Desktop/);
    assert.match(prompt, /Goal: Review UI/);
  });

  it("formats prompt for Copilot", () => {
    const prompt = formatGuiAgentPrompt("copilot", "Goal: Add tests");
    assert.match(prompt, /GitHub Copilot/);
    assert.match(prompt, /Goal: Add tests/);
  });
});
