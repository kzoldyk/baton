import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentId, Handoff } from "../../../shared/types";
import {
  buildAgentOptions,
  nextStateAfterRefreshChoice,
  resolvePassSheetAgents,
  shouldInitPassSheetAgents,
  shouldPromptRefreshBeforePass
} from "./handoffUiFlow.ts";

const sampleHandoff = { id: "h1" } as Handoff;

describe("handoff UI flow", () => {
  it("prompts refresh when a pass already exists", () => {
    assert.equal(shouldPromptRefreshBeforePass(undefined), false);
    assert.equal(shouldPromptRefreshBeforePass(sampleHandoff), true);
  });

  it("initializes pass sheet agents only on first open", () => {
    assert.equal(shouldInitPassSheetAgents(true, false), true);
    assert.equal(shouldInitPassSheetAgents(true, true), false);
    assert.equal(shouldInitPassSheetAgents(false, false), false);
  });

  it("defaults from active session and picks a different to agent", () => {
    const agents = resolvePassSheetAgents(["aider", "codex", "claude"], "aider");
    assert.equal(agents.from, "aider");
    assert.equal(agents.to, "codex");
  });

  it("does not reset user agent picks while sheet stays open", () => {
    let from: AgentId = "aider";
    let to: AgentId = "claude";
    if (shouldInitPassSheetAgents(true, true)) {
      ({ from, to } = resolvePassSheetAgents(["aider", "codex", "claude"], "aider"));
    }
    assert.equal(from, "aider");
    assert.equal(to, "claude");
  });

  it("maps refresh dialog choices to the next UI state", () => {
    assert.deepEqual(nextStateAfterRefreshChoice("cancel", false), {
      refreshBeforePassOpen: false,
      handoffSheetOpen: false
    });
    assert.equal(nextStateAfterRefreshChoice("refresh", false), null);
    assert.deepEqual(nextStateAfterRefreshChoice("refresh", true), {
      refreshBeforePassOpen: false,
      handoffSheetOpen: true
    });
    assert.deepEqual(nextStateAfterRefreshChoice("skip", false), {
      refreshBeforePassOpen: false,
      handoffSheetOpen: true
    });
  });

  it("falls back to default agents when none installed", () => {
    assert.deepEqual(buildAgentOptions([]), ["codex", "claude", "opencode", "gemini", "grok"]);
    assert.deepEqual(buildAgentOptions(["aider"]), ["aider"]);
  });
});
