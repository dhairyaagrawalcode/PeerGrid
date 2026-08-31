import { notFound } from "next/navigation";
import MessagesView from "@/app/components/messages-view";
import { requireStudent } from "@/app/lib/auth";
import {
  getConversationSummaries,
  getConversationSummary,
  getDirectMessages,
} from "@/app/lib/data";

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { conversationId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) notFound();
  const { draft } = await searchParams;
  const { supabase, profile } = await requireStudent();
  const conversationPage = await getConversationSummaries(supabase);
  const selected = conversationPage.conversations.find(
    (conversation) => conversation.conversation_id === conversationId,
  ) ?? await getConversationSummary(supabase, conversationId, profile.id);
  if (!selected) notFound();
  const conversations = conversationPage.conversations.some((item) => item.conversation_id === selected.conversation_id)
    ? conversationPage.conversations
    : [selected, ...conversationPage.conversations];
  const messagePage = await getDirectMessages(supabase, conversationId);
  return (
    <MessagesView
      conversations={conversations}
      hasMoreConversations={conversationPage.hasMore}
      hasMoreMessages={messagePage.hasMore}
      messages={messagePage.messages}
      profile={profile}
      selected={selected}
      draft={typeof draft === "string" ? draft.slice(0, 2000) : ""}
    />
  );
}
