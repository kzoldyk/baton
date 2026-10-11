import assert from "node:assert/strict";
import test from "node:test";
import { detectTokenAlert, estimateTokenCount, evaluateByteThreshold } from "./tokenAlerts.ts";

test("tokenAlerts detection", async (t) => {
  await t.test("detects critical context window exhaustion", () => {
    const alert = detectTokenAlert("Error: context window reached. Cannot continue session.");
    assert.ok(alert);
    assert.equal(alert?.level, "critical");
    assert.match(alert?.message ?? "", /context window is nearly full/i);
  });

  await t.test("detects high percentage token usage", () => {
    const alert = detectTokenAlert("Tokens: 85% used");
    assert.ok(alert);
    assert.equal(alert?.level, "warning");
    assert.match(alert?.message ?? "", /85%/);

    const criticalAlert = detectTokenAlert("Tokens: 92% used");
    assert.ok(criticalAlert);
    assert.equal(criticalAlert?.level, "critical");
  });

  await t.test("detects compact nudge", () => {
    const alert = detectTokenAlert("Conversation is getting long. Use /compact to compact.");
    assert.ok(alert);
    assert.equal(alert?.level, "warning");
  });

  await t.test("detects rate and quota limits", () => {
    const alert = detectTokenAlert("API rate limit approaching for this model.");
    assert.ok(alert);
    assert.equal(alert?.level, "critical");
  });

  await t.test("returns null for normal terminal output", () => {
    const alert = detectTokenAlert("npm run build\nEverything compiled successfully in 1.2s");
    assert.equal(alert, null);
  });
});

test("token count estimation and byte thresholds", async (t) => {
  await t.test("estimates ~4 chars per token", () => {
    assert.equal(estimateTokenCount(400), 100);
    assert.equal(estimateTokenCount(0), 0);
  });

  await t.test("warns at 55k estimated tokens (220k bytes)", () => {
    const alert = evaluateByteThreshold(220000);
    assert.ok(alert);
    assert.equal(alert?.level, "warning");
    assert.match(alert?.message ?? "", /Session context is growing/i);
  });

  await t.test("critical at 90k estimated tokens (360k bytes)", () => {
    const alert = evaluateByteThreshold(360000);
    assert.ok(alert);
    assert.equal(alert?.level, "critical");
    assert.match(alert?.message ?? "", /High session context/i);
  });

  await t.test("returns null below threshold", () => {
    const alert = evaluateByteThreshold(50000);
    assert.equal(alert, null);
  });
});
