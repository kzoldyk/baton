import assert from "node:assert/strict";
import test from "node:test";
import { UpdateService } from "./UpdateService.ts";

test("UpdateService instantiation and error resilience", async (t) => {
  await t.test("initializes with version", () => {
    const service = new UpdateService("kzoldyk/baton", "0.1.0");
    assert.ok(service);
  });

  await t.test("falls back cleanly on invalid repo without throwing", async () => {
    const service = new UpdateService("invalid-owner-nonexistent-123/repo-456", "0.1.0");
    const result = await service.checkForUpdates();
    assert.equal(result.currentVersion, "0.1.0");
    assert.equal(result.updateAvailable, false);
    assert.ok(result.checkedAt);
  });
});
