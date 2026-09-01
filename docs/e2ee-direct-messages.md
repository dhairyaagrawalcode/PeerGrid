# PeerGrid direct-message encryption

PeerGrid direct messages use client-side end-to-end encryption. The Supabase database receives ciphertext and routing/read metadata, never message plaintext or private device keys.

## Cryptographic design

- Each browser profile creates an X25519 key pair for sealed-box key delivery and an Ed25519 key pair for message signatures.
- Private keys are encrypted locally with a non-extractable Web Crypto AES-GCM key and persisted in IndexedDB. Public keys are registered in `user_crypto_devices`.
- Every message receives a fresh random 256-bit content key and a fresh XChaCha20-Poly1305 nonce.
- The content key is sealed separately to every active device belonging to every direct or group conversation member. The database trigger rejects a message unless its envelope set exactly covers those active devices.
- The sender signs the message identifier, conversation/sender/device identifiers, nonce, ciphertext, and ordered key envelopes. A recipient verifies the signature before decrypting.
- Supabase RLS restricts the conversation, encrypted payload, per-member read state, member list, and realtime stream to conversation members.
- Conversation previews deliberately show only `Encrypted message`; unread state uses message metadata and does not require plaintext.

## Device lifecycle

Opening an authenticated PeerGrid page registers the current browser device. The local encrypted key record survives normal session restoration in that browser. A user can have up to ten active devices; registering an eleventh revokes the least-recently-used device. The `revoke_crypto_device` RPC supports explicit rotation/revocation, and future messages exclude revoked devices.

Every direct or group member must have at least one registered device before the conversation can send its first encrypted message. This prevents a group from silently creating messages that one of its members can never decrypt.

New devices can decrypt messages sent after registration. PeerGrid does not copy old private keys through the server, because doing so would weaken the end-to-end boundary.

## Migration behavior

Migration `20260901000000_e2ee_collaboration_activity_notifications.sql` deletes the existing legacy plaintext message rows after explicit project-owner approval. Conversation shells remain. It then removes `messages.body` and requires ciphertext, nonce, encrypted key envelopes, sender device, version, and signature for every new message.

## Threat model and limitations

This protects message content from database readers, backups, normal server logs, and a passive Supabase compromise. Supabase still sees metadata such as participants, timestamps, message sizes, and read state.

Current limitations:

- There is no user-verifiable safety number or independent key-transparency log. A malicious server that substitutes a public key at first discovery is outside the current protection model.
- There is no cross-device historical-message recovery. Clearing browser site data loses that device's keys; other registered devices continue to work for messages addressed to them.
- Compromised client JavaScript, an XSS vulnerability, malicious browser extensions, or an already-compromised device can access plaintext while the user reads or writes it.
- The implementation has not received an independent cryptographic/security audit.

Before a high-risk production launch, add authenticated device linking or a user-held recovery key, safety-number verification/key transparency, device-management UI, CSP hardening, and an external security review.
