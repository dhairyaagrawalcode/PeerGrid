import assert from "node:assert/strict";
import test from "node:test";
import sodium from "libsodium-wrappers-sumo";
import { encryptDirectMessage, decryptDirectMessage } from "../app/lib/e2ee.ts";

// Ephemeral fixture keys only. No browser key stores, accounts, or network access.
async function device(userId: string) {
  await sodium.ready;
  const box = sodium.crypto_box_keypair();
  const signing = sodium.crypto_sign_keypair();
  const b64 = (bytes: Uint8Array) => sodium.to_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING);
  const unlocked = { userId, deviceId: crypto.randomUUID(), boxPublicKey: b64(box.publicKey),
    boxPrivateKey: box.privateKey, signingPublicKey: b64(signing.publicKey), signingPrivateKey: signing.privateKey };
  return { unlocked, public: { device_id: unlocked.deviceId, profile_id: userId,
    box_public_key: unlocked.boxPublicKey, signing_public_key: unlocked.signingPublicKey, revoked_at: null } };
}

async function fixture() {
  const sender = await device("sender");
  const recipient = await device("recipient");
  const devices = [sender.public, recipient.public];
  const payload = await encryptDirectMessage({ id: crypto.randomUUID(), conversationId: crypto.randomUUID(),
    senderId: "sender", plaintext: "Ephemeral test message", device: sender.unlocked, recipients: devices });
  return { sender, recipient, devices, message: { ...payload, created_at: new Date().toISOString(), read_at: null } };
}

test("existing encryption still round-trips for sender and recipient without plaintext in the payload", async () => {
  const { sender, recipient, devices, message } = await fixture();
  assert.equal(JSON.stringify(message).includes("Ephemeral test message"), false);
  for (const account of [sender, recipient]) {
    const result = await decryptDirectMessage(message, account.unlocked, devices);
    assert.equal(result.plaintext, "Ephemeral test message");
    assert.equal(result.decryption_error, null);
  }
});

test("ciphertext and conversation metadata tampering fail signature verification", async () => {
  const { recipient, devices, message } = await fixture();
  for (const modified of [{ ...message, conversation_id: crypto.randomUUID() },
    { ...message, ciphertext: (message.ciphertext[0] === "A" ? "B" : "A") + message.ciphertext.slice(1) }]) {
    const result = await decryptDirectMessage(modified, recipient.unlocked, devices);
    assert.equal(result.plaintext, null);
    assert.equal(result.decryption_error, "invalid_signature");
  }
});

test("a new device cannot decrypt history addressed to an older device", async () => {
  const { devices, message } = await fixture();
  const fresh = await device("recipient");
  const result = await decryptDirectMessage(message, fresh.unlocked, devices);
  assert.equal(result.plaintext, null);
  assert.equal(result.decryption_error, "missing_key");
});
