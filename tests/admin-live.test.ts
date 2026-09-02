import assert from "node:assert/strict";
import test from "node:test";
import { isAdminLiveUpdate, needsAdminRefresh } from "../app/lib/admin-live.ts";

const snapshot = { revision: "12", time_bucket: "42", checked_at: "2026-09-02T12:00:00Z", realtime: true };
test("live update contract accepts database markers, not arbitrary event payloads", () => {
  assert.equal(isAdminLiveUpdate(snapshot), true);
  for (const bad of [null, {}, { ...snapshot, revision: {} }, { ...snapshot, checked_at: "invalid" }, { ...snapshot, realtime: "true" }]) {
    assert.equal(isAdminLiveUpdate(bad), false);
  }
});
test("refresh on first connection, database writes, and time-window expiration only", () => {
  assert.equal(needsAdminRefresh(null, snapshot), true);
  assert.equal(needsAdminRefresh(snapshot, { ...snapshot, checked_at: "2026-09-02T12:00:05Z" }), false);
  assert.equal(needsAdminRefresh(snapshot, { ...snapshot, revision: "13" }), true);
  assert.equal(needsAdminRefresh(snapshot, { ...snapshot, time_bucket: "43" }), true);
  // A database restore/reset can lower the revision: equality, not monotonic comparison.
  assert.equal(needsAdminRefresh(snapshot, { ...snapshot, revision: "1" }), true);
});
