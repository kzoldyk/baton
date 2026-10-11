import assert from "node:assert/strict";
import test from "node:test";
import { hapticTap, hapticSelect, hapticSuccess, hapticWarning } from "./macHaptics.ts";

test("macHaptics functions execute safely without AudioContext in node", () => {
  // Should never throw, even when window / AudioContext are undefined in Node test environment
  assert.doesNotThrow(() => hapticTap());
  assert.doesNotThrow(() => hapticSelect());
  assert.doesNotThrow(() => hapticSuccess());
  assert.doesNotThrow(() => hapticWarning());
});
