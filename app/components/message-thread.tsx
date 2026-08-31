"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiLoader, FiSend } from "react-icons/fi";
import { createClient } from "@/app/lib/supabase/client";
import type { DirectMessage } from "@/app/types";

function messageTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessageThread({
  conversationId,
  currentId,
  initialDraft = "",
  initialHasMore = false,
  initialMessages,
}: {
  conversationId: string;
  currentId: string;
  initialDraft?: string;
  initialHasMore?: boolean;
  initialMessages: DirectMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const markRead = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentId)
      .is("read_at", null)
      .select("id");
    if (data?.length) {
      window.dispatchEvent(
        new CustomEvent("peergrid:messages-read", { detail: data.length }),
      );
    }
  }, [conversationId, currentId, supabase]);

  useEffect(() => {
    void markRead();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as DirectMessage;
          setMessages((current) =>
            current.some((item) => item.id === incoming.id)
              ? current
              : [...current, incoming],
          );
          if (incoming.sender_id !== currentId) void markRead();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as DirectMessage;
          setMessages((current) =>
            current.map((item) => (item.id === updated.id ? updated : item)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentId, markRead, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: messages.length > initialMessages.length ? "smooth" : "auto",
      block: "end",
    });
  }, [initialMessages.length, messages]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(51);
    if (loadError) {
      setError("Older messages could not be loaded. Please try again.");
    } else {
      const rows = (data ?? []) as DirectMessage[];
      setMessages((current) => [...rows.slice(0, 50).reverse(), ...current]);
      setHasMore(rows.length > 50);
    }
    setLoadingOlder(false);
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if (!message || sending) return;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimisticMessage: DirectMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: currentId,
      body: message,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setSending(true);
    setError(null);
    setBody("");
    setMessages((current) => [...current, optimisticMessage]);

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentId,
        body: message,
      })
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .single();

    if (sendError) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setBody(message);
      setError(sendError.message === "RATE_LIMIT_EXCEEDED" ? "You are sending messages too quickly. Wait a moment and try again." : "Your message could not be sent. Please try again.");
    } else if (data) {
      setMessages((current) => {
        const withoutOptimistic = current.filter((item) => item.id !== optimisticId);
        return withoutOptimistic.some((item) => item.id === data.id)
          ? withoutOptimistic
          : [...withoutOptimistic, data as DirectMessage];
      });
      window.dispatchEvent(new CustomEvent("peergrid:message-change"));
    }
    setSending(false);
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-4">
        {messages.length ? (
          <div className="flex w-full flex-col gap-3">
            {hasMore && (
              <button className="mx-auto mb-2 text-xs font-semibold text-muted hover:text-font disabled:opacity-50" disabled={loadingOlder} onClick={loadOlder} type="button">
                {loadingOlder ? "Loading older messages…" : "Load older messages"}
              </button>
            )}
            {messages.map((message) => {
              const own = message.sender_id === currentId;
              return (
                <div
                  className={`flex flex-col ${own ? "items-end" : "items-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 lg:max-w-[72%] ${
                      own
                        ? "rounded-br-md border border-line bg-card text-font"
                        : "rounded-bl-md border border-line bg-panel text-subtle"
                    }`}
                  >
                    {message.body}
                  </div>
                  <span className="mt-1 px-1 text-[9px] text-muted">
                    {messageTime(message.created_at)}
                    {message.id.startsWith("optimistic-") ? " · Sending" : ""}
                    {own && message.read_at ? " · Read" : ""}
                  </span>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm font-bold">Start the conversation</p>
              <p className="mt-1 text-xs text-muted">
                Send a message to say hello.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-line p-3 sm:p-4">
        <form className="flex w-full items-center gap-2" onSubmit={send}>
          <input
            aria-label="Message"
            autoComplete="off"
            autoFocus={Boolean(initialDraft)}
            className="field !min-h-11 flex-1 !rounded-full !px-4"
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Message…"
            value={body}
          />
          <button
            aria-label="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-primary-hover disabled:opacity-40"
            disabled={sending || !body.trim()}
            type="submit"
          >
            {sending ? <FiLoader className="animate-spin" /> : <FiSend />}
          </button>
        </form>
        {error && <p className="mt-2 px-2 text-xs text-danger">{error}</p>}
      </div>
    </>
  );
}
