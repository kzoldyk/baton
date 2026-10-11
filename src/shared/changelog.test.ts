import assert from "node:assert/strict";
import test from "node:test";
import { compareSemver, BUNDLED_CHANGELOG } from "./changelog.ts";

test("compareSemver comparison logic", () => {
  assert.equal(compareSemver("0.2.0", "0.1.0"), 1);
  assert.equal(compareSemver("v0.2.0", "v0.1.0"), 1);
  assert.equal(compareSemver("0.1.0", "0.2.0"), -1);
  assert.equal(compareSemver("0.1.0", "0.1.0"), 0);
  assert.equal(compareSemver("v0.1.0", "0.1.0"), 0);
  assert.equal(compareSemver("1.0.0", "0.9.9"), 1);
  assert.equal(compareSemver("0.1.1", "0.1.0"), 1);
  assert.equal(compareSemver("v0.1.0-alpha", "v0.1.0"), 0);
});

test("bundled changelog has entries", () => {
  assert.ok(BUNDLED_CHANGELOG.length > 0);
  assert.equal(BUNDLED_CHANGELOG[0]?.version, "0.1.0");
  assert.ok(BUNDLED_CHANGELOG[0]?.highlights.length > 0);
});
