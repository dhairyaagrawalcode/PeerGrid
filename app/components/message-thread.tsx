"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiFileText, FiLoader, FiPaperclip, FiSend, FiTrash2, FiX } from "react-icons/fi";
import { MESSAGE_ATTACHMENT_ACCEPT, readableAttachmentSize, validateMessageAttachment } from "@/app/lib/message-attachment";
import { uploadMessageAttachment } from "@/app/lib/message-attachment-upload";
import { createUuid } from "@/app/lib/random-uuid";
import { createClient } from "@/app/lib/supabase/client";
import type { ConversationMember, DirectMessage } from "@/app/types";
import ConfirmationModal from "./confirmation-modal";
import MessageAttachment from "./message-attachment";

function messageTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function MessageThread({ conversationId, currentId, initialHasMore = false, initialMessages, isGroup = false, members = [] }: {
  conversationId: string;
  currentId: string;
  initialHasMore?: boolean;
  initialMessages: DirectMessage[];
  isGroup?: boolean;
  members?: ConversationMember[];
}) {
  const [messages, setMessages] = useState<DirectMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const memberNames = useMemo(() => new Map(members.map((member) => [member.profile_id, member.profile.full_name])), [members]);

  const markRead = useCallback(async () => {
    const { data } = await supabase.rpc("mark_conversation_read", { candidate_conversation_id: conversationId });
    const count = Number(data ?? 0);
    if (count > 0) window.dispatchEvent(new CustomEvent("peergrid:messages-read", { detail: count }));
  }, [conversationId, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedDraft = sessionStorage.getItem(`peergrid:collaboration-draft:${conversationId}`);
      if (!storedDraft) return;
      setBody(storedDraft.slice(0, 2000));
      sessionStorage.removeItem(`peergrid:collaboration-draft:${conversationId}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [conversationId]);

  useEffect(() => {
    void markRead();
    const channel = supabase.channel(`conversation:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const incoming = payload.new as DirectMessage;
        setMessages((current) => current.some((item) => item.id === incoming.id) ? current.map((item) => item.id === incoming.id ? incoming : item) : [...current, incoming]);
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
  }, [conversationId, currentId, markRead, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: messages.length > initialMessages.length ? "smooth" : "auto", block: "end" });
  }, [initialMessages.length, messages.length]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    setError(null);
    const { data, error: loadError } = await supabase.from("messages")
      .select("id, conversation_id, sender_id, body, attachment_path, attachment_kind, attachment_size, attachment_name, attachment_mime, created_at, read_at")
      .eq("conversation_id", conversationId).lt("created_at", oldest.created_at).order("created_at", { ascending: false }).limit(51);
    if (loadError) setError("Older messages could not be loaded. Please try again.");
    else {
      const rows = (data ?? []) as DirectMessage[];
      setMessages((current) => [...rows.slice(0, 50).reverse(), ...current]);
      setHasMore(rows.length > 50);
    }
    setLoadingOlder(false);
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plaintext = body.trim();
    if ((!plaintext && !attachment) || sending) return;
    setSending(true);
    setError(null);
    const messageId = createUuid();
    let uploadedPath = "";
    try {
      let storedKind: DirectMessage["attachment_kind"] = null;
      let storedSize: number | null = null;
      let storedName: string | null = null;
      let storedMime: string | null = null;
      if (attachment) {
        const validation = validateMessageAttachment(attachment);
        if ("error" in validation) throw new Error(validation.error);
        uploadedPath = `${currentId}/${conversationId}/${messageId}.bin`;
        setUploadProgress(0);
        await uploadMessageAttachment(supabase, uploadedPath, attachment, setUploadProgress);
        storedKind = validation.kind;
        storedSize = attachment.size;
        storedName = validation.name;
        storedMime = validation.mime;
      }
      const optimistic: DirectMessage = {
        id: messageId, conversation_id: conversationId, sender_id: currentId, body: plaintext || null,
        attachment_path: uploadedPath || null, attachment_kind: storedKind, attachment_size: storedSize,
        attachment_name: storedName, attachment_mime: storedMime, created_at: new Date().toISOString(), read_at: null, optimistic: true,
      };
      setBody("");
      setAttachment(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessages((current) => [...current, optimistic]);
      const { data, error: sendError } = await supabase.from("messages").insert({
        id: messageId, conversation_id: conversationId, sender_id: currentId, body: plaintext || null,
        attachment_path: uploadedPath || null, attachment_kind: storedKind, attachment_size: storedSize,
        attachment_name: storedName, attachment_mime: storedMime,
      }).select("id, conversation_id, sender_id, body, attachment_path, attachment_kind, attachment_size, attachment_name, attachment_mime, created_at, read_at").single();
      if (sendError) throw sendError;
      setMessages((current) => current.map((item) => item.id === messageId ? data as DirectMessage : item));
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== messageId));
      setBody(plaintext);
      if (attachment) setAttachment(attachment);
      if (uploadedPath) await supabase.storage.from("message-media").remove([uploadedPath]);
      const message = sendError instanceof Error ? sendError.message : "";
      setError(message.includes("RATE_LIMIT_EXCEEDED") ? "You are sending messages too quickly. Wait a moment and try again." : message.includes("25 MB") || message.includes("Choose a JPG") ? message : "Your message could not be sent. Please try again.");
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
      const { data: deleted, error: deleteError } = await supabase.from("messages").delete().eq("id", target.id).eq("conversation_id", conversationId).eq("sender_id", currentId).select("id").maybeSingle();
      if (deleteError || !deleted) throw deleteError ?? new Error("MESSAGE_DELETE_DENIED");
      setMessages((current) => current.filter((item) => item.id !== target.id));
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
      if (target.attachment_path) {
        const { error: cleanupError } = await supabase.storage.from("message-media").remove([target.attachment_path]);
        if (cleanupError) setError("The message was deleted, but file cleanup is still pending.");
      }
    } catch {
      setError("This message could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return <>
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-4">
      {messages.length ? <div className="flex w-full flex-col gap-3">
        {hasMore && <button className="mx-auto mb-2 text-xs font-semibold text-muted hover:text-font disabled:opacity-50" disabled={loadingOlder} onClick={loadOlder} type="button">{loadingOlder ? "Loading older messages…" : "Load older messages"}</button>}
        {messages.map((message) => {
          const own = message.sender_id === currentId;
          const senderName = memberNames.get(message.sender_id);
          const legacy = !message.body && !message.attachment_name;
          return <div className={`flex flex-col gap-1 ${own ? "items-end" : "items-start"}`} key={message.id}>
            {isGroup && !own && senderName && <span className="mb-1 px-1 text-[10px] font-semibold text-muted">{senderName}</span>}
            {message.body && <div className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 lg:max-w-[72%] ${own ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-panel text-subtle"}`}>{message.body}</div>}
            {message.attachment_path && message.attachment_kind && message.attachment_name && message.attachment_mime && (message.optimistic ? <div className="flex max-w-72 items-center gap-2 rounded-xl border border-line bg-panel p-3 text-xs text-muted"><FiLoader className="shrink-0 animate-spin" />Uploading attachment…</div> : <MessageAttachment kind={message.attachment_kind} mime={message.attachment_mime} name={message.attachment_name} path={message.attachment_path} size={message.attachment_size} supabase={supabase} />)}
            {legacy && <div className="max-w-[82%] rounded-2xl border border-line bg-panel px-3.5 py-2.5 text-xs leading-5 text-muted">Legacy encrypted message — unavailable after the messaging upgrade.</div>}
            <span className="mt-1 flex items-center gap-1 px-1 text-[9px] text-muted">{messageTime(message.created_at)}{message.optimistic ? " · Sending" : ""}{own && message.read_at ? " · Read" : ""}{own && !message.optimistic && <button aria-label={message.attachment_path ? "Delete message and attachment" : "Delete message"} className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40" disabled={Boolean(deletingId)} onClick={() => setDeleteTarget(message)} title="Delete message" type="button">{deletingId === message.id ? <FiLoader className="animate-spin" /> : <FiTrash2 />}</button>}</span>
          </div>;
        })}
        <div ref={endRef} />
      </div> : <div className="grid h-full place-items-center text-center"><div><p className="text-sm font-bold">Start the conversation</p><p className="mt-1 text-xs text-muted">Only conversation members can read and send messages.</p></div></div>}
    </div>
    <div className="message-composer shrink-0 border-t border-line px-1 py-3 sm:p-4">
      {attachment && <div className="mb-2 flex min-w-0 items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2"><FiFileText className="shrink-0 text-muted" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{attachment.name}</span><span className="block text-[10px] text-muted">{readableAttachmentSize(attachment.size)}{uploadProgress !== null ? ` · ${uploadProgress}% uploaded` : ""}</span></span><button aria-label="Remove attachment" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-card hover:text-font" disabled={sending} onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = ""; }} type="button"><FiX /></button></div>}
      {uploadProgress !== null && <div aria-label={`Upload ${uploadProgress}% complete`} className="mb-2 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${uploadProgress}%` }} /></div>}
      <form className="flex w-full items-center gap-2" onSubmit={send}>
        <label aria-label="Attach a file" className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-card hover:text-font ${sending ? "pointer-events-none opacity-40" : "cursor-pointer"}`}><FiPaperclip /><input accept={MESSAGE_ATTACHMENT_ACCEPT} className="sr-only" disabled={sending} onChange={(event) => { const selected = event.target.files?.[0] ?? null; if (!selected) return; const validation = validateMessageAttachment(selected); if ("error" in validation) { setError(validation.error ?? "This attachment cannot be used."); event.target.value = ""; return; } setError(null); setAttachment(selected); }} ref={fileRef} type="file" /></label>
        <input aria-label="Message" autoComplete="off" className="field !min-h-11 min-w-0 flex-1 !rounded-full !px-4" disabled={sending} maxLength={2000} onChange={(event) => setBody(event.target.value)} placeholder="Message…" value={body} />
        <button aria-label="Send message" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-primary-hover disabled:opacity-40" disabled={sending || (!body.trim() && !attachment)} type="submit">{sending ? <FiLoader className="animate-spin" /> : <FiSend />}</button>
      </form>
      {error && <p className="mt-2 px-2 text-xs text-danger">{error}</p>}
    </div>
    <ConfirmationModal confirmLabel="Delete" description={deleteTarget?.attachment_path ? "This removes the message and its attachment for everyone in the conversation. This cannot be undone." : "This removes the message for everyone in the conversation. This cannot be undone."} onCancel={() => { if (!deletingId) setDeleteTarget(null); }} onConfirm={() => void deleteMessage()} open={Boolean(deleteTarget)} pending={Boolean(deletingId)} title="Delete this message?" />
  </>;
}
