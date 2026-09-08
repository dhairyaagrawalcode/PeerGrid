"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiFileText, FiLoader, FiLock, FiPaperclip, FiSend, FiTrash2, FiX } from "react-icons/fi";
import {
  decryptDirectMessage,
  encryptMessageAttachment,
  encryptDirectMessage,
  ensureCryptoDevice,
  getConversationCryptoDevices,
} from "@/app/lib/e2ee";
import {
  MESSAGE_ATTACHMENT_ACCEPT,
  parseMessagePayload,
  readableAttachmentSize,
  serializeMessagePayload,
  validateMessageAttachment,
} from "@/app/lib/message-attachment";
import { uploadEncryptedMessageAttachment } from "@/app/lib/message-attachment-upload";
import { createClient } from "@/app/lib/supabase/client";
import type { ConversationMember, CryptoDevicePublic, DecryptedDirectMessage, DirectMessage } from "@/app/types";
import ConfirmationModal from "./confirmation-modal";
import EncryptedMessageAttachment from "./encrypted-message-attachment";

function messageTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function encryptedPlaceholder(message: DirectMessage): DecryptedDirectMessage {
  return { ...message, plaintext: null, decryption_error: null };
}

export default function MessageThread({ conversationId, currentId, initialHasMore = false, initialMessages, isGroup = false, members = [] }: {
  conversationId: string;
  currentId: string;
  initialHasMore?: boolean;
  initialMessages: DirectMessage[];
  isGroup?: boolean;
  members?: ConversationMember[];
}) {
  const [messages, setMessages] = useState<DecryptedDirectMessage[]>(initialMessages.map(encryptedPlaceholder));
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cryptoReady, setCryptoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DecryptedDirectMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deviceRef = useRef<Awaited<ReturnType<typeof ensureCryptoDevice>> | null>(null);
  const devicesRef = useRef<CryptoDevicePublic[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const memberNames = useMemo(() => new Map(members.map((member) => [member.profile_id, member.profile.full_name])), [members]);

  const decryptRows = useCallback(async (rows: DirectMessage[], refreshDevices = false) => {
    const device = deviceRef.current;
    if (!device) return rows.map(encryptedPlaceholder);
    if (refreshDevices || !devicesRef.current.length) {
      devicesRef.current = await getConversationCryptoDevices(supabase, conversationId);
    }
    return Promise.all(rows.map((message) => decryptDirectMessage(message, device, devicesRef.current)));
  }, [conversationId, supabase]);

  const markRead = useCallback(async () => {
    const { data } = await supabase.rpc("mark_conversation_read", {
      candidate_conversation_id: conversationId,
    });
    const count = Number(data ?? 0);
    if (count > 0) window.dispatchEvent(new CustomEvent("peergrid:messages-read", { detail: count }));
  }, [conversationId, supabase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        deviceRef.current = await ensureCryptoDevice(currentId, supabase);
        devicesRef.current = await getConversationCryptoDevices(supabase, conversationId);
        const decrypted = await decryptRows(initialMessages);
        if (cancelled) return;
        setMessages(decrypted);
        const storedDraft = sessionStorage.getItem(`peergrid:collaboration-draft:${conversationId}`);
        if (storedDraft) {
          setBody(storedDraft.slice(0, 2000));
          sessionStorage.removeItem(`peergrid:collaboration-draft:${conversationId}`);
        }
        setCryptoReady(true);
      } catch (setupError) {
        if (!cancelled) {
          const message = setupError instanceof Error ? setupError.message : "";
          setError(message.includes("MEMBER_KEY")
            ? "One group member must open PeerGrid once before encrypted messages can begin."
            : "Encrypted messaging could not be initialized on this device.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, currentId, decryptRows, initialMessages, supabase]);

  useEffect(() => {
    void markRead();
    const channel = supabase.channel(`conversation:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const incoming = payload.new as DirectMessage;
        void decryptRows([incoming], true).then(([decrypted]) => {
          setMessages((current) => current.some((item) => item.id === incoming.id)
            ? current.map((item) => item.id === incoming.id ? decrypted : item)
            : [...current, decrypted]);
        });
        if (incoming.sender_id !== currentId) void markRead();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const updated = payload.new as DirectMessage;
        setMessages((current) => current.map((item) => item.id === updated.id ? { ...item, read_at: updated.read_at } : item));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const deleted = payload.old as Partial<DirectMessage>;
        if (deleted.id) setMessages((current) => current.filter((item) => item.id !== deleted.id));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentId, decryptRows, markRead, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: messages.length > initialMessages.length ? "smooth" : "auto", block: "end" });
  }, [initialMessages.length, messages.length]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    setError(null);
    const { data, error: loadError } = await supabase.from("messages")
      .select("id, conversation_id, sender_id, ciphertext, nonce, key_envelopes, encryption_version, sender_device_id, signature, attachment_path, attachment_kind, attachment_size, created_at, read_at")
      .eq("conversation_id", conversationId).lt("created_at", oldest.created_at).order("created_at", { ascending: false }).limit(51);
    if (loadError) {
      setError("Older messages could not be loaded. Please try again.");
    } else {
      const rows = (data ?? []) as DirectMessage[];
      const older = await decryptRows(rows.slice(0, 50).reverse(), true);
      setMessages((current) => [...older, ...current]);
      setHasMore(rows.length > 50);
    }
    setLoadingOlder(false);
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plaintext = body.trim();
    const device = deviceRef.current;
    if ((!plaintext && !attachment) || sending || !device) return;
    setSending(true);
    setError(null);
    const messageId = crypto.randomUUID();
    let uploadedPath = "";
    try {
      devicesRef.current = await getConversationCryptoDevices(supabase, conversationId);
      let encryptedPlaintext = plaintext;
      let storedKind: DirectMessage["attachment_kind"] = null;
      let storedSize: number | null = null;
      if (attachment) {
        const validation = validateMessageAttachment(attachment);
        if ("error" in validation) throw new Error(validation.error);
        uploadedPath = `${currentId}/${conversationId}/${messageId}.bin`;
        setUploadProgress(0);
        const attachmentBytes = new Uint8Array(await attachment.arrayBuffer());
        let encryptedAttachment: Awaited<ReturnType<typeof encryptMessageAttachment>>;
        try {
          encryptedAttachment = await encryptMessageAttachment({
            conversationId,
            messageId,
            path: uploadedPath,
            kind: validation.kind,
            name: validation.name,
            mime: validation.mime,
            data: attachmentBytes,
          });
        } finally {
          attachmentBytes.fill(0);
        }
        try {
          await uploadEncryptedMessageAttachment(supabase, uploadedPath, encryptedAttachment.encrypted, setUploadProgress);
        } finally {
          encryptedAttachment.encrypted.fill(0);
        }
        encryptedPlaintext = serializeMessagePayload(plaintext, encryptedAttachment.attachment);
        storedKind = validation.kind;
        storedSize = attachment.size;
      }
      const encryptedBase = await encryptDirectMessage({ id: messageId, conversationId, senderId: currentId, plaintext: encryptedPlaintext, device, recipients: devicesRef.current });
      const encrypted = { ...encryptedBase, attachment_path: uploadedPath || null, attachment_kind: storedKind, attachment_size: storedSize };
      const optimistic: DecryptedDirectMessage = { ...encrypted, created_at: new Date().toISOString(), read_at: null, plaintext: encryptedPlaintext, decryption_error: null, optimistic: true };
      setBody("");
      setAttachment(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessages((current) => [...current, optimistic]);
      const { data, error: sendError } = await supabase.from("messages").insert(encrypted)
        .select("id, conversation_id, sender_id, ciphertext, nonce, key_envelopes, encryption_version, sender_device_id, signature, attachment_path, attachment_kind, attachment_size, created_at, read_at").single();
      if (sendError) throw sendError;
      const persisted = await decryptDirectMessage(data as DirectMessage, device, devicesRef.current);
      setMessages((current) => current.map((item) => item.id === messageId ? persisted : item));
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== messageId));
      setBody(plaintext);
      if (attachment) setAttachment(attachment);
      if (uploadedPath) await supabase.storage.from("message-media").remove([uploadedPath]);
      const message = sendError instanceof Error ? sendError.message : "";
      setError(message.includes("RATE_LIMIT_EXCEEDED")
        ? "You are sending messages too quickly. Wait a moment and try again."
        : message.includes("25 MB") || message.includes("Choose a JPG")
          ? message
        : message.includes("encryption key") || message.includes("KEY_ENVELOPE") || message.includes("MEMBER_KEY")
          ? "One conversation member has not finished encrypted-message setup. Ask them to open PeerGrid once, then retry."
          : "Your encrypted message could not be sent. Please try again.");
    } finally {
      setSending(false);
      setUploadProgress(null);
    }
  }

  async function deleteMessage() {
    const target = deleteTarget;
    if (!target || target.sender_id !== currentId || target.optimistic || deletingId) return;
    setDeletingId(target.id);
    setError(null);
    try {
      const { data: deleted, error: deleteError } = await supabase.from("messages")
        .delete()
        .eq("id", target.id)
        .eq("conversation_id", conversationId)
        .eq("sender_id", currentId)
        .select("id")
        .maybeSingle();
      if (deleteError || !deleted) throw deleteError ?? new Error("MESSAGE_DELETE_DENIED");
      setMessages((current) => current.filter((item) => item.id !== target.id));
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
      if (target.attachment_path) {
        const { error: cleanupError } = await supabase.storage.from("message-media").remove([target.attachment_path]);
        if (cleanupError) setError("The message was deleted, but encrypted file cleanup is still pending.");
      }
    } catch {
      setError("This message could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-4">
        {messages.length ? <div className="flex w-full flex-col gap-3">
          {hasMore && <button className="mx-auto mb-2 text-xs font-semibold text-muted hover:text-font disabled:opacity-50" disabled={loadingOlder} onClick={loadOlder} type="button">{loadingOlder ? "Loading older messages…" : "Load older messages"}</button>}
          {messages.map((message) => {
            const own = message.sender_id === currentId;
            const senderName = memberNames.get(message.sender_id);
            const fallback = message.decryption_error === "missing_key" ? "This message was sent before this device was added." : message.decryption_error ? "This encrypted message could not be verified." : "Decrypting…";
            const content = message.plaintext ? parseMessagePayload(message.plaintext) : { text: fallback, attachment: null };
            return <div className={`flex flex-col gap-1 ${own ? "items-end" : "items-start"}`} key={message.id}>
              {isGroup && !own && senderName && <span className="mb-1 px-1 text-[10px] font-semibold text-muted">{senderName}</span>}
              {content.text && <div className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 lg:max-w-[72%] ${own ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-panel text-subtle"}`}>{content.text}</div>}
              {content.attachment && (message.optimistic
                ? <div className="flex max-w-72 items-center gap-2 rounded-xl border border-line bg-panel p-3 text-xs text-muted"><FiLoader className="shrink-0 animate-spin" />Securing attachment…</div>
                : <EncryptedMessageAttachment attachment={content.attachment} conversationId={conversationId} messageId={message.id} storedKind={message.attachment_kind} storedPath={message.attachment_path} storedSize={message.attachment_size} supabase={supabase} />)}
              <span className="mt-1 flex items-center gap-1 px-1 text-[9px] text-muted">
                {messageTime(message.created_at)}{message.optimistic ? " · Sending" : ""}{own && message.read_at ? " · Read" : ""}
                {own && !message.optimistic && <button aria-label={content.attachment ? "Delete message and attachment" : "Delete message"} className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40" disabled={Boolean(deletingId)} onClick={() => setDeleteTarget(message)} title="Delete message" type="button">{deletingId === message.id ? <FiLoader className="animate-spin" /> : <FiTrash2 />}</button>}
              </span>
            </div>;
          })}
          <div ref={endRef} />
        </div> : <div className="grid h-full place-items-center text-center"><div><p className="text-sm font-bold">Start the conversation</p><p className="mt-1 text-xs text-muted">Messages are end-to-end encrypted.</p></div></div>}
      </div>
      <div className="message-composer shrink-0 border-t border-line px-1 py-3 sm:p-4">
        {attachment && <div className="mb-2 flex min-w-0 items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2"><FiFileText className="shrink-0 text-muted" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{attachment.name}</span><span className="block text-[10px] text-muted">{readableAttachmentSize(attachment.size)}{uploadProgress !== null ? ` · ${uploadProgress}% uploaded` : " · encrypted before upload"}</span></span><button aria-label="Remove attachment" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" disabled={sending} onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = ""; }} type="button"><FiX /></button></div>}
        {uploadProgress !== null && <div aria-label={`Upload ${uploadProgress}% complete`} className="mb-2 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${uploadProgress}%` }} /></div>}
        <form className="flex w-full items-center gap-2" onSubmit={send}>
          <label aria-label="Attach an encrypted file" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-card hover:text-font ${sending || !cryptoReady ? "pointer-events-none opacity-40" : "cursor-pointer"}`}><FiPaperclip /><input accept={MESSAGE_ATTACHMENT_ACCEPT} className="sr-only" disabled={sending || !cryptoReady} onChange={(event) => { const selected = event.target.files?.[0] ?? null; if (!selected) return; const validation = validateMessageAttachment(selected); if ("error" in validation) { setError(validation.error ?? "This attachment cannot be used."); event.target.value = ""; return; } setError(null); setAttachment(selected); }} ref={fileRef} type="file" /></label>
          <div className="relative min-w-0 flex-1"><FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={13} /><input aria-label="Encrypted message" autoComplete="off" className="field !min-h-11 w-full !rounded-full !pl-10 !pr-4" disabled={!cryptoReady || sending} maxLength={2000} onChange={(event) => setBody(event.target.value)} placeholder={cryptoReady ? "Message…" : "Preparing encryption…"} value={body} /></div>
          <button aria-label="Send encrypted message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-primary-hover disabled:opacity-40" disabled={sending || !cryptoReady || (!body.trim() && !attachment)} type="submit">{sending ? <FiLoader className="animate-spin" /> : <FiSend />}</button>
        </form>
        {error && <p className="mt-2 px-2 text-xs text-danger">{error}</p>}
      </div>
      <ConfirmationModal
        confirmLabel="Delete"
        description={deleteTarget?.attachment_path ? "This removes the message and its encrypted attachment for everyone in the conversation. This cannot be undone." : "This removes the message for everyone in the conversation. This cannot be undone."}
        onCancel={() => { if (!deletingId) setDeleteTarget(null); }}
        onConfirm={() => void deleteMessage()}
        open={Boolean(deleteTarget)}
        pending={Boolean(deletingId)}
        title="Delete this message?"
      />
    </>
  );
}
