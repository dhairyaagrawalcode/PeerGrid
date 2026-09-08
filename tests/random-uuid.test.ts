import test from "node:test";
import assert from "node:assert/strict";
import { createUuid } from "../app/lib/random-uuid.ts";

test("uses native randomUUID when the browser provides it", () => {
  const expected = "123e4567-e89b-42d3-a456-426614174000";
  const source = {
    randomUUID: () => expected,
    getRandomValues: () => {
      throw new Error("fallback should not run");
    },
  } as unknown as Crypto;

  assert.equal(createUuid(source), expected);
});

test("creates a standards-shaped UUID v4 from getRandomValues on older mobile browsers", () => {
  const source = {
    getRandomValues: (bytes: Uint8Array) => {
      bytes.fill(0xaa);
      return bytes;
    },
  } as unknown as Crypto;

  const uuid = createUuid(source);
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(uuid, "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");
});

test("fails clearly when secure browser randomness is unavailable", () => {
  assert.throws(
    () => createUuid({} as Crypto),
    /Secure random number generation is unavailable/,
  );
});
