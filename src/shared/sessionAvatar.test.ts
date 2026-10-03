import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarSpecFromSessionId, resolveSessionAvatarSpec } from "./sessionAvatar.ts";

test("same session id always yields the same color and roundness", () => {
  const a = avatarSpecFromSessionId("ses_abc");
  const b = avatarSpecFromSessionId("ses_abc");
  assert.deepEqual(a, b);
  assert.match(a.color, /^#[0-9a-f]{6}$/);
  assert.ok(a.headRoundness >= 6 && a.headRoundness <= 94);
});

test("different session ids yield different looks", () => {
  const a = avatarSpecFromSessionId("ses_one");
  const b = avatarSpecFromSessionId("ses_two");
  assert.notDeepEqual(a, b);
});

test("stored spec wins over hashed fallback", () => {
  const resolved = resolveSessionAvatarSpec({
    id: "ses_abc",
    avatarColor: "#112233",
    avatarHeadRoundness: 12
  });
  assert.deepEqual(resolved, { color: "#112233", headRoundness: 12 });
});
