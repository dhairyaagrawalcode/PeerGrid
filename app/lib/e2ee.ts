"use client";

import "client-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import sodium from "libsodium-wrappers-sumo";
import type {
  CryptoDevicePublic,
  DecryptedDirectMessage,
  DirectMessage,
} from "@/app/types";

const DATABASE_NAME = "peergrid-e2ee-v1";
const STORE_NAME = "devices";
const FORMAT_VERSION = 1;

type StoredDevice = {
  userId: string;
  deviceId: string;
  boxPublicKey: string;
  signingPublicKey: string;
  secretCiphertext: ArrayBuffer;
  secretIv: Uint8Array;
  wrappingKey: CryptoKey;
  createdAt: string;
};

type UnlockedDevice = {
  userId: string;
  deviceId: string;
  boxPublicKey: string;
  boxPrivateKey: Uint8Array;
  signingPublicKey: string;
  signingPrivateKey: Uint8Array;
};

const unlockedDevices = new Map<string, Promise<UnlockedDevice>>();

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "userId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Encrypted message storage is unavailable."));
  });
}

async function readStoredDevice(userId: string) {
  const database = await openDatabase();
  return new Promise<StoredDevice | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(userId);
    request.onsuccess = () => resolve(request.result as StoredDevice | undefined);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeStoredDevice(device: StoredDevice) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(device);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function b64(bytes: Uint8Array) {
  return sodium.to_base64(bytes, sodium.base64_variants.URLSAFE_NO_PADDING);
}

function bytes(value: string) {
  return sodium.from_base64(value, sodium.base64_variants.URLSAFE_NO_PADDING);
}

function storageAdditionalData(device: Pick<StoredDevice, "userId" | "deviceId" | "boxPublicKey" | "signingPublicKey">) {
  return new TextEncoder().encode(
    JSON.stringify({
      v: FORMAT_VERSION,
      userId: device.userId,
      deviceId: device.deviceId,
      boxPublicKey: device.boxPublicKey,
      signingPublicKey: device.signingPublicKey,
    }),
  );
}

async function createStoredDevice(userId: string) {
  await sodium.ready;
  const box = sodium.crypto_box_keypair();
  const signing = sodium.crypto_sign_keypair();
  const base = {
    userId,
    deviceId: crypto.randomUUID(),
    boxPublicKey: b64(box.publicKey),
    signingPublicKey: b64(signing.publicKey),
  };
  const wrappingKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const secretIv = crypto.getRandomValues(new Uint8Array(12));
  const secretBytes = new TextEncoder().encode(
    JSON.stringify({
      boxPrivateKey: b64(box.privateKey),
      signingPrivateKey: b64(signing.privateKey),
    }),
  );
  const secretCiphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: secretIv, additionalData: storageAdditionalData(base) },
    wrappingKey,
    secretBytes,
  );
  sodium.memzero(secretBytes);
  sodium.memzero(box.privateKey);
  sodium.memzero(signing.privateKey);
  const stored: StoredDevice = {
    ...base,
    secretCiphertext,
    secretIv,
    wrappingKey,
    createdAt: new Date().toISOString(),
  };
  await writeStoredDevice(stored);
  return stored;
}

async function unlockStoredDevice(stored: StoredDevice): Promise<UnlockedDevice> {
  await sodium.ready;
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array([...stored.secretIv]),
      additionalData: storageAdditionalData(stored),
    },
    stored.wrappingKey,
    stored.secretCiphertext,
  );
  const secretBytes = new Uint8Array(decrypted);
  try {
    const secrets = JSON.parse(new TextDecoder().decode(secretBytes)) as {
      boxPrivateKey: string;
      signingPrivateKey: string;
    };
    return {
      userId: stored.userId,
      deviceId: stored.deviceId,
      boxPublicKey: stored.boxPublicKey,
      boxPrivateKey: bytes(secrets.boxPrivateKey),
      signingPublicKey: stored.signingPublicKey,
      signingPrivateKey: bytes(secrets.signingPrivateKey),
    };
  } finally {
    sodium.memzero(secretBytes);
  }
}

async function registerDevice(supabase: SupabaseClient, stored: StoredDevice) {
  const label = `${navigator.platform || "Browser"} · ${navigator.userAgent.includes("Mobile") ? "Mobile" : "Web"}`.slice(0, 80);
  const { error } = await supabase.rpc("register_crypto_device", {
    candidate_device_id: stored.deviceId,
    candidate_box_public_key: stored.boxPublicKey,
    candidate_signing_public_key: stored.signingPublicKey,
    candidate_label: label,
  });
  if (error) throw new Error(error.message || "This device could not be registered for encrypted messages.");
}

