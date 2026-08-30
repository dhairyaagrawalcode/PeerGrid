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
  initialMessages,
}: {
  conversationId: string;
  currentId: string;
  initialMessages: DirectMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
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

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);

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
      setError(sendError.message);
    } else if (data) {
      setMessages((current) =>
        current.some((item) => item.id === data.id)
          ? current
          : [...current, data as DirectMessage],
      );
      setBody("");
    }
    setSending(false);
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length ? (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((message) => {
              const own = message.sender_id === currentId;
              return (
                <div
                  className={`flex flex-col ${own ? "items-end" : "items-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                      own
                        ? "rounded-br-md bg-primary text-white"
                        : "rounded-bl-md border border-white/8 bg-white/[0.05] text-[#e2dee6]"
                    }`}
                  >
                    {message.body}
                  </div>
                  <span className="mt-1 px-1 text-[9px] text-muted">
                    {messageTime(message.created_at)}
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
              <p className="mt-1 text-xs text-muted">Send a message to say hello.</p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/8 p-3 sm:p-4">
        <form className="mx-auto flex max-w-2xl items-center gap-2" onSubmit={send}>
          <input
            aria-label="Message"
            autoComplete="off"
            className="field !min-h-11 flex-1 !rounded-full !px-4"
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Message…"
            value={body}
          />
          <button
            aria-label="Send message"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/20 transition hover:bg-[#9a70f8] disabled:opacity-40"
            disabled={sending || !body.trim()}
            type="submit"
          >
            {sending ? <FiLoader className="animate-spin" /> : <FiSend />}
          </button>
        </form>
        {error && <p className="mx-auto mt-2 max-w-2xl px-2 text-xs text-rose-300">{error}</p>}
      </div>
    </>
  );
}
