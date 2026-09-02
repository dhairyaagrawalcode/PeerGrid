import MessagesView from "@/app/components/messages-view";
import { requireStudent } from "@/app/lib/auth";
import { getConversationSummaries, getStudents } from "@/app/lib/data";

export default async function MessagesPage() {
  const { supabase, profile } = await requireStudent();
  const [conversationPage, students] = await Promise.all([
    getConversationSummaries(supabase),
    getStudents(supabase, profile.id, { limit: 100 }),
  ]);
  return <MessagesView conversations={conversationPage.conversations} groupCandidates={students} hasMoreConversations={conversationPage.hasMore} profile={profile} />;
}
