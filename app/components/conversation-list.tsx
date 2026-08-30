"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiEdit3 } from "react-icons/fi";
import { createClient } from "@/app/lib/supabase/client";
import { initials, timeAgo } from "@/app/lib/format";
import type { ConversationSummary } from "@/app/types";
import AvatarImage from "./avatar-image";

export default function ConversationList({
  initialConversations,
  currentId,
  selectedId,
}: {
  initialConversations: ConversationSummary[];
  currentId: string;
  selectedId?: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function refreshConversations() {
      const { data } = await supabase.rpc("get_conversation_summaries");
      if (!data) return;
      const rows = data as Array<
        Omit<ConversationSummary, "unread_count"> & {
          unread_count: number | string | null;
        }
      >;
      setConversations(
        rows.map((row) => ({
          ...row,
          unread_count: Number(row.unread_count ?? 0),
        })) as ConversationSummary[],
      );
    }

    const channel = supabase
      .channel(`conversation-list:${currentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        refreshConversations,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        refreshConversations,
      )
      .subscribe();

    window.addEventListener("peergrid:messages-read", refreshConversations);
    return () => {
      window.removeEventListener("peergrid:messages-read", refreshConversations);
      void supabase.removeChannel(channel);
    };
  }, [currentId, supabase]);

  return (
    <aside
      className={`${selectedId ? "hidden md:flex" : "flex"} h-full min-h-0 flex-col border-r border-white/8 md:w-[340px] md:flex-none`}
    >
      <div className="flex h-17 items-center justify-between border-b border-white/8 px-5">
        <div>
          <p className="text-base font-bold">Messages</p>
          <p className="mt-0.5 text-[11px] text-muted">Private student conversations</p>
        </div>
        <Link
          aria-label="Find someone to message"
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/8 bg-white/[0.03] text-muted hover:border-primary/35 hover:text-primary"
          href="/discover"
        >
          <FiEdit3 />
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {conversations.length ? (
          conversations.map((conversation) => {
            const active = conversation.conversation_id === selectedId;
            const unread = active ? 0 : conversation.unread_count;
            return (
              <Link
                className={`flex gap-3 rounded-xl p-3 transition ${active ? "bg-primary/12" : "hover:bg-white/[0.035]"}`}
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
                    <strong className={`truncate text-sm ${unread ? "text-font" : "font-semibold text-[#d5d1dc]"}`}>
                      {conversation.other_full_name}
                    </strong>
                    <small className="shrink-0 text-[10px] text-muted">
                      {timeAgo(conversation.last_activity_at)}
                    </small>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className={`truncate text-xs ${unread ? "font-semibold text-[#c9c3d2]" : "text-muted"}`}>
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
          })
        ) : (
          <div className="grid h-full min-h-72 place-items-center px-7 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <FiEdit3 size={20} />
              </div>
              <p className="mt-4 text-sm font-bold">No messages yet</p>
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
