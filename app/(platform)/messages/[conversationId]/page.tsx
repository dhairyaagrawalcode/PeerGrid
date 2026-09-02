import { notFound } from "next/navigation";
import MessagesView from "@/app/components/messages-view";
import { requireStudent } from "@/app/lib/auth";
import {
  getConversationSummaries,
  getConversationSummary,
  getConversationMembers,
  getDirectMessages,
  getStudents,
} from "@/app/lib/data";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) notFound();
  const { supabase, profile } = await requireStudent();
  const conversationPage = await getConversationSummaries(supabase);
  const selected = conversationPage.conversations.find(
    (conversation) => conversation.conversation_id === conversationId,
  ) ?? await getConversationSummary(supabase, conversationId, profile.id);
  if (!selected) notFound();
  const conversations = conversationPage.conversations.some((item) => item.conversation_id === selected.conversation_id)
    ? conversationPage.conversations
    : [selected, ...conversationPage.conversations];
  const [messagePage, members, students] = await Promise.all([
    getDirectMessages(supabase, conversationId),
    getConversationMembers(supabase, conversationId),
    getStudents(supabase, profile.id, { limit: 100 }),
  ]);
  return (
    <MessagesView
      conversations={conversations}
      hasMoreConversations={conversationPage.hasMore}
      groupCandidates={students}
      hasMoreMessages={messagePage.hasMore}
      messages={messagePage.messages}
      profile={profile}
      members={members}
      selected={selected}
    />
  );
}