export function ensureCryptoDevice(userId: string, supabase: SupabaseClient) {
  const cached = unlockedDevices.get(userId);
  if (cached) return cached;
  const promise = (async () => {
    let stored = (await readStoredDevice(userId)) ?? (await createStoredDevice(userId));
    try {
      await registerDevice(supabase, stored);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("CRYPTO_DEVICE_REVOKED")) throw error;
      stored = await createStoredDevice(userId);
      await registerDevice(supabase, stored);
    }
    return unlockStoredDevice(stored);
  })();
  unlockedDevices.set(userId, promise);
  promise.catch(() => unlockedDevices.delete(userId));
  return promise;
}

export async function getConversationCryptoDevices(
  supabase: SupabaseClient,
  conversationId: string,
) {
  const { data, error } = await supabase.rpc("get_conversation_crypto_devices", {
    candidate_conversation_id: conversationId,
  });
  if (error) throw new Error(error.message || "Encrypted message recipients are unavailable.");
  return (data ?? []) as CryptoDevicePublic[];
}

function messageAdditionalData(message: Pick<DirectMessage, "id" | "conversation_id" | "sender_id" | "sender_device_id" | "encryption_version">) {
  return JSON.stringify({
    v: message.encryption_version,
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    senderDeviceId: message.sender_device_id,
  });
}

function signaturePayload(message: Pick<DirectMessage, "id" | "conversation_id" | "sender_id" | "sender_device_id" | "encryption_version" | "nonce" | "ciphertext" | "key_envelopes">) {
  const orderedEnvelopes = Object.fromEntries(Object.entries(message.key_envelopes).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({
    aad: messageAdditionalData(message),
    nonce: message.nonce,
    ciphertext: message.ciphertext,
    keyEnvelopes: orderedEnvelopes,
  });
}

export async function encryptDirectMessage({
  id,
  conversationId,
  senderId,
  plaintext,
  device,
  recipients,
}: {
  id: string;
  conversationId: string;
  senderId: string;
  plaintext: string;
  device: UnlockedDevice;
  recipients: CryptoDevicePublic[];
}): Promise<Omit<DirectMessage, "created_at" | "read_at">> {
  await sodium.ready;
  const activeRecipients = recipients.filter((recipient) => !recipient.revoked_at);
  if (new Set(activeRecipients.map((recipient) => recipient.profile_id)).size < 2) {
    throw new Error("Conversation members need encryption keys before this message can be sent.");
  }
  const contentKey = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
  const nonceBytes = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const base = {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    sender_device_id: device.deviceId,
    encryption_version: 1 as const,
  };
  try {
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      messageAdditionalData(base),
      null,
      nonceBytes,
      contentKey,
    );
    const key_envelopes = Object.fromEntries(
      activeRecipients.map((recipient) => [
        recipient.device_id,
        b64(sodium.crypto_box_seal(contentKey, bytes(recipient.box_public_key))),
      ]),
    );
    const unsigned = {
      ...base,
      nonce: b64(nonceBytes),
      ciphertext: b64(ciphertext),
      key_envelopes,
    };
    return {
      ...unsigned,
      signature: b64(sodium.crypto_sign_detached(signaturePayload(unsigned), device.signingPrivateKey)),
    };
  } finally {
    sodium.memzero(contentKey);
    sodium.memzero(nonceBytes);
  }
}

export async function decryptDirectMessage(
  message: DirectMessage,
  device: UnlockedDevice,
  devices: CryptoDevicePublic[],
): Promise<DecryptedDirectMessage> {
  await sodium.ready;
  const senderDevice = devices.find((candidate) => candidate.device_id === message.sender_device_id);
  if (!senderDevice || !sodium.crypto_sign_verify_detached(
    bytes(message.signature),
    signaturePayload(message),
    bytes(senderDevice.signing_public_key),
  )) {
    return { ...message, plaintext: null, decryption_error: "invalid_signature" };
  }
  const envelope = message.key_envelopes[device.deviceId];
  if (!envelope) return { ...message, plaintext: null, decryption_error: "missing_key" };
  let contentKey: Uint8Array | null = null;
  try {
    contentKey = sodium.crypto_box_seal_open(
      bytes(envelope),
      bytes(device.boxPublicKey),
      device.boxPrivateKey,
    );
    if (!contentKey) throw new Error("Missing content key");
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      bytes(message.ciphertext),
      messageAdditionalData(message),
      bytes(message.nonce),
      contentKey,
      "text",
    );
    return { ...message, plaintext, decryption_error: null };
  } catch {
    return { ...message, plaintext: null, decryption_error: "decrypt_failed" };
  } finally {
    if (contentKey) sodium.memzero(contentKey);
  }
}
