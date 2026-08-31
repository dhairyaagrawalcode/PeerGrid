import MessagesView from "@/app/components/messages-view";
import { requireStudent } from "@/app/lib/auth";
import { getConversationSummaries } from "@/app/lib/data";

export default async function MessagesPage() {
  const { supabase, profile } = await requireStudent();
  const conversationPage = await getConversationSummaries(supabase);
  return <MessagesView conversations={conversationPage.conversations} hasMoreConversations={conversationPage.hasMore} profile={profile} />;
}
