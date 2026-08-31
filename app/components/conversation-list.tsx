"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiLoader } from "react-icons/fi";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { initials, timeAgo } from "@/app/lib/format";
import type { ConversationSummary } from "@/app/types";
import AvatarImage from "./avatar-image";

export default function ConversationList({
  initialConversations,
  currentId,
  selectedId,
  initialHasMore = false,
}: {
  initialConversations: ConversationSummary[];
  currentId: string;
  selectedId?: string;
  initialHasMore?: boolean;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextOffset = useRef(Math.min(initialConversations.length, 50));
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function refreshConversations() {
      const { data } = await supabase.rpc("get_conversation_summaries", {
        result_limit: 50,
        result_offset: 0,
      });
      if (!data) return;
      const rows = data as Array<
        Omit<ConversationSummary, "unread_count"> & {
          unread_count: number | string | null;
        }
      >;
      const refreshed = rows.map((row) => ({
          ...row,
          unread_count: Number(row.unread_count ?? 0),
        })) as ConversationSummary[];
      setConversations((current) => {
        const refreshedIds = new Set(refreshed.map((item) => item.conversation_id));
        return [...refreshed, ...current.filter((item) => !refreshedIds.has(item.conversation_id))];
      });
    }

    window.addEventListener("peergrid:message-change", refreshConversations);
    window.addEventListener("peergrid:messages-read", refreshConversations);
    return () => {
      window.removeEventListener("peergrid:message-change", refreshConversations);
      window.removeEventListener("peergrid:messages-read", refreshConversations);
    };
  }, [currentId, supabase]);

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const { data, error } = await supabase.rpc("get_conversation_summaries", {
      result_limit: 51,
      result_offset: nextOffset.current,
    });
    if (!error) {
      const rows = (data ?? []) as Array<Omit<ConversationSummary, "unread_count"> & { unread_count: number | string | null }>;
      const page = rows.slice(0, 50).map((row) => ({ ...row, unread_count: Number(row.unread_count ?? 0) })) as ConversationSummary[];
      nextOffset.current += page.length;
      setConversations((current) => {
        const existing = new Set(current.map((item) => item.conversation_id));
        return [...current, ...page.filter((item) => !existing.has(item.conversation_id))];
      });
      setHasMore(rows.length > 50);
    }
    setLoadingMore(false);
  }

  return (
    <aside
      className={`${selectedId ? "hidden md:flex" : "flex"} h-full min-h-0 flex-col border-r border-line md:w-[340px] md:flex-none`}
    >
      <div className="flex h-17 items-center border-b border-line px-5">
        <div>
          <p className="text-base font-bold">Messages</p>
          <p className="mt-0.5 text-[11px] text-muted">Private student conversations</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {conversations.length ? (
          <>
          {conversations.map((conversation) => {
            const active = conversation.conversation_id === selectedId;
            const unread = active ? 0 : conversation.unread_count;
            return (
              <Link
                className={`flex gap-3 rounded-xl p-3 transition ${active ? "bg-primary/10" : "hover:bg-card"}`}
                href={`/messages/${conversation.conversation_id}`}
                key={conversation.conversation_id}
              >
                <span className="avatar !h-11 !w-11 !rounded-full">
                  {conversation.other_avatar_url ? (
                    <AvatarImage
                      alt={conversation.other_full_name}
                      src={conversation.other_avatar_url}
                    />
                  ) : (
                    initials(conversation.other_full_name)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <strong className={`truncate text-sm ${unread ? "text-font" : "font-semibold text-subtle"}`}>
                      {conversation.other_full_name}
                    </strong>
                    <small className="shrink-0 text-[10px] text-muted">
                      {timeAgo(conversation.last_activity_at)}
                    </small>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className={`truncate text-xs ${unread ? "font-semibold text-subtle" : "text-muted"}`}>
                      {conversation.last_message_body
                        ? `${conversation.last_message_sender_id === currentId ? "You: " : ""}${conversation.last_message_body}`
                        : `Start a conversation with @${conversation.other_username}`}
                    </span>
                    {unread > 0 && (
                      <i className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold not-italic text-white">
                        {unread > 99 ? "99+" : unread}
                      </i>
                    )}
                  </span>
                </span>
              </Link>
            );
          })}
          {hasMore && (
            <button className="mx-auto my-3 flex items-center gap-2 text-xs font-semibold text-muted hover:text-font" disabled={loadingMore} onClick={loadMore} type="button">
              {loadingMore && <FiLoader className="animate-spin" />} More conversations
            </button>
          )}
          </>
        ) : (
          <div className="grid h-full min-h-72 place-items-center px-7 text-center">
            <div>
              <p className="text-sm font-bold">No messages yet</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Open a student profile and choose Message to start chatting.
              </p>
              <Link className="button button-primary mt-5 !min-h-9 !text-xs" href="/discover">
                Find students
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
