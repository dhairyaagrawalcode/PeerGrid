import Link from "next/link";
import { FiArrowLeft, FiMessageCircle } from "react-icons/fi";
import { initials } from "@/app/lib/format";
import type {
  ConversationSummary,
  ConversationMember,
  DirectMessage,
  StudentProfile,
} from "@/app/types";
import AvatarImage from "./avatar-image";
import ConversationList from "./conversation-list";
import GroupDetailsButton from "./group-details-button";
import MessageThread from "./message-thread";

export default function MessagesView({
  profile,
  conversations,
  selected,
  messages = [],
  hasMoreMessages = false,
  hasMoreConversations = false,
  members = [],
}: {
  profile: StudentProfile;
  conversations: ConversationSummary[];
  selected?: ConversationSummary;
  messages?: DirectMessage[];
  hasMoreMessages?: boolean;
  hasMoreConversations?: boolean;
  members?: ConversationMember[];
}) {
  return (
    <section className="app-page messages-viewport flex overflow-hidden">
      <ConversationList
        currentId={profile.id}
        initialHasMore={hasMoreConversations}
        initialConversations={conversations}
        selectedId={selected?.conversation_id}
      />

      <div
        className={`${selected ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-1 flex-col`}
      >
        {selected ? (
          <>
            <header className="flex h-17 shrink-0 items-center gap-2 border-b border-line px-2 sm:gap-3 sm:px-5">
              <Link
                aria-label="Back to conversations"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-card hover:text-font md:hidden"
                href="/messages"
              >
                <FiArrowLeft />
              </Link>
              {selected.is_group ? <GroupDetailsButton
                avatarPath={selected.group_avatar_path}
                conversationId={selected.conversation_id}
                currentId={profile.id}
                members={members}
                title={selected.group_title ?? "Group conversation"}
              /> : <Link
                className="flex min-w-0 items-center gap-3"
                href={`/students/${selected.other_username!}`}
              >
                <span className="avatar !h-10 !w-10 !rounded-full">
                  {selected.other_avatar_url ? (
                    <AvatarImage
                      alt={selected.other_full_name}
                      src={selected.other_avatar_url}
                    />
                  ) : (
                    initials(selected.other_full_name)
                  )}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm">
                    {selected.other_full_name}
                  </strong>
                  <small className="block truncate text-[10px] text-muted">
                    @{selected.other_username}
                  </small>
                </span>
              </Link>}
              {!selected.is_group && <Link
                className="button button-ghost ml-auto shrink-0 !min-h-9 !px-3 !text-xs max-sm:!hidden"
                href={`/students/${selected.other_username!}`}
              >
                View profile
              </Link>}
            </header>
            <MessageThread
              conversationId={selected.conversation_id}
              currentId={profile.id}
              initialHasMore={hasMoreMessages}
              initialMessages={messages}
              isGroup={selected.is_group}
              members={members}
              key={selected.conversation_id}
            />
          </>
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-card text-subtle">
                <FiMessageCircle size={25} />
              </div>
              <h1 className="mt-5 text-lg font-bold">Your messages</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                Choose a conversation or visit a student profile to start a
                private chat.
              </p>
              <Link className="button button-primary mt-5" href="/discover">
                Discover students
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
