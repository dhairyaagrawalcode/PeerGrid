import assert from "node:assert/strict";
import test from "node:test";
import { moderateContent } from "../app/lib/moderation.ts";

test("ordinary builder content is published", () => {
  assert.equal(moderateContent("Building an accessibility app with React").status, "published");
});

test("suspicious link spam is held", () => {
  assert.equal(moderateContent("Visit https://a.dev https://b.dev https://c.dev").status, "held");
});

test("clear threats are rejected", () => {
  assert.equal(moderateContent("I will kill you").status, "rejected");
});

test("short or low-detail content is not rejected for quality", () => {
  assert.equal(moderateContent("First build!").status, "published");
});
