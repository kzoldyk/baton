import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateCuteSessionName, isGenericAgentName } from "./cuteNames.ts";

describe("cute session names", () => {
  it("generates cute agent names", () => {
    const name1 = generateCuteSessionName();
    const name2 = generateCuteSessionName();

    assert.ok(name1.length > 2, "Name should be non-empty");
    assert.equal(typeof name1, "string");
    assert.equal(typeof name2, "string");
  });

  it("detects generic raw agent names", () => {
    assert.equal(isGenericAgentName("Antigravity"), true);
    assert.equal(isGenericAgentName("Antigravity #2"), true);
    assert.equal(isGenericAgentName("Kiro"), true);
    assert.equal(isGenericAgentName("Claude Code"), true);
    assert.equal(isGenericAgentName("Mochi"), false);
    assert.equal(isGenericAgentName("Pixel"), false);
    assert.equal(isGenericAgentName(""), true);
    assert.equal(isGenericAgentName(undefined), true);
  });
});
