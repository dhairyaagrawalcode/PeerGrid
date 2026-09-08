"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiLoader, FiSearch, FiUsers, FiX } from "react-icons/fi";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { initials, timeAgo } from "@/app/lib/format";
import { groupAvatarUrl } from "@/app/lib/group-avatar";
import type { ConversationSummary } from "@/app/types";
import AvatarImage from "./avatar-image";
import CreateGroupButton from "./create-group-button";

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
  const [searchQuery, setSearchQuery] = useState("");
  const nextOffset = useRef(Math.min(initialConversations.length, 50));
  const supabase = useMemo(() => createClient(), []);
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      [
        conversation.other_full_name,
        conversation.other_username,
        conversation.group_title,
        conversation.conversation_id,
      ].some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [conversations, searchQuery]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let revision = 0;
    async function refreshConversations() {
      const version = ++revision;
      const { data } = await supabase.rpc("get_conversation_summaries", {
        result_limit: 50,
        result_offset: 0,
      });
      if (!data || disposed || version !== revision) return;
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

    function scheduleRefresh() {
      revision++;
      clearTimeout(timer);
      timer = setTimeout(() => void refreshConversations(), 200);
    }
    window.addEventListener("peergrid:message-change", scheduleRefresh);
    window.addEventListener("peergrid:messages-read", scheduleRefresh);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("peergrid:message-change", scheduleRefresh);
      window.removeEventListener("peergrid:messages-read", scheduleRefresh);
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
      className={`conversation-list ${selectedId ? "hidden md:flex" : "flex"} h-full min-h-0 w-full min-w-0 flex-col border-line md:w-[340px] md:flex-none md:border-r`}
    >
      <div className="flex h-17 shrink-0 items-center gap-2 border-b border-line px-2 sm:px-5">
        <div>
          <p className="text-base font-bold">Messages</p>
          <p className="mt-0.5 text-[11px] text-muted">Direct and group conversations</p>
        </div>
        <div className="ml-auto"><CreateGroupButton currentId={currentId} /></div>
      </div>

      <label className="conversation-search relative block shrink-0 px-2 py-2.5 sm:px-3">
        <span className="sr-only">Search conversations by name, username, or ID</span>
        <FiSearch className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          autoComplete="off"
          className="field !min-h-12 !rounded-full !bg-panel !pl-10 !pr-11"
          inputMode="search"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search name, username, or ID"
          type="text"
          value={searchQuery}
        />
        {searchQuery && (
          <button
            aria-label="Clear conversation search"
            className="absolute end-3.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-card hover:text-font"
            onClick={() => setSearchQuery("")}
            type="button"
          >
            <FiX aria-hidden="true" />
          </button>
        )}
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto py-2.5 sm:px-2.5">
        {conversations.length ? (
          <>
          {filteredConversations.map((conversation) => {
            const active = conversation.conversation_id === selectedId;
            const unread = active ? 0 : conversation.unread_count;
            const groupAvatar = groupAvatarUrl(conversation.group_avatar_path);
            return (
              <Link
                className={`flex gap-3 rounded-xl p-3 transition ${active ? "bg-primary/10" : "hover:bg-card"}`}
                href={`/messages/${conversation.conversation_id}`}
                key={conversation.conversation_id}
              >
                <span className="avatar !h-11 !w-11 !rounded-full">
                  {conversation.is_group ? (groupAvatar ? <AvatarImage alt={conversation.other_full_name} src={groupAvatar} /> : <FiUsers size={18} />) : conversation.other_avatar_url ? (
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
                        : conversation.is_group ? `${conversation.member_count} members` : `Start a conversation with @${conversation.other_username}`}
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
          {filteredConversations.length === 0 && (
            <div className="grid min-h-52 place-items-center px-7 text-center">
              <div>
                <p className="text-sm font-bold">No matching conversations</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Try a name, username, group title, or conversation ID.
                </p>
              </div>
            </div>
          )}
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
                Message a student or create an encrypted group.
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
