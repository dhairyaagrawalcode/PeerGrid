import { notFound } from "next/navigation";
import MessagesView from "@/app/components/messages-view";
import { requireStudent } from "@/app/lib/auth";
import {
  getConversationSummaries,
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
  const { draft } = await searchParams;
  const { supabase, profile } = await requireStudent();
  const conversations = await getConversationSummaries(supabase);
  const selected = conversations.find(
    (conversation) => conversation.conversation_id === conversationId,
  );
  if (!selected) notFound();
  const messages = await getDirectMessages(supabase, conversationId);
  return (
    <MessagesView
      conversations={conversations}
      messages={messages}
      profile={profile}
      selected={selected}
      draft={typeof draft === "string" ? draft.slice(0, 2000) : ""}
    />
  );
}
