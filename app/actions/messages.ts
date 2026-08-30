"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/app/lib/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getOrCreateConversation(otherUserId: string) {
  const { supabase, user } = await requireStudent();
  if (!uuidPattern.test(otherUserId) || otherUserId === user.id) return null;
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    other_user_id: otherUserId,
  });
  if (error || !data) {
    throw new Error(error?.message || "Could not open this conversation.");
  }
  return String(data);
}

export async function startConversation(formData: FormData) {
  const otherUserId = String(formData.get("otherUserId") ?? "");
  const conversationId = await getOrCreateConversation(otherUserId);
  if (!conversationId) return;

  redirect(`/messages/${conversationId}`);
}

export async function connectForCollaboration(formData: FormData) {
  const otherUserId = String(formData.get("otherUserId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  if (!title) return;
  const conversationId = await getOrCreateConversation(otherUserId);
  if (!conversationId) return;

  const draft = `Hey, I'm interested in "${title}" and would like to work on this with you.`;
  redirect(`/messages/${conversationId}?draft=${encodeURIComponent(draft)}`);
}
