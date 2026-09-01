import assert from "node:assert/strict";
import test from "node:test";
import { isProtectedPath } from "../app/lib/routes.ts";

test("authenticated application routes are protected", () => {
  for (const path of ["/feed", "/profile/edit", "/messages/123", "/collaboration", "/notifications"]) {
    assert.equal(isProtectedPath(path), true, path);
  }
});

test("landing and authentication routes remain public", () => {
  for (const path of ["/", "/auth/login", "/auth/signup", "/auth/callback"]) {
    assert.equal(isProtectedPath(path), false, path);
  }
});
