import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateTokenSavings } from "./tokenSavings.ts";

describe("tokenSavings", () => {
  it("calculates pass tokens correctly based on content length", () => {
    const text = "a".repeat(1680);
    const savings = calculateTokenSavings(text);
    assert.equal(savings.passTokens, 420);
    assert.ok(savings.savedTokens > 20000);
    assert.ok(savings.savingsPercent >= 90);
    assert.match(savings.formattedBadge, /~420 tokens · Saved ~\d+k tokens \(\d+%\)/);
  });

  it("clamps repository tokens between 25k and 60k", () => {
    const smallRepoSavings = calculateTokenSavings("", { additions: 0, deletions: 0, changedFiles: [] });
    assert.ok(smallRepoSavings.repoTokens >= 25000);

    const hugeChurnSavings = calculateTokenSavings("", {
      additions: 50000,
      deletions: 50000,
      changedFiles: new Array(50).fill({})
    });
    assert.equal(hugeChurnSavings.repoTokens, 60000);
  });

  it("handles empty content gracefully", () => {
    const savings = calculateTokenSavings("");
    assert.equal(savings.passTokens, 1);
    assert.ok(savings.savedTokens > 0);
  });
});
