// Node-only primitives. No credentials are stored in this module.
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const ADMIN_SESSION_SECONDS = 3600;
export function isPasswordHash(value: unknown): value is string {
  return typeof value === "string" && /^scrypt:32768:8:1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value);
}
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, options, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashAdminPassword(password: string) {
  if (password.length < 16 || password.length > 256) throw new Error("Use a unique password or passphrase with 16–256 characters.");
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt:32768:8:1:${salt.toString("hex")}:${hash.toString("hex")}`;
}
export async function verifyAdminPassword(password: unknown, encoded: string) {
  if (typeof password !== "string" || password.length > 256 || !isPasswordHash(encoded)) return false;
  const parts = encoded.split(":");
  const actual = await derive(password, Buffer.from(parts[4], "hex"));
  return timingSafeEqual(actual, Buffer.from(parts[5], "hex"));
}
export function hashAdminToken(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function createAdminToken() { return randomBytes(32).toString("hex"); }
export function validAdminToken(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
