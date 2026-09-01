"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiLoader, FiLock, FiSend } from "react-icons/fi";
import {
  decryptDirectMessage,
  encryptDirectMessage,
  ensureCryptoDevice,
  getConversationCryptoDevices,
} from "@/app/lib/e2ee";
import { createClient } from "@/app/lib/supabase/client";
import type { ConversationMember, CryptoDevicePublic, DecryptedDirectMessage, DirectMessage } from "@/app/types";

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
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cryptoReady, setCryptoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<Awaited<ReturnType<typeof ensureCryptoDevice>> | null>(null);
  const devicesRef = useRef<CryptoDevicePublic[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
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
      .select("id, conversation_id, sender_id, ciphertext, nonce, key_envelopes, encryption_version, sender_device_id, signature, created_at, read_at")
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
    if (!plaintext || sending || !device) return;
    setSending(true);
    setError(null);
    const messageId = crypto.randomUUID();
    try {
      devicesRef.current = await getConversationCryptoDevices(supabase, conversationId);
      const encrypted = await encryptDirectMessage({ id: messageId, conversationId, senderId: currentId, plaintext, device, recipients: devicesRef.current });
      const optimistic: DecryptedDirectMessage = { ...encrypted, created_at: new Date().toISOString(), read_at: null, plaintext, decryption_error: null, optimistic: true };
      setBody("");
      setMessages((current) => [...current, optimistic]);
      const { data, error: sendError } = await supabase.from("messages").insert(encrypted)
        .select("id, conversation_id, sender_id, ciphertext, nonce, key_envelopes, encryption_version, sender_device_id, signature, created_at, read_at").single();
      if (sendError) throw sendError;
      const persisted = await decryptDirectMessage(data as DirectMessage, device, devicesRef.current);
      setMessages((current) => current.map((item) => item.id === messageId ? persisted : item));
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== messageId));
      setBody(plaintext);
      const message = sendError instanceof Error ? sendError.message : "";
      setError(message.includes("RATE_LIMIT_EXCEEDED")
        ? "You are sending messages too quickly. Wait a moment and try again."
        : message.includes("encryption key") || message.includes("KEY_ENVELOPE") || message.includes("MEMBER_KEY")
          ? "One conversation member has not finished encrypted-message setup. Ask them to open PeerGrid once, then retry."
          : "Your encrypted message could not be sent. Please try again.");
    } finally {
      setSending(false);
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
            const content = message.plaintext ?? (message.decryption_error === "missing_key" ? "This message was sent before this device was added." : message.decryption_error ? "This encrypted message could not be verified." : "Decrypting…");
            return <div className={`flex flex-col ${own ? "items-end" : "items-start"}`} key={message.id}>
              {isGroup && !own && senderName && <span className="mb-1 px-1 text-[10px] font-semibold text-muted">{senderName}</span>}
              <div className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 lg:max-w-[72%] ${own ? "rounded-br-md border border-line bg-card text-font" : "rounded-bl-md border border-line bg-panel text-subtle"}`}>{content}</div>
              <span className="mt-1 px-1 text-[9px] text-muted">{messageTime(message.created_at)}{message.optimistic ? " · Sending" : ""}{own && message.read_at ? " · Read" : ""}</span>
            </div>;
          })}
          <div ref={endRef} />
        </div> : <div className="grid h-full place-items-center text-center"><div><p className="text-sm font-bold">Start the conversation</p><p className="mt-1 text-xs text-muted">Messages are end-to-end encrypted.</p></div></div>}
      </div>
      <div className="border-t border-line p-3 sm:p-4">
        <form className="flex w-full items-center gap-2" onSubmit={send}>
          <div className="relative flex-1"><FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={13} /><input aria-label="Encrypted message" autoComplete="off" className="field !min-h-11 w-full !rounded-full !pl-10 !pr-4" disabled={!cryptoReady} maxLength={2000} onChange={(event) => setBody(event.target.value)} placeholder={cryptoReady ? "Message…" : "Preparing encryption…"} value={body} /></div>
          <button aria-label="Send encrypted message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-primary-hover disabled:opacity-40" disabled={sending || !cryptoReady || !body.trim()} type="submit">{sending ? <FiLoader className="animate-spin" /> : <FiSend />}</button>
        </form>
        {error && <p className="mt-2 px-2 text-xs text-danger">{error}</p>}
      </div>
    </>
  );
}
