import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_SESSION_SECONDS, createAdminToken, hashAdminPassword, hashAdminToken, isPasswordHash, validAdminToken, verifyAdminPassword } from "../app/lib/admin-password-crypto.ts";

test("scrypt password hash is salted and verifies only the configured password", async () => {
  const password = "test-only-passphrase-never-use-in-production";
  const hash = await hashAdminPassword(password);
  assert.equal(isPasswordHash(hash),true);
  assert.equal(hash.includes(password),false);
  assert.equal(await verifyAdminPassword(password,hash),true);
  assert.equal(await verifyAdminPassword("incorrect-password",hash),false);
  assert.notEqual(await hashAdminPassword(password),hash);
});
test("password setup refuses weak length and verification refuses malformed hashes", async () => {
  await assert.rejects(hashAdminPassword("short"));
  assert.equal(await verifyAdminPassword("anything",""),false);
  assert.equal(await verifyAdminPassword(null,"invalid"),false);
  assert.equal(isPasswordHash("scrypt:1:1:1:aa:bb"),false);
});
test("sessions use unique high-entropy opaque tokens, not a password or user ID", () => {
  const one=createAdminToken(), two=createAdminToken();
  assert.equal(validAdminToken(one),true);
  assert.notEqual(one,two);
  assert.notEqual(hashAdminToken(one),one);
  assert.equal(hashAdminToken(one).length,64);
  assert.equal(validAdminToken("admin"),false);
  assert.equal(validAdminToken("../admin"),false);
  assert.equal(ADMIN_SESSION_SECONDS,3600);
});
